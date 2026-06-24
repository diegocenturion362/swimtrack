import type {
  Swimmer, TrainingSession, TrainingSet,
  Competition, PersonalBest
} from '../types'

// ─── Entrenador ──────────────────────────────────────────────────────────────
export const COACH = { id: 'renan', nombre: 'Renan Amaral' }

// ─── Nadadores ───────────────────────────────────────────────────────────────
// Datos reales del usuario. El perfil se puede ajustar (avisar para cambiar).
export const MOCK_SWIMMERS: Swimmer[] = [
  {
    id: 'diego',
    nombre: 'Diego Centurión',
    edad: 35,
    sexo: 'masculino',
    categoria: 'Másters',
    especialidad: 'libre',
    pruebaPrincipal: '50m Libre',
    piletaHabitual: '25m',
    marcaObjetivo: 30.0,
    objetivoTemporada: 'Mejorar marcas en categoría Másters',
    entrenadorId: COACH.id,
  },
]

// ─── Sin datos cargados: empezamos en blanco con anotaciones reales ──────────
export const MOCK_SESSIONS:       TrainingSession[] = []
export const MOCK_SETS:           TrainingSet[]     = []
export const MOCK_COMPETITIONS:   Competition[]     = []
export const MOCK_PERSONAL_BESTS: PersonalBest[]    = []
