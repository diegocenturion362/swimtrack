import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Sparkles, Check, Clock, Ruler, ChevronDown, ChevronUp, Wand2, Repeat, Type, Table2,
} from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea, RPESlider, NutritionSlider, PoolToggle } from '../../components/ui/FormField'
import { useStore } from '../../store/useStore'
import { parseWorkout } from '../../utils/parseWorkout'
import { buildSimilarityKey } from '../../utils/similarity'
import { formatRepTime } from '../../utils/timeUtils'
import { strokeLabel } from '../../types'
import type {
  TrainingSession, TrainingSet, PoolSize, TrainingType, GeneralFeeling, PreviousState,
} from '../../types'

const EJEMPLO = `2 de Junio de 2026

Skill
Másters
6 x 100 ez gear

1 round
4 x 50 (vel Max) @2 dive

Long distance
1 round
8 x 50 @1'30s progresivo

Velocidad
5 x 6 x 7m @5" / 4'
2x (5x10 @5" + 25 @20")

Sprinters
1 or 2 rounds
4 x 25 @50s con manoplas y patas
200 ez

10 x 50 A1 material libre @1' gear`

interface Props {
  mode: 'coach' | 'swimmer'
}

export function ImportWorkout({ mode }: Props) {
  const navigate = useNavigate()
  const { id: paramId = '' } = useParams<{ id: string }>()
  const { swimmers, addSession, addSet } = useStore(s => ({
    swimmers:   s.swimmers,
    addSession: s.addSession,
    addSet:     s.addSet,
  }))

  const [texto, setTexto]   = useState('')
  const [ritmo, setRitmo]   = useState(100)         // s/100m
  const [swimmerId, setSwimmerId] = useState(
    mode === 'swimmer' ? paramId : swimmers[0]?.id ?? ''
  )
  const [pileta, setPileta] = useState<PoolSize>('25m')
  const [fecha, setFecha]   = useState(new Date().toISOString().slice(0, 10))
  const [fechaTocada, setFechaTocada] = useState(false)
  const [rpe, setRpe]           = useState(6)
  const [alimentacion, setAlimentacion] = useState(7)
  const [sueno, setSueno]       = useState('8')
  const [tipo, setTipo]         = useState<TrainingType>('mixto')
  const [sensacion, setSensacion] = useState<GeneralFeeling>('buena')
  const [estado, setEstado]       = useState<PreviousState>('fresco')
  const [comentarioPrevio, setComentarioPrevio] = useState('')
  const [comentario, setComentario] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState(false)
  const [verNotas, setVerNotas] = useState(false)
  // Rounds elegidos por el usuario para bloques ambiguos: { [bloqueId]: rounds }
  const [roundsElegidos, setRoundsElegidos] = useState<Record<number, number>>({})

  // Parseo en vivo (depende del texto y del ritmo)
  const parsed = useMemo(() => parseWorkout(texto, { ritmoPer100: ritmo }), [texto, ritmo])

  // Resetear elecciones de rounds al cambiar el texto
  useEffect(() => { setRoundsElegidos({}) }, [texto])

  // Sincronizar tipo con la detección automática (salvo que el usuario lo cambie)
  useEffect(() => { setTipo(tipoAuto) }, [tipoAuto])

  // Si el texto trae una fecha y el usuario no la tocó manualmente, la usamos
  useEffect(() => {
    if (parsed.fecha && !fechaTocada) setFecha(parsed.fecha)
  }, [parsed.fecha, fechaTocada])

  const bloqueMap = useMemo(
    () => new Map(parsed.bloques.map(b => [b.id, b])),
    [parsed.bloques]
  )

  // Recalcula metros/duración aplicando los rounds elegidos por bloque
  const calc = useMemo(() => {
    const roundsDe = (bloqueId: number, base: number) =>
      bloqueId >= 0 ? (roundsElegidos[bloqueId] ?? bloqueMap.get(bloqueId)?.roundsDetectados ?? base) : base

    let metros = 0, segundos = 0
    const primerSetDeBloque = new Map<number, number>()
    const filas = parsed.sets.map((s, idx) => {
      const r = roundsDe(s.bloqueId, s.rounds)
      const m = s.metrosPorRound * r
      metros   += m
      segundos += s.segundosPorRound * r
      if (s.bloqueId >= 0 && !primerSetDeBloque.has(s.bloqueId)) primerSetDeBloque.set(s.bloqueId, idx)
      return { set: s, idx, rounds: r, metros: m }
    })

    const secMap = new Map<string, number>()
    filas.forEach(({ set, metros }) => {
      const k = set.seccion || 'General'
      secMap.set(k, (secMap.get(k) ?? 0) + metros)
    })

    return {
      metros,
      minutos: Math.round(segundos / 60),
      filas,
      primerSetDeBloque,
      secciones: Array.from(secMap.entries()).map(([nombre, metros]) => ({ nombre, metros })),
    }
  }, [parsed, roundsElegidos, bloqueMap])

  const swimmer = swimmers.find(s => s.id === swimmerId)
  const hayDatos = parsed.sets.length > 0

  // Tipo de entrenamiento aproximado según intensidades detectadas
  const tipoAuto: TrainingType = useMemo(() => {
    const ints = parsed.sets.map(s => s.intensidad.toLowerCase())
    if (ints.some(i => i.includes('máx') || i.includes('vel'))) return 'velocidad'
    if (ints.length > 0 && ints.every(i => i.includes('a1') || i === '')) return 'aeróbico'
    return 'mixto'
  }, [parsed.sets])

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!hayDatos || !swimmerId) return
    setSaving(true)
    const sessionId = `ses-${Date.now()}`

    const session: TrainingSession = {
      id: sessionId, swimmerId, fecha, pileta,
      tipoEntrenamiento:    tipo,
      volumenTotal:         calc.metros,
      duracionMinutos:      calc.minutos,
      rpe,
      alimentacion,
      horasSueno:           parseFloat(sueno) || 8,
      sensacionGeneral:     sensacion,
      estadoPrevio:         estado,
      comentarioPrevio:     comentarioPrevio || undefined,
      comentarioNadador:    comentario,
      comentarioEntrenador: texto.trim(),
    }
    addSession(session)

    parsed.sets.forEach((s, i) => {
      const clave = buildSimilarityKey(s.reps, s.distancia, s.estilo, pileta, s.intervaloTexto)
      const set: TrainingSet = {
        id:                `set-${Date.now()}-${i}`,
        trainingSessionId: sessionId,
        swimmerId,
        pileta,
        repeticiones:      s.reps,
        distancia:         s.distancia,
        series:            s.series,
        estilo:            s.estilo,
        intervaloSalida:   s.intervaloTexto,
        tipoIntervaloReps: s.intervaloTexto ? s.tipoIntervalo : undefined,
        descanso:          s.descansoTexto,
        tiempoPromedio:    s.tiempoPromedio,
        mejorTiempo:       s.mejorTiempo,
        peorTiempo:        s.peorTiempo,
        variacion:         s.peorTiempo - s.mejorTiempo,
        tiempos:           s.tiempos.length ? [s.tiempos] : undefined,
        materiales:        s.materiales,
        grupo:             s.grupo,
        orden:             i,
        objetivoSerie:     'resistencia',
        observacionTecnica: s.descripcion,
        claveSimilitud:    clave,
      }
      addSet(set)
    })

    setTimeout(() => {
      setSaving(false)
      setDone(true)
      const dest = mode === 'coach' ? `/coach/nadadores/${swimmerId}` : `/nadador/${swimmerId}`
      setTimeout(() => navigate(dest), 1200)
    }, 500)
  }

  // ── Pantalla de éxito ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <Check size={32} className="text-emerald-600" />
        </div>
        <p className="text-lg font-bold text-slate-900">¡Entrenamiento guardado!</p>
        <p className="text-sm text-slate-500">
          {calc.metros.toLocaleString('es')} m · ~{calc.minutos} min
        </p>
      </div>
    )
  }

  const backTo = mode === 'coach' ? '/coach' : `/nadador/${paramId}`

  return (
    <>
      <Header title="Pegar entrenamiento" subtitle="Escribí o pegá el texto" showBack backTo={backTo} />
      <PageLayout>

        {/* Toggle de modo */}
        <div className="flex gap-2 mb-4">
          <button
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold bg-blue-700 text-white">
            <Type size={15} /> Texto
          </button>
          <button
            onClick={() => navigate(mode === 'coach' ? '/coach/tablero' : `/nadador/${paramId}/tablero`)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500">
            <Table2 size={15} /> Tablero
          </button>
        </div>

        {/* Selector / chip de nadador */}
        {mode === 'coach' ? (
          <Field label="Nadador" required>
            <Select value={swimmerId} onChange={e => setSwimmerId(e.target.value)}>
              {swimmers.map(sw => <option key={sw.id} value={sw.id}>{sw.nombre}</option>)}
            </Select>
          </Field>
        ) : swimmer && (
          <div className="flex items-center gap-2 mb-1 px-3 py-2 bg-blue-50 rounded-xl">
            <div className="w-7 h-7 bg-blue-700 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">{swimmer.nombre.charAt(0)}</span>
            </div>
            <span className="text-sm font-semibold text-blue-800">{swimmer.nombre}</span>
          </div>
        )}

        {/* Textarea principal */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-slate-700">Texto del entrenamiento</label>
            {texto === '' && (
              <button
                onClick={() => setTexto(EJEMPLO)}
                className="text-xs text-blue-700 font-semibold flex items-center gap-1"
              >
                <Wand2 size={13} /> Probar ejemplo
              </button>
            )}
          </div>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={10}
            placeholder={"Pegá el mensaje del coach tal como te lo mandó (WhatsApp, notas, etc.).\n\nEj:\n8 x 50 @1'30s libre\n4 x 100 ez gear\n200 ez"}
            className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          />
        </div>

        {/* Datos de la sesión — siempre visibles */}
        <div className="mt-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <Input type="date" value={fecha}
                onChange={e => { setFecha(e.target.value); setFechaTocada(true) }} />
            </Field>
            <Field label="Pileta">
              <PoolToggle value={pileta} onChange={setPileta} />
            </Field>
          </div>
          <Field label={`RPE — Esfuerzo percibido: ${rpe}/10`}>
            <RPESlider value={rpe} onChange={setRpe} />
          </Field>
          <Field label={`Alimentación del día: ${alimentacion}/10`}>
            <NutritionSlider value={alimentacion} onChange={setAlimentacion} />
          </Field>
          <Field label="Horas de sueño previas">
            <Input type="number" placeholder="8" value={sueno}
              onChange={e => setSueno(e.target.value)} inputMode="decimal" step="0.5" />
          </Field>
          <Field label="Tipo de entrenamiento">
            <Select value={tipo} onChange={e => setTipo(e.target.value as TrainingType)}>
              {(['aeróbico','velocidad','técnica','recuperación','ritmo de prueba','lactato','mixto'] as TrainingType[]).map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Sensaciones — siempre visibles */}
        <div className="mt-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sensaciones (opcional)</p>
          <div className="flex flex-col gap-3">

            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Antes del entreno</p>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">¿Cómo llegaste?</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['fresco','cansado','pesado','motivado','bajo de energía'] as PreviousState[]).map(s => (
                    <button key={s} type="button" onClick={() => setEstado(s)}
                      className={`py-2 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                        estado === s ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="mt-2">
                <Field label="Comentario previo">
                  <Textarea placeholder="Cómo te sentís antes, qué te propones…"
                    value={comentarioPrevio} onChange={e => setComentarioPrevio(e.target.value)} />
                </Field>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Después del entreno</p>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Sensación general</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['muy buena','buena','regular','mala'] as GeneralFeeling[]).map(s => (
                    <button key={s} type="button" onClick={() => setSensacion(s)}
                      className={`py-2 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                        sensacion === s ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="mt-2">
                <Field label="Tu comentario">
                  <Textarea placeholder="Sensaciones, observaciones, cómo resultó…"
                    value={comentario} onChange={e => setComentario(e.target.value)} />
                </Field>
              </div>
            </div>

          </div>
        </div>

        {/* Resultado en vivo — solo cuando hay series */}
        {hayDatos && (
          <div className="mt-4 fade-in">
            {/* Totales */}
            <div className="grid grid-cols-2 gap-3">
              <Card padding="md" className="bg-blue-700 border-blue-700">
                <div className="flex items-center gap-1.5 text-blue-200 mb-1">
                  <Ruler size={15} /><span className="text-xs font-semibold">Metros totales</span>
                </div>
                <p className="text-3xl font-black text-white leading-none">
                  {calc.metros.toLocaleString('es')}
                </p>
                <p className="text-[11px] text-blue-200 mt-1">{parsed.sets.length} series detectadas</p>
              </Card>
              <Card padding="md">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Clock size={15} /><span className="text-xs font-semibold">Duración estim.</span>
                </div>
                <p className="text-3xl font-black text-slate-900 leading-none">
                  ~{calc.minutos}<span className="text-base font-bold text-slate-400"> min</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">a {ritmo}s / 100m</p>
              </Card>
            </div>

            {/* Ritmo estimado */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-600">Ritmo para estimar (s/100m)</span>
                <span className="text-xs font-bold text-blue-700">{ritmo}s</span>
              </div>
              <input
                type="range" min={70} max={140} step={5}
                value={ritmo} onChange={e => setRitmo(parseInt(e.target.value))}
                className="w-full accent-blue-700"
              />
              <p className="text-[11px] text-slate-400">
                Solo afecta la duración de los nados sin intervalo marcado (@).
              </p>
            </div>

            {/* Desglose por sección */}
            <div className="mt-4 flex flex-col gap-3">
              {calc.secciones.map(sec => {
                const filasSec = calc.filas.filter(f => (f.set.seccion || 'General') === sec.nombre)
                return (
                  <Card key={sec.nombre} padding="sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                        {sec.nombre}
                      </p>
                      <p className="text-xs font-bold text-blue-700 shrink-0">{sec.metros.toLocaleString('es')} m</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {filasSec.map(({ set: s, idx, rounds: r, metros: m }) => {
                        const bloque = s.bloqueId >= 0 ? bloqueMap.get(s.bloqueId) : undefined
                        const mostrarToggle = bloque?.ambiguo && calc.primerSetDeBloque.get(s.bloqueId) === idx
                        return (
                          <div key={idx}>
                            {mostrarToggle && bloque && (
                              <div className="flex items-center gap-2 mb-1.5 mt-0.5">
                                <Repeat size={13} className="text-amber-600" />
                                <span className="text-[11px] font-semibold text-slate-500">¿Cuántos rounds?</span>
                                <div className="flex gap-1">
                                  {Array.from(
                                    { length: bloque.roundsMax - bloque.roundsMin + 1 },
                                    (_, k) => bloque.roundsMin + k
                                  ).map(n => (
                                    <button
                                      key={n}
                                      onClick={() => setRoundsElegidos(prev => ({ ...prev, [s.bloqueId]: n }))}
                                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                        r === n ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                                      }`}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-bold text-slate-800 tabular-nums">
                                {s.tipo === 'serie'
                                  ? (s.series > 1 ? `${s.series}×${s.reps}×${s.distancia}` : `${s.reps}×${s.distancia}`)
                                  : `${s.distancia}`}
                              </span>
                              {r > 1 && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">×{r}</span>}
                              <span className="text-slate-400 text-xs">{strokeLabel[s.estilo]}</span>
                              {s.intervaloTexto && (
                                <span className="text-[11px] text-slate-400">
                                  {s.tipoIntervalo === 'fijo' ? 'c/' : '@'}{s.intervaloTexto}{s.descansoTexto ? ` / ${s.descansoTexto}` : ''}
                                </span>
                              )}
                              {s.intensidad && <span className="text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">{s.intensidad}</span>}
                              {s.tiempoPromedio > 0 && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  prom {formatRepTime(s.tiempoPromedio)}
                                </span>
                              )}
                              <span className="ml-auto text-xs font-semibold text-slate-500 tabular-nums">{m} m</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* Líneas no reconocidas */}
            {parsed.notas.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setVerNotas(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"
                >
                  {verNotas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {parsed.notas.length} líneas no contadas (notas, indicaciones)
                </button>
                {verNotas && (
                  <div className="mt-2 flex flex-col gap-1 pl-2 border-l-2 border-slate-200">
                    {parsed.notas.map((n, i) => (
                      <p key={i} className="text-xs text-slate-400 font-mono">{n}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              size="lg" fullWidth loading={saving} className="mt-6"
              icon={<Sparkles size={18} />}
              onClick={handleSave}
            >
              Guardar entrenamiento ({calc.metros.toLocaleString('es')} m)
            </Button>
          </div>
        )}

        {!hayDatos && texto !== '' && (
          <p className="mt-4 text-sm text-slate-400 text-center">
            No se detectaron series todavía. Probá con un formato como <span className="font-mono">8 x 50</span>.
          </p>
        )}

      </PageLayout>
    </>
  )
}
