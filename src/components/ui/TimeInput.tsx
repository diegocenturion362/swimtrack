import { formatSmartTime } from '../../utils/timeUtils'

// Input de tiempo "inteligente": el usuario tipea solo números y aparecen
// los símbolos ' (minutos) y " (segundos/centésimas) solos. Cómodo en el celular.
//   2832 → 28"32   ·   12832 → 1'28"32   ·   012323 → 1'23"23
interface Props {
  value:       string
  onChange:    (v: string) => void
  placeholder?: string
  className?:  string
}

export function TimeInput({ value, onChange, placeholder, className = '' }: Props) {
  return (
    <input
      value={value}
      onChange={e => onChange(formatSmartTime(e.target.value))}
      inputMode="numeric"
      placeholder={placeholder}
      className={className}
    />
  )
}
