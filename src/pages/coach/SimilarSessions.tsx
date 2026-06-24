import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { Field, Select } from '../../components/ui/FormField'
import { useStore } from '../../store/useStore'
import { getSimilarGroups } from '../../utils/similarity'
import { formatTime, formatDate, deltaLabel } from '../../utils/timeUtils'
import type { SimilarSetComparison } from '../../types'

const feelingEmoji: Record<string, string> = {
  'muy buena': '😊', 'buena': '🙂', 'regular': '😐', 'mala': '😔'
}

export function SimilarSessions() {
  const [params]      = useSearchParams()
  const { swimmers, sessions, sets } = useStore(s => ({
    swimmers: s.swimmers,
    sessions: s.sessions,
    sets:     s.sets,
  }))

  const [swimmerId, setSwimmerId] = useState(params.get('swimmerId') ?? swimmers[0]?.id ?? '')
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const swimmer = swimmers.find(s => s.id === swimmerId)

  const groups: SimilarSetComparison[] = useMemo(() => {
    const swSessions = sessions.filter(s => s.swimmerId === swimmerId)
    return getSimilarGroups(swimmerId, sets, swSessions)
  }, [swimmerId, sessions, sets])

  // Seleccionar el primer grupo por defecto
  const activeKey = selectedKey || groups[0]?.claveSimilitud || ''
  const activeGroup = groups.find(g => g.claveSimilitud === activeKey)

  return (
    <>
      <Header title="Series similares" subtitle="Comparar evolución" showBack backTo="/coach" />
      <PageLayout>

        <p className="text-xs text-slate-500 mb-4">
          Seleccioná un nadador y una serie para ver cómo evolucionaron sus tiempos a lo largo de la temporada.
        </p>

        {/* Selector de nadador */}
        <Field label="Nadador">
          <Select value={swimmerId} onChange={e => { setSwimmerId(e.target.value); setSelectedKey('') }}>
            {swimmers.map(sw => (
              <option key={sw.id} value={sw.id}>{sw.nombre}</option>
            ))}
          </Select>
        </Field>

        {groups.length === 0 ? (
          <Card className="mt-4 text-center">
            <p className="text-slate-400 text-sm py-4">
              No hay series repetidas para comparar. Se necesitan al menos 2 apariciones de la misma serie.
            </p>
          </Card>
        ) : (
          <>
            {/* Selector de clave */}
            <div className="mt-4 mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Series disponibles ({groups.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {groups.map(g => (
                  <button
                    key={g.claveSimilitud}
                    onClick={() => setSelectedKey(g.claveSimilitud)}
                    className={[
                      'text-left px-3 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all',
                      activeKey === g.claveSimilitud
                        ? 'bg-blue-700 text-white'
                        : 'bg-white border border-slate-200 text-slate-600',
                    ].join(' ')}
                  >
                    <span>{g.claveSimilitud}</span>
                    <span className={`ml-2 text-[10px] ${activeKey === g.claveSimilitud ? 'text-blue-200' : 'text-slate-400'}`}>
                      ({g.entries.length} registros)
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Análisis del grupo seleccionado */}
            {activeGroup && (
              <div className="fade-in">
                {/* Mensaje de análisis */}
                {activeGroup.delta && (
                  <DeltaSummaryCard group={activeGroup} />
                )}

                {/* Tabla de registros */}
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 mt-5">
                  Historial de esta serie
                </p>
                <div className="flex flex-col gap-3">
                  {[...activeGroup.entries].reverse().map((entry, i) => {
                    const isLast = i === 0
                    const prev = [...activeGroup.entries].reverse()[i + 1]
                    const delta = prev
                      ? prev.set.tiempoPromedio - entry.set.tiempoPromedio
                      : null

                    return (
                      <Card key={entry.set.id} padding="sm" className={isLast ? 'border-blue-200 bg-blue-50/30' : ''}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-xs text-slate-400">{formatDate(entry.session.fecha)}</p>
                              {isLast && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded font-semibold">
                                  Último
                                </span>
                              )}
                            </div>
                            <p className="text-xl font-black text-slate-900">
                              {formatTime(entry.set.tiempoPromedio)}
                              <span className="text-xs text-slate-400 font-normal ml-1">promedio</span>
                            </p>
                            <p className="text-xs text-slate-500">
                              Mejor: {formatTime(entry.set.mejorTiempo)} ·
                              Peor: {formatTime(entry.set.peorTiempo)}
                            </p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <div className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                              entry.session.rpe >= 8 ? 'bg-red-100 text-red-700' :
                              entry.session.rpe >= 6 ? 'bg-amber-100 text-amber-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              RPE {entry.session.rpe}
                            </div>
                            <span className="text-base">{feelingEmoji[entry.session.sensacionGeneral]}</span>
                            {delta !== null && <DeltaIndicator delta={delta} />}
                          </div>
                        </div>

                        {/* Expandible: observación */}
                        {entry.set.observacionTecnica && (
                          <div
                            className="mt-2 cursor-pointer"
                            onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                          >
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              {expandedIdx === i ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              <span>Observación técnica</span>
                            </div>
                            {expandedIdx === i && (
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                {entry.set.observacionTecnica}
                              </p>
                            )}
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

      </PageLayout>
    </>
  )
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function DeltaSummaryCard({ group }: { group: SimilarSetComparison }) {
  const { delta } = group
  if (!delta) return null

  const improved = delta.tiempoPromedio > 0
  const neutral  = Math.abs(delta.tiempoPromedio) < 0.2

  return (
    <Card className={`border-l-4 ${
      neutral  ? 'border-l-slate-300' :
      improved ? 'border-l-emerald-400' :
                 'border-l-amber-400'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        {neutral ? (
          <Minus size={18} className="text-slate-400" />
        ) : improved ? (
          <TrendingUp size={18} className="text-emerald-600" />
        ) : (
          <TrendingDown size={18} className="text-amber-600" />
        )}
        <p className="text-sm font-bold text-slate-800">
          {neutral ? 'Sin cambio apreciable' :
           improved ? `Mejora de ${delta.tiempoPromedio.toFixed(1)}s` :
                      `Retroceso de ${Math.abs(delta.tiempoPromedio).toFixed(1)}s`}
        </p>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">{delta.mensaje}</p>
      {!neutral && (
        <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
          <div className="text-center">
            <p className="text-xs text-slate-400">Promedio</p>
            <p className={`text-sm font-bold ${improved ? 'text-emerald-600' : 'text-amber-600'}`}>
              {improved ? '−' : '+'}{Math.abs(delta.tiempoPromedio).toFixed(1)}s
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Mejor tiempo</p>
            <p className={`text-sm font-bold ${delta.mejorTiempo > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {delta.mejorTiempo > 0 ? '−' : '+'}{Math.abs(delta.mejorTiempo).toFixed(1)}s
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">RPE</p>
            <p className="text-sm font-bold text-slate-700">
              {delta.rpe === 0 ? '=' : delta.rpe > 0 ? `+${delta.rpe}` : delta.rpe}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">% mejora</p>
            <p className={`text-sm font-bold ${delta.porcentajeMejora > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {delta.porcentajeMejora > 0 ? '+' : ''}{delta.porcentajeMejora.toFixed(2)}%
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}

function DeltaIndicator({ delta }: { delta: number }) {
  const { text, positive } = deltaLabel(delta)
  return (
    <span className={`text-xs font-bold flex items-center gap-0.5 ${positive ? 'text-emerald-600' : 'text-amber-600'}`}>
      {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {text}
    </span>
  )
}
