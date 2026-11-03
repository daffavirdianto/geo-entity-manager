import L from 'leaflet'
import { TYPE_CATEGORY, type EntityStatus, type EntityType } from './types'

// Custom div icons avoid Leaflet's default-icon asset problem under bundlers.
// Shape encodes category, colour encodes status (see .pin rules in styles.css).
const cache = new Map<string, L.DivIcon>()

export function pinIcon(type: EntityType, status: EntityStatus, selected = false): L.DivIcon {
  const category = TYPE_CATEGORY[type]
  const key = `${category}|${status}|${selected}`
  let icon = cache.get(key)
  if (!icon) {
    icon = L.divIcon({
      className: 'pin-wrap',
      html: `<span class="pin pin--${category} pin--${status}${selected ? ' is-selected' : ''}"></span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      tooltipAnchor: [0, -14],
    })
    cache.set(key, icon)
  }
  return icon
}

export const draftIcon = L.divIcon({
  className: 'pin-wrap pin-wrap--draft',
  html: '<span class="pin pin--draft"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})
