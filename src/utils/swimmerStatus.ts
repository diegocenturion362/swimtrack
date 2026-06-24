import type {
  Swimmer, TrainingSession, TrainingSet, SwimmerStatus, Alert, AlertType, AlertLevel
} from '../types'
import { sortByDate, weekKey } from './timeUtils'

const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000

function recentSessions(sessions: TrainingSession[], weeks = 4): TrainingSession[] {
  const cutoff = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return sessions.filter(s => s.fecha >= cutoff)
}

// Agrupa sets por claveSimilitud y devuelve los que tienen ≥ 2 apariciones
function repeatedSets(sets: TrainingSet[]): Map<string, TrainingSet[]> {
  const map = new Map<string, TrainingSet[]>()
  for (const s of sets) {
    const arr = map.get(s.claveSimilitud) ?? []
    arr.push(s)
    map.set(s.claveSimilitud, arr)
  }
  const filtered = new Map<string, TrainingSet[]>()
  for (const [k, v] of map) {
    if (v.length >= 2) filtered.set(k, sortByDate(v.map(s => ({ ...s, fecha: s.id }))))
  }
  return filtered
}

// Detecta si la tendencia de los últimos sets similares es de mejora
function improvementTrend(
  sets: TrainingSet[],
  sessions?: TrainingSession[]
): 'mejora' | 'estancado' | 'empeora' | 'neutro' {
  if (sets.length < 2) return 'neutro'
  const sorted = [...sets].sort((a, b) => {
    if (sessions) {
      const sa = sessions.find(s => s.id === a.trainingSessionId)
      const sb = sessions.find(s => s.id === b.trainingSessionId)
      if (sa && sb) return sa.fecha.localeCompare(sb.fecha)
    }
    return a.trainingSessionId.localeCompare(b.trainingSessionId)
  })
  const diffs: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    diffs.push(sorted[i - 1].tiempoPromedio - sorted[i].tiempoPromedio)
  }
  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length
  if (avg > 0.3) return 'mejora'
  if (avg < -0.3) return 'empeora'
  return 'estancado'
}

export function detectSwimmerStatus(
  _swimmer: Swimmer,
  sessions: TrainingSession[],
  sets: TrainingSet[]
): SwimmerStatus {
  const recent = recentSessions(sessions)

  if (recent.length < 3) return 'Sin datos'

  const avgRPE  = recent.reduce((a, b) => a + b.rpe, 0) / recent.length
  const highRPE = recent.filter(s => s.rpe >= 8).length

  // Sobrecarga: RPE alto sostenido
  if (avgRPE >= 8 || (highRPE >= 3 && recent.length >= 4)) return 'Sobrecarga'

  const swimmerSets = sets.filter(s => sessions.map(ss => ss.id).includes(s.trainingSessionId))
  const repeated    = repeatedSets(swimmerSets)

  const trends: string[] = []
  for (const group of repeated.values()) {
    trends.push(improvementTrend(group, sessions))
  }

  const mejoras    = trends.filter(t => t === 'mejora').length
  const estancados = trends.filter(t => t === 'estancado').length
  const empeorados = trends.filter(t => t === 'empeora').length

  if (empeorados > 0 && avgRPE >= 7) return 'Sobrecarga'
  if (mejoras > 0 && estancados === 0 && empeorados === 0) return 'En progreso'
  if (mejoras >= estancados) return 'En progreso'
  if (estancados > 0 && mejoras === 0) return 'Estancado'

  return 'Estable'
}

// ─── Alertas ──────────────────────────────────────────────────────────────────

interface AlertSpec {
  tipo:    AlertType
  nivel:   AlertLevel
  mensaje: string
}

