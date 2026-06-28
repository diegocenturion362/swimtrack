import type { TrainingSession, Swimmer } from '../types'
import { addDays, formatDateShort, todayISO, formatTime } from './timeUtils'

const feelingEmoji: Record<string, string> = {
  'muy buena': '😊', 'buena': '🙂', 'regular': '😐', 'mala': '😔',
}
const DAY = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function currentWeekRange(): { desde: string; hasta: string } {
  const hoy = todayISO()
  return { desde: addDays(hoy, -6), hasta: hoy }
}

export function generateSwimmerWeekSummary(
  swimmer: Swimmer,
  sessions: TrainingSession[],
): string {
  const { desde, hasta } = currentWeekRange()
  const week = sessions
    .filter(s => s.swimmerId === swimmer.id && s.fecha >= desde && s.fecha <= hasta && !s.esPlaneada)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const totalVol = week.reduce((acc, s) => acc + s.volumenTotal, 0)
  const avgRPE   = week.length > 0
    ? (week.reduce((acc, s) => acc + s.rpe, 0) / week.length).toFixed(1)
    : '—'

  const lines: string[] = [
    `🏊 Resumen semanal — SwimTrack`,
    `${swimmer.nombre}  •  ${formatDateShort(desde)} al ${formatDateShort(hasta)}`,
    ``,
    `📊 Esta semana:`,
    `• ${week.length} sesión${week.length !== 1 ? 'es' : ''} entrenada${week.length !== 1 ? 's' : ''}`,
    `• ${(totalVol / 1000).toFixed(1)} km en el agua`,
    `• RPE promedio: ${avgRPE}`,
  ]

  if (week.length > 0) {
    lines.push(``, `📋 Detalle:`)
    for (const s of week) {
      const dayIdx = new Date(s.fecha + 'T12:00:00').getDay()
      const vol    = (s.volumenTotal / 1000).toFixed(1)
      const emoji  = feelingEmoji[s.sensacionGeneral] ?? ''
      lines.push(`${DAY[dayIdx]} ${formatDateShort(s.fecha)} — ${s.tipoEntrenamiento} · ${vol} km · RPE ${s.rpe} ${emoji}`)
    }
  } else {
    lines.push(``, `Sin entrenamientos registrados esta semana.`)
  }

  lines.push(``, `🎯 Objetivo: ${formatTime(swimmer.marcaObjetivo)} en ${swimmer.pruebaPrincipal}`)
  lines.push(`💪 ¡Seguí entrenando!`)
  return lines.join('\n')
}

export function generateCoachWeekSummary(
  swimmers: Swimmer[],
  sessions: TrainingSession[],
): string {
  const { desde, hasta } = currentWeekRange()

  const lines: string[] = [
    `📋 Resumen semanal — SwimTrack`,
    `Semana del ${formatDateShort(desde)} al ${formatDateShort(hasta)}`,
  ]

  for (const sw of swimmers) {
    const week     = sessions.filter(s => s.swimmerId === sw.id && s.fecha >= desde && s.fecha <= hasta && !s.esPlaneada)
    const totalVol = week.reduce((acc, s) => acc + s.volumenTotal, 0)
    const avgRPE   = week.length > 0
      ? (week.reduce((acc, s) => acc + s.rpe, 0) / week.length).toFixed(1)
      : null

    lines.push(``, `👤 ${sw.nombre}`)
    if (week.length > 0) {
      lines.push(`${week.length} sesión${week.length !== 1 ? 'es' : ''} · ${(totalVol / 1000).toFixed(1)} km · RPE prom. ${avgRPE}`)
      for (const s of week.sort((a, b) => a.fecha.localeCompare(b.fecha))) {
        const dayIdx = new Date(s.fecha + 'T12:00:00').getDay()
        const vol    = (s.volumenTotal / 1000).toFixed(1)
        const emoji  = feelingEmoji[s.sensacionGeneral] ?? ''
        lines.push(`  ${DAY[dayIdx]} ${formatDateShort(s.fecha)} — ${s.tipoEntrenamiento} · ${vol} km · RPE ${s.rpe} ${emoji}`)
      }
    } else {
      lines.push(`Sin entrenamientos esta semana`)
    }
  }

  lines.push(``, `_Generado con SwimTrack 🏊_`)
  return lines.join('\n')
}

export async function shareOrCopy(text: string): Promise<'shared' | 'copied'> {
  if (navigator.share) {
    await navigator.share({ text })
    return 'shared'
  }
  await navigator.clipboard.writeText(text)
  return 'copied'
}
