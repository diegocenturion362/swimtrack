import { AlertTriangle, CheckCircle2, Info, TrendingDown } from 'lucide-react'
import type { Alert } from '../../types'

const levelConfig = {
  success: {
    bg:     'bg-emerald-50 border-emerald-200',
    icon:   <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />,
    title:  'text-emerald-800',
  },
  info: {
    bg:     'bg-blue-50 border-blue-200',
    icon:   <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />,
    title:  'text-blue-800',
  },
  warning: {
    bg:     'bg-amber-50 border-amber-200',
    icon:   <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />,
    title:  'text-amber-800',
  },
  danger: {
    bg:     'bg-red-50 border-red-200',
    icon:   <TrendingDown size={16} className="text-red-600 shrink-0 mt-0.5" />,
    title:  'text-red-800',
  },
}

export function AlertCard({ alert }: { alert: Alert }) {
  const cfg = levelConfig[alert.nivel]
  return (
    <div className={`flex gap-2.5 p-3 rounded-xl border ${cfg.bg}`}>
      {cfg.icon}
      <p className={`text-xs leading-relaxed ${cfg.title}`}>{alert.mensaje}</p>
    </div>
  )
}
