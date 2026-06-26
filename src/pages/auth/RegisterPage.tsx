import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { signUp, upsertSwimmer, upsertCoach } from '../../lib/db'
import { useStore } from '../../store/useStore'
import type { Swimmer, Coach, Stroke, PoolSize } from '../../types'
import { STROKES, strokeLabel } from '../../types'

type Rol   = 'swimmer' | 'coach'
type Etapa = 'rol' | 'perfil' | 'exito'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularCategoria(fechaNac: string): string {
  if (!fechaNac) return ''
  const edadAlCierreAnio = new Date().getFullYear() - new Date(fechaNac).getFullYear()
  if (edadAlCierreAnio <= 12) return 'Menores'
  if (edadAlCierreAnio <= 14) return 'Cadetes'
  if (edadAlCierreAnio <= 16) return 'Juveniles A'
  if (edadAlCierreAnio <= 18) return 'Juveniles B'
  return 'Mayores'
}

function calcularEdad(fechaNac: string): number {
  if (!fechaNac) return 0
  const hoy = new Date()
  const nac = new Date(fechaNac)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function RegisterPage() {
  const navigate  = useNavigate()
  const { initAuth, authUserId } = useStore(s => ({ initAuth: s.initAuth, authUserId: s.authUserId }))

  const [etapa,    setEtapa]    = useState<Etapa>('rol')
  const [rol,      setRol]      = useState<Rol>('swimmer')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [codigo,   setCodigo]   = useState('')

  // ── Campos comunes ────────────────────────────────────────────────────────
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [showPass2, setShowPass2] = useState(false)
  const [nombre,    setNombre]    = useState('')

  // ── Coach ─────────────────────────────────────────────────────────────────
  const [clubEquipo, setClubEquipo] = useState('')

  // ── Nadador ───────────────────────────────────────────────────────────────
  const [fechaNac,     setFechaNac]     = useState('')
  const [sexo,         setSexo]         = useState<'masculino' | 'femenino'>('masculino')
  const [especialidad, setEspecialidad] = useState<Stroke>('libre')
  const [prueba,       setPrueba]       = useState('')
  const [pileta,       setPileta]       = useState<PoolSize>('25m')
  const [marcaMin,     setMarcaMin]     = useState('')
  const [marcaSeg,     setMarcaSeg]     = useState('')
  const [marcaCs,      setMarcaCs]      = useState('')
  const [objetivo,     setObjetivo]     = useState('')

  // ── Validación contraseñas ────────────────────────────────────────────────
  const passNoCoincide = password2 !== '' && password !== password2

  async function handleRegistrar(e: React.FormEvent) {
    e.preventDefault()
    if (password !== password2) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 6)   { setError('La contraseña debe tener al menos 6 caracteres.'); return }

    setError('')
    setLoading(true)

    const { data: authData, error: authErr } = await signUp(email, password)
    if (authErr) { setError(traducirError(authErr.message)); setLoading(false); return }

    const uid = authData.user?.id
    if (!uid) { setError('No se pudo crear la cuenta. Intentá de nuevo.'); setLoading(false); return }

    if (!authData.session) {
      setLoading(false)
      setEtapa('exito')
      return
    }

    if (rol === 'coach') {
      const coach: Coach = { id: uid, nombre, clubEquipo }
      await upsertCoach(coach)
    } else {
      const marcaObjetivo =
        (parseInt(marcaMin || '0') * 60) +
        parseFloat(marcaSeg || '0') +
        parseFloat(marcaCs  || '0') / 100

      const swimmer: Swimmer = {
        id:                uid,
        nombre,
        edad:              calcularEdad(fechaNac),
        fechaNacimiento:   fechaNac || undefined,
        sexo,
        categoria:         calcularCategoria(fechaNac),
        especialidad,
        pruebaPrincipal:   prueba,
        piletaHabitual:    pileta,
        marcaObjetivo,
        objetivoTemporada: objetivo,
        entrenadorId:      '',
      }
      await upsertSwimmer(swimmer)

      const { data: row } = await supabase
        .from('swimmers')
        .select('codigo_acceso')
        .eq('id', uid)
        .maybeSingle()
      setCodigo((row as any)?.codigo_acceso ?? '')
    }

    await initAuth()
    setLoading(false)
    setEtapa('exito')
  }

  // ── Pantalla: elegir rol ──────────────────────────────────────────────────

  if (etapa === 'rol') {
    return (
      <Contenedor>
        <h2 className="text-lg font-bold text-slate-800 mb-1">¿Cómo vas a usar SwimTrack?</h2>
        <p className="text-xs text-slate-500 mb-5">Podés cambiarlo más tarde desde tu perfil.</p>
        <div className="flex flex-col gap-3 mb-6">
          <BtnRol activo={rol === 'swimmer'} onClick={() => setRol('swimmer')}
            emoji="🏊" titulo="Soy nadador/a" desc="Registrá tus entrenamientos y seguí tu evolución." />
          <BtnRol activo={rol === 'coach'}   onClick={() => setRol('coach')}
            emoji="📋" titulo="Soy entrenador/a" desc="Gestioná tu equipo y cargá entrenamientos." />
        </div>
        <button onClick={() => setEtapa('perfil')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3 text-sm transition-colors">
          Continuar
        </button>
        <p className="text-center text-xs text-slate-500 pt-3">
          ¿Ya tenés cuenta?{' '}
          <Link to="/entrar" className="text-blue-600 font-semibold hover:underline">Iniciá sesión</Link>
        </p>
      </Contenedor>
    )
  }

  // ── Pantalla: éxito ───────────────────────────────────────────────────────

  if (etapa === 'exito') {
    const needsConfirm = rol === 'swimmer' && !codigo && !authUserId
    if (needsConfirm) {
      return (
        <Contenedor>
          <div className="text-center">
            <div className="text-4xl mb-4">📧</div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Revisá tu email</h2>
            <p className="text-sm text-slate-600 mb-6">
              Te enviamos un link de confirmación. Una vez que confirmes tu cuenta, podrás iniciar sesión.
            </p>
            <Link to="/entrar" className="block w-full bg-blue-600 text-white font-semibold rounded-lg py-3 text-sm text-center">
              Ir a iniciar sesión
            </Link>
          </div>
        </Contenedor>
      )
    }

    return (
      <Contenedor>
        <div className="text-center">
          <div className="text-4xl mb-4">{rol === 'swimmer' ? '🏊' : '📋'}</div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">¡Bienvenido/a, {nombre}!</h2>
          {rol === 'swimmer' && codigo && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
              <p className="text-xs text-blue-700 font-semibold mb-1">TU CÓDIGO DE ACCESO</p>
              <p className="text-3xl font-bold font-mono tracking-widest text-blue-800 mb-1">{codigo}</p>
              <p className="text-xs text-blue-600">
                Compartilo con tu entrenador/a para que pueda ver tu perfil y cargarte entrenamientos.
              </p>
            </div>
          )}
          {rol === 'coach' && (
            <p className="text-sm text-slate-600 mb-5">
              Tu cuenta está lista. Desde el dashboard podés vincular nadadores ingresando su código.
            </p>
          )}
          <button
            onClick={() => {
              if (rol === 'swimmer' && authUserId) navigate(`/nadador/${authUserId}`)
              else navigate('/coach')
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3 text-sm transition-colors"
          >
            Ir a la app
          </button>
        </div>
      </Contenedor>
    )
  }

  // ── Pantalla: formulario de perfil ────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-blue-950 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-sm mx-auto">
        <button onClick={() => setEtapa('rol')} className="text-blue-300 text-sm mb-4 flex items-center gap-1">
          ← Volver
        </button>
        <form onSubmit={handleRegistrar} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">
            {rol === 'swimmer' ? 'Crear cuenta de nadador/a' : 'Crear cuenta de entrenador/a'}
          </h2>

          <Campo label="Nombre completo">
            <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
              className={INPUT} placeholder="Juan Pérez" />
          </Campo>

          {rol === 'coach' && (
            <Campo label="Club / equipo">
              <input type="text" required value={clubEquipo} onChange={e => setClubEquipo(e.target.value)}
                className={INPUT} placeholder="Club Natación Ejemplo" />
            </Campo>
          )}

          {rol === 'swimmer' && (
            <>
              <Campo label="Fecha de nacimiento">
                <input type="date" required value={fechaNac} onChange={e => setFechaNac(e.target.value)}
                  className={INPUT} />
                {fechaNac && (
                  <p className="text-xs text-slate-400 mt-1">
                    {calcularEdad(fechaNac)} años · Categoría: {calcularCategoria(fechaNac)}
                  </p>
                )}
              </Campo>

              <Campo label="Sexo">
                <select value={sexo} onChange={e => setSexo(e.target.value as 'masculino' | 'femenino')} className={INPUT}>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                </select>
              </Campo>

              <Campo label="Especialidad (estilo)">
                <select value={especialidad} onChange={e => setEspecialidad(e.target.value as Stroke)} className={INPUT}>
                  {STROKES.map(s => <option key={s} value={s}>{strokeLabel[s]}</option>)}
                </select>
              </Campo>

              <Campo label="Prueba principal" hint="ej: 100m Libre, 200m Pecho">
                <input type="text" required value={prueba} onChange={e => setPrueba(e.target.value)}
                  className={INPUT} placeholder="100m Libre" />
              </Campo>

              <Campo label="Pileta habitual">
                <select value={pileta} onChange={e => setPileta(e.target.value as PoolSize)} className={INPUT}>
                  <option value="25m">25m</option>
                  <option value="50m">50m</option>
                </select>
              </Campo>

              <Campo label="Marca objetivo" hint="Opcional">
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <input type="number" min="0" max="99" value={marcaMin}
                      onChange={e => setMarcaMin(e.target.value)}
                      className={INPUT + ' text-center'} placeholder="min" />
                    <p className="text-[10px] text-slate-400 text-center mt-0.5">min</p>
                  </div>
                  <span className="text-slate-400 font-bold mb-4">:</span>
                  <div className="flex-1">
                    <input type="number" min="0" max="59" value={marcaSeg}
                      onChange={e => setMarcaSeg(e.target.value)}
                      className={INPUT + ' text-center'} placeholder="seg" />
                    <p className="text-[10px] text-slate-400 text-center mt-0.5">seg</p>
                  </div>
                  <span className="text-slate-400 font-bold mb-4">.</span>
                  <div className="flex-1">
                    <input type="number" min="0" max="99" value={marcaCs}
                      onChange={e => setMarcaCs(e.target.value)}
                      className={INPUT + ' text-center'} placeholder="cs" />
                    <p className="text-[10px] text-slate-400 text-center mt-0.5">cs</p>
                  </div>
                </div>
              </Campo>

              <Campo label="Objetivo de temporada" hint="Opcional">
                <input type="text" value={objetivo} onChange={e => setObjetivo(e.target.value)}
                  className={INPUT} placeholder="Bajar al 58'' en los 100m" />
              </Campo>
            </>
          )}

          {/* ── Credenciales ── */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-3">CREDENCIALES DE ACCESO</p>
            <div className="space-y-4">
              <Campo label="Email">
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className={INPUT} autoComplete="email" placeholder="tu@email.com" />
              </Campo>

              <Campo label="Contraseña">
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={INPUT + ' pr-10'} autoComplete="new-password" placeholder="Mín. 6 caracteres" />
                  <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Campo>

              <Campo label="Repetir contraseña">
                <div className="relative">
                  <input type={showPass2 ? 'text' : 'password'} required value={password2}
                    onChange={e => setPassword2(e.target.value)}
                    className={INPUT + ' pr-10 ' + (passNoCoincide ? 'border-red-400 ring-1 ring-red-300' : '')}
                    autoComplete="new-password" placeholder="••••••••" />
                  <button type="button" tabIndex={-1} onClick={() => setShowPass2(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass2 ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passNoCoincide && (
                  <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                )}
              </Campo>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading || passNoCoincide}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3 text-sm transition-colors disabled:opacity-60">
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const INPUT = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

function Campo({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label} {hint && <span className="font-normal text-slate-400">— {hint}</span>}
      </label>
      {children}
    </div>
  )
}

function Contenedor({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-blue-950 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        {children}
      </div>
    </div>
  )
}

function BtnRol({ activo, onClick, emoji, titulo, desc }: {
  activo: boolean; onClick: () => void; emoji: string; titulo: string; desc: string
}) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
        activo ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
      }`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <p className="font-semibold text-slate-800 text-sm">{titulo}</p>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
    </button>
  )
}

function traducirError(msg: string): string {
  if (msg.includes('already registered')) return 'Ya existe una cuenta con ese email.'
  if (msg.includes('weak_password'))      return 'La contraseña es muy débil.'
  if (msg.includes('invalid email'))      return 'El email no es válido.'
  return msg
}
