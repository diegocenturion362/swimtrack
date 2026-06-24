import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Swimmer, TrainingSession, TrainingSet,
  Competition, PersonalBest
} from '../types'
import {
  MOCK_SWIMMERS, MOCK_SESSIONS, MOCK_SETS,
  MOCK_COMPETITIONS, MOCK_PERSONAL_BESTS,
} from '../data/mockData'

// ─── Estado ──────────────────────────────────────────────────────────────────

interface AppState {
  // Rol activo
  currentRole:      'coach' | 'swimmer' | null
  currentSwimmerId: string | null

  // Datos
  swimmers:     Swimmer[]
  sessions:     TrainingSession[]
  sets:         TrainingSet[]
  competitions: Competition[]
  personalBests: PersonalBest[]

  // Acciones – Rol
  setRole:       (role: 'coach' | 'swimmer', swimmerId?: string) => void
  clearRole:     () => void

  // Acciones – Nadadores
  addSwimmer:    (s: Swimmer) => void
  updateSwimmer: (id: string, data: Partial<Swimmer>) => void

  // Acciones – Sesiones
  addSession:    (s: TrainingSession) => void
  updateSession: (id: string, data: Partial<TrainingSession>) => void
  deleteSession: (id: string) => void

  // Acciones – Series
  addSet:        (s: TrainingSet) => void
  deleteSet:     (id: string) => void

  // Acciones – Competencias
  addCompetition:    (c: Competition) => void
  updateCompetition: (id: string, data: Partial<Competition>) => void
  deleteCompetition: (id: string) => void

  // Acciones – Marcas
  addPersonalBest: (pb: PersonalBest) => void

  // Helpers
  getSwimmerSessions:     (swimmerId: string) => TrainingSession[]
  getSwimmerSets:         (swimmerId: string) => TrainingSet[]
  getSwimmerCompetitions: (swimmerId: string) => Competition[]
  getSwimmerBests:        (swimmerId: string) => PersonalBest[]
  getSessionSets:         (sessionId: string) => TrainingSet[]
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentRole:      null,
      currentSwimmerId: null,

      swimmers:      MOCK_SWIMMERS,
      sessions:      MOCK_SESSIONS,
      sets:          MOCK_SETS,
      competitions:  MOCK_COMPETITIONS,
      personalBests: MOCK_PERSONAL_BESTS,

      // Rol
      setRole: (role, swimmerId) =>
        set({ currentRole: role, currentSwimmerId: swimmerId ?? null }),
      clearRole: () =>
        set({ currentRole: null, currentSwimmerId: null }),

      // Nadadores
      addSwimmer: (s) =>
        set(state => ({ swimmers: [...state.swimmers, s] })),
      updateSwimmer: (id, data) =>
        set(state => ({
          swimmers: state.swimmers.map(sw => sw.id === id ? { ...sw, ...data } : sw),
        })),

      // Sesiones
      addSession: (s) =>
        set(state => ({ sessions: [...state.sessions, s] })),
      updateSession: (id, data) =>
        set(state => ({
          sessions: state.sessions.map(ss => ss.id === id ? { ...ss, ...data } : ss),
        })),
      deleteSession: (id) =>
        set(state => ({
          sessions: state.sessions.filter(ss => ss.id !== id),
          sets:     state.sets.filter(s => s.trainingSessionId !== id),
        })),

      // Series
      addSet: (s) =>
        set(state => ({ sets: [...state.sets, s] })),
      deleteSet: (id) =>
        set(state => ({ sets: state.sets.filter(s => s.id !== id) })),

      // Competencias
      addCompetition: (c) =>
        set(state => ({ competitions: [...state.competitions, c] })),
      updateCompetition: (id, data) =>
        set(state => ({
          competitions: state.competitions.map(c => c.id === id ? { ...c, ...data } : c),
        })),
      deleteCompetition: (id) =>
        set(state => ({ competitions: state.competitions.filter(c => c.id !== id) })),

      // Marcas
      addPersonalBest: (pb) =>
        set(state => ({ personalBests: [...state.personalBests, pb] })),

      // Helpers
      getSwimmerSessions: (swimmerId) =>
        get().sessions.filter(s => s.swimmerId === swimmerId)
          .sort((a, b) => b.fecha.localeCompare(a.fecha)),
      getSwimmerSets: (swimmerId) =>
        get().sets.filter(s => s.swimmerId === swimmerId),
      getSwimmerCompetitions: (swimmerId) =>
        get().competitions.filter(c => c.swimmerId === swimmerId)
          .sort((a, b) => b.fecha.localeCompare(a.fecha)),
      getSwimmerBests: (swimmerId) =>
        get().personalBests.filter(pb => pb.swimmerId === swimmerId)
          .sort((a, b) => a.tiempo - b.tiempo),
      getSessionSets: (sessionId) =>
        get().sets.filter(s => s.trainingSessionId === sessionId),
    }),
    {
      name:    'swimtrack-storage-v3',
      storage: createJSONStorage(() => localStorage),
      // No persistir el rol entre sesiones (cada apertura pide selección)
      partialize: (state) => ({
        swimmers:      state.swimmers,
        sessions:      state.sessions,
        sets:          state.sets,
        competitions:  state.competitions,
        personalBests: state.personalBests,
      }),
    }
  )
)
