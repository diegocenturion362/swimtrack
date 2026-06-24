import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea, PoolToggle } from '../../components/ui/FormField'
import { useStore } from '../../store/useStore'
import type { Competition, PoolSize, GeneralFeeling } from '../../types'

const STEPS = ['Evento', 'Resultado', 'Análisis']

export function AddCompetition() {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const { swimmers, addCompetition } = useStore(s => ({
    swimmers:       s.swimmers,
    addCompetition: s.addCompetition,
  }))

  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  // Paso 0
  const [swimmerId, setSwimmerId] = useState(params.get('swimmerId') ?? swimmers[0]?.id ?? '')
  const [torneo, setTorneo]       = useState('')
  const [fecha, setFecha]         = useState(new Date().toISOString().slice(0, 10))
  const [ciudad, setCiudad]       = useState('')
  const [pileta, setPileta]       = useState<PoolSize>('25m')
  const [prueba, setPrueba]       = useState('')
  const [categoria, setCategoria] = useState('')

  // Paso 1
  const [tiempo, setTiempo]         = useState('')
  const [ubicacion, setUbicacion]   = useState('')
  const [sensPrevia, setSensPrevia] = useState<GeneralFeeling>('buena')
  const [sensPost, setSensPost]     = useState<GeneralFeeling>('buena')

  // Paso 2
  const [estrategia, setEstrategia] = useState('')
  const [error, setError]           = useState('')
  const [aprendizaje, setAprendiz]  = useState('')
  const [comentEntren, setComentEnt] = useState('')

  const handleSave = () => {
    const comp: Competition = {
      id:          `comp-${Date.now()}`,
      swimmerId,
      nombreTorneo: torneo,
      fecha,
      ciudad,
      pileta,
      prueba,
      tiempoFinal:  parseFloat(tiempo) || 0,
      parciales:    [],
      ubicacion:    parseInt(ubicacion) || 0,
      categoria,
      sensacionPrevia:    sensPrevia,
      sensacionPosterior: sensPost,
      estrategia,
      errorPrincipal: error,
      aprendizaje,
      comentarioEntrenador: comentEntren,
    }
    addCompetition(comp)
    setDone(true)
    setTimeout(() => navigate(`/coach/nadadores/${swimmerId}`), 1200)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <Check size={32} className="text-emerald-600" />
        </div>
        <p className="text-lg font-bold text-slate-900">¡Competencia registrada!</p>
      </div>
    )
  }

  return (
    <>
      <Header title="Cargar competencia" showBack backTo="/coach" />
      <PageLayout>

        <div className="flex items-center gap-1 mb-5">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= step ? 'bg-blue-700' : 'bg-slate-200'}`} />
          ))}
        </div>
        <p className="text-xs text-slate-400 mb-5 text-center">
          Paso {step + 1}/{STEPS.length} — <span className="font-semibold text-slate-600">{STEPS[step]}</span>
        </p>

        {step === 0 && (
          <button
            onClick={() => navigate('/coach/competencia-importar')}
            className="w-full flex items-center gap-2 p-3 mb-4 rounded-xl border border-blue-200 bg-blue-50 text-left active:scale-[0.99] transition-transform"
          >
            <Sparkles size={16} className="text-blue-700 shrink-0" />
            <span className="text-xs font-semibold text-blue-800">
              ¿Ya tenés el resultado escrito? Pegá el texto y lo cargo solo
            </span>
            <ChevronRight size={16} className="text-blue-400 ml-auto shrink-0" />
          </button>
        )}

        {step === 0 && (
          <div className="flex flex-col gap-4 fade-in">
            <Field label="Nadador" required>
              <Select value={swimmerId} onChange={e => setSwimmerId(e.target.value)}>
                {swimmers.map(sw => <option key={sw.id} value={sw.id}>{sw.nombre}</option>)}
              </Select>
            </Field>
            <Field label="Nombre del torneo" required>
              <Input placeholder="Ej: Torneo Nacional" value={torneo} onChange={e => setTorneo(e.target.value)} />
            </Field>
            <Field label="Fecha" required>
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </Field>
            <Field label="Ciudad">
              <Input placeholder="Ej: Buenos Aires" value={ciudad} onChange={e => setCiudad(e.target.value)} />
            </Field>
            <Field label="Pileta">
              <PoolToggle value={pileta} onChange={setPileta} />
            </Field>
            <Field label="Prueba" required>
              <Input placeholder="Ej: 100m Libre" value={prueba} onChange={e => setPrueba(e.target.value)} />
            </Field>
            <Field label="Categoría">
              <Input placeholder="Ej: Mayores" value={categoria} onChange={e => setCategoria(e.target.value)} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4 fade-in">
            <Field label="Tiempo final (segundos)" required hint="Ejemplo: 58.3 para 58.3s | 122.5 para 2:02.5">
              <Input type="number" placeholder="Ej: 58.30" value={tiempo} onChange={e => setTiempo(e.target.value)} inputMode="decimal" step="0.01" />
            </Field>
            <Field label="Puesto / Posición">
              <Input type="number" placeholder="1" value={ubicacion} onChange={e => setUbicacion(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Sensación previa a la competencia">
              <div className="grid grid-cols-2 gap-2">
                {(['muy buena','buena','regular','mala'] as GeneralFeeling[]).map(s => (
                  <button key={s} type="button" onClick={() => setSensPrevia(s)}
                    className={`py-3 rounded-xl text-sm font-semibold capitalize transition-all ${
                      sensPrevia === s ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Sensación posterior">
              <div className="grid grid-cols-2 gap-2">
                {(['muy buena','buena','regular','mala'] as GeneralFeeling[]).map(s => (
                  <button key={s} type="button" onClick={() => setSensPost(s)}
                    className={`py-3 rounded-xl text-sm font-semibold capitalize transition-all ${
                      sensPost === s ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4 fade-in">
            <Field label="Estrategia aplicada">
              <Textarea placeholder="¿Cuál fue el plan de carrera?" value={estrategia} onChange={e => setEstrategia(e.target.value)} />
            </Field>
            <Field label="Error principal">
              <Textarea placeholder="¿Qué falló o podría mejorar?" value={error} onChange={e => setError(e.target.value)} />
            </Field>
            <Field label="Aprendizaje">
              <Textarea placeholder="¿Qué se lleva para el próximo torneo?" value={aprendizaje} onChange={e => setAprendiz(e.target.value)} />
            </Field>
            <Field label="Comentario del entrenador">
              <Textarea placeholder="Evaluación general de la performance…" value={comentEntren} onChange={e => setComentEnt(e.target.value)} />
            </Field>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button variant="secondary" size="lg" icon={<ChevronLeft size={18} />} onClick={() => setStep(s => s - 1)}>
              Atrás
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button size="lg" fullWidth onClick={() => setStep(s => s + 1)}>
              Siguiente <ChevronRight size={18} />
            </Button>
          ) : (
            <Button size="lg" fullWidth onClick={handleSave}>
              Guardar competencia
            </Button>
          )}
        </div>

      </PageLayout>
    </>
  )
}
