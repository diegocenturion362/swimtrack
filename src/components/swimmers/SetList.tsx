import type { TrainingSet } from '../../types'
import { strokeLabel, materialLabel } from '../../types'
import { formatRepTime } from '../../utils/timeUtils'

// Lista compacta de series de una sesión. Agrupa automáticamente las partes de
// un mismo "Trabajo" (mismo grupo) y las muestra como una sola entrada compuesta.
export function SetList({ sets, showKey = false }: { sets: TrainingSet[]; showKey?: boolean }) {
  if (sets.length === 0) return null

  // Agrupar por `grupo` preservando el orden de aparición
  const groups: TrainingSet[][] = []
  const groupMap = new Map<string, TrainingSet[]>()
  for (const s of sets) {
    const key = s.grupo ?? s.id
    if (!groupMap.has(key)) {
      const arr: TrainingSet[] = []
      groupMap.set(key, arr)
      groups.push(arr)
    }
    groupMap.get(key)!.push(s)
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((grupo, gi) => {
        const first = grupo[0]
        const series = (first.series ?? 1) > 1
        const esCompuesto = grupo.length > 1

        if (esCompuesto) {
          return <GrupoCompuesto key={gi} sets={grupo} showKey={showKey} />
        }

        // Parte simple (una sola entrada)
        const s = first
        const metros = (s.series ?? 1) * s.repeticiones * s.distancia
        const detalle: string[] = []

        const tipoInt = s.tipoIntervaloReps ?? 'salida'
        if (s.intervaloSalida) {
          detalle.push(
            tipoInt === 'fijo'
              ? `desc. ${s.intervaloSalida}${series ? ' (reps)' : ''}`
              : `salida @${s.intervaloSalida}${series ? ' (reps)' : ''}`
          )
        }
        if (s.descanso) detalle.push(`${s.descanso}${series ? ' entre series' : ' desc.'}`)
        if (s.materiales?.length) detalle.push(s.materiales.map(m => materialLabel[m]).join(', '))

        const grupos = (s.tiempos ?? [])
          .map(g => g.filter(t => t > 0))
          .filter(g => g.length > 0)

        return (
          <div key={gi} className="py-1.5 border-b border-slate-50 last:border-0">
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

// ─── Grupo compuesto: varias partes bajo el mismo trabajo ───────────────────

function GrupoCompuesto({ sets, showKey }: { sets: TrainingSet[]; showKey: boolean }) {
  const first = sets[0]
  const numSeries = first.series ?? 1
  const hasSeries = numSeries > 1
  const totalMetros = sets.reduce((a, s) => a + (s.series ?? 1) * s.repeticiones * s.distancia, 0)
  const descSeries = first.descanso

  const parteLabel = (s: TrainingSet) =>
    `${s.repeticiones}×${s.distancia}m ${strokeLabel[s.estilo]}`

  const parteDetalle = (s: TrainingSet) => {
    const tipoInt = s.tipoIntervaloReps ?? 'salida'
    if (!s.intervaloSalida) return ''
    return tipoInt === 'fijo'
      ? `desc. ${s.intervaloSalida}`
      : `@${s.intervaloSalida}`
  }

  return (
    <div className="py-1.5 border-b border-slate-50 last:border-0">
      {/* Encabezado del grupo */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-700">
            {hasSeries && <span className="text-amber-600">{numSeries} series × </span>}
            <span className="text-slate-500">(</span>
            {sets.map((s, i) => (
              <span key={s.id}>
                {i > 0 && <span className="text-slate-400"> + </span>}
                <span className="text-slate-700">{parteLabel(s)}</span>
              </span>
            ))}
            <span className="text-slate-500">)</span>
          </p>

          {/* Detalle de cada parte */}
          <div className="mt-0.5 flex flex-col gap-0.5">
            {sets.map(s => {
              const det = parteDetalle(s)
              const mats = s.materiales?.length ? s.materiales.map(m => materialLabel[m]).join(', ') : ''
              const info = [det, mats].filter(Boolean).join(' · ')
              return info ? (
                <p key={s.id} className="text-[10px] text-slate-400">
                  <span className="font-medium text-slate-500">{parteLabel(s)}:</span> {info}
                </p>
              ) : null
            })}
            {descSeries && (
              <p className="text-[10px] text-slate-400">{descSeries} entre series</p>
            )}
          </div>

          {showKey && (
            <p className="text-[10px] font-mono text-slate-300 truncate">{first.claveSimilitud}</p>
          )}
        </div>
        <div className="text-right shrink-0 ml-2">
          <p className="text-xs font-bold text-slate-500">{totalMetros} m</p>
        </div>
      </div>
    </div>
  )
}
