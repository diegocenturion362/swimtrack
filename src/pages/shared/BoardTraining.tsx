import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Check, Table2, Type, Ruler } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea, RPESlider, NutritionSlider, PoolToggle } from '../../components/ui/FormField'
import { TimeInput } from '../../components/ui/TimeInput'
import { MaterialPicker } from '../../components/ui/MaterialPicker'
import { useStore } from '../../store/useStore'
import { buildSimilarityKey } from '../../utils/similarity'
import { parseRepTime, formatRepTime } from '../../utils/timeUtils'
import { STROKES, strokeLabel } from '../../types'
import type {
  TrainingSession, TrainingSet, PoolSize, TrainingType, Stroke,
  GeneralFeeling, PreviousState, Material,
} from '../../types'

const MAX_SERIES = 12
const MAX_REPS   = 30

// ─── Tipos de formulario ─────────────────────────────────────────────────────
// Un "Trabajo" (Bloque) se repite N series y contiene 1 o más "partes".
// Cada parte es N reps × distancia, con su propio material y tiempos.

interface ParteForm {
  id:           string
  estilo:       Stroke
  reps:         string
  distancia:    string
  descReps:     string              // valor del descanso entre reps
  tipoDescReps: 'salida' | 'fijo'  // 'salida'= salís cada X; 'fijo'= descansás X
  materiales:   Material[]
  tiempos:      Record<string, string>  // clave `${serie}_${rep}`
}

interface BloqueForm {
  id:              string
  series:          string
  descSeries:      string
  tipoDescSeries:  'salida' | 'fijo'
  partes:          ParteForm[]
}

const nuevaParte = (): ParteForm => ({
  id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  estilo: 'libre', reps: '', distancia: '', descReps: '',
  tipoDescReps: 'salida', materiales: [], tiempos: {},
})

const nuevoBloque = (): BloqueForm => ({
  id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  series: '', descSeries: '',
  tipoDescSeries: 'salida',
  partes: [nuevaParte()],
})

// ─── Helpers de tiempo/unidades ────────────────────────────────────────────────

function mmssToSeg(txt: string): number {
  if (!txt) return 0
  const p = txt.split(':')
  return p.length === 2 ? (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0) : parseFloat(txt) || 0
}
function formatRest(seg: number): string {
  if (!seg || seg <= 0) return ''
  const m = Math.floor(seg / 60)
  const s = Math.round(seg % 60)
  return m > 0 ? `${m}'${String(s).padStart(2, '0')}"` : `${s}"`
}
const restoEnSeg = (val: string) => parseRepTime(val)
const restoTexto = (val: string) => {
  const seg = Math.round(parseRepTime(val))
  if (seg <= 0) return ''
  return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`
}
function digitosAFormato(digits: string): string {
  if (!digits) return ''
  if (digits.length <= 2) return `${parseInt(digits, 10)}"`
  return `${parseInt(digits.slice(0, -2), 10)}'${digits.slice(-2)}"`
}

// ─── Métricas (puras, a nivel módulo) ──────────────────────────────────────────

function metricasParte(p: ParteForm, S: number) {
  const R = Math.min(parseInt(p.reps) || 0, MAX_REPS)
  const dist = parseFloat(p.distancia) || 0
  const tiempos: number[] = []
  for (let s = 0; s < S; s++)
    for (let r = 0; r < R; r++) {
      const t = parseRepTime(p.tiempos[`${s}_${r}`] ?? '')
      if (t > 0) tiempos.push(t)
    }
  const prom  = tiempos.length ? Math.round(tiempos.reduce((a, c) => a + c, 0) / tiempos.length * 100) / 100 : 0
  const mejor = tiempos.length ? Math.min(...tiempos) : 0
  const peor  = tiempos.length ? Math.max(...tiempos) : 0
  const metros = S * R * dist
  return { R, dist, tiempos, prom, mejor, peor, metros }
}

function seriesDe(b: BloqueForm): number {
  return Math.min(Math.max(parseInt(b.series) || 1, 1), MAX_SERIES)
}
function metrosBloque(b: BloqueForm): number {
  const S = seriesDe(b)
  return b.partes.reduce((a, p) => a + metricasParte(p, S).metros, 0)
}

// ─── Reconstrucción para editar ─────────────────────────────────────────────────

