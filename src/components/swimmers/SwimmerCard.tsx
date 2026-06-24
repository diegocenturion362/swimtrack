import { useNavigate } from 'react-router-dom'
import { ChevronRight, Calendar } from 'lucide-react'
import { Card } from '../ui/Card'
import { StatusBadge } from '../ui/Badge'
import type { Swimmer, TrainingSession, SwimmerStatus } from '../../types'
import { formatDate, relativeDate, calcularEdad } from '../../utils/timeUtils'

interface Props {
  swimmer:     Swimmer
  status:      SwimmerStatus
  lastSession: TrainingSession | null
  linkTo?:     string
}

const specialtyLabel: Record<string, string> = {
  libre:     'Libre',
  pecho:     'Pecho',
  espalda:   'Espalda',
  mariposa:  'Mariposa',
  combinado: 'Combinado',
}

export function SwimmerCard({ swimmer, status, lastSession, linkTo }: Props) {
  const navigate = useNavigate()

  return (
    <Card
      hover={!!linkTo}
      onClick={() => linkTo && navigate(linkTo)}
      className="flex items-center gap-3"
    >
      {/* Avatar inicial */}
      <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-lg">
          {swimmer.nombre.charAt(0)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900 text-sm">{swimmer.nombre}</p>
            <p className="text-xs text-slate-500">
              {swimmer.fechaNacimiento ? calcularEdad(swimmer.fechaNacimiento) : swimmer.edad} años · {swimmer.categoria} · {swimmer.pruebaPrincipal}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
          <Calendar size={11} />
          <span>
            {lastSession
              ? `Último: ${relativeDate(lastSession.fecha)}`
              : 'Sin entrenamientos'}
          </span>
        </div>
      </div>

      {linkTo && <ChevronRight size={16} className="text-slate-300 shrink-0" />}
    </Card>
  )
}
