import type { Entity } from '../types'
import { STATUS_LABEL, TYPE_LABEL } from '../types'
import PinGlyph from './PinGlyph'

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

interface Props {
  entity: Entity
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function DetailPanel({ entity: e, onClose, onEdit, onDelete }: Props) {
  return (
    <section className="panel" aria-label={`Details for ${e.name}`}>
      <header className="panel__head">
        <PinGlyph type={e.type} status={e.status} />
        <h2>{e.name}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close details">
          ×
        </button>
      </header>

      <dl className="facts">
        <dt>Type</dt>
        <dd>{TYPE_LABEL[e.type]}</dd>
        <dt>Status</dt>
        <dd>
          <span className={`badge badge--${e.status}`}>{STATUS_LABEL[e.status]}</span>
        </dd>
        <dt>Latitude</dt>
        <dd className="num">{e.latitude.toFixed(6)}</dd>
        <dt>Longitude</dt>
        <dd className="num">{e.longitude.toFixed(6)}</dd>
        <dt>Description</dt>
        <dd>{e.description || <span className="muted">No description</span>}</dd>
        <dt>Created</dt>
        <dd>{fmt(e.created_at)}</dd>
        <dt>Updated</dt>
        <dd>{fmt(e.updated_at)}</dd>
      </dl>

      <footer className="panel__actions">
        <button className="btn btn--primary" onClick={onEdit}>
          Edit
        </button>
        <button className="btn btn--danger" onClick={onDelete}>
          Delete
        </button>
      </footer>
    </section>
  )
}
