// ─────────────────────────────────────────────────────────────────────────────
// Parser de competencias escritas en texto libre.
// Extrae: prueba, tiempo final, parciales (splits), fecha, puesto, torneo, pileta.
// Todo queda editable en la pantalla; el parseo es una ayuda, no la verdad final.
// ─────────────────────────────────────────────────────────────────────────────

import type { PoolSize } from '../types'

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

// Convierte "1:02.45" / "58.34" / "58,3" / "2:05" a segundos
export function parseTiempo(token: string): number {
  const t = token.trim().replace(',', '.')
  if (t.includes(':')) {
    const [m, s] = t.split(':')
    return parseInt(m) * 60 + parseFloat(s)
  }
  return parseFloat(t) || 0
}

// Formatea segundos a "M:SS.xx" o "SS.xx"
export function tiempoATexto(seg: number): string {
  if (seg <= 0) return ''
  if (seg < 60) return seg.toFixed(2).replace(/\.?0+$/, '')
  const m = Math.floor(seg / 60)
  const s = (seg % 60).toFixed(2).padStart(5, '0')
  return `${m}:${s}`
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
