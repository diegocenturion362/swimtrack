import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

// ─── Wrapper ──────────────────────────────────────────────────────────────────

interface FieldProps {
  label:     string
  error?:    string
  hint?:     string
  required?: boolean
  children:  React.ReactNode
}

export function Field({ label, error, hint, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={[
        'w-full px-3 py-3 rounded-xl border border-slate-200',
        'bg-white text-slate-900 placeholder:text-slate-400',
        'text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:bg-slate-50 disabled:text-slate-400',
        className,
      ].join(' ')}
      {...props}
    />
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={[
        'w-full px-3 py-3 rounded-xl border border-slate-200',
        'bg-white text-slate-900',
        'text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'appearance-none',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </select>
  )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      rows={3}
      className={[
        'w-full px-3 py-3 rounded-xl border border-slate-200',
        'bg-white text-slate-900 placeholder:text-slate-400',
        'text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'resize-none',
        className,
      ].join(' ')}
      {...props}
    />
  )
}

// ─── RPE Slider ──────────────────────────────────────────────────────────────

interface RPESliderProps {
  value:    number
  onChange: (v: number) => void
}

const rpeColors = [
  '', 'bg-emerald-400', 'bg-emerald-500', 'bg-green-500',
  'bg-lime-500', 'bg-yellow-400', 'bg-orange-400',
  'bg-orange-500', 'bg-red-400', 'bg-red-500', 'bg-red-700',
]

const rpeLabels = [
  '', 'Muy fácil', 'Fácil', 'Moderado', 'Controlado', 'Medio',
  'Algo duro', 'Duro', 'Muy duro', 'Extremo', 'Máximo',
]

export function RPESlider({ value, onChange }: RPESliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={[
                'w-7 h-7 rounded-lg text-xs font-bold transition-all',
                n <= value
                  ? `${rpeColors[n]} text-white scale-100`
                  : 'bg-slate-100 text-slate-400',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      {value > 0 && (
        <p className="text-sm text-slate-600">
          <span className="font-semibold">{value}/10</span> — {rpeLabels[value]}
        </p>
      )}
    </div>
  )
}

// ─── Nutrition Slider ────────────────────────────────────────────────────────

const nutritionColors = [
  '', 'bg-red-500', 'bg-red-400', 'bg-orange-500',
  'bg-amber-400', 'bg-yellow-400', 'bg-lime-400',
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-emerald-600',
]

const nutritionLabels = [
  '', 'Muy mala', 'Mala', 'Baja', 'Regular',
  'Moderada', 'Aceptable', 'Buena', 'Muy buena', 'Excelente', 'Perfecta',
]

export function NutritionSlider({ value, onChange }: RPESliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={[
              'w-7 h-7 rounded-lg text-xs font-bold transition-all',
              n <= value
                ? `${nutritionColors[n]} text-white`
                : 'bg-slate-100 text-slate-400',
            ].join(' ')}
          >
            {n}
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-sm text-slate-600">
          <span className="font-semibold">{value}/10</span> — {nutritionLabels[value]}
        </p>
      )}
    </div>
  )
}

// ─── Pool Toggle ──────────────────────────────────────────────────────────────

interface PoolToggleProps {
  value:    '25m' | '50m'
  onChange: (v: '25m' | '50m') => void
}

export function PoolToggle({ value, onChange }: PoolToggleProps) {
  return (
    <div className="flex gap-2">
      {(['25m', '50m'] as const).map(size => (
        <button
          key={size}
          type="button"
          onClick={() => onChange(size)}
          className={[
            'flex-1 py-3 rounded-xl font-semibold text-sm transition-all',
            value === size
              ? 'bg-blue-700 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600',
          ].join(' ')}
        >
          Pileta {size}
        </button>
      ))}
    </div>
  )
}
