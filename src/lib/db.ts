import { supabase } from './supabase'
import type {
  Swimmer, TrainingSession, TrainingSet, Competition, PersonalBest, Coach,
} from '../types'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUp = (email: string, password: string) =>
  supabase.auth.signUp({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

export async function getUserRole(uid: string): Promise<'coach' | 'swimmer' | null> {
  const [{ data: coach }, { data: swimmer }] = await Promise.all([
    supabase.from('coaches').select('id').eq('id', uid).maybeSingle(),
    supabase.from('swimmers').select('id').eq('id', uid).maybeSingle(),
  ])
  if (coach)   return 'coach'
  if (swimmer) return 'swimmer'
  return null
}

// ─── Carga inicial ────────────────────────────────────────────────────────────

export async function fetchAll() {
  const [sw, se, st, co, pb] = await Promise.all([
    supabase.from('swimmers').select('codigo_acceso, data'),
    supabase.from('sessions').select('data'),
    supabase.from('sets').select('data'),
    supabase.from('competitions').select('data'),
    supabase.from('personal_bests').select('data'),
  ])
  const err = sw.error || se.error || st.error || co.error || pb.error
  if (err) throw err
  return {
    swimmers:      (sw.data ?? []).map(r => ({
      ...(r.data as Swimmer),
      codigoAcceso: (r as any).codigo_acceso ?? undefined,
    })),
    sessions:      (se.data ?? []).map(r => r.data as TrainingSession),
    sets:          (st.data ?? []).map(r => r.data as TrainingSet),
    competitions:  (co.data ?? []).map(r => r.data as Competition),
    personalBests: (pb.data ?? []).map(r => r.data as PersonalBest),
  }
}

// ─── Escritura ────────────────────────────────────────────────────────────────

async function run(label: string, p: PromiseLike<{ error: unknown }>) {
  const { error } = await p
  if (error) console.error(`[db] ${label}`, error)
}

export const upsertCoach = (c: Coach) =>
  run('upsertCoach', supabase.from('coaches').upsert({ id: c.id, data: c }))

export const upsertSwimmer = (s: Swimmer) =>
  run('upsertSwimmer', supabase.from('swimmers').upsert({ id: s.id, data: s }))

export const upsertSession = (s: TrainingSession) =>
  run('upsertSession', supabase.from('sessions').upsert({ id: s.id, swimmer_id: s.swimmerId, data: s }))

export const upsertSet = (s: TrainingSet) =>
  run('upsertSet', supabase.from('sets').upsert({ id: s.id, session_id: s.trainingSessionId, swimmer_id: s.swimmerId, data: s }))

export const upsertCompetition = (c: Competition) =>
  run('upsertCompetition', supabase.from('competitions').upsert({ id: c.id, swimmer_id: c.swimmerId, data: c }))

export const upsertPersonalBest = (pb: PersonalBest) =>
  run('upsertPersonalBest', supabase.from('personal_bests').upsert({ id: pb.id, swimmer_id: pb.swimmerId, data: pb }))

export async function deleteSessionDb(id: string) {
  await run('deleteSets',   supabase.from('sets').delete().eq('session_id', id))
  await run('deleteSession', supabase.from('sessions').delete().eq('id', id))
}

export const deleteSetDb = (id: string) =>
  run('deleteSet', supabase.from('sets').delete().eq('id', id))

export const deleteCompetitionDb = (id: string) =>
  run('deleteCompetition', supabase.from('competitions').delete().eq('id', id))

// ─── Vinculación coach ↔ nadador ──────────────────────────────────────────────

export async function linkSwimmerByCode(codigo: string): Promise<{ nombre?: string; swimmerId?: string; error?: string }> {
  const { data, error } = await supabase.rpc('buscar_nadador_por_codigo', { p_codigo: codigo })
  if (error)                          return { error: error.message }
  if (!data || data.length === 0)     return { error: 'Código no encontrado. Verificá que esté bien escrito.' }

  const { swimmer_id, nombre } = data[0]
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)                          return { error: 'No autenticado' }

  const { error: linkError } = await supabase
    .from('coach_swimmer_access')
    .insert({ coach_id: user.id, swimmer_id })

  if (linkError) {
    if (linkError.code === '23505') return { error: 'Este nadador ya está en tu grupo.' }
    return { error: linkError.message }
  }
  return { nombre, swimmerId: swimmer_id }
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export function subscribeChanges(onChange: () => void) {
  try {
    const ch = supabase.channel('swimtrack-cambios-' + Math.random().toString(36).slice(2, 8))
    for (const table of ['swimmers', 'sessions', 'sets', 'competitions', 'personal_bests']) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
    }
    ch.subscribe()
    return ch
  } catch (e) {
    console.error('[db] realtime', e)
    return null
  }
}
