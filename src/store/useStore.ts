import { create } from 'zustand'
import type {
  Swimmer, TrainingSession, TrainingSet,
  Competition, PersonalBest
} from '../types'
import { MOCK_SWIMMERS } from '../data/mockData'
import { supabaseConfigured } from '../lib/supabase'
import * as db from '../lib/db'

// Para suscribir el realtime una sola vez (React monta dos veces en dev)
let realtimeIniciado = false

// ─── Estado ──────────────────────────────────────────────────────────────────

interface AppState {
  // Rol activo (vive solo en este dispositivo, no se guarda)
  currentRole:      'coach' | 'swimmer' | null
  currentSwimmerId: string | null

  // Carga inicial
  loaded:  boolean

  // Datos (cache en memoria; la fuente de verdad es Supabase)
  swimmers:     Swimmer[]
  sessions:     TrainingSession[]
  sets:         TrainingSet[]
  competitions: Competition[]
  personalBests: PersonalBest[]

  // Carga / sincronización
  loadAll:          () => Promise<void>
  subscribeRealtime: () => void

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

export const useStore = create<AppState>()((set, get) => ({
  currentRole:      null,
  currentSwimmerId: null,
  loaded:           false,

  swimmers:      [],
  sessions:      [],
  sets:          [],
  competitions:  [],
  personalBests: [],

  // ── Carga / sync ──────────────────────────────────────────────────────────
  loadAll: async () => {
    if (!supabaseConfigured) {
      // Sin Supabase configurado: funciona en memoria con el nadador de ejemplo.
      set({ swimmers: MOCK_SWIMMERS, sessions: [], sets: [], competitions: [], personalBests: [], loaded: true })
      return
    }
    try {
      const data = await db.fetchAll()
      set({ ...data, loaded: true })
    } catch (e) {
      console.error('Error cargando datos de Supabase', e)
      set({ loaded: true })   // que la app no quede colgada en "cargando"
    }
  },

  subscribeRealtime: () => {
    if (!supabaseConfigured || realtimeIniciado) return
    realtimeIniciado = true
    db.subscribeChanges(() => { get().loadAll() })
  },

  // ── Rol ──────────────────────────────────────────────────────────────────
  setRole: (role, swimmerId) =>
    set({ currentRole: role, currentSwimmerId: swimmerId ?? null }),
  clearRole: () =>
    set({ currentRole: null, currentSwimmerId: null }),

  // ── Nadadores ────────────────────────────────────────────────────────────
  addSwimmer: (s) => {
    set(state => ({ swimmers: [...state.swimmers, s] }))
    if (supabaseConfigured) db.upsertSwimmer(s)
  },
  updateSwimmer: (id, data) => {
    let actualizado: Swimmer | undefined
    set(state => {
      const swimmers = state.swimmers.map(sw => {
        if (sw.id !== id) return sw
        actualizado = { ...sw, ...data }
        return actualizado
      })
      return { swimmers }
    })
    if (supabaseConfigured && actualizado) db.upsertSwimmer(actualizado)
  },

  // ── Sesiones ─────────────────────────────────────────────────────────────
  addSession: (s) => {
    set(state => ({ sessions: [...state.sessions, s] }))
    if (supabaseConfigured) db.upsertSession(s)
  },
  updateSession: (id, data) => {
    let actualizado: TrainingSession | undefined
    set(state => {
      const sessions = state.sessions.map(ss => {
        if (ss.id !== id) return ss
        actualizado = { ...ss, ...data }
        return actualizado
      })
      return { sessions }
    })
    if (supabaseConfigured && actualizado) db.upsertSession(actualizado)
  },
  deleteSession: (id) => {
    set(state => ({
      sessions: state.sessions.filter(ss => ss.id !== id),
      sets:     state.sets.filter(s => s.trainingSessionId !== id),
    }))
    if (supabaseConfigured) db.deleteSessionDb(id)
  },

  // ── Series ───────────────────────────────────────────────────────────────
  addSet: (s) => {
    set(state => ({ sets: [...state.sets, s] }))
    if (supabaseConfigured) db.upsertSet(s)
  },
  deleteSet: (id) => {
    set(state => ({ sets: state.sets.filter(s => s.id !== id) }))
    if (supabaseConfigured) db.deleteSetDb(id)
  },

  // ── Competencias ─────────────────────────────────────────────────────────
  addCompetition: (c) => {
    set(state => ({ competitions: [...state.competitions, c] }))
    if (supabaseConfigured) db.upsertCompetition(c)
  },
  updateCompetition: (id, data) => {
    let actualizado: Competition | undefined
    set(state => {
      const competitions = state.competitions.map(c => {
        if (c.id !== id) return c
        actualizado = { ...c, ...data }
        return actualizado
      })
      return { competitions }
    })
    if (supabaseConfigured && actualizado) db.upsertCompetition(actualizado)
  },
  deleteCompetition: (id) => {
    set(state => ({ competitions: state.competitions.filter(c => c.id !== id) }))
    if (supabaseConfigured) db.deleteCompetitionDb(id)
  },

  // ── Marcas ───────────────────────────────────────────────────────────────
  addPersonalBest: (pb) => {
    set(state => ({ personalBests: [...state.personalBests, pb] }))
    if (supabaseConfigured) db.upsertPersonalBest(pb)
  },

  // ── Helpers ──────────────────────────────────────────────────────────────
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
}))
