import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trophy, Plus, ChevronDown, ChevronUp, Pencil, Trash2, Timer } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { useStore } from '../../store/useStore'
import { formatTime, formatDate, formatearParciales } from '../../utils/timeUtils'
import { tiempoATexto } from '../../utils/parseCompetition'
import type { Competition } from '../../types'

const feelingEmoji: Record<string, string> = {
  'muy buena': '😊', 'buena': '🙂', 'regular': '😐', 'mala': '😔',
}
const stateEmoji: Record<string, string> = {
  'fresco': '⚡', 'cansado': '😴', 'pesado': '🏋️', 'motivado': '🔥', 'bajo de energía': '🪫',
}

export function MyMarks() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { personalBests, competitions, deleteCompetition } = useStore(s => ({
    personalBests:     s.personalBests,
    competitions:      s.competitions,
    deleteCompetition: s.deleteCompetition,
  }))

  const myBests = personalBests.filter(pb => pb.swimmerId === id).sort((a, b) => a.tiempo - b.tiempo)
  const myComps = competitions
    .filter(c => c.swimmerId === id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  const compBests = myBests.filter(pb => pb.fuente === 'competencia')
  const trainBests = myBests.filter(pb => pb.fuente === 'entrenamiento')

  // Agrupar competencias por prueba para el historial
  const pruebas = Array.from(new Set(myComps.map(c => c.prueba))).sort()

  const [expandedComps, setExpandedComps] = useState<Set<string>>(new Set())
  const [expandedPruebas, setExpandedPruebas] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [filtroPrueba, setFiltroPrueba] = useState('')

  // Cuando hay un chip activo → exact match; sin filtro → todas
  const pruebasFiltradas = filtroPrueba ? [filtroPrueba] : pruebas
  const compsFiltradas   = filtroPrueba ? myComps.filter(c => c.prueba === filtroPrueba) : myComps

  const handleFiltro = (prueba: string) => {
    const nueva = filtroPrueba === prueba ? '' : prueba
    setFiltroPrueba(nueva)
    if (nueva) setExpandedPruebas(prev => { const n = new Set(prev); n.add(nueva); return n })
  }

  const toggleComp = (id: string) =>
    setExpandedComps(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const togglePrueba = (p: string) =>
    setExpandedPruebas(prev => {
      const n = new Set(prev)
      n.has(p) ? n.delete(p) : n.add(p)
      return n
    })

  const handleDelete = (c: Competition) => {
    if (confirmDelete === c.id) {
      deleteCompetition(c.id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(c.id)
    }
  }

  return (
    <>
      <Header title="Mis marcas" subtitle="Entrenamiento y competencia" showBack />
      <PageLayout>

        {/* Cargar competencia */}
        <button
          onClick={() => navigate(`/nadador/${id}/competencia`)}
          className="w-full flex items-center gap-2 p-3 mb-5 rounded-xl bg-blue-700 text-white text-left active:scale-[0.99] transition-transform"
        >
          <Plus size={18} className="shrink-0" />
          <span className="text-sm font-semibold">Cargar una competencia</span>
        </button>

        {/* Marcas de competencia */}
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          🏆 Mejores marcas
        </h2>
        {compBests.length === 0 ? (
          <Card className="mb-4 text-center">
            <p className="text-slate-400 text-sm py-4">Sin marcas de competencia</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2 mb-5">
            {compBests.map(pb => (
              <Card key={pb.id} padding="sm" className="border-yellow-200 bg-yellow-50/30">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-black text-slate-900">{formatTime(pb.tiempo)}</p>
                    <p className="text-sm font-semibold text-slate-700">{pb.prueba}</p>
                    <p className="text-xs text-slate-400">{pb.pileta} · {formatDate(pb.fecha)}</p>
                  </div>
                  <Trophy size={20} className="text-yellow-600 mt-1" />
                </div>
                {pb.contexto    && <p className="text-xs text-slate-500 mt-1.5">{pb.contexto}</p>}
                {pb.observacion && <p className="text-xs text-slate-400 mt-0.5 italic">{pb.observacion}</p>}
              </Card>
            ))}
          </div>
        )}

        {/* Marcas de entrenamiento */}
        {trainBests.length > 0 && (
          <>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              🏊 Marcas de entrenamiento
            </h2>
            <div className="flex flex-col gap-2 mb-5">
              {trainBests.map(pb => (
                <Card key={pb.id} padding="sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xl font-black text-slate-900">{formatTime(pb.tiempo)}</p>
                      <p className="text-sm font-semibold text-slate-700">{pb.prueba}</p>
                      <p className="text-xs text-slate-400">{pb.pileta} · {formatDate(pb.fecha)}</p>
                    </div>
                  </div>
                  {pb.contexto    && <p className="text-xs text-slate-500 mt-1.5">{pb.contexto}</p>}
                  {pb.observacion && <p className="text-xs text-slate-400 mt-0.5 italic">{pb.observacion}</p>}
                </Card>
              ))}
            </div>
          </>
        )}

        {/* ── Historial por prueba ──────────────────────────────────────────── */}
        {myComps.length > 0 && (
          <>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Historial por prueba
            </h2>

            {/* Chips de prueba */}
            <div className="overflow-x-auto -mx-4 px-4 pb-1 mb-3">
              <div className="flex gap-2 w-max">
                <button
                  onClick={() => setFiltroPrueba('')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    !filtroPrueba ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Todas ({myComps.length})
                </button>
                {pruebas.map(p => {
                  const n = myComps.filter(c => c.prueba === p).length
                  return (
                    <button key={p} onClick={() => handleFiltro(p)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                        filtroPrueba === p ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p} ({n})
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-col gap-3 mb-5">
              {pruebasFiltradas.map(prueba => {
                const compsDeEstaPrueba = myComps.filter(c => c.prueba === prueba)
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                const mejor = [...compsDeEstaPrueba].sort((a, b) => a.tiempoFinal - b.tiempoFinal)[0]
                const open = expandedPruebas.has(prueba)

                return (
                  <Card key={prueba} padding="sm" className="border-slate-200">
                    <button
                      className="w-full flex items-center justify-between text-left"
                      onClick={() => togglePrueba(prueba)}
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-800">{prueba}</p>
                        <p className="text-xs text-slate-400">
                          {compsDeEstaPrueba.length} carrera{compsDeEstaPrueba.length !== 1 ? 's' : ''}
                          {mejor?.tiempoFinal > 0 && ` · mejor: ${tiempoATexto(mejor.tiempoFinal)}`}
                        </p>
                      </div>
                      {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </button>

                    {open && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                        {compsDeEstaPrueba.map(c => (
                          <CompCard
                            key={c.id}
                            comp={c}
                            expanded={expandedComps.has(c.id)}
                            confirming={confirmDelete === c.id}
                            onToggle={() => toggleComp(c.id)}
                            onEdit={() => navigate(`/nadador/${id}/competencia-tablero?edit=${c.id}`)}
                            onDelete={() => handleDelete(c)}
                            onCancelDelete={() => setConfirmDelete(null)}
                          />
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </>
        )}

        {/* ── Historial completo (vista compacta) ──────────────────────────── */}
        {myComps.length > 0 && (
          <>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {filtroPrueba
                ? `${filtroPrueba} — cronológico (${compsFiltradas.length})`
                : `Todas las competencias (${myComps.length})`}
            </h2>
            <div className="flex flex-col gap-2">
              {compsFiltradas.map(c => (
                <CompCard
                  key={c.id}
                  comp={c}
                  expanded={expandedComps.has(`all-${c.id}`)}
                  confirming={confirmDelete === `all-${c.id}`}
                  onToggle={() => {
                    setExpandedComps(prev => {
                      const n = new Set(prev)
                      n.has(`all-${c.id}`) ? n.delete(`all-${c.id}`) : n.add(`all-${c.id}`)
                      return n
                    })
                  }}
                  onEdit={() => navigate(`/nadador/${id}/competencia-tablero?edit=${c.id}`)}
                  onDelete={() => {
                    if (confirmDelete === `all-${c.id}`) {
                      deleteCompetition(c.id)
                      setConfirmDelete(null)
                    } else {
                      setConfirmDelete(`all-${c.id}`)
                    }
                  }}
                  onCancelDelete={() => setConfirmDelete(null)}
                />
              ))}
            </div>
          </>
        )}

        {myComps.length === 0 && compBests.length === 0 && trainBests.length === 0 && (
          <Card className="text-center mt-4">
            <p className="text-slate-400 text-sm py-8">
              Todavía no hay marcas. Cargá tu primera competencia.
            </p>
          </Card>
        )}

      </PageLayout>
    </>
  )
}

// ─── Tarjeta de competencia expandible ───────────────────────────────────────

function CompCard({
  comp: c, expanded, confirming,
  onToggle, onEdit, onDelete, onCancelDelete,
}: {
  comp: Competition
  expanded: boolean
  confirming: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onCancelDelete: () => void
}) {
  return (
    <Card padding="sm" className="border-slate-200">
      {/* Encabezado siempre visible */}
      <button className="w-full flex items-start justify-between gap-2 text-left" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800">{c.prueba}</p>
            {c.pileta && <span className="text-[10px] text-slate-400">{c.pileta}</span>}
          </div>
          <p className="text-xs text-slate-500">{c.nombreTorneo} · {formatDate(c.fecha)}</p>
          {c.ciudad && <p className="text-xs text-slate-400">{c.ciudad}</p>}
        </div>
        <div className="text-right shrink-0">
          {c.tiempoFinal > 0 && (
            <p className="text-xl font-black text-blue-700">{tiempoATexto(c.tiempoFinal)}</p>
          )}
          {c.ubicacion > 0 && (
            <p className="text-xs text-slate-500">Puesto #{c.ubicacion}</p>
          )}
          <div className="flex items-center justify-end mt-1">
            {expanded
              ? <ChevronUp size={14} className="text-slate-400" />
              : <ChevronDown size={14} className="text-slate-400" />}
          </div>
        </div>
      </button>

      {/* Detalles expandidos */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-3">

          {/* Pre-carrera */}
          {(c.estadoPrevio || c.sensacionPrevia || c.comentarioPrevio || c.estrategia) && (
            <div>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Antes de la carrera</p>
              {c.estadoPrevio && (
                <p className="text-xs text-slate-500">
                  Estado: <span className="font-medium">{stateEmoji[c.estadoPrevio] ?? ''} {c.estadoPrevio}</span>
                  {c.sensacionPrevia && ` · ${feelingEmoji[c.sensacionPrevia]} ${c.sensacionPrevia}`}
                </p>
              )}
              {!c.estadoPrevio && c.sensacionPrevia && (
                <p className="text-xs text-slate-500">
                  Sensación: {feelingEmoji[c.sensacionPrevia]} {c.sensacionPrevia}
                </p>
              )}
              {c.estrategia && (
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-semibold">Estrategia:</span> {c.estrategia}
                </p>
              )}
              {c.comentarioPrevio && (
                <p className="text-xs text-slate-400 italic mt-0.5">"{c.comentarioPrevio}"</p>
              )}
            </div>
          )}

          {/* Parciales */}
          {c.parciales.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Parciales</p>
              <div className="flex items-center gap-1.5">
                <Timer size={13} className="text-slate-400 shrink-0" />
                <p className="text-[11px] font-semibold text-slate-700 leading-relaxed">
                  {formatearParciales(c.parciales, c.tiempoFinal)}
                </p>
              </div>
            </div>
          )}

          {/* Post-carrera */}
          {(c.sensacionPosterior || c.comentarioNadador || c.aprendizaje || c.errorPrincipal) && (
            <div>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Después de la carrera</p>
              {c.sensacionPosterior && (
                <p className="text-xs text-slate-500">
                  Sensación: {feelingEmoji[c.sensacionPosterior]} {c.sensacionPosterior}
                </p>
              )}
              {c.comentarioNadador && (
                <p className="text-xs text-slate-500 italic mt-0.5">"{c.comentarioNadador}"</p>
              )}
              {c.aprendizaje && (
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-semibold">Aprendizaje:</span> {c.aprendizaje}
                </p>
              )}
              {c.errorPrincipal && (
                <p className="text-xs text-slate-400 mt-0.5">
                  <span className="font-semibold">A mejorar:</span> {c.errorPrincipal}
                </p>
              )}
            </div>
          )}

          {/* Comentario del entrenador */}
          {c.comentarioEntrenador && (
            <div className="pl-3 border-l-2 border-blue-200">
              <p className="text-xs text-blue-700 font-semibold">Entrenador:</p>
              <p className="text-xs text-slate-600 italic">"{c.comentarioEntrenador}"</p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-xs font-semibold text-blue-700 px-3 py-1.5 rounded-lg bg-blue-50"
            >
              <Pencil size={12} /> Editar
            </button>
            {confirming ? (
              <>
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-red-500"
                >
                  Confirmar eliminar
                </button>
                <button
                  onClick={onCancelDelete}
                  className="text-xs font-semibold text-slate-500 px-2 py-1.5"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={onDelete}
                className="flex items-center gap-1 text-xs font-semibold text-red-400 px-3 py-1.5 rounded-lg bg-red-50"
              >
                <Trash2 size={12} /> Eliminar
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
