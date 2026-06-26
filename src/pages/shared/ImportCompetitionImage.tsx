import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trophy, Camera, Timer } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PageLayout } from '../../components/layout/PageLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, PoolToggle } from '../../components/ui/FormField'
import { useStore } from '../../store/useStore'
import { parseTiempo, tiempoATexto } from '../../utils/parseCompetition'
import { formatearParciales, todayISO } from '../../utils/timeUtils'
import type { Competition, PoolSize } from '../../types'

interface Props {
  mode: 'coach' | 'swimmer'
}

async function comprimirImagen(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1280
      let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = reject
    img.src = url
  })
}

export function ImportCompetitionImage({ mode }: Props) {
  const navigate = useNavigate()
  const { id: paramId = '' } = useParams<{ id: string }>()
  const { swimmers, addCompetition } = useStore(s => ({
    swimmers:       s.swimmers,
    addCompetition: s.addCompetition,
  }))

  const inputRef = useRef<HTMLInputElement>(null)

  const [swimmerId, setSwimmerId] = useState(mode === 'swimmer' ? paramId : swimmers[0]?.id ?? '')
  const [preview, setPreview]     = useState('')
  const [file, setFile]           = useState<File | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)

  // Campos editables (se rellenan después del análisis)
  const [hayDatos, setHayDatos] = useState(false)
  const [torneo, setTorneo]     = useState('')
  const [fecha, setFecha]       = useState(todayISO())
  const [ciudad, setCiudad]     = useState('')
  const [pileta, setPileta]     = useState<PoolSize>('25m')
  const [prueba, setPrueba]     = useState('')
  const [tiempo, setTiempo]     = useState('')
  const [puesto, setPuesto]     = useState('')
  const [parciales, setParciales] = useState<number[]>([])

  const swimmer  = swimmers.find(s => s.id === swimmerId)
  const tiempoSeg = tiempo ? parseTiempo(tiempo) : 0

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setHayDatos(false)
    setError('')
  }

  const handleAnalizar = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const { base64, mimeType } = await comprimirImagen(file)
      const res = await fetch('/parse-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al analizar la imagen')
        return
      }
      setTorneo(data.torneo ?? '')
      setPrueba(data.prueba ?? '')
      if (data.fecha) setFecha(data.fecha)
      setPuesto(data.puesto ? String(data.puesto) : '')
      setTiempo(data.tiempoFinal ? tiempoATexto(data.tiempoFinal) : '')
      if (data.pileta === '25m' || data.pileta === '50m') setPileta(data.pileta)
      setParciales(Array.isArray(data.parciales) ? data.parciales : [])
      setHayDatos(true)
    } catch {
      setError('Error de conexión. Verificá la red e intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

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
      parciales,
      ubicacion:    parseInt(puesto) || 0,
      categoria:    swimmer?.categoria ?? '',
      sensacionPrevia:    'buena',
      sensacionPosterior: 'buena',
      estrategia:   '',
      errorPrincipal: '',
      aprendizaje:  '',
      comentarioEntrenador: '',
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

  const backTo = mode === 'coach' ? '/coach/competencia' : `/nadador/${paramId}/competencia`

  return (
    <>
      <Header title="Foto de resultado" subtitle="Sacá una captura del Meet Mobile" showBack backTo={backTo} />
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

        {/* Selector de imagen */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="mt-4">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Captura seleccionada"
                className="w-full rounded-2xl object-contain max-h-64 bg-slate-100"
              />
              <button
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-2 right-2 bg-white/90 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-10 flex flex-col items-center gap-3 text-slate-400 active:bg-slate-50 transition-colors"
            >
              <Camera size={36} strokeWidth={1.5} />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600">Tocá para elegir una imagen</p>
                <p className="text-xs mt-0.5">Captura de pantalla o foto del resultado</p>
              </div>
            </button>
          )}
        </div>

        {file && !hayDatos && (
          <Button
            size="lg"
            fullWidth
            className="mt-4"
            icon={loading ? undefined : <Camera size={18} />}
            onClick={handleAnalizar}
            disabled={loading}
          >
            {loading ? 'Analizando imagen…' : 'Analizar foto'}
          </Button>
        )}

        {loading && (
          <div className="mt-4 flex items-center justify-center gap-3 text-slate-500 text-sm">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Claude está leyendo el resultado…
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Resultado y formulario */}
        {hayDatos && (
          <div className="mt-4 fade-in">
            <Card padding="md" className="bg-amber-50 border-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-700 mb-0.5">{prueba || 'Prueba ?'}</p>
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
              {parciales.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3">
                  <Timer size={13} className="text-amber-600 shrink-0" />
                  <p className="text-[11px] font-semibold text-amber-700 leading-relaxed">
                    {formatearParciales(parciales, tiempoSeg)}
                  </p>
                </div>
              )}
            </Card>

            <div className="mt-4 flex flex-col gap-4">
              <Field label="Prueba" required>
                <Input placeholder="Ej: 100m Mariposa" value={prueba} onChange={e => setPrueba(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tiempo final" hint={`56"18  ó  1'23"23`}>
                  <Input placeholder='56"18' value={tiempo} onChange={e => setTiempo(e.target.value)} />
                </Field>
                <Field label="Puesto">
                  <Input type="number" placeholder="1" value={puesto} onChange={e => setPuesto(e.target.value)} inputMode="numeric" />
                </Field>
              </div>
              <Field label="Torneo">
                <Input placeholder="Nombre del torneo" value={torneo} onChange={e => setTorneo(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha">
                  <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
                </Field>
                <Field label="Pileta">
                  <PoolToggle value={pileta} onChange={setPileta} />
                </Field>
              </div>
              <Field label="Ciudad">
                <Input placeholder="Ej: Buenos Aires" value={ciudad} onChange={e => setCiudad(e.target.value)} />
              </Field>
            </div>

            <Button size="lg" fullWidth className="mt-6" icon={<Trophy size={18} />} onClick={handleSave}>
              Guardar competencia
            </Button>
          </div>
        )}

      </PageLayout>
    </>
  )
}
