import { supabase } from './supabase'
import type {
  Swimmer, TrainingSession, TrainingSet, Competition, PersonalBest,
} from '../types'

// Cada tabla guarda el objeto completo en una columna jsonb `data`.
// Así el mapeo es directo y no hay que tocar nada si cambian los tipos.

export async function fetchAll() {
  const [sw, se, st, co, pb] = await Promise.all([
    supabase.from('swimmers').select('data'),
    supabase.from('sessions').select('data'),
    supabase.from('sets').select('data'),
    supabase.from('competitions').select('data'),
    supabase.from('personal_bests').select('data'),
  ])
  const err = sw.error || se.error || st.error || co.error || pb.error
  if (err) throw err
  return {
    swimmers:      (sw.data ?? []).map(r => r.data as Swimmer),
    sessions:      (se.data ?? []).map(r => r.data as TrainingSession),
    sets:          (st.data ?? []).map(r => r.data as TrainingSet),
    competitions:  (co.data ?? []).map(r => r.data as Competition),
    personalBests: (pb.data ?? []).map(r => r.data as PersonalBest),
  }
}

async function run(label: string, p: PromiseLike<{ error: unknown }>) {
  const { error } = await p
  if (error) console.error(`[db] ${label}`, error)
}

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
  await run('deleteSets', supabase.from('sets').delete().eq('session_id', id))
  await run('deleteSession', supabase.from('sessions').delete().eq('id', id))
}

export const deleteSetDb = (id: string) =>
  run('deleteSet', supabase.from('sets').delete().eq('id', id))

export const deleteCompetitionDb = (id: string) =>
  run('deleteCompetition', supabase.from('competitions').delete().eq('id', id))

// Realtime: avisa cuando cambia cualquier tabla (otro dispositivo cargó algo).
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
