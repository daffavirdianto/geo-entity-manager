import { z } from 'zod'
import { ENTITY_STATUSES, ENTITY_TYPES } from './types'

// Mirrors backend validation (backend/internal/entity/entity.go).
const coord = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .transform((v) => Number(v))
    .pipe(
      z
        .number({ invalid_type_error: `${label} must be a number` })
        .finite(`${label} must be a number`)
        .min(min, `${label} must be between ${min} and ${max}`)
        .max(max, `${label} must be between ${min} and ${max}`),
    )

export const entitySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  type: z.enum(ENTITY_TYPES, { errorMap: () => ({ message: 'Choose a type' }) }),
  status: z.enum(ENTITY_STATUSES, { errorMap: () => ({ message: 'Choose a status' }) }),
  latitude: coord('Latitude', -90, 90),
  longitude: coord('Longitude', -180, 180),
  description: z.string().trim().max(500, 'Description must be at most 500 characters'),
})

export type EntityFormInput = z.input<typeof entitySchema>
export type EntityFormOutput = z.output<typeof entitySchema>
