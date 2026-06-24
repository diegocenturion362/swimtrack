import type { SwimmerStatus, AlertLevel } from '../../types'

// ─── Status Badge ─────────────────────────────────────────────────────────────

const statusStyles: Record<SwimmerStatus, string> = {
  'En progreso': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Estable':     'bg-blue-100 text-blue-800 border-blue-200',
  'Estancado':   'bg-amber-100 text-amber-800 border-amber-200',
  'Sobrecarga':  'bg-red-100 text-red-800 border-red-200',
  'Sin datos':   'bg-slate-100 text-slate-600 border-slate-200',
}

const statusDots: Record<SwimmerStatus, string> = {
  'En progreso': 'bg-emerald-500',
  'Estable':     'bg-blue-500',
  'Estancado':   'bg-amber-500',
  'Sobrecarga':  'bg-red-500',
  'Sin datos':   'bg-slate-400',
}

export function StatusBadge({ status }: { status: SwimmerStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${statusDots[status]}`} />
      {status}
    </span>
  )
}

// ─── Alert Level Badge ────────────────────────────────────────────────────────

const levelStyles: Record<AlertLevel, string> = {
  success: 'bg-emerald-100 text-emerald-800',
  info:    'bg-blue-100 text-blue-800',
  warning: 'bg-amber-100 text-amber-800',
  danger:  'bg-red-100 text-red-800',
}

export function AlertBadge({ level, text }: { level: AlertLevel; text: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${levelStyles[level]}`}>
      {text}
    </span>
  )
}

// ─── Generic tag badge ────────────────────────────────────────────────────────

interface TagProps {
  children: React.ReactNode
  color?: 'blue' | 'slate' | 'gold' | 'green' | 'red'
}

const tagColors: Record<string, string> = {
  blue:  'bg-blue-50 text-blue-700',
  slate: 'bg-slate-100 text-slate-600',
  gold:  'bg-yellow-50 text-yellow-700',
  green: 'bg-emerald-50 text-emerald-700',
  red:   'bg-red-50 text-red-700',
}

export function Tag({ children, color = 'slate' }: TagProps) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${tagColors[color]}`}>
      {children}
    </span>
  )
}
