import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { TimeLineChart } from '../../components/charts/TimeLineChart'
import { VolumeBarChart } from '../../components/charts/VolumeBarChart'
import { RPEChart } from '../../components/charts/RPEChart'
import { useStore } from '../../store/useStore'
import { weeklyVolume } from '../../utils/swimmerStatus'
import { formatTime } from '../../utils/timeUtils'
import { getSimilarGroups } from '../../utils/similarity'
import type { PoolSize } from '../../types'

export function MyEvolution() {
  const { id } = useParams<{ id: string }>()
  const { swimmers, sessions, sets, competitions } = useStore(s => ({
    swimmers:     s.swimmers,
    sessions:     s.sessions,
    sets:         s.sets,
    competitions: s.competitions,
  }))

  // Todos los hooks antes del early return para no violar las reglas de React
  const [pruebaSeleccionada, setPruebaSeleccionada] = useState('')
  const [piletaSeleccionada, setPiletaSeleccionada] = useState<PoolSize | ''>('')

  const swimmer = swimmers.find(s => s.id === id)

  const swSessions = useMemo(
    () => sessions.filter(s => s.swimmerId === id).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [sessions, id]
  )

  const misComps = useMemo(
    () => competitions.filter(c => c.swimmerId === id),
    [competitions, id]
  )

  const todasPruebas = useMemo(
    () => Array.from(new Set(misComps.map(c => c.prueba))).sort(),
    [misComps]
  )

  const pruebaEfectiva = pruebaSeleccionada || swimmer?.pruebaPrincipal || ''

  // Piletas disponibles para la prueba seleccionada
  const piletasDisponibles = useMemo(
    () => Array.from(new Set(
      misComps.filter(c => c.prueba === pruebaEfectiva).map(c => c.pileta)
    )).sort() as PoolSize[],
    [misComps, pruebaEfectiva]
  )

  // Si la pileta seleccionada no existe en esta prueba, usar la primera disponible
  const piletaEfectiva: PoolSize | '' = (piletaSeleccionada && piletasDisponibles.includes(piletaSeleccionada))
    ? piletaSeleccionada
    : piletasDisponibles[0] ?? ''

  const swComps = useMemo(
    () => misComps
      .filter(c => c.prueba === pruebaEfectiva && (!piletaEfectiva || c.pileta === piletaEfectiva))
      .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [misComps, pruebaEfectiva, piletaEfectiva]
  )

  const groups = useMemo(
    () => id ? getSimilarGroups(id, sets, swSessions) : [],
    [id, sets, swSessions]
  )

  if (!swimmer) return <div className="p-8 text-center text-slate-400">No encontrado</div>

  const esPrincipal = pruebaEfectiva === swimmer.pruebaPrincipal
  const compChartData = swComps.map(c => ({ fecha: c.fecha, tiempo: c.tiempoFinal }))
  const volData  = weeklyVolume(swSessions)
  const rpeData  = swSessions.map(s => ({ fecha: s.fecha, rpe: s.rpe }))
  const topGroup = groups[0]

  return (
    <>
      <Header title="Mi evolución" subtitle={pruebaEfectiva || 'Sin prueba'} showBack />
      <PageLayout>

        {/* ── Selector de prueba (chips horizontales) ───────────────────────── */}
        {todasPruebas.length > 0 && (
          <div className="overflow-x-auto -mx-4 px-4 pb-1 mb-3">
            <div className="flex gap-2 w-max">
              {todasPruebas.map(p => (
                <button
                  key={p}
                  onClick={() => { setPruebaSeleccionada(p); setPiletaSeleccionada('') }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    p === pruebaEfectiva
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Selector de pileta ────────────────────────────────────────────── */}
        {piletasDisponibles.length > 0 && (
          <div className="flex gap-2 mb-4">
            {piletasDisponibles.map(p => (
              <button
                key={p}
                onClick={() => setPiletaSeleccionada(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  p === piletaEfectiva
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                🏊 Pileta {p}
              </button>
            ))}
          </div>
        )}

        {/* ── Evolución en competencia ──────────────────────────────────────── */}
        <Card className="mb-4 fade-in">
          <p className="text-sm font-bold text-slate-800 mb-0.5">
            {pruebaEfectiva}{piletaEfectiva ? ` · Pileta ${piletaEfectiva}` : ''} — Competencias
          </p>
          <p className="text-xs text-slate-400 mb-3">El eje Y está invertido: más arriba = mejor tiempo</p>
          {compChartData.length >= 2 ? (
            <TimeLineChart
              data={compChartData}
              objetivo={esPrincipal ? swimmer.marcaObjetivo : undefined}
            />
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">
              {swComps.length === 0
                ? 'Sin competencias cargadas para esta prueba'
                : 'Se necesitan al menos 2 competencias para mostrar la evolución'}
            </p>
          )}
          {swComps.length >= 2 && (
            <div className="flex justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span>Inicio: {formatTime(swComps[0].tiempoFinal)}</span>
              <span className={
                swComps[0].tiempoFinal > swComps[swComps.length - 1].tiempoFinal
                  ? 'text-emerald-600 font-bold'
                  : 'text-amber-600 font-bold'
              }>
                Ahora: {formatTime(swComps[swComps.length - 1].tiempoFinal)}
              </span>
              {esPrincipal
                ? <span>Obj: {formatTime(swimmer.marcaObjetivo)}</span>
                : <span>{swComps.length} carreras</span>}
            </div>
          )}
        </Card>

        {/* ── Volumen semanal ───────────────────────────────────────────────── */}
        <Card className="mb-4">
          <p className="text-sm font-bold text-slate-800 mb-3">Volumen semanal</p>
          <VolumeBarChart data={volData.slice(-10)} />
        </Card>

        {/* ── RPE ──────────────────────────────────────────────────────────── */}
        <Card className="mb-4">
          <p className="text-sm font-bold text-slate-800 mb-0.5">Esfuerzo percibido (RPE)</p>
          <p className="text-xs text-slate-400 mb-3">La línea roja marca el umbral de carga alta (RPE 8)</p>
          <RPEChart data={rpeData.slice(-12)} />
        </Card>

        {/* ── Serie más repetida ────────────────────────────────────────────── */}
        {topGroup && (
          <Card>
            <p className="text-sm font-bold text-slate-800 mb-1">Serie más repetida</p>
            <p className="text-xs font-mono text-blue-700 mb-3">{topGroup.claveSimilitud}</p>
            <TimeLineChart
              data={topGroup.entries.map(e => ({ fecha: e.session.fecha, tiempo: e.set.tiempoPromedio }))}
              color="#7c3aed"
              height={150}
            />
            {topGroup.delta && (
              <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 leading-relaxed">
                {topGroup.delta.mensaje}
              </p>
            )}
          </Card>
        )}

      </PageLayout>
    </>
  )
}
