// Keep enums in sync with backend/internal/entity/entity.go.
export const ENTITY_TYPES = [
  'truck', 'car', 'motorcycle', 'bus',
  'sensor', 'gateway', 'camera', 'gps_tracker',
  'warehouse', 'office', 'factory', 'gas_station', 'charging_station',
  'other',
] as const
export const ENTITY_STATUSES = ['active', 'inactive', 'maintenance'] as const

export type EntityType = (typeof ENTITY_TYPES)[number]
export type EntityStatus = (typeof ENTITY_STATUSES)[number]

/** Categories group types in menus and decide the marker shape on the map. */
export type Category = 'vehicle' | 'iot' | 'facility' | 'other'

export const CATEGORY_LABEL: Record<Category, string> = {
  vehicle: 'Vehicles',
  iot: 'IoT devices',
  facility: 'Facilities',
  other: 'Other',
}

export const TYPE_CATEGORY: Record<EntityType, Category> = {
  truck: 'vehicle',
  car: 'vehicle',
  motorcycle: 'vehicle',
  bus: 'vehicle',
  sensor: 'iot',
  gateway: 'iot',
  camera: 'iot',
  gps_tracker: 'iot',
  warehouse: 'facility',
  office: 'facility',
  factory: 'facility',
  gas_station: 'facility',
  charging_station: 'facility',
  other: 'other',
}

export const TYPE_LABEL: Record<EntityType, string> = {
  truck: 'Truck',
  car: 'Car',
  motorcycle: 'Motorcycle',
  bus: 'Bus',
  sensor: 'Sensor',
  gateway: 'Gateway',
  camera: 'Camera (CCTV)',
  gps_tracker: 'GPS tracker',
  warehouse: 'Warehouse',
  office: 'Office',
  factory: 'Factory',
  gas_station: 'Gas station',
  charging_station: 'EV charging station',
  other: 'Other',
}

export const STATUS_LABEL: Record<EntityStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  maintenance: 'Maintenance',
}

/** Types grouped by category, in display order, for <optgroup> menus. */
export const TYPE_GROUPS: { category: Category; label: string; types: EntityType[] }[] = (
  ['vehicle', 'iot', 'facility', 'other'] as Category[]
).map((c) => ({
  category: c,
  label: CATEGORY_LABEL[c],
  types: ENTITY_TYPES.filter((t) => TYPE_CATEGORY[t] === c),
}))

export interface Entity {
  id: string
  name: string
  type: EntityType
  status: EntityStatus
  latitude: number
  longitude: number
  description: string
  created_at: string
  updated_at: string
}

/** Payload sent to the API for create/update. */
export interface EntityInput {
  name: string
  type: EntityType
  status: EntityStatus
  latitude: number
  longitude: number
  description: string
}

export interface Coords {
  lat: number
  lng: number
}
