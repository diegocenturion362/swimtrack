import { useNavigate } from 'react-router-dom'
import { Clipboard, User, Waves } from 'lucide-react'
import { useStore } from '../store/useStore'
import { COACH } from '../data/mockData'

export function RoleSelector() {
  const navigate  = useNavigate()
  const { setRole, swimmers } = useStore(s => ({
    setRole:   s.setRole,
    swimmers:  s.swimmers,
  }))

  const handleCoach = () => {
    setRole('coach')
    navigate('/coach')
  }

  const handleSwimmer = (swimmerId: string) => {
    setRole('swimmer', swimmerId)
    navigate(`/nadador/${swimmerId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-blue-950 flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="mb-6 p-4 bg-blue-700/30 rounded-3xl">
          <Waves size={48} className="text-blue-300" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">SwimTrack</h1>
        <p className="text-blue-300 text-sm mt-2 text-center max-w-xs">
          Registro y análisis de rendimiento en natación
        </p>
      </div>

      {/* Cards de selección */}
      <div className="px-5 pb-12 max-w-md mx-auto w-full">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4 text-center">
          ¿Con qué rol querés entrar?
        </p>

        {/* Entrenador */}
        <button
          onClick={handleCoach}
          className="w-full mb-3 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 rounded-2xl p-5 flex items-center gap-4 text-left transition-all"
        >
          <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
            <Clipboard size={24} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base">Entrar como {COACH.nombre}</p>
            <p className="text-blue-200 text-xs mt-0.5">
              Entrenador · ver nadadores, cargar entrenamientos y analizar evolución
            </p>
          </div>
        </button>

        {/* Divisor */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-slate-500 text-xs">o entrá como nadador</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* Lista de nadadores */}
        <div className="flex flex-col gap-2">
          {swimmers.map(sw => (
            <button
              key={sw.id}
              onClick={() => handleSwimmer(sw.id)}
              className="w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-900 rounded-2xl p-4 flex items-center gap-3 text-left transition-all border border-slate-700"
            >
              <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white font-bold">{sw.nombre.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{sw.nombre}</p>
                <p className="text-slate-400 text-xs">{sw.pruebaPrincipal} · {sw.categoria}</p>
              </div>
              <User size={14} className="text-slate-500 shrink-0" />
            </button>
          ))}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          SwimTrack · v0.1
        </p>
      </div>
    </div>
  )
}
