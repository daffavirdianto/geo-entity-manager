import { useEffect, useRef } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { Coords, Entity } from '../types'
import { draftIcon, pinIcon } from '../markerIcon'
import { TYPE_LABEL } from '../types'

export interface FlyTarget {
  coords: Coords
  nonce: number
}

interface Props {
  entities: Entity[]
  selectedId: string | null
  editingId: string | null
  picking: boolean
  draft: Coords | null
  flyTo: FlyTarget | null
  onSelect: (id: string) => void
  onPick: (c: Coords) => void
  onBackgroundClick: () => void
}

const JAKARTA: L.LatLngTuple = [-6.2, 106.82]

function MapEvents({ picking, onPick, onBackgroundClick }: Pick<Props, 'picking' | 'onPick' | 'onBackgroundClick'>) {
  useMapEvents({
    click(e) {
      if (picking) onPick({ lat: e.latlng.lat, lng: wrapLng(e.latlng.lng) })
      else onBackgroundClick()
    },
  })
  return null
}

function wrapLng(lng: number) {
  return ((((lng + 180) % 360) + 360) % 360) - 180
}

function FitOnce({ entities }: { entities: Entity[] }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current || entities.length === 0) return
    done.current = true
    const bounds = L.latLngBounds(entities.map((e) => [e.latitude, e.longitude] as L.LatLngTuple))
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 })
  }, [entities, map])
  return null
}

function FlyTo({ target }: { target: FlyTarget | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.flyTo([target.coords.lat, target.coords.lng], Math.max(map.getZoom(), 14), { duration: 0.8 })
  }, [target, map])
  return null
}

function KeepDraftVisible({ draft }: { draft: Coords | null }) {
  const map = useMap()
  useEffect(() => {
    if (draft && !map.getBounds().contains([draft.lat, draft.lng])) {
      map.panTo([draft.lat, draft.lng])
    }
  }, [draft, map])
  return null
}

export default function MapView(p: Props) {
  return (
    <MapContainer
      center={JAKARTA}
      zoom={11}
      minZoom={2}
      className="map"
      worldCopyJump
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <MapEvents picking={p.picking} onPick={p.onPick} onBackgroundClick={p.onBackgroundClick} />
      <FitOnce entities={p.entities} />
      <FlyTo target={p.flyTo} />
      <KeepDraftVisible draft={p.draft} />

      {p.entities
        .filter((e) => e.id !== p.editingId)
        .map((e) => (
          <Marker
            key={e.id}
            position={[e.latitude, e.longitude]}
            icon={pinIcon(e.type, e.status, e.id === p.selectedId)}
            title={e.name}
            eventHandlers={{ click: () => p.onSelect(e.id) }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              {e.name} · {TYPE_LABEL[e.type]}
            </Tooltip>
          </Marker>
        ))}

      {p.draft && (
        <Marker
          position={[p.draft.lat, p.draft.lng]}
          icon={draftIcon}
          draggable
          zIndexOffset={1000}
          eventHandlers={{
            dragend(ev) {
              const ll = (ev.target as L.Marker).getLatLng()
              p.onPick({ lat: ll.lat, lng: wrapLng(ll.lng) })
            },
          }}
        />
      )}
    </MapContainer>
  )
}
