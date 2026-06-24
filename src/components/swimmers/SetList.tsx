import type { TrainingSet } from '../../types'
import { strokeLabel, materialLabel } from '../../types'
import { formatRepTime } from '../../utils/timeUtils'

// Lista compacta de series de una sesión. Muestra bien las series compuestas
// (5 series × 6×7m), los descansos, el material, el promedio y TODOS los tiempos.
export function SetList({ sets, showKey = false }: { sets: TrainingSet[]; showKey?: boolean }) {
  if (sets.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {sets.map(s => {
        const series  = (s.series ?? 1) > 1
        const metros  = (s.series ?? 1) * s.repeticiones * s.distancia

        const detalle: string[] = []
        if (s.intervaloSalida) detalle.push(`salida @${s.intervaloSalida}${series ? ' (reps)' : ''}`)
        if (s.descanso)        detalle.push(`${s.descanso}${series ? ' entre series' : ' desc.'}`)
        if (s.materiales && s.materiales.length) detalle.push(s.materiales.map(m => materialLabel[m]).join(', '))

        // Grupos de tiempos con al menos un valor > 0
        const grupos = (s.tiempos ?? [])
          .map(g => g.filter(t => t > 0))
          .filter(g => g.length > 0)

        return (
          <div key={s.id} className="py-1.5 border-b border-slate-50 last:border-0">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">
                  {series && <span className="text-amber-600">{s.series} series × </span>}
                  {s.repeticiones}×{s.distancia}m{' '}
                  <span className="text-slate-400 font-normal">{strokeLabel[s.estilo]}</span>
                </p>
                {detalle.length > 0 && (
                  <p className="text-[10px] text-slate-400">{detalle.join(' · ')}</p>
                )}
                {showKey && <p className="text-[10px] font-mono text-slate-300 truncate">{s.claveSimilitud}</p>}
              </div>
              <div className="text-right shrink-0 ml-2">
                {s.tiempoPromedio > 0
                  ? <p className="text-xs font-bold text-blue-700">{formatRepTime(s.tiempoPromedio)} prom.</p>
                  : <p className="text-xs font-bold text-slate-500">{metros} m</p>}
                {s.tiempoPromedio > 0 && s.mejorTiempo > 0 && (
                  <p className="text-[10px] text-slate-400">
                    mejor {formatRepTime(s.mejorTiempo)} · peor {formatRepTime(s.peorTiempo)}
                  </p>
                )}
              </div>
            </div>

            {/* Todos los tiempos realizados */}
            {grupos.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-0.5">
                {grupos.map((g, i) => (
                  <div key={i} className="flex items-baseline gap-1.5 flex-wrap">
                    {grupos.length > 1 && (
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">S{i + 1}</span>
                    )}
                    {g.map((t, j) => (
                      <span key={j} className="text-[11px] font-mono font-semibold text-slate-600 tabular-nums">
                        {formatRepTime(t)}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
