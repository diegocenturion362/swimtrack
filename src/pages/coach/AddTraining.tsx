import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, Sparkles } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea, RPESlider, PoolToggle } from '../../components/ui/FormField'
import { MaterialPicker } from '../../components/ui/MaterialPicker'
import { useStore } from '../../store/useStore'
import { buildSimilarityKey } from '../../utils/similarity'
import { STROKES, strokeLabel } from '../../types'
import type {
  TrainingSession, TrainingSet, PoolSize, TrainingType,
  GeneralFeeling, PreviousState, Stroke, Material, SetObjective
} from '../../types'

// ─── Tipos de formulario ─────────────────────────────────────────────────────

interface SetForm {
  repeticiones:   string
  distancia:      string
  estilo:         Stroke
  intervaloSalida: string
  descanso:       string
  tiempoPromedio: string
  mejorTiempo:    string
  peorTiempo:     string
  materiales:     Material[]
  objetivoSerie:  SetObjective
  observacion:    string
}

const emptySet = (): SetForm => ({
  repeticiones: '', distancia: '', estilo: 'libre',
  intervaloSalida: '', descanso: '', tiempoPromedio: '',
  mejorTiempo: '', peorTiempo: '', materiales: [],
  objetivoSerie: 'ritmo de competencia', observacion: '',
})

const STEPS = ['Sesión', 'Carga', 'Sensaciones', 'Series']

