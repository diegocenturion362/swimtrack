import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trophy, Check, Wand2, Timer } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, PoolToggle } from '../../components/ui/FormField'
import { useStore } from '../../store/useStore'
import { parseCompetition, parseMeetMobile, isMeetMobile, parseTiempo, tiempoATexto } from '../../utils/parseCompetition'
import type { Competition, PoolSize } from '../../types'

const EJEMPLO = `Torneo Nacional
15 de Mayo de 2026
100m Libre
Final: 58.34
Parciales: 27.80 / 30.54
Puesto 3`

interface Props {
  mode: 'coach' | 'swimmer'
}

export function ImportCompetition({ mode }: Props) {
  const navigate = useNavigate()
  const { id: paramId = '' } = useParams<{ id: string }>()
  const { swimmers, addCompetition } = useStore(s => ({
    swimmers:       s.swimmers,
    addCompetition: s.addCompetition,
  }))

  const [texto, setTexto] = useState('')
  const [swimmerId, setSwimmerId] = useState(mode === 'swimmer' ? paramId : swimmers[0]?.id ?? '')
  const [done, setDone] = useState(false)

  // Campos editables
  const [torneo, setTorneo]     = useState('')
  const [fecha, setFecha]       = useState(new Date().toISOString().slice(0, 10))
  const [ciudad, setCiudad]     = useState('')
  const [pileta, setPileta]     = useState<PoolSize>('25m')
  const [prueba, setPrueba]     = useState('')
  const [tiempo, setTiempo]     = useState('')   // texto: "1:02.45" o "58.3"
  const [puesto, setPuesto]     = useState('')
  const [tocado, setTocado]     = useState(false)

  const esMeetMobile = useMemo(() => isMeetMobile(texto), [texto])
  const parsed       = useMemo(
    () => esMeetMobile ? parseMeetMobile(texto) : parseCompetition(texto),
    [texto, esMeetMobile],
  )

  // Mientras el usuario no edite manualmente, los campos siguen al parseo en vivo
  useEffect(() => {
    if (tocado) return
    setTorneo(parsed.nombreTorneo)
    setCiudad(parsed.ciudad)
    setPrueba(parsed.prueba)
    setTiempo(parsed.tiempoTexto)
    setPuesto(parsed.puesto ? String(parsed.puesto) : '')
    if (parsed.fecha) setFecha(parsed.fecha)
    if (parsed.pileta) setPileta(parsed.pileta)
  }, [parsed, tocado])

  const edit = <T,>(setter: (v: T) => void) => (v: T) => { setTocado(true); setter(v) }

  const swimmer = swimmers.find(s => s.id === swimmerId)
  const hayDatos = parsed.tiempoFinal > 0 || parsed.prueba !== ''
  const tiempoSeg = tiempo ? parseTiempo(tiempo) : 0

  const handleSave = () => {
    if (!swimmerId) return
    const comp: Competition = {
      id:           `comp-${Date.now()}`,
      swimmerId,
      nombreTorneo: torneo || 'Competencia',
      fecha,
      ciudad,
      pileta,
      prueba:       prueba || 'Prueba',
      tiempoFinal:  tiempoSeg,
      parciales:    parsed.parciales,
      ubicacion:    parseInt(puesto) || 0,
      categoria:    swimmer?.categoria ?? '',
      sensacionPrevia:    'buena',
      sensacionPosterior: 'buena',
      estrategia:   '',
      errorPrincipal: '',
      aprendizaje:  '',
      comentarioEntrenador: texto.trim(),
    }
    addCompetition(comp)
    setDone(true)
    const dest = mode === 'coach' ? `/coach/nadadores/${swimmerId}` : `/nadador/${swimmerId}/marcas`
    setTimeout(() => navigate(dest), 1200)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
          <Trophy size={30} className="text-amber-600" />
        </div>
        <p className="text-lg font-bold text-slate-900">¡Competencia registrada!</p>
        {tiempoSeg > 0 && <p className="text-sm text-slate-500">{prueba} · {tiempoATexto(tiempoSeg)}</p>}
      </div>
    )
  }

  const backTo = mode === 'coach' ? '/coach' : `/nadador/${paramId}/marcas`

  return (
    <>
      <Header title="Pegar competencia" subtitle="Escribí o pegá el resultado" showBack backTo={backTo} />
      <PageLayout>

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

        {/* Textarea */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-slate-700">Texto de la competencia</label>
            {texto === '' && (
              <button
                onClick={() => { setTocado(false); setTexto(EJEMPLO) }}
                className="text-xs text-blue-700 font-semibold flex items-center gap-1"
              >
                <Wand2 size={13} /> Probar ejemplo
              </button>
            )}
          </div>
          <textarea
            value={texto}
            onChange={e => { setTexto(e.target.value) }}
            rows={7}
            placeholder={"Pegá el resultado. Ej:\n\nTorneo Nacional\n15 de Mayo de 2026\n100m Libre\nFinal: 58.34\nParciales: 27.8 / 30.5\nPuesto 3"}
            className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          />
        </div>

        {hayDatos && (
          <div className="mt-4 fade-in">
            {/* Resultado detectado */}
            <Card padding="md" className="bg-amber-50 border-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-amber-700">{prueba || 'Prueba ?'}</p>
                    {esMeetMobile && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full leading-none">
                        Meet Mobile
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-black text-slate-900 leading-tight">
                    {tiempoSeg > 0 ? tiempoATexto(tiempoSeg) : '—'}
                  </p>
                </div>
                {puesto && (
                  <div className="text-center">
                    <p className="text-2xl font-black text-amber-600 leading-none">#{puesto}</p>
                    <p className="text-[10px] text-amber-500 font-semibold mt-0.5">puesto</p>
                  </div>
                )}
              </div>
              {parsed.parciales.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  <Timer size={13} className="text-amber-600" />
                  {parsed.parcialesTexto.map((p, i) => (
                    <span key={i} className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {/* Campos editables */}
            <div className="mt-4 flex flex-col gap-4">
              <Field label="Prueba" required>
                <Input placeholder="Ej: 100m Libre" value={prueba} onChange={e => edit(setPrueba)(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tiempo final" hint='56"18  ó  1\'23"23'>
                  <Input placeholder='56"18' value={tiempo} onChange={e => edit(setTiempo)(e.target.value)} />
                </Field>
                <Field label="Puesto" hint={esMeetMobile ? 'Puesto en serie' : undefined}>
                  <Input type="number" placeholder="3" value={puesto} onChange={e => edit(setPuesto)(e.target.value)} inputMode="numeric" />
                </Field>
              </div>
              <Field label="Torneo">
                <Input placeholder="Ej: Torneo Nacional" value={torneo} onChange={e => edit(setTorneo)(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha">
                  <Input type="date" value={fecha} onChange={e => edit(setFecha)(e.target.value)} />
                </Field>
                <Field label="Pileta">
                  <PoolToggle value={pileta} onChange={edit(setPileta)} />
                </Field>
              </div>
              <Field label="Ciudad">
                <Input placeholder="Ej: Buenos Aires" value={ciudad} onChange={e => edit(setCiudad)(e.target.value)} />
              </Field>
            </div>

            <Button size="lg" fullWidth className="mt-6" icon={<Trophy size={18} />} onClick={handleSave}>
              Guardar competencia
            </Button>
          </div>
        )}

        {!hayDatos && texto !== '' && (
          <p className="mt-4 text-sm text-slate-400 text-center">
            No se detectó la prueba ni el tiempo. Asegurate de incluir algo como
            <span className="font-mono"> 100m libre</span> y <span className="font-mono">58.34</span>.
          </p>
        )}

      </PageLayout>
    </>
  )
}
