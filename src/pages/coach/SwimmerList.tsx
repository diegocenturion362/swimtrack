import { useState } from 'react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { SwimmerCard } from '../../components/swimmers/SwimmerCard'
import { useStore } from '../../store/useStore'
import { detectSwimmerStatus } from '../../utils/swimmerStatus'
import type { SwimmerStatus } from '../../types'

const statusOrder: SwimmerStatus[] = ['Sobrecarga', 'Estancado', 'En progreso', 'Estable', 'Sin datos']

const filterOptions: { label: string; value: SwimmerStatus | 'todos' }[] = [
  { label: 'Todos',       value: 'todos'       },
  { label: 'En progreso', value: 'En progreso' },
  { label: 'Estancado',   value: 'Estancado'   },
  { label: 'Sobrecarga',  value: 'Sobrecarga'  },
  { label: 'Estable',     value: 'Estable'     },
]

export function SwimmerList() {
  const [filter, setFilter] = useState<SwimmerStatus | 'todos'>('todos')
  const { swimmers, sessions, sets } = useStore(s => ({
    swimmers: s.swimmers,
    sessions: s.sessions,
    sets:     s.sets,
  }))

  const summaries = swimmers
    .map(sw => {
      const swSessions = sessions.filter(s => s.swimmerId === sw.id)
      const swSets     = sets.filter(s => s.swimmerId === sw.id)
      const status     = detectSwimmerStatus(sw, swSessions, swSets)
      const lastSes    = swSessions.sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null
      return { swimmer: sw, status, lastSes }
    })
    .filter(s => filter === 'todos' || s.status === filter)
    .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status))

  return (
    <>
      <Header title="Nadadores" subtitle={`${swimmers.length} activos`} showBack backTo="/coach" />
      <PageLayout>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1 no-scrollbar">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={[
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                filter === opt.value
                  ? 'bg-blue-700 text-white'
                  : 'bg-white text-slate-600 border border-slate-200',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {summaries.map(({ swimmer, status, lastSes }) => (
            <SwimmerCard
              key={swimmer.id}
              swimmer={swimmer}
              status={status}
              lastSession={lastSes}
              linkTo={`/coach/nadadores/${swimmer.id}`}
            />
          ))}

          {summaries.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              No hay nadadores con ese estado
            </div>
          )}
        </div>

      </PageLayout>
    </>
  )
}
