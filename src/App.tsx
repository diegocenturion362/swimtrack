import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './store/useStore'
import { supabaseConfigured } from './lib/supabase'

// Layout
import { BottomNav } from './components/layout/BottomNav'
import { ErrorBoundary } from './components/ErrorBoundary'

// Auth
import { LoginPage }    from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'

// Páginas públicas
import { RoleSelector } from './pages/RoleSelector'

// Coach
import { CoachDashboard }   from './pages/coach/CoachDashboard'
import { SwimmerList }       from './pages/coach/SwimmerList'
import { SwimmerProfile }    from './pages/coach/SwimmerProfile'
import { AddCompetition }    from './pages/coach/AddCompetition'
import { SimilarSessions }   from './pages/coach/SimilarSessions'
import { CoachMarks }        from './pages/coach/CoachMarks'

// Swimmer
import { SwimmerDashboard }   from './pages/swimmer/SwimmerDashboard'
import { MyTrainings }         from './pages/swimmer/MyTrainings'
import { MyMarks }             from './pages/swimmer/MyMarks'
import { MyEvolution }         from './pages/swimmer/MyEvolution'

// Compartido
import { ImportWorkout }          from './pages/shared/ImportWorkout'
import { ImportCompetition }      from './pages/shared/ImportCompetition'
import { BoardTraining }          from './pages/shared/BoardTraining'
import { BoardCompetition }       from './pages/shared/BoardCompetition'
import { ChooseTrainingMethod }   from './pages/shared/ChooseTrainingMethod'
import { ChooseCompetitionMethod }  from './pages/shared/ChooseCompetitionMethod'
import { ImportCompetitionImage }   from './pages/shared/ImportCompetitionImage'

// ─── Guards ───────────────────────────────────────────────────────────────────

const RUTA_NO_AUTH = supabaseConfigured ? '/entrar' : '/'

function RequireCoach({ children }: { children: React.ReactNode }) {
  const { currentRole, loaded } = useStore(s => ({ currentRole: s.currentRole, loaded: s.loaded }))
  if (!loaded) return null
  if (currentRole !== 'coach') return <Navigate to={RUTA_NO_AUTH} replace />
  return <>{children}</>
}

function RequireSwimmer({ children }: { children: React.ReactNode }) {
  const { currentRole, loaded } = useStore(s => ({ currentRole: s.currentRole, loaded: s.loaded }))
  if (!loaded) return null
  if (currentRole !== 'swimmer') return <Navigate to={RUTA_NO_AUTH} replace />
  return <>{children}</>
}

// ─── Redirección raíz (modo Supabase) ────────────────────────────────────────

function RootRedirect() {
  const { userRole, authUserId, loaded } = useStore(s => ({
    userRole:   s.userRole,
    authUserId: s.authUserId,
    loaded:     s.loaded,
  }))
  if (!loaded) return null
  if (userRole === 'swimmer' && authUserId) return <Navigate to={`/nadador/${authUserId}`} replace />
  if (userRole === 'coach')                 return <Navigate to="/coach" replace />
  return <Navigate to="/entrar" replace />
}

// ─── Scroll al top en cada navegación ────────────────────────────────────────

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

// ─── App ─────────────────────────────────────────────────────────────────────

export function App() {
  const { loaded, initAuth } = useStore(s => ({ loaded: s.loaded, initAuth: s.initAuth }))

  useEffect(() => { initAuth() }, [initAuth])

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
            {/* Raíz */}
            <Route path="/" element={
              supabaseConfigured ? <RootRedirect /> : <RoleSelector />
            } />

            {/* Auth */}
            <Route path="/entrar"   element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />

            {/* Coach */}
            <Route path="/coach"                     element={<RequireCoach><CoachDashboard /></RequireCoach>} />
            <Route path="/coach/nadadores"           element={<RequireCoach><SwimmerList /></RequireCoach>} />
            <Route path="/coach/nadadores/:id"       element={<RequireCoach><SwimmerProfile /></RequireCoach>} />
            <Route path="/coach/registrar"           element={<RequireCoach><ChooseTrainingMethod mode="coach" /></RequireCoach>} />
            <Route path="/coach/importar"            element={<RequireCoach><ImportWorkout mode="coach" /></RequireCoach>} />
            <Route path="/coach/tablero"             element={<RequireCoach><BoardTraining mode="coach" /></RequireCoach>} />
            <Route path="/coach/competencia"         element={<RequireCoach><ChooseCompetitionMethod mode="coach" /></RequireCoach>} />
            <Route path="/coach/competencia-importar" element={<RequireCoach><ImportCompetition mode="coach" /></RequireCoach>} />
            <Route path="/coach/competencia-tablero"  element={<RequireCoach><BoardCompetition mode="coach" /></RequireCoach>} />
            <Route path="/coach/competencia-foto"     element={<RequireCoach><ImportCompetitionImage mode="coach" /></RequireCoach>} />
            <Route path="/coach/similares"           element={<RequireCoach><SimilarSessions /></RequireCoach>} />
            <Route path="/coach/marcas"              element={<RequireCoach><CoachMarks /></RequireCoach>} />

            {/* Swimmer */}
            <Route path="/nadador/:id"                         element={<RequireSwimmer><SwimmerDashboard /></RequireSwimmer>} />
            <Route path="/nadador/:id/entrenos"                element={<RequireSwimmer><MyTrainings /></RequireSwimmer>} />
            <Route path="/nadador/:id/marcas"                  element={<RequireSwimmer><MyMarks /></RequireSwimmer>} />
            <Route path="/nadador/:id/evolucion"               element={<RequireSwimmer><MyEvolution /></RequireSwimmer>} />
            <Route path="/nadador/:id/registrar"               element={<RequireSwimmer><ChooseTrainingMethod mode="swimmer" /></RequireSwimmer>} />
            <Route path="/nadador/:id/importar"                element={<RequireSwimmer><ImportWorkout mode="swimmer" /></RequireSwimmer>} />
            <Route path="/nadador/:id/tablero"                 element={<RequireSwimmer><BoardTraining mode="swimmer" /></RequireSwimmer>} />
            <Route path="/nadador/:id/competencia"             element={<RequireSwimmer><ChooseCompetitionMethod mode="swimmer" /></RequireSwimmer>} />
            <Route path="/nadador/:id/competencia-importar"    element={<RequireSwimmer><ImportCompetition mode="swimmer" /></RequireSwimmer>} />
            <Route path="/nadador/:id/competencia-tablero"     element={<RequireSwimmer><BoardCompetition mode="swimmer" /></RequireSwimmer>} />
            <Route path="/nadador/:id/competencia-foto"        element={<RequireSwimmer><ImportCompetitionImage mode="swimmer" /></RequireSwimmer>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <BottomNav />
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
