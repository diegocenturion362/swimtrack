import { useParams, useNavigate } from 'react-router-dom'
import { Trophy, Plus } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { useStore } from '../../store/useStore'
import { formatTime, formatDate } from '../../utils/timeUtils'

export function MyMarks() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { personalBests, competitions } = useStore(s => ({
    personalBests: s.personalBests,
    competitions:  s.competitions,
  }))

  const myBests = personalBests.filter(pb => pb.swimmerId === id).sort((a, b) => a.tiempo - b.tiempo)
  const myComps = competitions.filter(c => c.swimmerId === id).sort((a, b) => b.fecha.localeCompare(a.fecha))

  const compBests = myBests.filter(pb => pb.fuente === 'competencia')
  const trainBests = myBests.filter(pb => pb.fuente === 'entrenamiento')

  return (
    <>
      <Header title="Mis marcas" subtitle="Entrenamiento y competencia" showBack />
      <PageLayout>

        {/* Cargar competencia */}
        <button
          onClick={() => navigate(`/nadador/${id}/competencia-importar`)}
          className="w-full flex items-center gap-2 p-3 mb-5 rounded-xl bg-blue-700 text-white text-left active:scale-[0.99] transition-transform"
        >
          <Plus size={18} className="shrink-0" />
          <span className="text-sm font-semibold">Cargar una competencia</span>
        </button>

        {/* Marcas de competencia */}
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          🏆 Marcas de competencia
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
                {pb.contexto && <p className="text-xs text-slate-500 mt-1.5">{pb.contexto}</p>}
                {pb.observacion && <p className="text-xs text-slate-400 mt-0.5 italic">{pb.observacion}</p>}
              </Card>
            ))}
          </div>
        )}

        {/* Marcas de entrenamiento */}
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          🏊 Marcas de entrenamiento
        </h2>
        {trainBests.length === 0 ? (
          <Card className="mb-4 text-center">
            <p className="text-slate-400 text-sm py-4">Sin marcas de entrenamiento</p>
          </Card>
        ) : (
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
                {pb.contexto   && <p className="text-xs text-slate-500 mt-1.5">{pb.contexto}</p>}
                {pb.observacion && <p className="text-xs text-slate-400 mt-0.5 italic">{pb.observacion}</p>}
              </Card>
            ))}
          </div>
        )}

        {/* Historial de competencias */}
        {myComps.length > 0 && (
          <>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Historial de competencias
            </h2>
            <div className="flex flex-col gap-2">
              {myComps.map(c => (
                <Card key={c.id} padding="sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{c.nombreTorneo}</p>
                      <p className="text-xs text-slate-500">{c.prueba} · {c.pileta} · {c.ciudad}</p>
                      <p className="text-xs text-slate-400">{formatDate(c.fecha)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-blue-700">{formatTime(c.tiempoFinal)}</p>
                      <p className="text-xs text-slate-500">Puesto #{c.ubicacion}</p>
                    </div>
                  </div>
                  {c.aprendizaje && (
                    <p className="text-xs text-slate-500 mt-2 italic">Aprendizaje: {c.aprendizaje}</p>
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
