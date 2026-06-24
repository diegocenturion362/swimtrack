import { MATERIALS, materialLabel } from '../../types'
import type { Material } from '../../types'

// Selección múltiple de materiales (se pueden tildar varios juntos).
export function MaterialPicker({ value, onChange }: {
  value: Material[]
  onChange: (v: Material[]) => void
}) {
  const toggle = (m: Material) =>
    onChange(value.includes(m) ? value.filter(x => x !== m) : [...value, m])

  return (
    <div className="flex flex-wrap gap-1.5">
      {MATERIALS.map(m => {
        const on = value.includes(m)
        return (
          <button
            key={m}
            type="button"
            onClick={() => toggle(m)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              on ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {on ? '✓ ' : ''}{materialLabel[m]}
          </button>
        )
      })}
    </div>
  )
}
