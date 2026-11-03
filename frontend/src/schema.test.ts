import { describe, expect, it } from 'vitest'
import { entitySchema } from './schema'
import { ENTITY_TYPES, TYPE_CATEGORY, TYPE_LABEL } from './types'

const ok = { name: 'Truck', type: 'truck', status: 'active', latitude: '-6.2', longitude: '106.8', description: '' }

describe('type metadata', () => {
  it('has a label and category for every type', () => {
    for (const t of ENTITY_TYPES) {
      expect(TYPE_LABEL[t]).toBeTruthy()
      expect(TYPE_CATEGORY[t]).toBeTruthy()
    }
  })
})

describe('entitySchema', () => {
  it('accepts valid input and converts coordinates to numbers', () => {
    const r = entitySchema.safeParse(ok)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.latitude).toBe(-6.2)
  })
  it('accepts every real-world type', () => {
    for (const t of ENTITY_TYPES) expect(entitySchema.safeParse({ ...ok, type: t }).success).toBe(true)
  })
  it('accepts zero and boundary coordinates', () => {
    expect(entitySchema.safeParse({ ...ok, latitude: '0', longitude: '0' }).success).toBe(true)
    expect(entitySchema.safeParse({ ...ok, latitude: '90', longitude: '-180' }).success).toBe(true)
  })
  it.each([
    ['empty name', { name: '  ' }, 'name'],
    ['long name', { name: 'a'.repeat(101) }, 'name'],
    ['bad type', { type: 'boat' }, 'type'],
    ['lat > 90', { latitude: '91' }, 'latitude'],
    ['lng < -180', { longitude: '-181' }, 'longitude'],
    ['empty lat', { latitude: '' }, 'latitude'],
    ['non-numeric lng', { longitude: 'abc' }, 'longitude'],
    ['long description', { description: 'a'.repeat(501) }, 'description'],
  ])('rejects %s', (_n, patch, field) => {
    const r = entitySchema.safeParse({ ...ok, ...patch })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === field)).toBe(true)
  })
})
