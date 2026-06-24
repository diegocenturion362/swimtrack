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
import { useMemo } from 'react'

export function MyEvolution() {
  const { id }  = useParams<{ id: string }>()
  const { swimmers, sessions, sets, competitions } = useStore(s => ({
    swimmers:     s.swimmers,
    sessions:     s.sessions,
    sets:         s.sets,
    competitions: s.competitions,
  }))

  const swimmer = swimmers.find(s => s.id === id)
  if (!swimmer) return <div className="p-8 text-center text-slate-400">No encontrado</div>

  const swSessions = sessions.filter(s => s.swimmerId === id).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const swComps    = competitions
    .filter(c => c.swimmerId === id && c.prueba === swimmer.pruebaPrincipal)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Datos para gráfico de competencias
  const compChartData = swComps.map(c => ({ fecha: c.fecha, tiempo: c.tiempoFinal }))

  // Volumen semanal
  const volData = weeklyVolume(swSessions)

  // RPE por sesión
  const rpeData = swSessions.map(s => ({ fecha: s.fecha, rpe: s.rpe }))

  // Series similares (top 1)
  const groups = useMemo(() =>
    getSimilarGroups(id!, sets, swSessions),
    [id, sets, swSessions]
  )
  const topGroup = groups[0]

  return (
    <>
      <Header title="Mi evolución" subtitle={swimmer.pruebaPrincipal} showBack />
      <PageLayout>

        {/* Evolución en competencia */}
        <Card className="mb-4 fade-in">
          <p className="text-sm font-bold text-slate-800 mb-0.5">
            {swimmer.pruebaPrincipal} — Competencias
          </p>
          <p className="text-xs text-slate-400 mb-3">El eje Y está invertido: más arriba = mejor tiempo</p>
          {compChartData.length >= 2 ? (
            <TimeLineChart data={compChartData} objetivo={swimmer.marcaObjetivo} />
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">
              Se necesitan al menos 2 competencias para mostrar la evolución
            </p>
          )}
          {swComps.length >= 2 && (
            <div className="flex justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span>Inicio: {formatTime(swComps[0].tiempoFinal)}</span>
              <span className={swComps[0].tiempoFinal > swComps[swComps.length - 1].tiempoFinal
                ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                Ahora: {formatTime(swComps[swComps.length - 1].tiempoFinal)}
              </span>
              <span>Obj: {formatTime(swimmer.marcaObjetivo)}</span>
            </div>
          )}
        </Card>

        {/* Volumen semanal */}
        <Card className="mb-4">
          <p className="text-sm font-bold text-slate-800 mb-3">Volumen semanal</p>
          <VolumeBarChart data={volData.slice(-10)} />
        </Card>

        {/* RPE */}
        <Card className="mb-4">
          <p className="text-sm font-bold text-slate-800 mb-0.5">Esfuerzo percibido (RPE)</p>
          <p className="text-xs text-slate-400 mb-3">La línea roja marca el umbral de carga alta (RPE 8)</p>
          <RPEChart data={rpeData.slice(-12)} />
        </Card>

        {/* Serie similar más repetida */}
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
