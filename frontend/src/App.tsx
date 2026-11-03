import { useCallback, useEffect, useMemo, useState } from 'react'
import MapView, { type FlyTarget } from './components/MapView'
import Sidebar, { type Filters } from './components/Sidebar'
import DetailPanel from './components/DetailPanel'
import EntityForm from './components/EntityForm'
import ConfirmDialog from './components/ConfirmDialog'
import { useDeleteEntity, useEntities } from './useEntities'
import type { Coords, Entity } from './types'

type Mode = { kind: 'idle' } | { kind: 'view'; id: string } | { kind: 'create' } | { kind: 'edit'; id: string }

const round6 = (n: number) => Math.round(n * 1e6) / 1e6

export default function App() {
  const { data, isLoading, error, refetch } = useEntities()
  const del = useDeleteEntity()

  const [mode, setMode] = useState<Mode>({ kind: 'idle' })
  const [draft, setDraft] = useState<Coords | null>(null)
  const [pick, setPick] = useState<Coords | null>(null)
  const [flyTo, setFlyTo] = useState<FlyTarget | null>(null)
  const [filters, setFilters] = useState<Filters>({ q: '', type: '', status: '' })
  const [toast, setToast] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Entity | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const all = useMemo(() => data ?? [], [data])
  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    return all.filter(
      (e) =>
        (!filters.type || e.type === filters.type) &&
        (!filters.status || e.status === filters.status) &&
        (!q || e.name.toLowerCase().includes(q)),
    )
  }, [all, filters])

  const activeId = mode.kind === 'view' || mode.kind === 'edit' ? mode.id : null
  const active = activeId ? all.find((e) => e.id === activeId) : undefined

  // If the selected entity disappears (deleted elsewhere), fall back to idle.
  useEffect(() => {
    if (activeId && data && !active) {
      setMode({ kind: 'idle' })
      setDraft(null)
      setPick(null)
    }
  }, [activeId, active, data])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const picking = mode.kind === 'create' || mode.kind === 'edit'

  useEffect(() => {
    if (!picking) setDirty(false)
  }, [picking])

  /** Run `fn` now, or after the user confirms discarding unsaved form changes. */
  const guard = (fn: () => void) => {
    if (picking && dirty) setPendingAction(() => fn)
    else fn()
  }

  const reset = useCallback(() => {
    setMode({ kind: 'idle' })
    setDraft(null)
    setPick(null)
  }, [])

  const select = useCallback(
    (id: string, fly = false) => {
      setDraft(null)
      setPick(null)
      setMode({ kind: 'view', id })
      const e = all.find((x) => x.id === id)
      if (fly && e) setFlyTo({ coords: { lat: e.latitude, lng: e.longitude }, nonce: Date.now() })
    },
    [all],
  )

  const startCreate = () => {
    setMode({ kind: 'create' })
    setDraft(null)
    setPick(null)
  }

  const startEdit = (e: Entity) => {
    const c = { lat: e.latitude, lng: e.longitude }
    setMode({ kind: 'edit', id: e.id })
    setDraft(c)
    setPick(null)
  }

  const onMapPick = useCallback((c: Coords) => {
    const r = { lat: round6(c.lat), lng: round6(c.lng) }
    setDraft(r)
    setPick(r)
  }, [])

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleteError(null)
    try {
      await del.mutateAsync(toDelete.id)
      setToast(`Deleted “${toDelete.name}”`)
      setToDelete(null)
      reset()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete')
    }
  }

  return (
    <div className="app">
      <Sidebar
        all={all}
        visible={visible}
        loading={isLoading}
        error={error}
        filters={filters}
        selectedId={activeId}
        onFilters={setFilters}
        onSelect={(id) => guard(() => select(id, true))}
        onAdd={() => guard(startCreate)}
        onRetry={() => refetch()}
      />

      <main className={`stage${picking ? ' stage--picking' : ''}`}>
        <MapView
          entities={visible}
          selectedId={activeId}
          editingId={mode.kind === 'edit' ? mode.id : null}
          picking={picking}
          draft={draft}
          flyTo={flyTo}
          onSelect={(id) => {
            if (!picking) select(id)
          }}
          onPick={onMapPick}
          onBackgroundClick={reset}
        />

        {picking && (
          <div className="banner" role="status">
            {draft ? 'Drag the marker to fine-tune the position.' : 'Click the map to place the entity.'}
          </div>
        )}

        {mode.kind === 'view' && active && (
          <DetailPanel
            entity={active}
            onClose={reset}
            onEdit={() => startEdit(active)}
            onDelete={() => {
              setDeleteError(null)
              setToDelete(active)
            }}
          />
        )}

        {mode.kind === 'create' && (
          <EntityForm
            key="create"
            pick={pick}
            onDraftChange={setDraft}
            onDirtyChange={setDirty}
            onCancel={() => guard(reset)}
            onSaved={(e) => {
              setToast(`Added “${e.name}”`)
              setFlyTo({ coords: { lat: e.latitude, lng: e.longitude }, nonce: Date.now() })
              setDraft(null)
              setPick(null)
              setMode({ kind: 'view', id: e.id })
            }}
          />
        )}

        {mode.kind === 'edit' && active && (
          <EntityForm
            key={`edit-${active.id}`}
            entity={active}
            pick={pick}
            onDraftChange={setDraft}
            onDirtyChange={setDirty}
            onCancel={() => guard(() => select(active.id))}
            onSaved={(e) => {
              setToast(`Saved “${e.name}”`)
              setDraft(null)
              setPick(null)
              setMode({ kind: 'view', id: e.id })
            }}
          />
        )}

        <div className="toast-region" aria-live="polite">
          {toast && <div className="toast">{toast}</div>}
        </div>
      </main>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete “${toDelete?.name ?? ''}”?`}
        message="This removes the entity and its marker permanently."
        confirmLabel="Delete entity"
        pending={del.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />

      <ConfirmDialog
        open={pendingAction !== null}
        title="Discard changes?"
        message="You have unsaved changes. If you continue, they will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        pending={false}
        error={null}
        onConfirm={() => {
          pendingAction?.()
          setPendingAction(null)
        }}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  )
}
