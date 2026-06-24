import type { TrainingSet, TrainingSession, SimilarSetComparison } from '../types'
import { sortByDate } from './timeUtils'

// Genera la clave canónica de similitud para una serie
export function buildSimilarityKey(
  reps: number,
  dist: number,
  estilo: string,
  pileta: '25m' | '50m',
  intervalo: string
): string {
  const pool = pileta === '25m' ? 'Pileta25' : 'Pileta50'
  return `${reps}x${dist}-${estilo}-${pool}-Intervalo${intervalo}`
}

// Dado un nadador, agrupa sus sets por claveSimilitud (solo los que tienen ≥ 2 entradas)
export function getSimilarGroups(
  swimmerId: string,
  sets: TrainingSet[],
  sessions: TrainingSession[]
): SimilarSetComparison[] {
  const swimmerSets  = sets.filter(s => s.swimmerId === swimmerId)
  const sessionMap   = new Map(sessions.map(s => [s.id, s]))

  const grouped = new Map<string, { set: TrainingSet; session: TrainingSession }[]>()
  for (const set of swimmerSets) {
    const session = sessionMap.get(set.trainingSessionId)
    if (!session) continue
    const arr = grouped.get(set.claveSimilitud) ?? []
    arr.push({ set, session })
    grouped.set(set.claveSimilitud, arr)
  }

  const result: SimilarSetComparison[] = []

  for (const [clave, entries] of grouped) {
    if (entries.length < 2) continue

    // Ordenar por fecha de sesión
    const sorted = [...entries].sort((a, b) => a.session.fecha.localeCompare(b.session.fecha))

    const last = sorted[sorted.length - 1]
    const prev = sorted[sorted.length - 2]

    const deltaTime   = parseFloat((prev.set.tiempoPromedio - last.set.tiempoPromedio).toFixed(2))
    const deltaBest   = parseFloat((prev.set.mejorTiempo    - last.set.mejorTiempo).toFixed(2))
    const deltaRPE    = last.session.rpe - prev.session.rpe
    const pctMejora   = prev.set.tiempoPromedio > 0
      ? parseFloat(((deltaTime / prev.set.tiempoPromedio) * 100).toFixed(2))
      : 0

    const mensaje = buildDeltaMessage(deltaTime, deltaRPE, last.session.sensacionGeneral)

    result.push({
      claveSimilitud: clave,
      entries: sorted,
      delta: {
        tiempoPromedio:   deltaTime,
        mejorTiempo:      deltaBest,
        rpe:              deltaRPE,
        porcentajeMejora: pctMejora,
        mensaje,
      },
    })
  }

  // Ordenar por cantidad de entradas desc
  return result.sort((a, b) => b.entries.length - a.entries.length)
}

function buildDeltaMessage(
  deltaTime: number,
  deltaRPE:  number,
  feeling:   string
): string {
  if (Math.abs(deltaTime) < 0.2) {
    // Sin cambio apreciable
    return 'El tiempo promedio se mantuvo prácticamente igual. No hay mejora ni retroceso claro por ahora.'
  }

  if (deltaTime > 0) {
    // Mejoró (bajó tiempo)
    if (deltaRPE <= 0) {
      return `Mejoró ${deltaTime.toFixed(1)}s en el promedio con un esfuerzo similar o menor. Señal positiva de adaptación.`
    }
    if (deltaRPE > 0) {
      return `Mejoró ${deltaTime.toFixed(1)}s, pero con mayor RPE. Puede indicar un esfuerzo más intenso. Monitorear la recuperación.`
    }
    return `Mejoró ${deltaTime.toFixed(1)}s respecto a la última vez que realizó esta serie.`
  }

  // Empeoró (subió tiempo)
  const abs = Math.abs(deltaTime).toFixed(1)
  if (deltaRPE < 0) {
    return `El tiempo empeoró ${abs}s, pero el RPE fue más bajo. Puede indicar entrenamiento controlado, fatiga o menor exigencia. No necesariamente negativo.`
  }
  if (deltaRPE === 0 && feeling === 'buena') {
    return `El tiempo empeoró ${abs}s con esfuerzo similar. Posible acumulación de fatiga. Revisar carga total de la semana.`
  }
  return `El tiempo empeoró ${abs}s. Considerar la carga acumulada antes de evaluar la sesión de forma aislada.`
}
