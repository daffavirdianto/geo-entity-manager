import { useEffect, useRef } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { entitySchema, type EntityFormInput, type EntityFormOutput } from '../schema'
import { ApiError } from '../api'
import { useCreateEntity, useUpdateEntity } from '../useEntities'
import { ENTITY_STATUSES, STATUS_LABEL, type Coords, type Entity } from '../types'
import TypeOptions from './TypeOptions'

interface Props {
  entity?: Entity
  pick: Coords | null
  onDraftChange: (c: Coords | null) => void
  onCancel: () => void
  onDirtyChange: (dirty: boolean) => void
  onSaved: (e: Entity, created: boolean) => void
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9

export default function EntityForm({ entity, pick, onDraftChange, onCancel, onDirtyChange, onSaved }: Props) {
  const create = useCreateEntity()
  const update = useUpdateEntity()
  const pending = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitted, isDirty },
  } = useForm<EntityFormInput, unknown, EntityFormOutput>({
    // The schema transforms coordinate strings to numbers, so input and output types differ.
    resolver: zodResolver(entitySchema) as unknown as Resolver<EntityFormInput, unknown, EntityFormOutput>,
    mode: 'onTouched',
    defaultValues: entity
      ? {
          name: entity.name,
          type: entity.type,
          status: entity.status,
          latitude: String(entity.latitude),
          longitude: String(entity.longitude),
          description: entity.description,
        }
      : { name: '', type: 'truck', status: 'active', latitude: '', longitude: '', description: '' },
  })

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange])

  // Map -> form: a click or drag on the map fills the coordinate fields.
  useEffect(() => {
    if (!pick) return
    setValue('latitude', String(pick.lat), { shouldValidate: true, shouldDirty: true })
    setValue('longitude', String(pick.lng), { shouldValidate: true, shouldDirty: true })
  }, [pick, setValue])

  // Form -> map: typed coordinates move the draft marker when they are valid.
  const latStr = watch('latitude')
  const lngStr = watch('longitude')
  const pickRef = useRef(pick)
  pickRef.current = pick
  useEffect(() => {
    if (!latStr.trim() || !lngStr.trim()) return
    const lat = Number(latStr)
    const lng = Number(lngStr)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return
    const p = pickRef.current
    if (p && near(p.lat, lat) && near(p.lng, lng)) return
    onDraftChange({ lat, lng })
  }, [latStr, lngStr, onDraftChange])

  const submit = handleSubmit(async (values) => {
    try {
      const saved = entity
        ? await update.mutateAsync({ id: entity.id, input: values })
        : await create.mutateAsync(values)
      onSaved(saved, !entity)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) {
        // Server-side validation: show each message next to its field.
        for (const [field, message] of Object.entries(err.fields)) {
          setError(field as keyof EntityFormInput, { type: 'server', message: `${capitalize(field)} ${message}` })
        }
      } else {
        setError('root', { type: 'server', message: err instanceof Error ? err.message : 'Could not save' })
      }
    }
  })

  const descLen = watch('description')?.length ?? 0

  return (
    <section className="panel" aria-label={entity ? 'Edit entity' : 'Add entity'}>
      <header className="panel__head">
        <h2>{entity ? 'Edit entity' : 'Add entity'}</h2>
        <button className="icon-btn" onClick={onCancel} aria-label="Cancel" type="button">
          ×
        </button>
      </header>

      <form onSubmit={submit} noValidate className="form">
        <Field label="Name" error={errors.name?.message}>
          <input {...register('name')} maxLength={200} autoFocus={!entity} aria-invalid={!!errors.name} />
        </Field>

        <div className="form__row">
          <Field label="Type" error={errors.type?.message}>
            <select {...register('type')}>
              <TypeOptions />
            </select>
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <select {...register('status')}>
              {ENTITY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <fieldset className="coords">
          <legend>Position</legend>
          <p className="hint">Click the map or drag the marker to set the position, or type coordinates.</p>
          <div className="form__row">
            <Field label="Latitude" error={errors.latitude?.message}>
              <input {...register('latitude')} inputMode="decimal" placeholder="-6.2" aria-invalid={!!errors.latitude} />
            </Field>
            <Field label="Longitude" error={errors.longitude?.message}>
              <input {...register('longitude')} inputMode="decimal" placeholder="106.82" aria-invalid={!!errors.longitude} />
            </Field>
          </div>
        </fieldset>

        <Field label="Description" error={errors.description?.message} hint={`${descLen}/500`}>
          <textarea {...register('description')} rows={3} />
        </Field>

        {errors.root && (
          <p className="form__error" role="alert">
            {errors.root.message}
          </p>
        )}
        {isSubmitted && Object.keys(errors).filter((k) => k !== 'root').length > 0 && !errors.root && (
          <p className="form__error" role="alert">
            Fix the highlighted fields to continue.
          </p>
        )}

        <div className="panel__actions">
          <button className="btn btn--primary" type="submit" disabled={pending}>
            {pending ? 'Saving…' : entity ? 'Save changes' : 'Add entity'}
          </button>
          <button className="btn" type="button" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label className="field__wrap">
        <span className="field__label">
          {label}
          {hint && <span className="field__hint">{hint}</span>}
        </span>
        {children}
      </label>
      {error && <span className="field__error">{error}</span>}
    </div>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
