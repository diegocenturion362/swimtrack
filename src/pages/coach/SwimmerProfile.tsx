import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PlusCircle, Trophy, Activity, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge, Tag } from '../../components/ui/Badge'
import { AlertCard } from '../../components/swimmers/AlertCard'
import { SetList } from '../../components/swimmers/SetList'
import { EditObjective } from '../../components/swimmers/EditObjective'
import { TimeLineChart } from '../../components/charts/TimeLineChart'
import { useStore } from '../../store/useStore'
import { detectSwimmerStatus, computeAlerts } from '../../utils/swimmerStatus'
import { formatTime, formatDate, relativeDate, calcularEdad } from '../../utils/timeUtils'

const feelingEmoji: Record<string, string> = {
  'muy buena': '😊',
  'buena':     '🙂',
  'regular':   '😐',
  'mala':      '😔',
}

const typeColor: Record<string, string> = {
  'aeróbico':       'blue',
  'velocidad':      'red',
  'técnica':        'green',
  'recuperación':   'slate',
  'ritmo de prueba':'gold',
  'lactato':        'red',
  'mixto':          'slate',
}

export function SwimmerProfile() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const {
    swimmers, sessions, sets, competitions, personalBests
  } = useStore(s => ({
    swimmers:      s.swimmers,
    sessions:      s.sessions,
    sets:          s.sets,
    competitions:  s.competitions,
    personalBests: s.personalBests,
  }))

  const swimmer = swimmers.find(s => s.id === id)
  if (!swimmer) return <div className="p-8 text-center text-slate-400">Nadador no encontrado</div>

  const swSessions     = sessions.filter(s => s.swimmerId === id).sort((a, b) => b.fecha.localeCompare(a.fecha))
  const swSets         = sets.filter(s => s.swimmerId === id)
  const swComps        = competitions.filter(c => c.swimmerId === id).sort((a, b) => b.fecha.localeCompare(a.fecha))
  const swBests        = personalBests.filter(pb => pb.swimmerId === id).sort((a, b) => a.tiempo - b.tiempo)

  const status  = detectSwimmerStatus(swimmer, swSessions, swSets)
  const alerts  = computeAlerts(swimmer, swSessions, swSets)

  // Datos para el gráfico: competencias de la prueba principal
  const compChartData = swComps
    .filter(c => c.prueba === swimmer.pruebaPrincipal)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(c => ({ fecha: c.fecha, tiempo: c.tiempoFinal }))

  // Mejor marca de competencia de su prueba principal
  const bestComp = swComps
    .filter(c => c.prueba === swimmer.pruebaPrincipal)
    .sort((a, b) => a.tiempoFinal - b.tiempoFinal)[0]

  // Progreso hacia objetivo (%)
  const bestTime = bestComp?.tiempoFinal
  const pctGoal  = bestTime
    ? Math.max(0, Math.min(100, ((bestTime - swimmer.marcaObjetivo) / (bestTime * 0.1)) * 100))
    : 0

  return (
    <>
      <Header
        title={swimmer.nombre}
        subtitle={`${swimmer.pruebaPrincipal} · ${swimmer.categoria}`}
        showBack
        backTo="/coach/nadadores"
        right={
          <button
            onClick={() => navigate(`/coach/registrar?swimmerId=${id}`)}
            className="p-2 rounded-xl bg-blue-700 text-white"
          >
            <PlusCircle size={18} />
          </button>
        }
      />
      <PageLayout>

        {/* Info header */}
        <Card className="mb-4 fade-in">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-700 flex items-center justify-center shrink-0">
              <span className="text-white text-2xl font-black">{swimmer.nombre.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={status} />
                <Tag color="slate">{swimmer.fechaNacimiento ? calcularEdad(swimmer.fechaNacimiento) : swimmer.edad} años</Tag>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{swimmer.objetivoTemporada}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div className="text-center">
              <p className="text-xs text-slate-400">Pileta hab.</p>
              <p className="font-bold text-slate-800 text-sm">{swimmer.piletaHabitual}</p>
            </div>
            <div className="text-center border-x border-slate-100">
              <p className="text-xs text-slate-400">Objetivo</p>
              <p className="font-bold text-yellow-600 text-sm">{formatTime(swimmer.marcaObjetivo)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Mejor marca</p>
              <p className="font-bold text-slate-800 text-sm">
                {bestComp ? formatTime(bestComp.tiempoFinal) : '—'}
              </p>
            </div>
          </div>
        </Card>

        {/* Editar objetivo */}
        <EditObjective swimmer={swimmer} />

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {alerts.slice(0, 3).map(a => <AlertCard key={a.id} alert={a} />)}
          </div>
        )}

        {/* Evolución en competencia */}
        {compChartData.length >= 2 && (
          <Card className="mb-4">
            <p className="text-sm font-bold text-slate-800 mb-1">Evolución — {swimmer.pruebaPrincipal}</p>
            <p className="text-xs text-slate-400 mb-3">Tiempos en competencia</p>
            <TimeLineChart data={compChartData} objetivo={swimmer.marcaObjetivo} />
          </Card>
        )}

        {/* Acciones rápidas */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <ActionBtn icon={<PlusCircle size={18} />} label="Entrenamiento" onClick={() => navigate(`/coach/registrar?swimmerId=${id}`)} />
          <ActionBtn icon={<Trophy size={18} />}     label="Competencia"  onClick={() => navigate(`/coach/competencia?swimmerId=${id}`)} />
          <ActionBtn icon={<Activity size={18} />}   label="Comparar"     onClick={() => navigate(`/coach/similares?swimmerId=${id}`)} />
        </div>

        {/* Últimas sesiones */}
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Últimas sesiones</h2>
        <div className="flex flex-col gap-2 mb-5">
          {swSessions.slice(0, 5).map(ses => {
            const sesSets = sets.filter(s => s.trainingSessionId === ses.id)
            const abierto = expandedId === ses.id
            return (
              <Card key={ses.id} padding="sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{feelingEmoji[ses.sensacionGeneral]}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 capitalize">{ses.tipoEntrenamiento}</p>
                      <p className="text-xs text-slate-400">
                        {(ses.volumenTotal / 1000).toFixed(1)} km · {ses.duracionMinutos} min · {ses.pileta}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-lg inline-block ${
                      ses.rpe >= 8 ? 'bg-red-100 text-red-700' :
                      ses.rpe >= 6 ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      RPE {ses.rpe}
                    </div>
                    {ses.confirmacion && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        ses.confirmacion === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
                        ses.confirmacion === 'modificado' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {ses.confirmacion === 'confirmado' ? '✅ Lo hizo' :
                         ses.confirmacion === 'modificado' ? '✏️ Modificó' :
                         '❌ No pudo'}
                      </span>
                    )}
                    <p className="text-xs text-slate-400">{relativeDate(ses.fecha)}</p>
                  </div>
                </div>
                {ses.comentarioEntrenador && (
                  <p className="text-xs text-slate-500 mt-2 pl-8 italic border-l-2 border-blue-200 ml-8">
                    "{ses.comentarioEntrenador}"
                  </p>
                )}
                {sesSets.length > 0 && (
                  <>
                    <button
                      onClick={() => setExpandedId(abierto ? null : ses.id)}
                      className="flex items-center gap-1 mt-2 text-xs font-semibold text-blue-700"
                    >
                      {abierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {abierto ? 'Ocultar series' : `Ver series (${sesSets.length})`}
                    </button>
                    {abierto && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                        <SetList sets={sesSets} />
                        <button
                          onClick={() => navigate(`/coach/tablero?edit=${ses.id}`)}
                          className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-blue-700"
                        >
                          <Pencil size={13} /> Editar entrenamiento
                        </button>
                      </div>
                    )}
                  </>
                )}
              </Card>
            )
          })}
          {swSessions.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-6">Sin sesiones registradas</p>
          )}
        </div>

        {/* Marcas personales */}
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Marcas personales</h2>
        <div className="flex flex-col gap-2 mb-5">
          {swBests.map(pb => (
            <Card key={pb.id} padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{formatTime(pb.tiempo)}</p>
                  <p className="text-xs text-slate-500">{pb.prueba} · {pb.pileta}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    pb.fuente === 'competencia'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {pb.fuente === 'competencia' ? '🏆 Competencia' : '🏊 Entrenamiento'}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(pb.fecha)}</p>
                </div>
              </div>
              {pb.observacion && (
                <p className="text-xs text-slate-400 mt-1.5 italic">{pb.observacion}</p>
              )}
            </Card>
          ))}
        </div>

        {/* Competencias */}
        {swComps.length > 0 && (
          <>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Competencias</h2>
            <div className="flex flex-col gap-2">
              {swComps.slice(0, 4).map(comp => (
                <Card key={comp.id} padding="sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{comp.nombreTorneo}</p>
                      <p className="text-xs text-slate-500">{comp.prueba} · {comp.pileta} · {comp.ciudad}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-blue-700">{formatTime(comp.tiempoFinal)}</p>
                      <p className="text-xs text-slate-400">Puesto #{comp.ubicacion}</p>
                    </div>
                  </div>
                  {comp.comentarioEntrenador && (
                    <p className="text-xs text-slate-500 mt-2 italic">"{comp.comentarioEntrenador}"</p>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}

      </PageLayout>
    </>
  )
}

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl border border-slate-100 shadow-sm active:scale-[0.97] transition-transform"
    >
      <span className="text-blue-700">{icon}</span>
      <span className="text-xs font-semibold text-slate-600">{label}</span>
    </button>
  )
}
