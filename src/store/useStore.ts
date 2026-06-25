import { create } from 'zustand'
import type {
  Swimmer, TrainingSession, TrainingSet,
  Competition, PersonalBest, Coach,
} from '../types'
import { MOCK_SWIMMERS } from '../data/mockData'
import { supabase, supabaseConfigured } from '../lib/supabase'
import * as db from '../lib/db'

let realtimeIniciado   = false
let authListenerSetup  = false

// ─── Estado ──────────────────────────────────────────────────────────────────

interface AppState {
  // Auth
  authUserId:  string | null
  userRole:    'coach' | 'swimmer' | null
  coach:       Coach | null

  // Rol legacy (para modo mock sin Supabase)
  currentRole:      'coach' | 'swimmer' | null
  currentSwimmerId: string | null

  // Carga
  loaded: boolean

  // Datos
  swimmers:      Swimmer[]
  sessions:      TrainingSession[]
  sets:          TrainingSet[]
  competitions:  Competition[]
  personalBests: PersonalBest[]

  // Auth
  initAuth:        () => Promise<void>
  signOut:         () => Promise<void>
  linkSwimmer:     (codigo: string) => Promise<{ nombre?: string; error?: string }>

  // Rol legacy (modo mock)
  setRole:   (role: 'coach' | 'swimmer', swimmerId?: string) => void
  clearRole: () => void

  // Realtime
  subscribeRealtime: () => void

  // Acciones – Nadadores
  addSwimmer:    (s: Swimmer) => void
  updateSwimmer: (id: string, data: Partial<Swimmer>) => void

  // Acciones – Sesiones
  addSession:    (s: TrainingSession) => void
  updateSession: (id: string, data: Partial<TrainingSession>) => void
  deleteSession: (id: string) => void

  // Acciones – Series
  addSet:    (s: TrainingSet) => void
  deleteSet: (id: string) => void

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
  authUserId:       null,
  userRole:         null,
  coach:            null,
  currentRole:      null,
  currentSwimmerId: null,
  loaded:           false,

  swimmers:      [],
  sessions:      [],
  sets:          [],
  competitions:  [],
  personalBests: [],

  // ── Auth ──────────────────────────────────────────────────────────────────

  initAuth: async () => {
    // Modo mock (sin Supabase): funciona con datos locales, sin login
    if (!supabaseConfigured) {
      set({ swimmers: MOCK_SWIMMERS, sessions: [], sets: [], competitions: [], personalBests: [], loaded: true })
      return
    }

    // Registrar listener de cambios de sesión una sola vez
    if (!authListenerSetup) {
      authListenerSetup = true
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          get().signOut()
        } else if (event === 'SIGNED_IN' && session) {
          await loadAsUser(session.user.id, set, get)
        }
      })
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      set({ loaded: true, userRole: null, authUserId: null })
      return
    }

    await loadAsUser(session.user.id, set, get)
  },

  signOut: async () => {
    if (supabaseConfigured) await db.signOut()
    realtimeIniciado  = false
    authListenerSetup = false
    set({
      authUserId: null, userRole: null, coach: null,
      currentRole: null, currentSwimmerId: null,
      swimmers: [], sessions: [], sets: [], competitions: [], personalBests: [],
    })
  },

  linkSwimmer: async (codigo) => {
    const result = await db.linkSwimmerByCode(codigo)
    if (result.error) return result
    // Recargar lista de nadadores
    try {
      const data = await db.fetchAll()
      set({ swimmers: data.swimmers })
    } catch {}
    return result
  },

  // ── Rol legacy (modo mock) ────────────────────────────────────────────────
  setRole: (role, swimmerId) =>
    set({ currentRole: role, currentSwimmerId: swimmerId ?? null }),
  clearRole: () =>
    set({ currentRole: null, currentSwimmerId: null }),

  // ── Realtime ──────────────────────────────────────────────────────────────
  subscribeRealtime: () => {
    if (!supabaseConfigured || realtimeIniciado) return
    realtimeIniciado = true
    db.subscribeChanges(async () => {
      try {
        const data = await db.fetchAll()
        set(data)
      } catch {}
    })
  },

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

// ─── Helper interno ───────────────────────────────────────────────────────────

async function loadAsUser(
  uid: string,
  set: (patch: Partial<AppState>) => void,
  get: () => AppState,
) {
  const role = await db.getUserRole(uid)
  set({
    authUserId:       uid,
    userRole:         role,
    currentRole:      role,
    currentSwimmerId: role === 'swimmer' ? uid : null,
  })

  if (!role) {
    // Cuenta creada pero perfil todavía no completado
    set({ loaded: true })
    return
  }

  try {
    const data = await db.fetchAll()
    // Para coaches: cargar también el perfil del coach
    let coach: Coach | null = null
    if (role === 'coach') {
      const { data: cd } = await supabase.from('coaches').select('data').eq('id', uid).maybeSingle()
      if (cd) coach = cd.data as Coach
    }
    set({ ...data, coach, loaded: true })
  } catch (e) {
    console.error('[store] loadAsUser', e)
    set({ loaded: true })
  }

  if (!realtimeIniciado) get().subscribeRealtime()
}