function parteDeSet(set: TrainingSet): ParteForm {
  const tiempos: Record<string, string> = {}
  if (set.tiempos) {
    set.tiempos.forEach((serie, s) =>
      serie.forEach((t, r) => { if (t > 0) tiempos[`${s}_${r}`] = formatRepTime(t) })
    )
  }
  return {
    id:           `p-${set.id}`,
    estilo:       set.estilo,
    reps:         String(set.repeticiones),
    distancia:    String(set.distancia),
    descReps:     set.intervaloSalida ? formatRest(mmssToSeg(set.intervaloSalida)) : '',
    tipoDescReps: set.tipoIntervaloReps ?? 'salida',
    materiales:   set.materiales ?? [],
    tiempos,
  }
}

// Agrupa los sets guardados por "grupo" (Trabajo) y arma los bloques editables
function bloquesDeSets(editSets: TrainingSet[]): BloqueForm[] {
  const grupos = new Map<string, TrainingSet[]>()
  editSets.forEach(s => {
    const g = s.grupo ?? s.id            // sin grupo → cada set es su propio trabajo
    const arr = grupos.get(g) ?? []
    arr.push(s)
    grupos.set(g, arr)
  })
  return Array.from(grupos.entries()).map(([g, sets]) => {
    const first = sets[0]
    return {
      id:             `b-${g}`,
      series:         String(first.series ?? 1),
      descSeries:     first.descanso ? formatRest(mmssToSeg(first.descanso)) : '',
      tipoDescSeries: (first.tipoDescansoSeries ?? 'salida') as 'salida' | 'fijo',
      partes:         sets.map(parteDeSet),
    }
  })
}

interface Props { mode: 'coach' | 'swimmer' }

