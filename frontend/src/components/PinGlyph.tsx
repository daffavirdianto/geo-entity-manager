import { TYPE_CATEGORY, type EntityStatus, type EntityType } from '../types'

/** Same visual language as the map markers, used in the list and detail panel. */
export default function PinGlyph({ type, status }: { type: EntityType; status: EntityStatus }) {
  return <span className={`pin pin--static pin--${TYPE_CATEGORY[type]} pin--${status}`} aria-hidden="true" />
}
