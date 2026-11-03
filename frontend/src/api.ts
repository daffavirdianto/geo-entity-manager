import type { Entity, EntityInput } from './types'

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

/** Error thrown for non-2xx responses. `fields` carries per-field validation messages. */
export class ApiError extends Error {
  status: number
  fields: Record<string, string>
  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check that the backend is running.')
  }
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, body?.message ?? `Request failed (${res.status})`, body?.fields ?? {})
  }
  return body as T
}

export const api = {
  list: () => request<Entity[]>('/api/entities'),
  create: (input: EntityInput) => request<Entity>('/api/entities', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: EntityInput) =>
    request<Entity>(`/api/entities/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(`/api/entities/${id}`, { method: 'DELETE' }),
}