export function BoardTraining({ mode }: Props) {
  const navigate = useNavigate()
  const { id: paramId = '' } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const editId = params.get('edit')

  const { swimmers, sessions, sets, addSession, addSet, deleteSession } = useStore(s => ({
    swimmers:      s.swimmers,
    sessions:      s.sessions,
    sets:          s.sets,
    addSession:    s.addSession,
    addSet:        s.addSet,
    deleteSession: s.deleteSession,
  }))

  const editSession = editId ? sessions.find(s => s.id === editId) : undefined
  const editSets    = editId ? sets.filter(s => s.trainingSessionId === editId) : []

  // Config general
  const [swimmerId, setSwimmerId] = useState(
    editSession?.swimmerId ?? (mode === 'swimmer' ? paramId : swimmers[0]?.id ?? '')
  )
  const [pileta, setPileta]   = useState<PoolSize>(editSession?.pileta ?? '25m')
  const [distUnit, setDistUnit] = useState<'m' | 'yd'>('m')
  const [fecha, setFecha]     = useState(editSession?.fecha ?? new Date().toISOString().slice(0, 10))
  const [tipo, setTipo]       = useState<TrainingType>(editSession?.tipoEntrenamiento ?? 'mixto')
  const [rpe, setRpe]         = useState(editSession?.rpe ?? 6)
  const [sueno, setSueno]     = useState(String(editSession?.horasSueno ?? 8))
  const [sensacion, setSensacion] = useState<GeneralFeeling>(editSession?.sensacionGeneral ?? 'buena')
  const [estado, setEstado]       = useState<PreviousState>(editSession?.estadoPrevio ?? 'fresco')
  const [comentarioPrevio, setComentarioPrevio] = useState(editSession?.comentarioPrevio ?? '')
  const [comentario, setComentario] = useState(
    editSession ? (mode === 'swimmer' ? editSession.comentarioNadador : editSession.comentarioEntrenador) : ''
  )
  const [alimentacion, setAlimentacion] = useState(editSession?.alimentacion ?? 7)

  const [bloques, setBloques] = useState<BloqueForm[]>(
    editSets.length ? bloquesDeSets(editSets) : [nuevoBloque()]
  )
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)

  const swimmer = swimmers.find(s => s.id === swimmerId)

  // ── Handlers ───────────────────────────────────────────────────────────────
  const updateBloque = (id: string, patch: Partial<BloqueForm>) =>
    setBloques(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b))

  const updateParte = (bId: string, pId: string, patch: Partial<ParteForm>) =>
    setBloques(bs => bs.map(b => b.id !== bId ? b : {
      ...b, partes: b.partes.map(p => p.id === pId ? { ...p, ...patch } : p),
    }))

  const setTiempo = (bId: string, pId: string, s: number, r: number, val: string) =>
    setBloques(bs => bs.map(b => b.id !== bId ? b : {
      ...b, partes: b.partes.map(p =>
        p.id === pId ? { ...p, tiempos: { ...p.tiempos, [`${s}_${r}`]: val } } : p),
    }))

  const addParte = (bId: string) =>
    setBloques(bs => bs.map(b => b.id === bId ? { ...b, partes: [...b.partes, nuevaParte()] } : b))

  const removeParte = (bId: string, pId: string) =>
    setBloques(bs => {
      const b = bs.find(x => x.id === bId)
      if (!b) return bs
      const partesFiltradas = b.partes.filter(p => p.id !== pId)
      if (partesFiltradas.length === 0) {
        // Si quedan 0 partes → eliminar el bloque (o reset si es el único)
        const sinBloque = bs.filter(x => x.id !== bId)
        return sinBloque.length === 0 ? [nuevoBloque()] : sinBloque
      }
      return bs.map(x => x.id === bId ? { ...x, partes: partesFiltradas } : x)
    })

  // ── Totales ──────────────────────────────────────────────────────────────────
  const totalMetros = useMemo(
    () => bloques.reduce((a, b) => a + metrosBloque(b), 0),
    [bloques]
  )

  const duracionMin = useMemo(() => {
    let seg = 0
    for (const b of bloques) {
      const S = seriesDe(b)
      let porSerie = 0
      for (const p of b.partes) {
        const m = metricasParte(p, S)
        const dr = restoEnSeg(p.descReps)
        const nado = m.tiempos.length ? (m.prom * S * m.R) : (m.dist / 100 * 100) * S * m.R
        porSerie += nado + S * m.R * dr
      }
      seg += porSerie + Math.max(0, S - 1) * restoEnSeg(b.descSeries)
    }
    return Math.round(seg / 60)
  }, [bloques])

  const hayDatos = totalMetros > 0

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!hayDatos || !swimmerId) return
    setSaving(true)
    if (editId) deleteSession(editId)
    const sessionId = editId ?? `ses-${Date.now()}`

    const session: TrainingSession = {
      id: sessionId, swimmerId, fecha, pileta,
      tipoEntrenamiento:    tipo,
      volumenTotal:         Math.round(totalMetros),
      duracionMinutos:      duracionMin,
      rpe, horasSueno: parseFloat(sueno) || 8,
      sensacionGeneral: sensacion,
      estadoPrevio:     estado,
      comentarioPrevio:     comentarioPrevio || undefined,
      comentarioNadador:    mode === 'swimmer' ? comentario : (editSession?.comentarioNadador ?? ''),
      comentarioEntrenador: mode === 'coach'   ? comentario : (editSession?.comentarioEntrenador ?? ''),
      alimentacion,
    }
    addSession(session)

    bloques.forEach((b, bi) => {
      const S = seriesDe(b)
      b.partes.forEach((p, pi) => {
        const m = metricasParte(p, S)
        if (m.metros <= 0) return
        const intervalo = restoTexto(p.descReps)
        const clave = buildSimilarityKey(m.R, m.dist, p.estilo, pileta, intervalo)
        const grid: number[][] = []
        for (let s = 0; s < S; s++) {
          const fila: number[] = []
          for (let r = 0; r < m.R; r++) fila.push(parseRepTime(p.tiempos[`${s}_${r}`] ?? ''))
          grid.push(fila)
        }
        const hayTiempos = grid.some(f => f.some(t => t > 0))
        const descansoSeries = restoTexto(b.descSeries)
        const set: TrainingSet = {
          id: `set-${sessionId}-${bi}-${pi}`,
          trainingSessionId: sessionId,
          swimmerId, pileta,
          repeticiones:       m.R,
          distancia:          m.dist,
          series:             S,
          estilo:             p.estilo,
          intervaloSalida:    intervalo,
          tipoIntervaloReps:  intervalo ? p.tipoDescReps : undefined,
          descanso:           descansoSeries,
          tipoDescansoSeries: descansoSeries ? b.tipoDescSeries : undefined,
          orden:              bi * 100 + pi,
          tiempoPromedio:     m.prom,
          mejorTiempo:        m.mejor,
          peorTiempo:         m.peor,
          variacion:          m.peor - m.mejor,
          tiempos:            hayTiempos ? grid : undefined,
          materiales:         p.materiales,
          grupo:              b.partes.length > 1 ? b.id : undefined,
          objetivoSerie:      'resistencia',
          observacionTecnica: '',
          claveSimilitud:     clave,
        }
        addSet(set)
      })
    })

    setTimeout(() => {
      setSaving(false); setDone(true)
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
        <p className="text-sm text-slate-500">{Math.round(totalMetros).toLocaleString('es')} {distUnit === 'yd' ? 'yd' : 'm'} · ~{duracionMin} min</p>
      </div>
    )
  }

  const textRoute = mode === 'coach' ? '/coach/importar' : `/nadador/${paramId}/importar`
  const backTo    = mode === 'coach' ? '/coach' : `/nadador/${paramId}`

  return (
    <>
      <Header title={editId ? 'Editar entrenamiento' : 'Cargar entrenamiento'} subtitle="Modo tablero" showBack backTo={backTo} />
      <PageLayout>

        {/* Toggle de modo */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => navigate(textRoute)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500">
            <Type size={15} /> Texto
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold bg-blue-700 text-white">
            <Table2 size={15} /> Tablero
          </button>
        </div>

        {/* Nadador */}
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

        {/* Config de unidades */}
        <Card padding="sm" className="mt-4 bg-slate-50/50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Unidades</p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <Ruler size={14} className="text-slate-400 shrink-0" />
              <span className="text-xs text-slate-600 w-28 shrink-0">Distancia</span>
              <Seg value={distUnit} onChange={setDistUnit} opciones={[['m', 'metros'], ['yd', 'yardas']]} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 w-28 shrink-0 pl-5">Pileta</span>
              <div className="flex-1"><PoolToggle value={pileta} onChange={setPileta} /></div>
            </div>
          </div>
        </Card>

        {/* Bloques de trabajo */}
        <div className="flex flex-col gap-4 mt-4">
          {bloques.map((b, idx) => (
            <BloqueCard
              key={b.id}
              bloque={b}
              idx={idx}
              distUnit={distUnit}
              onUpdate={patch => updateBloque(b.id, patch)}
              onUpdateParte={(pId, patch) => updateParte(b.id, pId, patch)}
              onTiempo={(pId, s, r, v) => setTiempo(b.id, pId, s, r, v)}
              onAddParte={() => addParte(b.id)}
              onRemoveParte={pId => removeParte(b.id, pId)}
              onRemove={() => setBloques(bs => {
                const sinEste = bs.filter(x => x.id !== b.id)
                return sinEste.length === 0 ? [nuevoBloque()] : sinEste
              })}
            />
          ))}
        </div>

        <Button variant="secondary" fullWidth icon={<Plus size={16} />} className="mt-4"
          onClick={() => setBloques(bs => [...bs, nuevoBloque()])}>
          Agregar trabajo
        </Button>

        {/* Totales */}
        {hayDatos && (
          <Card padding="md" className="mt-5 bg-blue-700 border-blue-700 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-200">Total</p>
              <p className="text-2xl font-black text-white">{Math.round(totalMetros).toLocaleString('es')} {distUnit === 'yd' ? 'yd' : 'm'}</p>
            </div>
            <p className="text-sm font-semibold text-blue-100">~{duracionMin} min</p>
          </Card>
        )}

        <div className="mt-4">
          <Field label={`RPE — Esfuerzo percibido: ${rpe}/10`}>
            <RPESlider value={rpe} onChange={setRpe} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label={`Alimentación del día: ${alimentacion}/10`}>
            <NutritionSlider value={alimentacion} onChange={setAlimentacion} />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </Field>
          <Field label="Horas de sueño">
            <Input type="number" placeholder="8" value={sueno}
              onChange={e => setSueno(e.target.value)} inputMode="decimal" step="0.5" />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Tipo de entrenamiento">
            <Select value={tipo} onChange={e => setTipo(e.target.value as TrainingType)}>
              {(['aeróbico','velocidad','técnica','recuperación','ritmo de prueba','lactato','mixto'] as TrainingType[]).map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Sensaciones (opcional) */}
        <div className="mt-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sensaciones (opcional)</p>
          <div className="flex flex-col gap-3">

            {/* ANTES */}
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

            {/* DESPUÉS */}
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
                <Field label={mode === 'coach' ? 'Comentario del entrenador' : 'Tu comentario'}>
                  <Textarea placeholder="Sensaciones, observaciones, cómo resultó…"
                    value={comentario} onChange={e => setComentario(e.target.value)} />
                </Field>
              </div>
            </div>

          </div>
        </div>

        <Button size="lg" fullWidth loading={saving} disabled={!hayDatos} className="mt-6"
          icon={<Check size={18} />} onClick={handleSave}>
          Guardar entrenamiento{hayDatos ? ` (${Math.round(totalMetros).toLocaleString('es')} ${distUnit === 'yd' ? 'yd' : 'm'})` : ''}
        </Button>

      </PageLayout>
    </>
  )
}

