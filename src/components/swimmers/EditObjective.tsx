import { useState } from 'react'
import { Target, Check, X, Pencil } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Field, Input, Textarea } from '../ui/FormField'
import { TimeInput } from '../ui/TimeInput'
import { useStore } from '../../store/useStore'
import { parseRepTime, formatRepTime, calcularEdad } from '../../utils/timeUtils'
import type { Swimmer } from '../../types'

// Botón + panel para editar el perfil (fecha de nacimiento, objetivo, prueba y marca).
export function EditObjective({ swimmer }: { swimmer: Swimmer }) {
  const updateSwimmer = useStore(s => s.updateSwimmer)
  const [open, setOpen]         = useState(false)
  const [fechaNac, setFechaNac] = useState(swimmer.fechaNacimiento ?? '')
  const [objetivo, setObjetivo] = useState(swimmer.objetivoTemporada)
  const [prueba, setPrueba]     = useState(swimmer.pruebaPrincipal)
  const [marca, setMarca]       = useState(formatRepTime(swimmer.marcaObjetivo))

  const abrir = () => {
    setFechaNac(swimmer.fechaNacimiento ?? '')
    setObjetivo(swimmer.objetivoTemporada)
    setPrueba(swimmer.pruebaPrincipal)
    setMarca(formatRepTime(swimmer.marcaObjetivo))
    setOpen(true)
  }

  const guardar = () => {
    updateSwimmer(swimmer.id, {
      fechaNacimiento:   fechaNac || undefined,
      edad:              fechaNac ? calcularEdad(fechaNac) : swimmer.edad,
      objetivoTemporada: objetivo.trim(),
      pruebaPrincipal:   prueba.trim() || swimmer.pruebaPrincipal,
      marcaObjetivo:     parseRepTime(marca) || swimmer.marcaObjetivo,
    })
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={abrir}
        className="flex items-center gap-1.5 mb-4 text-xs font-semibold text-blue-700"
      >
        <Pencil size={13} /> Editar perfil
      </button>
    )
  }

  const edadPreview = fechaNac ? calcularEdad(fechaNac) : null

  return (
    <Card className="mb-4 border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <Target size={16} className="text-blue-700" />
        <p className="text-sm font-bold text-slate-800">Editar perfil</p>
      </div>
      <div className="flex flex-col gap-3">
        <Field
          label="Fecha de nacimiento"
          hint={edadPreview !== null ? `Edad: ${edadPreview} años` : 'La edad se calcula sola'}
        >
          <Input type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)} />
        </Field>
        <Field label="Objetivo de temporada">
          <Textarea
            value={objetivo}
            onChange={e => setObjetivo(e.target.value)}
            placeholder="Ej: Bajar de 30 segundos en 50m Libre"
          />
        </Field>
        <Field label="Prueba principal">
          <Input value={prueba} onChange={e => setPrueba(e.target.value)} placeholder="Ej: 50m Libre" />
        </Field>
        <Field label="Marca objetivo" hint={`Escribí solo números: 3000 → 30"00`}>
          <TimeInput
            value={marca}
            onChange={setMarca}
            placeholder='30"00'
            className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </Field>
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth icon={<X size={16} />} onClick={() => setOpen(false)}>Cancelar</Button>
          <Button fullWidth icon={<Check size={16} />} onClick={guardar}>Guardar</Button>
        </div>
      </div>
    </Card>
  )
}