export function AddTraining() {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const { swimmers, sessions, addSession, addSet } = useStore(s => ({
    swimmers:   s.swimmers,
    sessions:   s.sessions,
    addSession: s.addSession,
    addSet:     s.addSet,
  }))

  const [step, setStep]       = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  // ── Paso 1: Sesión ──
  const [swimmerId, setSwimmerId]       = useState(params.get('swimmerId') ?? swimmers[0]?.id ?? '')
  const [fecha, setFecha]               = useState(new Date().toISOString().slice(0, 10))
  const [pileta, setPileta]             = useState<PoolSize>('25m')
  const [tipo, setTipo]                 = useState<TrainingType>('aeróbico')

  // ── Paso 2: Carga ──
  const [volumen, setVolumen]           = useState('')
  const [duracion, setDuracion]         = useState('')
  const [rpe, setRpe]                   = useState(6)
  const [sueno, setSueno]               = useState('8')

  // ── Paso 3: Sensaciones ──
  const [sensacion, setSensacion]       = useState<GeneralFeeling>('buena')
  const [estado, setEstado]             = useState<PreviousState>('fresco')
  const [comentNadador, setComentNad]   = useState('')
  const [comentEntren, setComentEnt]    = useState('')

  // ── Paso 4: Series ──
  const [sets, setSets]                 = useState<SetForm[]>([])
  const [editingSet, setEditingSet]     = useState<SetForm | null>(null)
  const [editingIdx, setEditingIdx]     = useState<number | null>(null)

  // ── Guardar ──────────────────────────────────────────────────────────────
  const handleSave = () => {
    setLoading(true)
    const sessionId = `ses-${Date.now()}`
    const newSession: TrainingSession = {
      id: sessionId, swimmerId, fecha, pileta,
      tipoEntrenamiento: tipo,
      volumenTotal:    parseInt(volumen) || 0,
      duracionMinutos: parseInt(duracion) || 0,
      rpe, horasSueno: parseFloat(sueno) || 8,
      sensacionGeneral: sensacion, estadoPrevio: estado,
      comentarioNadador: comentNadador,
      comentarioEntrenador: comentEntren,
    }
    addSession(newSession)

    sets.forEach((s, i) => {
      const rep  = parseInt(s.repeticiones) || 1
      const dist = parseInt(s.distancia) || 50
      const clave = buildSimilarityKey(rep, dist, s.estilo, pileta, s.intervaloSalida)
      const newSet: TrainingSet = {
        id: `set-${Date.now()}-${i}`,
        trainingSessionId: sessionId,
        swimmerId,
        pileta,
        repeticiones:    rep,
        distancia:       dist,
        estilo:          s.estilo,
        intervaloSalida: s.intervaloSalida,
        descanso:        s.descanso,
        tiempoPromedio:  parseFloat(s.tiempoPromedio) || 0,
        mejorTiempo:     parseFloat(s.mejorTiempo) || 0,
        peorTiempo:      parseFloat(s.peorTiempo) || 0,
        variacion:       (parseFloat(s.peorTiempo) || 0) - (parseFloat(s.mejorTiempo) || 0),
        materiales:      s.materiales,
        objetivoSerie:   s.objetivoSerie,
        observacionTecnica: s.observacion,
        claveSimilitud:  clave,
      }
      addSet(newSet)
    })

    setTimeout(() => {
      setLoading(false)
      setDone(true)
      setTimeout(() => navigate(`/coach/nadadores/${swimmerId}`), 1200)
    }, 600)
  }

  // ── Pantalla de éxito ─────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <Check size={32} className="text-emerald-600" />
        </div>
        <p className="text-lg font-bold text-slate-900">¡Entrenamiento guardado!</p>
        <p className="text-sm text-slate-500">Redirigiendo al perfil…</p>
      </div>
    )
  }

  return (
    <>
      <Header title="Cargar entrenamiento" showBack backTo="/coach" />
      <PageLayout>

        {/* Indicador de pasos */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`flex-1 h-1 rounded-full transition-all ${i <= step ? 'bg-blue-700' : 'bg-slate-200'}`} />
              {i === STEPS.length - 1 && null}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mb-4 text-center">
          Paso {step + 1} de {STEPS.length} — <span className="font-semibold text-slate-600">{STEPS[step]}</span>
        </p>

        {/* Atajo: pegar texto */}
        {step === 0 && (
          <button
            onClick={() => navigate('/coach/importar')}
            className="w-full flex items-center gap-2 p-3 mb-4 rounded-xl border border-blue-200 bg-blue-50 text-left active:scale-[0.99] transition-transform"
          >
            <Sparkles size={16} className="text-blue-700 shrink-0" />
            <span className="text-xs font-semibold text-blue-800">
              ¿Ya tenés el entreno escrito? Pegá el texto y calculo todo solo
            </span>
            <ChevronRight size={16} className="text-blue-400 ml-auto shrink-0" />
          </button>
        )}

        {/* ── Paso 0: Sesión ─────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="flex flex-col gap-4 fade-in">
            <Field label="Nadador" required>
              <Select value={swimmerId} onChange={e => setSwimmerId(e.target.value)}>
                {swimmers.map(sw => (
                  <option key={sw.id} value={sw.id}>{sw.nombre}</option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha" required>
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </Field>
            <Field label="Pileta">
              <PoolToggle value={pileta} onChange={setPileta} />
            </Field>
            <Field label="Tipo de entrenamiento">
              <Select value={tipo} onChange={e => setTipo(e.target.value as TrainingType)}>
                {(['aeróbico','velocidad','técnica','recuperación','ritmo de prueba','lactato','mixto'] as TrainingType[]).map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {/* ── Paso 1: Carga ──────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-4 fade-in">
            <Field label="Volumen total (metros)" required>
              <Input type="number" placeholder="Ej: 5000" value={volumen} onChange={e => setVolumen(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Duración (minutos)">
              <Input type="number" placeholder="Ej: 90" value={duracion} onChange={e => setDuracion(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label={`RPE — Esfuerzo percibido: ${rpe}/10`} required>
              <RPESlider value={rpe} onChange={setRpe} />
            </Field>
            <Field label="Horas de sueño previas">
              <Input type="number" placeholder="8" value={sueno} onChange={e => setSueno(e.target.value)} inputMode="decimal" step="0.5" />
            </Field>
          </div>
        )}

        {/* ── Paso 2: Sensaciones ────────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-4 fade-in">
            <Field label="Sensación general">
              <div className="grid grid-cols-2 gap-2">
                {(['muy buena','buena','regular','mala'] as GeneralFeeling[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSensacion(s)}
                    className={`py-3 rounded-xl text-sm font-semibold capitalize transition-all ${
                      sensacion === s ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Estado previo al entrenamiento">
              <div className="grid grid-cols-2 gap-2">
                {(['fresco','cansado','pesado','motivado','bajo de energía'] as PreviousState[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEstado(s)}
                    className={`py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                      estado === s ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Comentario del nadador">
              <Textarea
                placeholder="¿Cómo se sintió durante el entrenamiento?"
                value={comentNadador}
                onChange={e => setComentNad(e.target.value)}
              />
            </Field>
            <Field label="Comentario del entrenador">
              <Textarea
                placeholder="Observaciones técnicas, ajustes, evaluación…"
                value={comentEntren}
                onChange={e => setComentEnt(e.target.value)}
              />
            </Field>
          </div>
        )}

        {/* ── Paso 3: Series ─────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col gap-4 fade-in">
            <p className="text-xs text-slate-500">
              Registrá las series principales. Se generará una clave de similitud automática para comparar en el futuro.
            </p>

            {/* Series agregadas */}
            {sets.map((s, i) => {
              const clave = buildSimilarityKey(parseInt(s.repeticiones)||1, parseInt(s.distancia)||50, s.estilo, pileta, s.intervaloSalida)
              return (
                <Card key={i} padding="sm" className="border-blue-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {s.repeticiones}x{s.distancia}m {s.estilo}
                      </p>
                      <p className="text-xs text-slate-500">Promedio: {s.tiempoPromedio}s · Int: {s.intervaloSalida}</p>
                      <p className="text-xs text-blue-600 mt-0.5 font-mono">{clave}</p>
                    </div>
                    <button
                      onClick={() => setSets(sets.filter((_, j) => j !== i))}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              )
            })}

            {/* Editor de serie */}
            {editingSet !== null ? (
              <Card className="border-blue-200 bg-blue-50">
                <p className="text-sm font-bold text-slate-800 mb-3">Nueva serie</p>
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Repeticiones">
                      <Input type="number" placeholder="8" value={editingSet.repeticiones}
                        onChange={e => setEditingSet({ ...editingSet, repeticiones: e.target.value })} inputMode="numeric" />
                    </Field>
                    <Field label="Distancia (m)">
                      <Input type="number" placeholder="50" value={editingSet.distancia}
                        onChange={e => setEditingSet({ ...editingSet, distancia: e.target.value })} inputMode="numeric" />
                    </Field>
                  </div>
                  <Field label="Estilo">
                    <Select value={editingSet.estilo} onChange={e => setEditingSet({ ...editingSet, estilo: e.target.value as Stroke })}>
                      {STROKES.map(s => (
                        <option key={s} value={s}>{strokeLabel[s]}</option>
                      ))}
                    </Select>
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Intervalo salida">
                      <Input placeholder="Ej: 1:30" value={editingSet.intervaloSalida}
                        onChange={e => setEditingSet({ ...editingSet, intervaloSalida: e.target.value })} />
                    </Field>
                    <Field label="Descanso">
                      <Input placeholder="Ej: 0:30" value={editingSet.descanso}
                        onChange={e => setEditingSet({ ...editingSet, descanso: e.target.value })} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="T. Promedio (s)">
                      <Input type="number" placeholder="65.3" value={editingSet.tiempoPromedio}
                        onChange={e => setEditingSet({ ...editingSet, tiempoPromedio: e.target.value })} inputMode="decimal" />
                    </Field>
                    <Field label="Mejor (s)">
                      <Input type="number" placeholder="63.1" value={editingSet.mejorTiempo}
                        onChange={e => setEditingSet({ ...editingSet, mejorTiempo: e.target.value })} inputMode="decimal" />
                    </Field>
                    <Field label="Peor (s)">
                      <Input type="number" placeholder="67.5" value={editingSet.peorTiempo}
                        onChange={e => setEditingSet({ ...editingSet, peorTiempo: e.target.value })} inputMode="decimal" />
                    </Field>
                  </div>
                  <Field label="Materiales">
                    <MaterialPicker value={editingSet.materiales}
                      onChange={v => setEditingSet({ ...editingSet, materiales: v })} />
                  </Field>
                  <Field label="Objetivo de la serie">
                    <Select value={editingSet.objetivoSerie} onChange={e => setEditingSet({ ...editingSet, objetivoSerie: e.target.value as SetObjective })}>
                      {(['velocidad','resistencia','técnica','ritmo de competencia','control'] as SetObjective[]).map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Observación técnica">
                    <Textarea placeholder="Correcciones, puntos fuertes, sensaciones…"
                      value={editingSet.observacion}
                      onChange={e => setEditingSet({ ...editingSet, observacion: e.target.value })} />
                  </Field>
                  <div className="flex gap-2">
                    <Button variant="secondary" fullWidth onClick={() => setEditingSet(null)}>Cancelar</Button>
                    <Button fullWidth onClick={() => {
                      setSets([...sets, editingSet])
                      setEditingSet(null)
                    }}>
                      Agregar serie
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Button
                variant="secondary"
                fullWidth
                icon={<Plus size={16} />}
                onClick={() => setEditingSet(emptySet())}
              >
                Agregar serie principal
              </Button>
            )}
          </div>
        )}

        {/* ── Navegación entre pasos ─────────────────────────────────────── */}
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
            <Button size="lg" fullWidth loading={loading} onClick={handleSave}>
              Guardar entrenamiento
            </Button>
          )}
        </div>

      </PageLayout>
    </>
  )
}
