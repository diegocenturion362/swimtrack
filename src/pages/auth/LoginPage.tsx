import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn } from '../../lib/db'
import { useStore } from '../../store/useStore'

export function LoginPage() {
  const navigate  = useNavigate()
  const { userRole, authUserId } = useStore(s => ({
    userRole:    s.userRole,
    authUserId:  s.authUserId,
  }))

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Redirigir si ya tiene sesión
  const loaded = useStore(s => s.loaded)
  useEffect(() => {
    if (!loaded) return
    if (userRole === 'swimmer' && authUserId) navigate(`/nadador/${authUserId}`, { replace: true })
    else if (userRole === 'coach')            navigate('/coach', { replace: true })
    else if (authUserId && !userRole)         navigate('/registro', { replace: true })
  }, [userRole, authUserId, loaded, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) setError(traducirError(err.message))
    // Si no hay error, onAuthStateChange dispara loadAsUser → el useEffect de arriba redirige
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-blue-950 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo / título */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">🏊</span>
          </div>
          <h1 className="text-2xl font-bold text-white">SwimTrack</h1>
          <p className="text-blue-300 text-sm mt-1">Tu entrenamiento, en la nube</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Iniciar sesión</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3 text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Entrar'}
          </button>

          <p className="text-center text-xs text-slate-500 pt-1">
            ¿No tenés cuenta?{' '}
            <Link to="/registro" className="text-blue-600 font-semibold hover:underline">
              Registrarse
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

function traducirError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (msg.includes('Email not confirmed'))       return 'Confirmá tu email antes de ingresar.'
  if (msg.includes('too many requests'))         return 'Demasiados intentos. Esperá unos minutos.'
  return msg
}