// ─── Toggle segmentado genérico ──────────────────────────────────────────────────

function Seg<T extends string>({ value, onChange, opciones }: {
  value: T; onChange: (v: T) => void; opciones: [T, string][]
}) {
  return (
    <div className="flex gap-1.5 flex-1">
      {opciones.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            value === v ? 'bg-blue-700 text-white' : 'bg-white text-slate-500 border border-slate-200'
          }`}>
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Tarjeta de un Trabajo (con sus partes) ──────────────────────────────────────

function BloqueCard({
  bloque: b, idx, distUnit,
  onUpdate, onUpdateParte, onTiempo, onAddParte, onRemoveParte, onRemove,
}: {
  bloque: BloqueForm
  idx: number
  distUnit: 'm' | 'yd'
  onUpdate: (patch: Partial<BloqueForm>) => void
  onUpdateParte: (pId: string, patch: Partial<ParteForm>) => void
  onTiempo: (pId: string, s: number, r: number, v: string) => void
  onAddParte: () => void
  onRemoveParte: (pId: string) => void
  onRemove: () => void
}) {
  const S = seriesDe(b)
  const metros = metrosBloque(b)
  const variasPartes = b.partes.length > 1
  const distLabel = distUnit === 'yd' ? 'yd' : 'm'

  return (
    <Card padding="sm" className="border-blue-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">Trabajo {idx + 1}</span>
        <button onClick={onRemove} className="p-1 text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
      </div>

      {/* Series del trabajo */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Mini label="Series (repite el trabajo)" value={b.series} onChange={v => onUpdate({ series: v })} placeholder="2" />
        <Mini label="Desc. e/ series" value={b.descSeries} onChange={v => onUpdate({ descSeries: v })} placeholder={`1'00"`} digitTime />
      </div>

      {/* Tipo de descanso entre series */}
      <div className="flex gap-1 mb-3 pb-2 border-b border-slate-100">
        <button type="button" onClick={() => onUpdate({ tipoDescSeries: 'salida' })}
          className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            b.tipoDescSeries !== 'fijo' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
          }`}>Salida cada</button>
        <button type="button" onClick={() => onUpdate({ tipoDescSeries: 'fijo' })}
          className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            b.tipoDescSeries === 'fijo' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
          }`}>Desc. fijo</button>
      </div>

      {/* Partes */}
      <div className="flex flex-col gap-2">
        {b.partes.map((p, pi) => (
          <ParteRow
            key={p.id}
            parte={p}
            idx={pi}
            series={S}
            mostrarTitulo={variasPartes}
            distUnit={distUnit}
            onUpdate={patch => onUpdateParte(p.id, patch)}
            onTiempo={(s, r, v) => onTiempo(p.id, s, r, v)}
            onRemove={() => onRemoveParte(p.id)}
          />
        ))}
      </div>

      <button onClick={onAddParte}
        className="flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-blue-700">
        <Plus size={13} /> Agregar parte a la serie
      </button>

      {/* Resumen del trabajo */}
      {metros > 0 && (
        <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-700">{metros.toLocaleString('es')} {distLabel}</span>
          <span className="text-amber-600">
            {S} {S === 1 ? 'serie' : 'series'} × ({b.partes.map(p => `${p.reps || '?'}×${p.distancia || '?'}`).join(' + ')})
          </span>
        </div>
      )}
    </Card>
  )
}

