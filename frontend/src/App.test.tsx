import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Coords, Entity } from './types'

// Leaflet needs a real layout engine; the map is replaced by a stub that
// exposes the same props so the app logic around it can be tested.
vi.mock('./components/MapView', () => ({
  default: (p: {
    entities: Entity[]
    draft: Coords | null
    onSelect: (id: string) => void
    onPick: (c: Coords) => void
  }) => (
    <div>
      {p.entities.map((e) => (
        <button key={e.id} onClick={() => p.onSelect(e.id)}>
          marker {e.name}
        </button>
      ))}
      <button onClick={() => p.onPick({ lat: -6.5, lng: 106.9 })}>map click</button>
      <span data-testid="draft">{p.draft ? `${p.draft.lat},${p.draft.lng}` : 'none'}</span>
    </div>
  ),
}))

import App from './App'

const base = { description: '', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
const seed = (): Entity[] => [
  { ...base, id: '1', name: 'Truck Alpha', type: 'truck', status: 'active', latitude: -6.2, longitude: 106.8 },
  { ...base, id: '2', name: 'Sensor Beta', type: 'sensor', status: 'maintenance', latitude: -6.3, longitude: 106.9 },
]

interface Call { method: string; url: string; body?: Record<string, unknown> }
let db: Entity[]
let calls: Call[]
let failList: boolean

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  db = seed()
  calls = []
  failList = false
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      const body = init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : undefined
      calls.push({ method, url, body })
      if (url === '/api/entities' && method === 'GET') return failList ? json(500, { message: 'boom' }) : json(200, db)
      if (url === '/api/entities' && method === 'POST') {
        if (body?.name === 'Taken') {
          return json(422, { error: 'validation_failed', message: 'invalid', fields: { name: 'is already taken' } })
        }
        const e = { ...base, ...body, id: String(db.length + 10) } as Entity
        db.push(e)
        return json(201, e)
      }
      const id = url.split('/').pop()
      if (method === 'PUT') {
        db = db.map((e) => (e.id === id ? ({ ...e, ...body } as Entity) : e))
        return json(200, db.find((e) => e.id === id))
      }
      if (method === 'DELETE') {
        db = db.filter((e) => e.id !== id)
        return json(204)
      }
      return json(404, { message: 'not found' })
    }),
  )
})

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

describe('App', () => {
  it('lists entities with a count', async () => {
    renderApp()
    expect(await screen.findByText('Truck Alpha')).toBeInTheDocument()
    expect(screen.getByText('Sensor Beta')).toBeInTheDocument()
    expect(screen.getByText('2 of 2 shown')).toBeInTheDocument()
  })

  it('filters by search text', async () => {
    const user = renderApp()
    await screen.findByText('Truck Alpha')
    await user.type(screen.getByLabelText('Search by name'), 'sensor')
    expect(screen.queryByText('Truck Alpha')).not.toBeInTheDocument()
    expect(screen.getByText('1 of 2 shown')).toBeInTheDocument()
  })

  it('shows an error state and recovers on retry', async () => {
    failList = true
    const user = renderApp()
    expect(await screen.findByText('boom')).toBeInTheDocument()
    failList = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Truck Alpha')).toBeInTheDocument()
  })

  it('validates on the client before calling the API, then creates', async () => {
    const user = renderApp()
    await screen.findByText('Truck Alpha')
    await user.click(screen.getByRole('button', { name: 'Add entity' }))
    const form = screen.getByRole('region', { name: 'Add entity' })

    await user.click(within(form).getByRole('button', { name: 'Add entity' }))
    expect(await within(form).findByText('Name is required')).toBeInTheDocument()
    expect(within(form).getByText('Latitude is required')).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST')).toBe(false)

    await user.type(within(form).getByLabelText('Name'), 'New truck')
    await user.click(screen.getByRole('button', { name: 'map click' }))
    expect(within(form).getByLabelText('Latitude')).toHaveValue('-6.5')
    expect(screen.getByTestId('draft')).toHaveTextContent('-6.5,106.9')

    await user.click(within(form).getByRole('button', { name: 'Add entity' }))
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true))
    const post = calls.find((c) => c.method === 'POST')!
    expect(post.body).toMatchObject({ name: 'New truck', latitude: -6.5, longitude: 106.9 })
    expect(await screen.findByText(/Added/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Details for New truck' })).toBeInTheDocument()
  })

  it('shows server-side field errors next to the field', async () => {
    const user = renderApp()
    await screen.findByText('Truck Alpha')
    await user.click(screen.getByRole('button', { name: 'Add entity' }))
    const form = screen.getByRole('region', { name: 'Add entity' })
    await user.type(within(form).getByLabelText('Name'), 'Taken')
    await user.type(within(form).getByLabelText('Latitude'), '1')
    await user.type(within(form).getByLabelText('Longitude'), '2')
    await user.click(within(form).getByRole('button', { name: 'Add entity' }))
    expect(await within(form).findByText('Name is already taken')).toBeInTheDocument()
  })

  it('edits an entity', async () => {
    const user = renderApp()
    await user.click(await screen.findByRole('button', { name: 'marker Truck Alpha' }))
    await user.click(within(screen.getByRole('region', { name: 'Details for Truck Alpha' })).getByRole('button', { name: 'Edit' }))
    expect(screen.getByTestId('draft')).toHaveTextContent('-6.2,106.8')

    const form = screen.getByRole('region', { name: 'Edit entity' })
    const name = within(form).getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Truck Renamed')
    await user.click(within(form).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true))
    const put = calls.find((c) => c.method === 'PUT')!
    expect(put.url).toBe('/api/entities/1')
    expect(put.body).toMatchObject({ name: 'Truck Renamed', latitude: -6.2 })
    expect(await screen.findByText(/Saved/)).toBeInTheDocument()
  })

  it('deletes only after confirmation', async () => {
    const user = renderApp()
    await user.click(await screen.findByRole('button', { name: 'marker Truck Alpha' }))
    await user.click(within(screen.getByRole('region', { name: 'Details for Truck Alpha' })).getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog')
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)

    await user.click(within(dialog).getByRole('button', { name: 'Delete entity' }))
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true))
    await waitFor(() => expect(screen.queryByText('Truck Alpha')).not.toBeInTheDocument())
  })

  it('asks before discarding unsaved form changes', async () => {
    const user = renderApp()
    await screen.findByText('Truck Alpha')
    await user.click(screen.getByRole('button', { name: 'Add entity' }))
    await user.type(screen.getByLabelText('Name'), 'Half typed')

    await user.click(screen.getByText('Truck Alpha'))
    let dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Discard changes?')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Half typed')

    await user.click(screen.getByText('Truck Alpha'))
    dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Discard changes' }))
    expect(await screen.findByRole('region', { name: 'Details for Truck Alpha' })).toBeInTheDocument()
  })

  it('does not ask when nothing was typed', async () => {
    const user = renderApp()
    await screen.findByText('Truck Alpha')
    await user.click(screen.getByRole('button', { name: 'Add entity' }))
    await user.click(screen.getByText('Truck Alpha'))
    expect(await screen.findByRole('region', { name: 'Details for Truck Alpha' })).toBeInTheDocument()
  })
})
