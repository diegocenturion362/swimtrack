import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, PlusCircle, Trophy, Activity, TrendingUp, AlertTriangle, ChevronRight, Sparkles, Link2, X, Share2,
} from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { AlertCard } from '../../components/swimmers/AlertCard'
import { StatusBadge } from '../../components/ui/Badge'
import { useStore } from '../../store/useStore'
import { detectSwimmerStatus, computeAlerts } from '../../utils/swimmerStatus'
import { relativeDate, formatTime } from '../../utils/timeUtils'
import { generateCoachWeekSummary, shareOrCopy } from '../../utils/weekSummary'
import type { SwimmerStatus } from '../../types'

export function CoachDashboard() {
  const navigate = useNavigate()
  const { swimmers, sessions, sets, competitions, coach, linkSwimmer } = useStore(s => ({
    swimmers:     s.swimmers,
    sessions:     s.sessions,
    sets:         s.sets,
    competitions: s.competitions,
    coach:        s.coach,
    linkSwimmer:  s.linkSwimmer,
  }))

  const [mostrarVincular,  setMostrarVincular]  = useState(false)
  const [codigoInput,      setCodigoInput]      = useState('')
  const [vinculandoError,  setVinculandoError]  = useState('')
  const [vinculandoNombre, setVinculandoNombre] = useState('')
  const [vinculandoLoad,   setVinculandoLoad]   = useState(false)
  const [shareFeedback,    setShareFeedback]    = useState('')

  async function handleShareWeek() {
    try {
      const text   = generateCoachWeekSummary(swimmers, sessions)
      const result = await shareOrCopy(text)
      if (result === 'copied') {
        setShareFeedback('¡Copiado!')
        setTimeout(() => setShareFeedback(''), 2500)
      }
    } catch {}
  }

  async function handleVincular(e: React.FormEvent) {
    e.preventDefault()
    setVinculandoError('')
    setVinculandoNombre('')
    setVinculandoLoad(true)
    const result = await linkSwimmer(codigoInput.trim().toUpperCase())
    setVinculandoLoad(false)
    if (result.error) {
      setVinculandoError(result.error)
    } else {
      setVinculandoNombre(result.nombre ?? 'Nadador')
      setCodigoInput('')
    }
  }

  // Calcular estado de cada nadador
  const summaries = swimmers.map(sw => {
    const swSessions = sessions.filter(s => s.swimmerId === sw.id)
    const swSets     = sets.filter(s => s.swimmerId === sw.id)
    const status     = detectSwimmerStatus(sw, swSessions, swSets)
    const alerts     = computeAlerts(sw, swSessions, swSets)
    const lastSes    = swSessions.sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null
    return { swimmer: sw, status, alerts, lastSes }
  })

  // Stats globales
  const weekAgo     = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
  const thisWeek    = sessions.filter(s => s.fecha >= weekAgo)
  const enProgreso  = summaries.filter(s => s.status === 'En progreso').length
  const estancados  = summaries.filter(s => s.status === 'Estancado' || s.status === 'Sobrecarga').length

  // Alertas globales (primer alerta de cada nadador que necesita atención)
  const globalAlerts = summaries
    .filter(s => s.alerts.some(a => a.nivel === 'danger' || a.nivel === 'warning'))
    .slice(0, 4)

  // Últimas sesiones
  const recentSessions = [...sessions]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 4)

  const quickActions = [
    { icon: <PlusCircle size={20} />, label: 'Cargar entrenamiento', to: '/coach/registrar' },
    { icon: <Trophy size={20} />,     label: 'Cargar competencia',   to: '/coach/competencia' },
    { icon: <Users size={20} />,      label: 'Ver nadadores',        to: '/coach/nadadores'  },
    { icon: <Activity size={20} />,   label: 'Comparar series',      to: '/coach/similares'  },
  ]

  return (
    <>
      <Header
        title={coach?.nombre ?? 'Entrenador'}
        subtitle="Panel del entrenador"
        showLogout
        right={
          <button
            onClick={() => { setMostrarVincular(true); setVinculandoNombre(''); setVinculandoError('') }}
            className="p-2 rounded-xl text-blue-700 hover:bg-blue-50 transition-colors"
            title="Vincular nadador"
          >
            <Link2 size={18} />
          </button>
        }
      />
      <PageLayout>

        {/* Stats + F6 compartir */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resumen de la semana</p>
          <button
            onClick={handleShareWeek}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg active:scale-95 transition-transform"
          >
            <Share2 size={12} />
            {shareFeedback || 'Compartir semana'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatCard icon={<Users size={18} />}     label="Nadadores activos" value={swimmers.length} color="blue" />
          <StatCard icon={<Activity size={18} />}  label="Sesiones esta semana" value={thisWeek.length} color="slate" />
          <StatCard icon={<TrendingUp size={18} />} label="En progreso" value={enProgreso} color="green" />
          <StatCard icon={<AlertTriangle size={18} />} label="Necesitan atención" value={estancados} color="amber" />
        </div>

        {/* Pegar entrenamiento (destacado) */}
        <button
          onClick={() => navigate('/coach/importar')}
          className="w-full flex items-center gap-3 p-4 mb-5 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-sm active:scale-[0.98] transition-transform text-left"
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">Pegar entrenamiento</p>
            <p className="text-xs text-blue-100">Escribí el texto y calculo metros y duración solo</p>
          </div>
          <ChevronRight size={20} className="text-blue-200 shrink-0" />
        </button>

        {/* Acciones rápidas */}
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {quickActions.map(a => (
            <button
              key={a.to}
              onClick={() => navigate(a.to)}
              className="flex items-center gap-2.5 p-3.5 bg-white rounded-xl border border-slate-100 shadow-sm text-left active:scale-[0.98] transition-transform"
            >
              <span className="text-blue-700">{a.icon}</span>
              <span className="text-sm font-semibold text-slate-700 leading-tight">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Alertas */}
        {globalAlerts.length > 0 && (
          <>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Nadadores que necesitan atención
            </h2>
            <div className="flex flex-col gap-2 mb-5">
              {globalAlerts.map(({ swimmer, alerts, status }) => {
                const topAlert = alerts.find(a => a.nivel === 'danger' || a.nivel === 'warning')!
                return (
                  <button
                    key={swimmer.id}
                    onClick={() => navigate(`/coach/nadadores/${swimmer.id}`)}
                    className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-slate-100 shadow-sm text-left w-full active:scale-[0.99] transition-transform"
                  >
                    <div className="w-9 h-9 bg-blue-700 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-sm">{swimmer.nombre.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{swimmer.nombre}</p>
                      <p className="text-xs text-slate-500 truncate">{topAlert.mensaje}</p>
                    </div>
                    <StatusBadge status={status} />
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Tutorial */}
        <a
          href="/tutorial-offline.html"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 p-4 mb-5 rounded-2xl bg-slate-50 border border-slate-200 text-left active:scale-[0.98] transition-transform"
        >
          <span className="text-2xl">📖</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700">Tutorial de la app</p>
            <p className="text-xs text-slate-400">Guía completa paso a paso</p>
          </div>
          <ChevronRight size={16} className="text-slate-400 shrink-0" />
        </a>

        {/* Últimas sesiones */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Últimas sesiones</h2>
          <button onClick={() => navigate('/coach/nadadores')} className="text-xs text-blue-700 font-semibold">
            Ver todo
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {recentSessions.map(ses => {
            const sw = swimmers.find(s => s.id === ses.swimmerId)
            if (!sw) return null
            return (
              <button
                key={ses.id}
                onClick={() => navigate(`/coach/nadadores/${sw.id}`)}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm text-left w-full active:scale-[0.99] transition-transform"
              >
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-slate-600 font-bold text-sm">{sw.nombre.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{sw.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {ses.tipoEntrenamiento} · {(ses.volumenTotal / 1000).toFixed(1)} km · RPE {ses.rpe}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{relativeDate(ses.fecha)}</p>
                  <p className="text-xs text-slate-300">{ses.pileta}</p>
                </div>
              </button>
            )
          })}
        </div>

      </PageLayout>

      {/* ── Modal: vincular nadador ────────────────────────────────────────── */}
      {mostrarVincular && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMostrarVincular(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-2xl p-6 pb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Vincular nadador</h3>
              <button onClick={() => setMostrarVincular(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            {vinculandoNombre ? (
              <div className="text-center py-2">
                <div className="text-3xl mb-2">✅</div>
                <p className="font-semibold text-slate-800">{vinculandoNombre} vinculado/a</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Ya podés ver su perfil y cargarle entrenamientos.</p>
                <button
                  onClick={() => setMostrarVincular(false)}
                  className="w-full bg-blue-600 text-white font-semibold rounded-lg py-3 text-sm"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleVincular} className="space-y-4">
                <p className="text-sm text-slate-600">
                  Pedile al nadador su código de acceso y escribilo acá.
                </p>
                <input
                  type="text"
                  value={codigoInput}
                  onChange={e => setCodigoInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                  placeholder="XK7P2A"
                  className="w-full border border-slate-200 rounded-lg px-3 py-3 text-center text-xl font-bold font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {vinculandoError && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{vinculandoError}</p>
                )}
                <button
                  type="submit"
                  disabled={vinculandoLoad || codigoInput.length < 4}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3 text-sm disabled:opacity-60"
                >
                  {vinculandoLoad ? 'Buscando…' : 'Vincular nadador'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode; label: string; value: number; color: string
}) {
  const colors: Record<string, string> = {
    blue:  'bg-blue-50 text-blue-700',
    slate: 'bg-slate-50 text-slate-500',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <Card padding="md">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
    </Card>
  )
}
