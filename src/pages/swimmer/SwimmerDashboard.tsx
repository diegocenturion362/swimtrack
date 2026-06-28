import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Target, Calendar, TrendingUp, MessageCircle, Droplets, ChevronRight, Bell, X, Share2, Utensils } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { AlertCard } from '../../components/swimmers/AlertCard'
import { EditObjective } from '../../components/swimmers/EditObjective'
import { VolumeBarChart } from '../../components/charts/VolumeBarChart'
import { useStore } from '../../store/useStore'
import { detectSwimmerStatus, computeAlerts, weeklyVolume } from '../../utils/swimmerStatus'
import { formatTime, relativeDate, todayISO } from '../../utils/timeUtils'
import { generateSwimmerWeekSummary, shareOrCopy } from '../../utils/weekSummary'

// ── Helpers localStorage para F2 ─────────────────────────────────────────────
function getSeenComments(swimmerId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`seenComments_${swimmerId}`)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}
function saveSeenComments(swimmerId: string, ids: Set<string>) {
  localStorage.setItem(`seenComments_${swimmerId}`, JSON.stringify([...ids]))
}

export function SwimmerDashboard() {
  const { id } = useParams<{ id: string }>()
  const { swimmers, sessions, sets, personalBests } = useStore(s => ({
    swimmers:      s.swimmers,
    sessions:      s.sessions,
    sets:          s.sets,
    personalBests: s.personalBests,
  }))

  const [seenIds, setSeenIds] = useState<Set<string>>(() => getSeenComments(id ?? ''))
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [shareFeedback, setShareFeedback] = useState('')

  const swimmer = swimmers.find(s => s.id === id)
  if (!swimmer) return <div className="p-8 text-center text-slate-400">Nadador no encontrado</div>

  const swSessions = sessions
    .filter(s => s.swimmerId === id && !s.esPlaneada)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
  const planHoy = sessions.find(s => s.swimmerId === id && s.fecha === todayISO() && s.esPlaneada)
  const swSets  = sets.filter(s => s.swimmerId === id)
  const swBests    = personalBests.filter(pb => pb.swimmerId === id).sort((a, b) => a.tiempo - b.tiempo)

  const status = detectSwimmerStatus(swimmer, swSessions, swSets)
  const alerts = computeAlerts(swimmer, swSessions, swSets)

  // Última semana
  const weekAgo    = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
  const thisWeek   = swSessions.filter(s => s.fecha >= weekAgo)
  const weekVol    = thisWeek.reduce((a, b) => a + b.volumenTotal, 0)
  const avgRPE     = thisWeek.length > 0
    ? (thisWeek.reduce((a, b) => a + b.rpe, 0) / thisWeek.length).toFixed(1)
    : '—'
  const withNutrition = thisWeek.filter(s => s.alimentacion != null)
  const avgAlimentacion = withNutrition.length > 0
    ? (withNutrition.reduce((a, b) => a + (b.alimentacion ?? 0), 0) / withNutrition.length).toFixed(1)
    : '—'

  // Volumen semanal para gráfico
  const volData = weeklyVolume(swSessions.slice(0, 20))

  // Mejor marca de su prueba principal
  const mainEventBest = swBests
    .filter(pb => pb.prueba === swimmer.pruebaPrincipal)
    .sort((a, b) => a.tiempo - b.tiempo)[0]

  // Progreso hacia objetivo
  const pctGoal = mainEventBest
    ? Math.max(0, Math.min(100, (
        (swimmer.marcaObjetivo - mainEventBest.tiempo) /
        (swimmer.marcaObjetivo * 0.1)
      ) * 100 + 50
      ))
    : 0

  // Comentarios del entrenador (últimas 3 sesiones)
  const coachComments = swSessions
    .filter(s => s.comentarioEntrenador)
    .slice(0, 3)

  // F3: sesión de hoy (ya filtradas esPlaneada=false en swSessions)
  const todaySession = swSessions.find(s => s.fecha === todayISO())

  // F6: compartir semana
  async function handleShare() {
    if (!swimmer) return
    try {
      const result = await shareOrCopy(generateSwimmerWeekSummary(swimmer, swSessions))
      if (result === 'copied') {
        setShareFeedback('¡Copiado!')
        setTimeout(() => setShareFeedback(''), 2500)
      }
    } catch {}
  }

  // F2: comentarios que el nadador todavía no vio
  const unseenComments = coachComments.filter(s => !seenIds.has(s.id))
  const showBanner = unseenComments.length > 0 && !bannerDismissed

  function dismissBanner() {
    const next = new Set(seenIds)
    coachComments.forEach(s => next.add(s.id))
    setSeenIds(next)
    saveSeenComments(id ?? '', next)
    setBannerDismissed(true)
  }

  const feelingEmoji: Record<string, string> = {
    'muy buena': '😊', 'buena': '🙂', 'regular': '😐', 'mala': '😔'
  }

  return (
    <>
      <Header title={swimmer.nombre} subtitle={swimmer.pruebaPrincipal} showLogout />
      <PageLayout>

        {/* F2 — Banner comentario nuevo del entrenador */}
        {showBanner && (
          <div className="mb-4 rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-3 fade-in">
            <Bell size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-blue-800">
                {unseenComments.length === 1
                  ? 'Tu entrenador dejó un comentario nuevo'
                  : `Tu entrenador dejó ${unseenComments.length} comentarios nuevos`}
              </p>
              <button
                onClick={dismissBanner}
                className="text-xs text-blue-600 font-semibold mt-0.5 underline underline-offset-2"
              >
                Ver comentarios
              </button>
            </div>
            <button onClick={dismissBanner} className="text-blue-400 shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        {/* F3 — Vista de hoy */}
        {todaySession ? (
          <Card className="mb-4 bg-emerald-50 border border-emerald-200 fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Hoy entrenaste</p>
                <p className="text-sm font-bold text-slate-800 capitalize">{todaySession.tipoEntrenamiento}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-800">{(todaySession.volumenTotal / 1000).toFixed(1)} km</p>
                <p className="text-xs text-slate-500">
                  RPE {todaySession.rpe} · {feelingEmoji[todaySession.sensacionGeneral]}
                </p>
              </div>
            </div>
          </Card>
        ) : planHoy ? (
          <Card className="mb-4 bg-blue-50 border border-blue-200 fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Tu entreno de hoy</p>
                <p className="text-sm font-bold text-slate-800 capitalize">{planHoy.tipoEntrenamiento}</p>
                {planHoy.comentarioEntrenador && (
                  <p className="text-xs text-slate-500 mt-0.5 italic truncate">"{planHoy.comentarioEntrenador}"</p>
                )}
              </div>
              <Link
                to={`/nadador/${id}/registrar`}
                className="shrink-0 text-xs font-bold text-blue-700 bg-blue-200/60 px-3 py-1.5 rounded-lg"
              >
                Registrar →
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="mb-4 border border-dashed border-slate-200 bg-slate-50/50 fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hoy</p>
                <p className="text-sm text-slate-500">Sin entreno registrado</p>
              </div>
              <Link
                to={`/nadador/${id}/registrar`}
                className="shrink-0 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg"
              >
                Registrar →
              </Link>
            </div>
          </Card>
        )}

        {/* Hero card */}
        <Card className="mb-4 bg-gradient-to-br from-blue-700 to-blue-900 text-white border-0 fade-in">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-blue-200 text-xs">Mi estado</p>
              <StatusBadge status={status} />
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-xs">Objetivo</p>
              <p className="text-yellow-300 font-black text-xl">{formatTime(swimmer.marcaObjetivo)}</p>
              <p className="text-blue-200 text-xs">{swimmer.pruebaPrincipal}</p>
            </div>
          </div>
          <p className="text-blue-100 text-xs leading-relaxed">{swimmer.objetivoTemporada}</p>

          {/* Barra de progreso */}
          {mainEventBest && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="flex justify-between text-xs text-blue-200 mb-1.5">
                <span>Mi mejor: {formatTime(mainEventBest.tiempo)}</span>
                <span>Obj: {formatTime(swimmer.marcaObjetivo)}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, pctGoal)}%` }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Acciones rápidas */}
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Acciones rápidas</p>
          <div className="flex flex-col gap-2">
            <Link to={`/nadador/${id}/registrar`}
              className="flex items-center gap-3 px-4 py-3.5 bg-blue-700 rounded-2xl text-white active:scale-95 transition-transform">
              <span className="text-2xl">💪</span>
              <div>
                <p className="font-bold text-sm">Registrar entreno</p>
                <p className="text-blue-200 text-xs">Cargá la práctica de hoy</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-blue-300" />
            </Link>
            <Link to={`/nadador/${id}/competencia`}
              className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-slate-200 text-slate-800 active:scale-95 transition-transform shadow-sm">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="font-bold text-sm">Cargar competencia</p>
                <p className="text-slate-400 text-xs">Guardá tu próxima marca</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-slate-400" />
            </Link>
            <Link to={`/nadador/${id}/series`}
              className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-slate-200 text-slate-800 active:scale-95 transition-transform shadow-sm">
              <span className="text-2xl">📈</span>
              <div>
                <p className="font-bold text-sm">Comparar mis series</p>
                <p className="text-slate-400 text-xs">Buscá 8x50, 100 mariposa…</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-slate-400" />
            </Link>
            <a href="/tutorial-offline.html" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 active:scale-95 transition-transform">
              <span className="text-2xl">📖</span>
              <div>
                <p className="font-bold text-sm">Tutorial de la app</p>
                <p className="text-slate-400 text-xs">Guía completa paso a paso</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-slate-400" />
            </a>
          </div>
        </div>

        {/* Editar objetivo */}
        <EditObjective swimmer={swimmer} />

        {/* Stats de esta semana + F6 compartir */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Esta semana</p>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg active:scale-95 transition-transform"
          >
            <Share2 size={12} />
            {shareFeedback || 'Compartir'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <MiniStat icon={<Droplets size={14} />} label="Volumen" value={`${(weekVol / 1000).toFixed(1)} km`} />
          <MiniStat icon={<Calendar size={14} />}  label="Sesiones" value={`${thisWeek.length}`} />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <MiniStat icon={<TrendingUp size={14} />} label="RPE prom." value={String(avgRPE)} />
          <MiniStat icon={<Utensils size={14} />} label="Nutrición" value={avgAlimentacion === '—' ? '—' : `${avgAlimentacion}/10`} />
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {alerts.slice(0, 2).map(a => <AlertCard key={a.id} alert={a} />)}
          </div>
        )}

        {/* Volumen semanal */}
        <Card className="mb-4">
          <p className="text-sm font-bold text-slate-800 mb-3">Volumen semanal</p>
          <VolumeBarChart data={volData.slice(-8)} />
        </Card>

        {/* Mis marcas principales */}
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Mis mejores marcas</h2>
        <div className="flex flex-col gap-2 mb-4">
          {swBests.slice(0, 4).map(pb => (
            <Card key={pb.id} padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{formatTime(pb.tiempo)}</p>
                  <p className="text-xs text-slate-500">{pb.prueba} · {pb.pileta}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  pb.fuente === 'competencia'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {pb.fuente === 'competencia' ? '🏆 Comp.' : '🏊 Entreno'}
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* Comentarios del entrenador */}
        {coachComments.length > 0 && (
          <>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Comentarios del entrenador
            </h2>
            <div className="flex flex-col gap-2 mb-4">
              {coachComments.map(ses => (
                <Card key={ses.id} padding="sm">
                  <div className="flex items-start gap-2">
                    <MessageCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">{relativeDate(ses.fecha)}</p>
                      <p className="text-sm text-slate-700 leading-relaxed italic">
                        "{ses.comentarioEntrenador}"
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Código de acceso (para compartir con el entrenador) */}
        {swimmer.codigoAcceso && (
          <Card className="mb-4 bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-0.5">Tu código para el entrenador</p>
                <p className="text-2xl font-bold font-mono tracking-widest text-blue-800">{swimmer.codigoAcceso}</p>
              </div>
              <p className="text-xs text-slate-400 leading-tight max-w-[120px] text-right">
                Mandáselo por WhatsApp
              </p>
            </div>
          </Card>
        )}

        {/* Últimas sesiones */}
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Últimas sesiones</h2>
        <div className="flex flex-col gap-2">
          {swSessions.slice(0, 4).map(ses => (
            <Card key={ses.id} padding="sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{feelingEmoji[ses.sensacionGeneral]}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 capitalize">{ses.tipoEntrenamiento}</p>
                    <p className="text-xs text-slate-400">
                      {(ses.volumenTotal / 1000).toFixed(1)} km · {ses.pileta}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                    ses.rpe >= 8 ? 'bg-red-100 text-red-700' :
                    ses.rpe >= 6 ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    RPE {ses.rpe}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{relativeDate(ses.fecha)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

      </PageLayout>
    </>
  )
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card padding="sm" className="text-center">
      <div className="flex justify-center mb-1 text-blue-700">{icon}</div>
      <p className="text-base font-black text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{label}</p>
    </Card>
  )
}
