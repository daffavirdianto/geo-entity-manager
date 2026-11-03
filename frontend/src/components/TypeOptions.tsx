import { TYPE_GROUPS, TYPE_LABEL } from '../types'

export default function TypeOptions() {
  return (
    <>
      {TYPE_GROUPS.map((g) =>
        g.types.length === 1 && g.category === 'other' ? (
          <option key={g.types[0]} value={g.types[0]}>
            {TYPE_LABEL[g.types[0]]}
          </option>
        ) : (
          <optgroup key={g.category} label={g.label}>
            {g.types.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </optgroup>
        ),
      )}
    </>
  )
}
