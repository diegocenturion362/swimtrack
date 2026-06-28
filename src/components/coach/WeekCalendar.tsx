import { todayISO, getWeekDays } from '../../utils/timeUtils'
import type { TrainingSession, Swimmer } from '../../types'

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function WeekCalendar({
  sessions,
  swimmers,
  onClickDay,
}: {
  sessions: TrainingSession[]
  swimmers: Swimmer[]
  onClickDay: (fecha: string) => void
}) {
  const today = todayISO()
  const days  = getWeekDays(today)

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((fecha, i) => {
        const daySessions  = sessions.filter(s => s.fecha === fecha)
        const real         = daySessions.filter(s => !s.esPlaneada)
        const planned      = daySessions.filter(s => s.esPlaneada)
        const isToday      = fecha === today
        const isFuture     = fecha > today

        return (
          <button
            key={fecha}
            onClick={() => onClickDay(fecha)}
            className={`flex flex-col items-center py-2 px-0.5 rounded-xl transition-all active:scale-95 ${
              isToday
                ? 'bg-blue-700 text-white'
                : isFuture
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
          >
            <span className="text-[9px] font-semibold uppercase">{DAY_LABELS[i]}</span>
            <span className={`text-xs font-bold mt-0.5 ${isToday ? 'text-white' : 'text-slate-700'}`}>
              {fecha.slice(-2)}
            </span>

            {/* Indicadores de sesiones */}
            <div className="flex flex-col gap-0.5 mt-1.5 w-full px-1 min-h-[12px]">
              {real.slice(0, 3).map((s, j) => {
                const sw = swimmers.find(w => w.id === s.swimmerId)
                return (
                  <div
                    key={j}
                    className={`w-full h-1 rounded-full ${isToday ? 'bg-white/80' : 'bg-blue-500'}`}
                    title={sw?.nombre}
                  />
                )
              })}
              {planned.slice(0, 2).map((s, j) => {
                const sw = swimmers.find(w => w.id === s.swimmerId)
                return (
                  <div
                    key={`p${j}`}
                    className={`w-full h-1 rounded-full border ${
                      isToday ? 'border-white/60 bg-transparent' : 'border-blue-300 bg-transparent'
                    }`}
                    title={`Plan: ${sw?.nombre}`}
                  />
                )
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}
