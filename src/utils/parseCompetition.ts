// ─────────────────────────────────────────────────────────────────────────────
// Parser de competencias escritas en texto libre.
// Extrae: prueba, tiempo final, parciales (splits), fecha, puesto, torneo, pileta.
// Todo queda editable en la pantalla; el parseo es una ayuda, no la verdad final.
// ─────────────────────────────────────────────────────────────────────────────

import type { PoolSize } from '../types'
import { formatRepTime, parseRepTime } from './timeUtils'

export interface ParsedCompetition {
  fecha:         string | null
  nombreTorneo:  string
  ciudad:        string
  prueba:        string          // "100m Libre"
  pileta:        PoolSize | null
  tiempoFinal:   number          // segundos (0 si no se detectó)
  tiempoTexto:   string          // "1:02.45" para mostrar/editar
  parciales:     number[]        // segundos
  parcialesTexto: string[]
  puesto:        number          // 0 si no se detectó
  notas:         string[]
}

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
}

const ESTILOS: { re: RegExp; nombre: string }[] = [
  { re: /\b(mariposa|fly)\b/i,             nombre: 'Mariposa'  },
  { re: /\b(espalda|dorso|back)\b/i,       nombre: 'Espalda'   },
  { re: /\b(pecho|braza|breast)\b/i,       nombre: 'Pecho'     },
  { re: /\b(combinado|medley|estilos)\b/i, nombre: 'Combinado' },
  { re: /\b(libre|crol|cr|free)\b/i,       nombre: 'Libre'     },
]

// Convierte a segundos: acepta 56.18, 1:02.45, 56"18, 1'23"23
export function parseTiempo(token: string): number {
  return parseRepTime(token)
}

// Formatea segundos al formato de pileta: 56"18  o  1'23"23
export function tiempoATexto(seg: number): string {
  return formatRepTime(seg)
}

// Encuentra todos los tokens de tiempo en un texto (deben tener ":" o decimales)
function encontrarTiempos(texto: string): { txt: string; seg: number }[] {
  const re = /(\d{1,2}:\d{2}(?:[.,]\d{1,2})?)|(\d{1,3}[.,]\d{1,2})/g
  const out: { txt: string; seg: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(texto)) !== null) {
    const txt = m[0]
    out.push({ txt, seg: parseTiempo(txt) })
  }
  return out
}

