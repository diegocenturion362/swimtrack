import { useNavigate, useParams } from 'react-router-dom'
import { FileText, LayoutGrid, Camera } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'

interface Props {
  mode: 'coach' | 'swimmer'
}

export function ChooseCompetitionMethod({ mode }: Props) {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()

  const base = mode === 'coach' ? '/coach' : `/nadador/${id}`

  const opciones = [
    {
      icon:   <FileText size={36} strokeWidth={1.5} className="text-blue-600" />,
      titulo: 'Pegar texto',
      desc:   'Pegá el resultado copiado de Meet Mobile o escribilo a mano. La app detecta torneo, prueba y tiempo automáticamente.',
      to:     `${base}/competencia-importar`,
    },
    {
      icon:   <Camera size={36} strokeWidth={1.5} className="text-green-600" />,
      titulo: 'Foto / Screenshot',
      desc:   'Sacá una captura de pantalla del Meet Mobile y la app extrae el torneo, prueba, tiempo y parciales automáticamente.',
      to:     `${base}/competencia-foto`,
    },
    {
      icon:   <LayoutGrid size={36} strokeWidth={1.5} className="text-purple-600" />,
      titulo: 'Tablero',
      desc:   'Completá el resultado campo por campo: prueba, tiempo, parciales, sensaciones y más.',
      to:     `${base}/competencia-tablero`,
    },
  ]

  return (
    <>
      <Header title="Cargar competencia" showBack />
      <PageLayout>
        <p className="text-sm text-slate-500 mb-6">¿Cómo querés registrar el resultado?</p>
        <div className="flex flex-col gap-4">
          {opciones.map(op => (
            <button
              key={op.to}
              onClick={() => navigate(op.to)}
              className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4 active:scale-[0.98] transition-transform"
            >
              <div className="shrink-0 mt-0.5">{op.icon}</div>
              <div>
                <p className="font-bold text-slate-800 text-base mb-1">{op.titulo}</p>
                <p className="text-sm text-slate-500 leading-snug">{op.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </PageLayout>
    </>
  )
}
