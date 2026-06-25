import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './store/useStore'

// Layout
import { BottomNav } from './components/layout/BottomNav'
import { ErrorBoundary } from './components/ErrorBoundary'

// Páginas públicas
import { RoleSelector } from './pages/RoleSelector'

// Coach
import { CoachDashboard }   from './pages/coach/CoachDashboard'
import { SwimmerList }       from './pages/coach/SwimmerList'
import { SwimmerProfile }    from './pages/coach/SwimmerProfile'
import { AddTraining }       from './pages/coach/AddTraining'
import { AddCompetition }    from './pages/coach/AddCompetition'
import { SimilarSessions }   from './pages/coach/SimilarSessions'
import { CoachMarks }        from './pages/coach/CoachMarks'

// Swimmer
import { SwimmerDashboard } from './pages/swimmer/SwimmerDashboard'
import { MyTrainings }       from './pages/swimmer/MyTrainings'
import { MyMarks }           from './pages/swimmer/MyMarks'
import { MyEvolution }           from './pages/swimmer/MyEvolution'
import { SwimmerAddTraining }    from './pages/swimmer/SwimmerAddTraining'

// Compartido
import { ImportWorkout }         from './pages/shared/ImportWorkout'
import { ImportCompetition }     from './pages/shared/ImportCompetition'
import { BoardTraining }         from './pages/shared/BoardTraining'
import { BoardCompetition }      from './pages/shared/BoardCompetition'

// ─── Guard de autenticación ──────────────────────────────────────────────────

function RequireCoach({ children }: { children: React.ReactNode }) {
  const role = useStore(s => s.currentRole)
  if (role !== 'coach') return <Navigate to="/" replace />
  return <>{children}</>
}

function RequireSwimmer({ children }: { children: React.ReactNode }) {
  const role = useStore(s => s.currentRole)
  if (role !== 'swimmer') return <Navigate to="/" replace />
  return <>{children}</>
}

// ─── Scroll al top en cada navegación ───────────────────────────────────────

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

// ─── App ─────────────────────────────────────────────────────────────────────

export function App() {
  const loaded            = useStore(s => s.loaded)
  const loadAll           = useStore(s => s.loadAll)
  const subscribeRealtime = useStore(s => s.subscribeRealtime)

  useEffect(() => {
    loadAll()
    subscribeRealtime()
  }, [loadAll, subscribeRealtime])

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-blue-950 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-blue-200 text-sm">Cargando SwimTrack…</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <ScrollTop />
      <ErrorBoundary>
      <div className="bg-slate-50 min-h-screen">
        <Routes>
          {/* Selector de rol */}
          <Route path="/" element={<RoleSelector />} />

          {/* Coach */}
          <Route path="/coach" element={<RequireCoach><CoachDashboard /></RequireCoach>} />
          <Route path="/coach/nadadores" element={<RequireCoach><SwimmerList /></RequireCoach>} />
          <Route path="/coach/nadadores/:id" element={<RequireCoach><SwimmerProfile /></RequireCoach>} />
          <Route path="/coach/registrar" element={<RequireCoach><AddTraining /></RequireCoach>} />
          <Route path="/coach/importar" element={<RequireCoach><ImportWorkout mode="coach" /></RequireCoach>} />
          <Route path="/coach/tablero" element={<RequireCoach><BoardTraining mode="coach" /></RequireCoach>} />
          <Route path="/coach/competencia" element={<RequireCoach><AddCompetition /></RequireCoach>} />
          <Route path="/coach/competencia-importar" element={<RequireCoach><ImportCompetition mode="coach" /></RequireCoach>} />
          <Route path="/coach/competencia-tablero" element={<RequireCoach><BoardCompetition mode="coach" /></RequireCoach>} />
          <Route path="/coach/similares" element={<RequireCoach><SimilarSessions /></RequireCoach>} />
          <Route path="/coach/marcas" element={<RequireCoach><CoachMarks /></RequireCoach>} />

          {/* Swimmer */}
          <Route path="/nadador/:id" element={<RequireSwimmer><SwimmerDashboard /></RequireSwimmer>} />
          <Route path="/nadador/:id/entrenos" element={<RequireSwimmer><MyTrainings /></RequireSwimmer>} />
          <Route path="/nadador/:id/marcas" element={<RequireSwimmer><MyMarks /></RequireSwimmer>} />
          <Route path="/nadador/:id/evolucion"  element={<RequireSwimmer><MyEvolution /></RequireSwimmer>} />
          <Route path="/nadador/:id/registrar" element={<RequireSwimmer><SwimmerAddTraining /></RequireSwimmer>} />
          <Route path="/nadador/:id/importar"  element={<RequireSwimmer><ImportWorkout mode="swimmer" /></RequireSwimmer>} />
          <Route path="/nadador/:id/tablero"   element={<RequireSwimmer><BoardTraining mode="swimmer" /></RequireSwimmer>} />
          <Route path="/nadador/:id/competencia-importar" element={<RequireSwimmer><ImportCompetition mode="swimmer" /></RequireSwimmer>} />
          <Route path="/nadador/:id/competencia-tablero" element={<RequireSwimmer><BoardCompetition mode="swimmer" /></RequireSwimmer>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
      </div>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
