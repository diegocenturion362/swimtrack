import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CalendarDays, X, Pencil, Trash2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { SetList } from '../../components/swimmers/SetList'
import { useStore } from '../../store/useStore'
import { formatDate, formatDateShort, addDays, todayISO } from '../../utils/timeUtils'

const feelingEmoji: Record<string, string> = {
  'muy buena': '😊', 'buena': '🙂', 'regular': '😐', 'mala': '😔'
}

const stateEmoji: Record<string, string> = {
  'fresco': '⚡', 'cansado': '😴', 'pesado': '🏋️', 'motivado': '🔥', 'bajo de energía': '🪫'
}

type Confirmacion = 'confirmado' | 'modificado' | 'no_pudo'

const CONF_OPTIONS: { value: Confirmacion; label: string; icon: React.ReactNode; active: string; idle: string }[] = [
  {
    value: 'confirmado',
    label: 'Lo hice',
    icon: <CheckCircle2 size={13} />,
    active: 'bg-emerald-500 text-white',
    idle:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  {
    value: 'modificado',
    label: 'Lo modifiqué',
    icon: <AlertCircle size={13} />,
    active: 'bg-amber-500 text-white',
    idle:   'bg-amber-50 text-amber-700 border border-amber-200',
  },
  {
    value: 'no_pudo',
    label: 'No pude',
    icon: <XCircle size={13} />,
    active: 'bg-slate-500 text-white',
    idle:   'bg-slate-50 text-slate-600 border border-slate-200',
  },
]

function ConfirmacionBar({
  confirmacion,
  onChange,
}: {
  confirmacion?: Confirmacion
  onChange: (v: Confirmacion) => void
}) {
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      {!confirmacion && (
        <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
          ¿Pudiste hacer este entreno?
        </p>
      )}
      <div className="flex gap-2">
        {CONF_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
              confirmacion === opt.value ? opt.active : confirmacion ? 'opacity-30 ' + opt.idle : opt.idle
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function MyTrainings() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { sessions, sets, deleteSession, updateSession } = useStore(s => ({
    sessions: s.sessions, sets: s.sets, deleteSession: s.deleteSession, updateSession: s.updateSession,
  }))
  const [fechaSel, setFechaSel] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const swSessions = sessions
    .filter(s => s.swimmerId === id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  // Ventana visible: por defecto últimos 6 días; con fecha elegida, ±3 días.
  // Si no hay nada reciente, anclamos al último entreno para no mostrar vacío.
  const hoy = todayISO()
  const hayReciente = swSessions.some(s => s.fecha >= addDays(hoy, -5))
  const ancla = hayReciente ? hoy : (swSessions[0]?.fecha ?? hoy)
  const desde = fechaSel ? addDays(fechaSel, -3) : addDays(ancla, -5)
  const hasta = fechaSel ? addDays(fechaSel,  3) : ancla
  const label = fechaSel
    ? `${formatDateShort(desde)} – ${formatDateShort(hasta)} (alrededor del ${formatDate(fechaSel)})`
    : hayReciente
      ? 'Últimos 6 días'
      : `Últimos entrenamientos · ${formatDateShort(desde)} – ${formatDateShort(hasta)}`

  const visibles = swSessions.filter(s => s.fecha >= desde && s.fecha <= hasta)

  return (
    <>
      <Header title="Mis entrenamientos" subtitle={`${swSessions.length} en total`} showBack />
      <PageLayout>

        {/* Filtro por calendario */}
        <Card padding="sm" className="mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-blue-700 shrink-0" />
            <input
              type="date"
              value={fechaSel}
              onChange={e => setFechaSel(e.target.value)}
              className="flex-1 min-w-0 px-2 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {fechaSel && (
              <button
                onClick={() => setFechaSel('')}
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold shrink-0"
              >
                <X size={13} /> Hoy
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            {label} · {visibles.length} entreno{visibles.length === 1 ? '' : 's'}
          </p>
        </Card>

        {visibles.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            {fechaSel
              ? 'Sin entrenamientos en esas fechas. Probá otra fecha.'
              : swSessions.length === 0
                ? 'Todavía no hay entrenamientos cargados.'
                : 'Sin entrenamientos recientes. Elegí una fecha en el calendario.'}
          </div>
        )}
        <div className="flex flex-col gap-3">
          {visibles.map(ses => {
            const sesSets = sets
              .filter(s => s.trainingSessionId === ses.id)
              .sort((a, b) => {
                if (a.orden !== undefined && b.orden !== undefined) return a.orden - b.orden
                const pa = a.id.split('-'), pb = b.id.split('-')
                if (pa.length >= 5 && pb.length >= 5) {
                  const biA = parseInt(pa[pa.length - 2]) || 0, piA = parseInt(pa[pa.length - 1]) || 0
                  const biB = parseInt(pb[pb.length - 2]) || 0, piB = parseInt(pb[pb.length - 1]) || 0
                  return (biA * 100 + piA) - (biB * 100 + piB)
                }
                return (parseInt(pa[pa.length - 1]) || 0) - (parseInt(pb[pb.length - 1]) || 0)
              })
            return (
              <Card key={ses.id} className="fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800 capitalize">{ses.tipoEntrenamiento}</p>
                    <p className="text-xs text-slate-400">{formatDate(ses.fecha)} · {ses.pileta}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-lg inline-block ${
                      ses.rpe >= 8 ? 'bg-red-100 text-red-700' :
                      ses.rpe >= 6 ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      RPE {ses.rpe}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 mb-2">
                  <div>
                    <p className="text-xs text-slate-400">Volumen</p>
                    <p className="text-sm font-semibold text-slate-700">{(ses.volumenTotal / 1000).toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Duración</p>
                    <p className="text-sm font-semibold text-slate-700">{ses.duracionMinutos} min</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Sensación</p>
                    <p className="text-sm">{feelingEmoji[ses.sensacionGeneral]} {ses.sensacionGeneral}</p>
                  </div>
                </div>

                {/* Estado previo + comentario previo */}
                <p className="text-xs text-slate-400">
                  Estado previo: {stateEmoji[ses.estadoPrevio]} {ses.estadoPrevio}
                </p>
                {ses.comentarioPrevio && (
                  <p className="text-xs text-slate-400 italic mt-0.5">"{ses.comentarioPrevio}"</p>
                )}

                {/* Comentario del nadador (post) */}
                {ses.comentarioNadador && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 italic">"{ses.comentarioNadador}"</p>
                  </div>
                )}

                {/* Comentario del entrenador */}
                {ses.comentarioEntrenador && (
                  <div className="mt-1.5 pl-3 border-l-2 border-blue-200">
                    <p className="text-xs text-blue-700 font-semibold">Entrenador:</p>
                    <p className="text-xs text-slate-600 italic">"{ses.comentarioEntrenador}"</p>
                  </div>
                )}

                {/* Series */}
                {sesSets.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 mb-1.5">
                      Series ({new Set(sesSets.map(s => s.grupo ?? s.id)).size})
                    </p>
                    <SetList sets={sesSets} showKey />
                  </div>
                )}

                {/* F4 — Confirmación del nadador */}
                <ConfirmacionBar
                  confirmacion={ses.confirmacion}
                  onChange={v => updateSession(ses.id, { confirmacion: v })}
                />

                {/* Acciones */}
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => navigate(`/nadador/${id}/tablero?edit=${ses.id}`)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-700"
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  {confirmDeleteId === ses.id ? (
                    <>
                      <button
                        onClick={() => { deleteSession(ses.id); setConfirmDeleteId(null) }}
                        className="flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-red-500"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs font-semibold text-slate-400"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(ses.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-red-400"
                    >
                      <Trash2 size={13} /> Eliminar
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </PageLayout>
    </>
  )
}
