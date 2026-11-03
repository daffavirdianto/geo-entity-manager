import type { Entity, EntityStatus, EntityType } from '../types'
import { ENTITY_STATUSES, STATUS_LABEL, TYPE_LABEL } from '../types'
import TypeOptions from './TypeOptions'
import PinGlyph from './PinGlyph'

export interface Filters {
  q: string
  type: EntityType | ''
  status: EntityStatus | ''
}

interface Props {
  all: Entity[]
  visible: Entity[]
  loading: boolean
  error: Error | null
  filters: Filters
  selectedId: string | null
  onFilters: (f: Filters) => void
  onSelect: (id: string) => void
  onAdd: () => void
  onRetry: () => void
}

export default function Sidebar(p: Props) {
  const filtering = p.filters.q !== '' || p.filters.type !== '' || p.filters.status !== ''

  return (
    <aside className="sidebar">
      <header className="sidebar__head">
        <h1>Entity map</h1>
        <button className="btn btn--primary" onClick={p.onAdd}>
          Add entity
        </button>
      </header>

      <div className="filters">
        <input
          type="search"
          placeholder="Search by name"
          aria-label="Search by name"
          value={p.filters.q}
          onChange={(e) => p.onFilters({ ...p.filters, q: e.target.value })}
        />
        <div className="filters__row">
          <select
            aria-label="Filter by type"
            value={p.filters.type}
            onChange={(e) => p.onFilters({ ...p.filters, type: e.target.value as Filters['type'] })}
          >
            <option value="">All types</option>
            <TypeOptions />
          </select>
          <select
            aria-label="Filter by status"
            value={p.filters.status}
            onChange={(e) => p.onFilters({ ...p.filters, status: e.target.value as Filters['status'] })}
          >
            <option value="">All statuses</option>
            {ENTITY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="sidebar__count" aria-live="polite">
        {!p.loading && !p.error && `${p.visible.length} of ${p.all.length} shown`}
      </div>

      <div className="list">
        {p.loading && <p className="note">Loading entities…</p>}

        {p.error && (
          <div className="note note--error" role="alert">
            <p>{p.error.message}</p>
            <button className="btn" onClick={p.onRetry}>
              Try again
            </button>
          </div>
        )}

        {!p.loading && !p.error && p.all.length === 0 && (
          <div className="note">
            <p>No entities yet. Add one, then click the map to set its position.</p>
          </div>
        )}

        {!p.loading && !p.error && p.all.length > 0 && p.visible.length === 0 && (
          <div className="note">
            <p>No entities match these filters.</p>
            <button className="btn" onClick={() => p.onFilters({ q: '', type: '', status: '' })}>
              Clear filters
            </button>
          </div>
        )}

        {!p.error && (
          <ul>
            {p.visible.map((e) => (
              <li key={e.id}>
                <button
                  className={`item${e.id === p.selectedId ? ' is-selected' : ''}`}
                  onClick={() => p.onSelect(e.id)}
                  aria-current={e.id === p.selectedId}
                >
                  <PinGlyph type={e.type} status={e.status} />
                  <span className="item__text">
                    <span className="item__name">{e.name}</span>
                    <span className="item__meta">
                      {TYPE_LABEL[e.type]}, {STATUS_LABEL[e.status].toLowerCase()}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {filtering && p.visible.length > 0 && (
        <button className="btn btn--ghost sidebar__clear" onClick={() => p.onFilters({ q: '', type: '', status: '' })}>
          Clear filters
        </button>
      )}
    </aside>
  )
}
