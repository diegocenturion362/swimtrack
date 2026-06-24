import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Check, Trophy, Timer } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea, PoolToggle } from '../../components/ui/FormField'
import { TimeInput } from '../../components/ui/TimeInput'
import { useStore } from '../../store/useStore'
import { tiempoATexto, parseTiempo } from '../../utils/parseCompetition'
import { parseRepTime, formatRepTime } from '../../utils/timeUtils'
import type { Competition, PoolSize, GeneralFeeling, PreviousState } from '../../types'

// ─── Pruebas predefinidas ─────────────────────────────────────────────────────

const PRUEBAS = [
  '25m Libre','50m Libre','100m Libre','200m Libre','400m Libre','800m Libre','1500m Libre',
  '50m Mariposa','100m Mariposa','200m Mariposa',
  '50m Espalda','100m Espalda','200m Espalda',
  '50m Pecho','100m Pecho','200m Pecho',
  '100m Combinado','200m Combinado','400m Combinado',
  '4×50m Libre','4×100m Libre','4×200m Libre','4×50m Combinado','4×100m Combinado',
]

const feelingEmoji: Record<string, string> = {
  'muy buena': '😊', 'buena': '🙂', 'regular': '😐', 'mala': '😔',
}
const stateEmoji: Record<string, string> = {
  'fresco': '⚡', 'cansado': '😴', 'pesado': '🏋️', 'motivado': '🔥', 'bajo de energía': '🪫',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Convierte "28"32" / "28.32" / "1:02.45" a segundos
function parseSplit(val: string): number {
  if (!val.trim()) return 0
  // formato de TimeInput: "2832" → 28.32
  const raw = val.replace(/["""]/g, '.')
  if (raw.includes(':')) {
    const [m, s] = raw.split(':')
    return parseInt(m) * 60 + parseFloat(s || '0')
  }
  return parseFloat(raw) || 0
}

function splitDisplay(seg: number): string {
  if (seg <= 0) return ''
  return tiempoATexto(seg)
}

interface SplitRow { id: string; valor: string }
const nuevoSplit = (): SplitRow => ({
  id: `sp-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
  valor: '',
})

interface Props { mode: 'coach' | 'swimmer' }

export function BoardCompetition({ mode }: Props) {
  const navigate = useNavigate()
  const { id: paramId = '' } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const editId = params.get('edit')

  const { swimmers, competitions, addCompetition, updateCompetition } = useStore(s => ({
    swimmers:         s.swimmers,
    competitions:     s.competitions,
    addCompetition:   s.addCompetition,
    updateCompetition: s.updateCompetition,
  }))

  const editComp = editId ? competitions.find(c => c.id === editId) : undefined

  // ── Estado del formulario ──────────────────────────────────────────────────
  const [swimmerId, setSwimmerId] = useState(
    editComp?.swimmerId ?? (mode === 'swimmer' ? paramId : swimmers[0]?.id ?? '')
  )
  const swimmer = swimmers.find(s => s.id === swimmerId)

  // Datos del evento
  const [pruebaCustom, setPruebaCustom]  = useState(editComp?.prueba ?? '')
  const [pileta, setPileta]              = useState<PoolSize>(editComp?.pileta ?? '25m')
  const [fecha, setFecha]                = useState(editComp?.fecha ?? new Date().toISOString().slice(0, 10))
  const [torneo, setTorneo]              = useState(editComp?.nombreTorneo ?? '')
  const [ciudad, setCiudad]              = useState(editComp?.ciudad ?? '')

  // Pre-carrera
  const [sensacionPrevia, setSensacionPrevia]   = useState<GeneralFeeling>(editComp?.sensacionPrevia ?? 'buena')
  const [estadoPrevio, setEstadoPrevio]         = useState<PreviousState>(editComp?.estadoPrevio ?? 'fresco')
  const [comentarioPrevio, setComentarioPrevio] = useState(editComp?.comentarioPrevio ?? '')
  const [estrategia, setEstrategia]             = useState(editComp?.estrategia ?? '')

  // Splits
  const initSplits = (): SplitRow[] => {
    if (editComp?.parciales.length) {
      return editComp.parciales.map(seg => ({ id: `sp-${seg}`, valor: tiempoATexto(seg) }))
    }
    return [nuevoSplit()]
  }
  const [splits, setSplits] = useState<SplitRow[]>(initSplits)

  // Tiempo final
  const [tiempoFinalTxt, setTiempoFinalTxt] = useState(
    editComp?.tiempoFinal ? tiempoATexto(editComp.tiempoFinal) : ''
  )
  // Auto-suma los splits cuando se modifican y no hay tiempo manual
  const splitsSeg = splits.map(s => parseSplit(s.valor))
  const sumasSplits = splitsSeg.reduce((a, b) => a + b, 0)

  // Post-carrera
  const [puesto, setPuesto]                       = useState(editComp?.ubicacion ? String(editComp.ubicacion) : '')
  const [sensacionPost, setSensacionPost]         = useState<GeneralFeeling>(editComp?.sensacionPosterior ?? 'buena')
  const [comentarioNadador, setComentarioNadador] = useState(editComp?.comentarioNadador ?? '')
  const [aprendizaje, setAprendizaje]             = useState(editComp?.aprendizaje ?? '')
  const [errorPrincipal, setErrorPrincipal]       = useState(editComp?.errorPrincipal ?? '')
  const [comentarioEntrenador, setComentarioEntrenador] = useState(editComp?.comentarioEntrenador ?? '')

  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState(false)

  // ── Tiempo final efectivo ─────────────────────────────────────────────────
  const tiempoFinalSeg = tiempoFinalTxt
    ? parseTiempo(tiempoFinalTxt)
    : (sumasSplits > 0 ? sumasSplits : 0)

  const prueba = pruebaCustom.trim() || '—'
  const hayDatos = prueba !== '—' || tiempoFinalSeg > 0

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!swimmerId) return
    setSaving(true)

    const parcialesSeg = splitsSeg.filter(s => s > 0)
    const comp: Competition = {
      id:              editId ?? `comp-${Date.now()}`,
      swimmerId,
      nombreTorneo:    torneo || 'Competencia',
      fecha,
      ciudad,
      pileta,
      prueba:          prueba !== '—' ? prueba : 'Prueba',
      tiempoFinal:     tiempoFinalSeg,
      parciales:       parcialesSeg,
      ubicacion:       parseInt(puesto) || 0,
      categoria:       swimmer?.categoria ?? '',
      sensacionPrevia,
      estadoPrevio,
      comentarioPrevio: comentarioPrevio || undefined,
      estrategia,
      sensacionPosterior:  sensacionPost,
      comentarioNadador: comentarioNadador || undefined,
      errorPrincipal,
      aprendizaje,
      comentarioEntrenador,
    }

    if (editId) {
      updateCompetition(editId, comp)
    } else {
      addCompetition(comp)
    }

    setTimeout(() => {
      setSaving(false); setDone(true)
      const dest = mode === 'coach'
        ? `/coach/nadadores/${swimmerId}`
        : `/nadador/${swimmerId}/marcas`
      setTimeout(() => navigate(dest), 1200)
    }, 400)
  }

  // ── Éxito ─────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
          <Trophy size={30} className="text-amber-600" />
        </div>
        <p className="text-lg font-bold text-slate-900">
          {editId ? '¡Competencia actualizada!' : '¡Competencia registrada!'}
        </p>
        {tiempoFinalSeg > 0 && (
          <p className="text-sm text-slate-500">{prueba} · {tiempoATexto(tiempoFinalSeg)}</p>
        )}
      </div>
    )
  }

  const backTo = mode === 'coach' ? '/coach' : `/nadador/${paramId}/marcas`

  return (
    <>
      <Header
        title={editId ? 'Editar competencia' : 'Cargar competencia'}
        subtitle="Modo tablero"
        showBack backTo={backTo}
      />
      <PageLayout>

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

        {/* ── DATOS DEL EVENTO ─────────────────────────────────────────────── */}
        <Card padding="sm" className="mt-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Datos de la carrera</p>

          <Field label="Prueba" required>
            <div className="flex gap-2">
              <select
                value={PRUEBAS.includes(pruebaCustom) ? pruebaCustom : '__custom'}
                onChange={e => {
                  if (e.target.value !== '__custom') setPruebaCustom(e.target.value)
                }}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="__custom">Otra…</option>
                {PRUEBAS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {(!PRUEBAS.includes(pruebaCustom) || pruebaCustom === '') && (
              <Input
                placeholder="Ej: 100m Libre"
                value={pruebaCustom}
                onChange={e => setPruebaCustom(e.target.value)}
                className="mt-2"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Fecha">
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </Field>
            <Field label="Pileta">
              <PoolToggle value={pileta} onChange={setPileta} />
            </Field>
          </div>

          <div className="mt-3">
            <Field label="Torneo / Competencia">
              <Input placeholder="Ej: Torneo Nacional" value={torneo} onChange={e => setTorneo(e.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Ciudad">
              <Input placeholder="Ej: Buenos Aires" value={ciudad} onChange={e => setCiudad(e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* ── PRE-CARRERA ──────────────────────────────────────────────────── */}
        <Card padding="sm" className="mt-4 border-blue-100">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Antes de la carrera</p>

          <label className="text-[11px] font-semibold text-slate-500 block mb-1">¿Cómo llegaste?</label>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {(['fresco','cansado','pesado','motivado','bajo de energía'] as PreviousState[]).map(s => (
              <button key={s} type="button" onClick={() => setEstadoPrevio(s)}
                className={`py-2 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                  estadoPrevio === s ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {stateEmoji[s]} {s}
              </button>
            ))}
          </div>

          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Sensación previa</label>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {(['muy buena','buena','regular','mala'] as GeneralFeeling[]).map(s => (
              <button key={s} type="button" onClick={() => setSensacionPrevia(s)}
                className={`py-2 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                  sensacionPrevia === s ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {feelingEmoji[s]} {s}
              </button>
            ))}
          </div>

          <Field label="Estrategia / Plan de carrera">
            <Textarea placeholder="¿Cómo pensabas nadar? Salida, parciales, ritmo…"
              value={estrategia} onChange={e => setEstrategia(e.target.value)} />
          </Field>
          <div className="mt-2">
            <Field label="Comentario previo">
              <Textarea placeholder="Sensaciones, calentamiento, estado físico…"
                value={comentarioPrevio} onChange={e => setComentarioPrevio(e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* ── TIEMPOS ──────────────────────────────────────────────────────── */}
        <Card padding="sm" className="mt-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tiempos</p>

          {/* Splits */}
          <p className="text-[11px] font-semibold text-slate-500 mb-2">
            Parciales <span className="font-normal text-slate-400">— escribí solo números: 2732 → 27"32</span>
          </p>
          <div className="flex flex-col gap-2">
            {splits.map((sp, i) => (
              <div key={sp.id} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 w-16 shrink-0">
                  {i === splits.length - 1 ? `${(i + 1) * (pileta === '50m' ? 50 : 25)}m` : `${(i + 1) * (pileta === '50m' ? 50 : 25)}m`}
                </span>
                <TimeInput
                  value={sp.valor}
                  onChange={v => setSplits(ss => ss.map(s => s.id === sp.id ? { ...s, valor: v } : s))}
                  placeholder='27"32'
                  className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {splitsSeg[i] > 0 && (
                  <span className="text-[11px] font-mono text-blue-700 font-semibold">
                    {tiempoATexto(splitsSeg[i])}
                  </span>
                )}
                <button
                  onClick={() => setSplits(ss => ss.length > 1 ? ss.filter(s => s.id !== sp.id) : ss)}
                  className="ml-auto p-1 text-slate-200 hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setSplits(ss => [...ss, nuevoSplit()])}
            className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-blue-700">
            <Plus size={13} /> Agregar parcial
          </button>

          {/* Resumen splits */}
          {sumasSplits > 0 && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-slate-50 rounded-lg">
              <Timer size={14} className="text-slate-400" />
              <span className="text-xs text-slate-500">Suma parciales:</span>
              <span className="text-sm font-bold text-blue-700">{tiempoATexto(sumasSplits)}</span>
            </div>
          )}

          {/* Tiempo final */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Field label="Tiempo final" hint="Dejalo vacío para usar la suma de parciales">
              <Input
                placeholder={sumasSplits > 0 ? tiempoATexto(sumasSplits) : 'Ej: 58.34 o 1:02.45'}
                value={tiempoFinalTxt}
                onChange={e => setTiempoFinalTxt(e.target.value)}
              />
            </Field>
            {tiempoFinalSeg > 0 && (
              <p className="text-2xl font-black text-slate-900 mt-2 text-center">
                {tiempoATexto(tiempoFinalSeg)}
              </p>
            )}
          </div>
        </Card>

        {/* ── POST-CARRERA ─────────────────────────────────────────────────── */}
        <Card padding="sm" className="mt-4 border-amber-100">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">Después de la carrera</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Puesto">
              <Input type="number" placeholder="Ej: 3" value={puesto}
                onChange={e => setPuesto(e.target.value)} inputMode="numeric" />
            </Field>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Sensación posterior</label>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {(['muy buena','buena','regular','mala'] as GeneralFeeling[]).map(s => (
                  <button key={s} type="button" onClick={() => setSensacionPost(s)}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-all ${
                      sensacionPost === s ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {feelingEmoji[s]} {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Field label="Comentario del nadador">
            <Textarea placeholder="¿Cómo te sentiste? ¿Qué salió bien?"
              value={comentarioNadador} onChange={e => setComentarioNadador(e.target.value)} />
          </Field>
          <div className="mt-2">
            <Field label="Aprendizaje">
              <Textarea placeholder="¿Qué aprendiste? ¿Qué mejorarías?"
                value={aprendizaje} onChange={e => setAprendizaje(e.target.value)} />
            </Field>
          </div>
          <div className="mt-2">
            <Field label="Error principal">
              <Input placeholder="Ej: Vuelta de pared lenta"
                value={errorPrincipal} onChange={e => setErrorPrincipal(e.target.value)} />
            </Field>
          </div>

          {mode === 'coach' && (
            <div className="mt-2">
              <Field label="Comentario del entrenador">
                <Textarea placeholder="Observaciones del entrenador…"
                  value={comentarioEntrenador} onChange={e => setComentarioEntrenador(e.target.value)} />
              </Field>
            </div>
          )}
        </Card>

        <Button
          size="lg" fullWidth loading={saving} disabled={!hayDatos}
          className="mt-6" icon={<Trophy size={18} />}
          onClick={handleSave}
        >
          {editId ? 'Actualizar competencia' : 'Guardar competencia'}
          {tiempoFinalSeg > 0 && ` · ${tiempoATexto(tiempoFinalSeg)}`}
        </Button>

      </PageLayout>
    </>
  )
}
