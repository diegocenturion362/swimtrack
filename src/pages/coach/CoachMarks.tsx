import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { Field, Select } from '../../components/ui/FormField'
import { useStore } from '../../store/useStore'
import { formatTime, formatDate } from '../../utils/timeUtils'

export function CoachMarks() {
  const { swimmers, personalBests, competitions } = useStore(s => ({
    swimmers:      s.swimmers,
    personalBests: s.personalBests,
    competitions:  s.competitions,
  }))

  const [swimmerId, setSwimmerId] = useState('all')

  const filtered = swimmerId === 'all'
    ? personalBests
    : personalBests.filter(pb => pb.swimmerId === swimmerId)

  const sorted = [...filtered].sort((a, b) => {
    if (a.swimmerId !== b.swimmerId) return a.swimmerId.localeCompare(b.swimmerId)
    if (a.prueba !== b.prueba) return a.prueba.localeCompare(b.prueba)
    return a.tiempo - b.tiempo
  })

  const getSwimmerName = (id: string) => swimmers.find(s => s.id === id)?.nombre ?? id

  return (
    <>
      <Header title="Marcas personales" subtitle="Entrenamiento y competencia" showBack backTo="/coach" />
      <PageLayout>

        <Field label="Filtrar por nadador">
          <Select value={swimmerId} onChange={e => setSwimmerId(e.target.value)}>
            <option value="all">Todos los nadadores</option>
            {swimmers.map(sw => <option key={sw.id} value={sw.id}>{sw.nombre}</option>)}
          </Select>
        </Field>

        <div className="flex flex-col gap-3 mt-4">
          {sorted.map(pb => (
            <Card key={pb.id} padding="sm">
              <div className="flex items-start justify-between">
                <div>
                  {swimmerId === 'all' && (
                    <p className="text-xs font-bold text-blue-700 mb-0.5">{getSwimmerName(pb.swimmerId)}</p>
                  )}
                  <p className="text-xl font-black text-slate-900">{formatTime(pb.tiempo)}</p>
                  <p className="text-sm font-semibold text-slate-700">{pb.prueba}</p>
                  <p className="text-xs text-slate-400">{pb.pileta} · {formatDate(pb.fecha)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 ${
                  pb.fuente === 'competencia'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {pb.fuente === 'competencia' ? <Trophy size={11} /> : null}
                  {pb.fuente === 'competencia' ? 'Competencia' : 'Entrenamiento'}
                </span>
              </div>
              {pb.observacion && (
                <p className="text-xs text-slate-500 mt-2 italic">{pb.observacion}</p>
              )}
              {pb.contexto && (
                <p className="text-xs text-slate-400 mt-0.5">{pb.contexto}</p>
              )}
            </Card>
          ))}

          {sorted.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              No hay marcas registradas
            </div>
          )}
        </div>

      </PageLayout>
    </>
  )
}