export function computeAlerts(
  swimmer: Swimmer,
  sessions: TrainingSession[],
  sets: TrainingSet[]
): Alert[] {
  const specs: AlertSpec[] = []
  const recent = recentSessions(sessions)

  if (sessions.length < 3) {
    specs.push({
      tipo:    'sin_datos',
      nivel:   'info',
      mensaje: 'Pocas sesiones registradas. Se necesitan más datos para análisis.',
    })
  }

  // Carga alta
  const avgRPE = recent.length > 0
    ? recent.reduce((a, b) => a + b.rpe, 0) / recent.length
    : 0
  if (avgRPE >= 8 && recent.length >= 3) {
    specs.push({
      tipo:    'carga_alta',
      nivel:   'danger',
      mensaje: `RPE promedio de ${avgRPE.toFixed(1)} en las últimas sesiones. Evaluar recuperación.`,
    })
  }

  // Baja asistencia (menos de 2 sesiones en las últimas 2 semanas)
  const twoWeeks = recentSessions(sessions, 2)
  if (sessions.length >= 5 && twoWeeks.length < 2) {
    specs.push({
      tipo:    'baja_asistencia',
      nivel:   'warning',
      mensaje: 'Menos de 2 entrenamientos en las últimas 2 semanas.',
    })
  }

  // Analizar sets similares
  const swimmerSets = sets.filter(s => sessions.map(ss => ss.id).includes(s.trainingSessionId))
  const repeated    = repeatedSets(swimmerSets)

  for (const [key, group] of repeated) {
    const trend = improvementTrend(group, sessions)
    const sorted = [...group].sort((a, b) => a.trainingSessionId.localeCompare(b.trainingSessionId))
    const last   = sorted[sorted.length - 1]
    const prev   = sorted[sorted.length - 2]
    const delta  = (prev.tiempoPromedio - last.tiempoPromedio).toFixed(1)

    if (trend === 'mejora') {
      specs.push({
        tipo:    'mejora_reciente',
        nivel:   'success',
        mensaje: `Mejora de ${delta}s en ${key}. Tendencia positiva confirmada.`,
      })
      break // una alerta de mejora alcanza
    }
    if (trend === 'empeora' && group.length >= 3) {
      specs.push({
        tipo:    'carga_alta',
        nivel:   'danger',
        mensaje: `El tiempo en "${key}" empeoró en ${group.length} registros consecutivos. Posible sobrecarga o fatiga acumulada.`,
      })
      break
    }
    if (trend === 'estancado' && group.length >= 3) {
      specs.push({
        tipo:    'estancamiento',
        nivel:   'warning',
        mensaje: `Sin mejora en "${key}" en ${group.length} repeticiones. Revisar estímulo.`,
      })
      break
    }
  }

  // Progreso hacia objetivo
  const bestComp = [...sessions].reverse().find(s => s.swimmerId === swimmer.id)
  if (bestComp) {
    // Aproximación simple: si tiene series similares mejorando y objetivo dentro de 5%
    const allTimes = swimmerSets.map(s => s.tiempoPromedio).filter(Boolean)
    if (allTimes.length > 0) {
      const best = Math.min(...allTimes)
      const pct  = ((best - swimmer.marcaObjetivo) / swimmer.marcaObjetivo) * 100
      if (pct <= 5 && pct >= 0) {
        specs.push({
          tipo:    'buen_progreso',
          nivel:   'success',
          mensaje: `A ${pct.toFixed(1)}% del objetivo de temporada. ¡Cerca!`,
        })
      }
    }
  }

  return specs.map((s, i) => ({
    id:        `alert-${swimmer.id}-${i}`,
    swimmerId: swimmer.id,
    fecha:     new Date().toISOString().slice(0, 10),
    ...s,
  }))
}

// Agrupa sesiones por semana para el gráfico de volumen
export function weeklyVolume(sessions: TrainingSession[]): { semana: string; volumen: number; sesiones: number }[] {
  const map = new Map<string, { volumen: number; sesiones: number }>()
  for (const s of sessions) {
    const k = weekKey(s.fecha)
    const existing = map.get(k) ?? { volumen: 0, sesiones: 0 }
    map.set(k, { volumen: existing.volumen + s.volumenTotal, sesiones: existing.sesiones + 1 })
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semana, v]) => ({ semana: semana.replace(/^\d{4}-/, ''), ...v }))
}