function parseFechaEspanol(texto: string): string | null {
  const m = texto.toLowerCase().match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i)
  if (m && MESES[m[2]]) {
    return `${m[3]}-${MESES[m[2]].toString().padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  // formato 12/05/2026 o 2026-05-12
  const dmy = texto.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  const iso = texto.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (iso) return iso[0]
  return null
}

export function parseCompetition(texto: string): ParsedCompetition {
  const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

  let fecha: string | null = null
  let prueba = ''
  let pileta: PoolSize | null = null
  let puesto = 0
  let nombreTorneo = ''
  let ciudad = ''
  const tiemposFinalCandidatos: number[] = []
  const parciales: number[] = []
  const notas: string[] = []

  const tienePuestoRe = /(?:puesto|posici[oó]n|salí|termin[eé]|llegu[eé])\s*[:#]?\s*(\d{1,2})/i
  const ordinalRe     = /\b(\d{1,2})\s*[°ºªo]\b/

  for (const linea of lineas) {
    let consumido = false

    // Fecha (no cortamos: la línea puede traer también el nombre del torneo)
    if (!fecha) { const f = parseFechaEspanol(linea); if (f) { fecha = f; consumido = true } }

    // Prueba: distancia + estilo
    let pruebaEnLinea = false
    if (!prueba) {
      const mDist = linea.match(/\b(\d{2,4})\s*m?\b/)
      const est = ESTILOS.find(e => e.re.test(linea))
      if (mDist && est && parseInt(mDist[1]) >= 25) {
        prueba = `${mDist[1]}m ${est.nombre}`
        pruebaEnLinea = true
        consumido = true
      }
    } else if (ESTILOS.some(e => e.re.test(linea)) && /\d{2,4}/.test(linea)) {
      pruebaEnLinea = true
    }

    // Pileta (solo si se nombra explícitamente)
    if (!pileta) {
      const mp = linea.match(/(?:pileta|piscina|pool)\s*(?:de\s*)?(25|50)/i)
      if (mp) pileta = (mp[1] + 'm') as PoolSize
    }

    // Puesto
    const mPuesto = tienePuestoRe.exec(linea) || ordinalRe.exec(linea)
    if (!puesto && mPuesto) { puesto = parseInt(mPuesto[1]); consumido = true }

    // Ciudad
    if (!ciudad) {
      const mc = linea.match(/(?:ciudad|en)\s*[:]\s*([a-záéíóúñ .]+)/i)
      if (mc) { ciudad = mc[1].trim(); consumido = true }
    }

    // Tiempos en la línea
    const tiempos = encontrarTiempos(linea)
    if (tiempos.length > 0) {
      const esParcial = /parcial|split|pasaje|paso|vuelta/i.test(linea)
      const esFinal   = /final|resultad|marca|tiempo/i.test(linea)
      if (esParcial && !esFinal) {
        parciales.push(...tiempos.map(t => t.seg))
      } else if (esFinal) {
        tiemposFinalCandidatos.push(...tiempos.map(t => t.seg))
      } else {
        if (tiempos.length > 1) parciales.push(...tiempos.map(t => t.seg))
        else tiemposFinalCandidatos.push(tiempos[0].seg)
      }
      continue
    }

    // Nombre del torneo: línea de texto que no es prueba, ni puesto, ni solo fecha
    if (!nombreTorneo && !pruebaEnLinea && !mPuesto) {
      const sinFecha = linea
        .replace(/\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{4}/i, '')
        .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/, '')
        .replace(/\d{4}-\d{2}-\d{2}/, '')
        .trim()
      if (/[a-záéíóú]{3,}/i.test(sinFecha) && !ESTILOS.some(e => e.re.test(sinFecha))) {
        nombreTorneo = sinFecha
        continue
      }
    }

    if (!consumido) notas.push(linea)
  }

  // Tiempo final: el mayor entre los candidatos (la marca total suele ser la más alta);
  // si no hubo candidatos pero sí parciales, tomamos el mayor parcial.
  const todos = tiemposFinalCandidatos.length > 0 ? tiemposFinalCandidatos : parciales
  const tiempoFinal = todos.length > 0 ? Math.max(...todos) : 0

  // Quitar el final de la lista de parciales si quedó duplicado
  const parcialesFinales = parciales.filter(p => p !== tiempoFinal)

  return {
    fecha,
    nombreTorneo,
    ciudad,
    prueba,
    pileta,
    tiempoFinal,
    tiempoTexto: tiempoATexto(tiempoFinal),
    parciales: parcialesFinales,
    parcialesTexto: parcialesFinales.map(tiempoATexto),
    puesto,
    notas,
  }
}

// ─── Meet Mobile ──────────────────────────────────────────────────────────────

const MONTHS_EN: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

// Detecta si el texto fue copiado desde Meet Mobile
export function isMeetMobile(texto: string): boolean {
  return /HEAT\s*PLACE/i.test(texto) && /SPLITS/i.test(texto)
}

// Parsea el texto copiado de Meet Mobile y devuelve los mismos campos que parseCompetition
export function parseMeetMobile(texto: string): ParsedCompetition {
  const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

  // Nombre del torneo: primera línea toda en mayúsculas con más de 5 chars
  const nombreTorneo = lineas.find(l => /^[A-ZÁÉÍÓÚÑ0-9 ]+$/.test(l) && l.length > 5) ?? ''

  // Prueba: línea con distancia numérica + estilo (español o inglés)
  let prueba = ''
  for (const l of lineas) {
    const mDist = l.match(/\b(\d{2,4})\s*(?:metros?|m)\b/i)
    if (!mDist || parseInt(mDist[1]) < 25) continue
    const est = ESTILOS.find(e => e.re.test(l))
    if (est) { prueba = `${mDist[1]}m ${est.nombre}`; break }
  }

  // Fecha en formato inglés: "Sat | Dec 20,2025" o "Dec 20, 2025"
  let fecha: string | null = null
  for (const l of lineas) {
    const m = l.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})[,\s]+(\d{4})/i)
    if (m) {
      const mon = MONTHS_EN[m[1].toLowerCase().slice(0, 3)]
      if (mon) { fecha = `${m[3]}-${String(mon).padStart(2, '0')}-${m[2].padStart(2, '0')}`; break }
    }
    if (!fecha) { const f = parseFechaEspanol(l); if (f) { fecha = f; break } }
  }

  // Puesto en serie: número en la línea siguiente a "HEAT PLACE"
  let puesto = 0
  const hpIdx = lineas.findIndex(l => /^HEAT\s*PLACE$/i.test(l))
  if (hpIdx >= 0) {
    for (let i = hpIdx + 1; i < Math.min(hpIdx + 3, lineas.length); i++) {
      if (/^\d+$/.test(lineas[i])) { puesto = parseInt(lineas[i]); break }
    }
  }

  // Valores numéricos después de "Total": pares (parcial, acumulado) + total final
  const totalIdx = lineas.findIndex(l => /^total$/i.test(l))
  const numValues: number[] = []
  if (totalIdx >= 0) {
    for (let i = totalIdx + 1; i < lineas.length; i++) {
      if (/^\d+[.,]\d+$/.test(lineas[i])) numValues.push(parseFloat(lineas[i].replace(',', '.')))
    }
  }

  const tiempoFinal = numValues.length > 0 ? numValues[numValues.length - 1] : 0

  // Tiempos acumulados (índices impares): 25m→[1], 50m→[3], 75m→[5]...
  const parciales: number[] = []
  for (let i = 1; i < numValues.length - 1; i += 2) {
    if (numValues[i] < tiempoFinal) parciales.push(numValues[i])
  }

  return {
    fecha,
    nombreTorneo,
    ciudad: '',
    prueba,
    pileta: null,
    tiempoFinal,
    tiempoTexto: tiempoATexto(tiempoFinal),
    parciales,
    parcialesTexto: parciales.map(tiempoATexto),
    puesto,
    notas: [],
  }
}