// ─── Una parte dentro de un Trabajo ──────────────────────────────────────────────

function ParteRow({
  parte: p, idx, series: S, mostrarTitulo, distUnit,
  onUpdate, onTiempo, onRemove,
}: {
  parte: ParteForm
  idx: number
  series: number
  mostrarTitulo: boolean
  distUnit: 'm' | 'yd'
  onUpdate: (patch: Partial<ParteForm>) => void
  onTiempo: (s: number, r: number, v: string) => void
  onRemove: () => void
}) {
  const m = metricasParte(p, S)
  const descLabel = p.tipoDescReps === 'fijo' ? 'Desc. fijo' : 'Salida cada'
  const descPlaceholder = p.tipoDescReps === 'fijo' ? '30"' : `1'30"`

  return (
    <div className={mostrarTitulo ? 'rounded-xl border border-slate-100 p-2.5' : ''}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {mostrarTitulo && (
            <span className="text-[11px] font-bold text-slate-500">Parte {idx + 1}</span>
          )}
          <Select value={p.estilo} onChange={e => onUpdate({ estilo: e.target.value as Stroke })}
            className="!py-1 !px-2 !text-xs !w-auto">
            {STROKES.map(s => <option key={s} value={s}>{strokeLabel[s]}</option>)}
          </Select>
        </div>
        <button onClick={onRemove} className="p-1 text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
      </div>

      {/* Tipo de descanso entre reps */}
      <div className="flex gap-1.5 mb-2">
        <button type="button"
          onClick={() => onUpdate({ tipoDescReps: 'salida' })}
          className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            p.tipoDescReps !== 'fijo' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
          Salida cada
        </button>
        <button type="button"
          onClick={() => onUpdate({ tipoDescReps: 'fijo' })}
          className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            p.tipoDescReps === 'fijo' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
          Descanso fijo
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Mini label="Reps" value={p.reps} onChange={v => onUpdate({ reps: v })} placeholder="5" />
        <Mini label={`Dist. (${distUnit})`} value={p.distancia} onChange={v => onUpdate({ distancia: v })} placeholder="50" />
        <Mini label={descLabel} value={p.descReps} onChange={v => onUpdate({ descReps: v })} placeholder={descPlaceholder} digitTime />
      </div>

      <div className="mt-2">
        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Materiales</label>
        <MaterialPicker value={p.materiales} onChange={v => onUpdate({ materiales: v })} />
      </div>

      {/* Grilla de tiempos: columnas = series, filas = reps */}
      {S > 0 && m.R > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
            Tiempos <span className="text-slate-400 font-normal">— escribí solo números: 2832 → 28"32</span>
          </p>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="border-separate" style={{ borderSpacing: '4px' }}>
              <thead>
                <tr>
                  <th className="w-10"></th>
                  {Array.from({ length: S }, (_, s) => (
                    <th key={s} className="text-[10px] font-semibold text-slate-400 px-1 whitespace-nowrap">Serie {s + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: m.R }, (_, r) => (
                  <tr key={r}>
                    <td className="text-[10px] font-semibold text-slate-400 pr-1 whitespace-nowrap">Rep {r + 1}</td>
                    {Array.from({ length: S }, (_, s) => (
                      <td key={s}>
                        <TimeInput
                          value={p.tiempos[`${s}_${r}`] ?? ''}
                          onChange={v => onTiempo(s, r, v)}
                          placeholder='28"32'
                          className="w-16 px-1.5 py-1.5 rounded-lg border border-slate-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumen de la parte */}
      {m.metros > 0 && (
        <div className="flex items-center gap-2 mt-2 text-xs">
          <span className="font-semibold text-slate-600">{m.metros.toLocaleString('es')} m</span>
          {m.prom > 0 && <span className="text-emerald-600 font-semibold">prom {formatRepTime(m.prom)}</span>}
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, onChange, placeholder, inputMode = 'decimal', digitTime = false }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  digitTime?: boolean
}) {
  const handleKeyDown = digitTime ? (e: React.KeyboardEvent<HTMLInputElement>) => {
    const digits = value.replace(/[^0-9]/g, '')
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault()
      if (digits.length >= 4) return
      onChange(digitosAFormato(digits + e.key))
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      const nd = digits.slice(0, -1)
      onChange(nd ? digitosAFormato(nd) : '')
    } else if (e.key === 'Delete') {
      e.preventDefault()
      onChange('')
    } else if (!['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
    }
  } : undefined

  const handleChange = digitTime ? (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputType = (e.nativeEvent as InputEvent).inputType
    const oldDigits = value.replace(/[^0-9]/g, '')
    if (inputType?.startsWith('delete')) {
      const nd = oldDigits.slice(0, -1)
      onChange(nd ? digitosAFormato(nd) : '')
    } else {
      const newDigits = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
      onChange(newDigits ? digitosAFormato(newDigits) : '')
    }
  } : (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)

  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-500 block mb-1 leading-tight">{label}</label>
      <input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={digitTime ? (e) => { const l = e.target.value.length; e.target.setSelectionRange(l, l) } : undefined}
        inputMode={digitTime ? 'numeric' : inputMode}
        placeholder={placeholder}
        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
