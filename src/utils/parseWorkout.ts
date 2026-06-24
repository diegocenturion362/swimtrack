// ─────────────────────────────────────────────────────────────────────────────
// Parser de entrenamientos escritos en texto libre (estilo "bloc de notas").
//
// Convierte el texto que escribe el entrenador en datos estructurados:
// detecta series (N x D), nados sueltos (400 ez), rounds que multiplican,
// intervalos (@1'30s), material, intensidad, y la fecha en español.
//
// Calcula automáticamente METROS TOTALES y DURACIÓN ESTIMADA.
// Los rounds ambiguos ("1 or 2 rounds") quedan como bloques editables.
// ─────────────────────────────────────────────────────────────────────────────

import type { Stroke, Material } from '../types'

export interface ParsedSet {
  raw:             string          // línea original
  reps:            number
  distancia:       number          // metros por repetición
  series:          number          // multiplicador externo (A en "A x B x C"), 1 si no
  grupo?:          string          // id del "Trabajo" cuando es una serie con partes
  rounds:          number          // multiplicador detectado (1 si no hay)
  bloqueId:        number          // id del bloque de round (-1 si no pertenece a uno)
  metrosPorRound:  number          // series * reps * distancia (un solo round)
  segundosPorRound: number         // duración de un solo round
  metros:          number          // metrosPorRound * rounds (detectado)
  intervaloSeg:    number | null   // salida/descanso entre reps, si se detectó
  intervaloTexto:  string          // "1:30", "0:45", etc. (vacío si no hay)
  descansoSeg:     number          // descanso entre series (triples) o extra "+50s"
  descansoTexto:   string          // descanso entre series (display, para triples)
  tiempoPromedio:  number          // promedio de los tiempos por repetición (0 si no hay)
  mejorTiempo:     number          // mejor tiempo (mínimo)
  peorTiempo:      number          // peor tiempo (máximo)
  tiempos:         number[]        // lista de tiempos detectados
  segundos:        number          // duración estimada (detectado, incl. rounds)
  estilo:          Stroke
  materiales:      Material[]       // materiales detectados (puede haber varios)
  intensidad:      string          // "A1", "vel máx", "ritmo de 200"…
  descripcion:     string          // texto sobrante
  seccion:         string          // sección actual (Skill, Másters…)
  tipo:            'serie' | 'nado' // N x D  vs  distancia suelta
}

export interface Bloque {
  id:                number
  roundsDetectados:  number   // valor por defecto (mínimo del rango)
  roundsMin:         number
  roundsMax:         number
  ambiguo:           boolean   // true si era "N or M rounds"
}

export interface SeccionResumen {
  nombre: string
  metros: number
}

export interface ParseResult {
  fecha:           string | null   // ISO YYYY-MM-DD si se detectó en el encabezado
  sets:            ParsedSet[]
  bloques:         Bloque[]
  notas:           string[]        // líneas no reconocidas / informativas
  secciones:       SeccionResumen[]
  metrosTotales:   number
  minutosEstimados: number
  ritmoPer100:     number          // s/100m usado para estimar nados sin intervalo
}

// ─── Diccionarios ──────────────────────────────────────────────────────────────

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
}

const ESTILOS: { re: RegExp; estilo: Stroke }[] = [
  { re: /\b(delfineo|delf[ií]n|ondulaci[oó]n|subacu)\b/i, estilo: 'delfineo' },
  { re: /\b(piernas?|patadas?|kick)\b/i,      estilo: 'piernas'  },
  { re: /\b(correctivo|drill)\b/i,            estilo: 'tecnica-correctivo' },
  { re: /\b(mariposa|fly|maripos)\b/i,        estilo: 'mariposa' },
  { re: /\b(espalda|back|dorso)\b/i,          estilo: 'espalda'  },
  { re: /\b(pecho|braza|breast)\b/i,          estilo: 'pecho'    },
  { re: /\b(combinado|medley|im|4\s*estilos)\b/i, estilo: 'combinado' },
  { re: /\b(libre|crol|cr|free|fondo)\b/i,    estilo: 'libre'    },
]

const MATERIALES: { re: RegExp; material: Material }[] = [
  { re: /\b(paletas|manoplas|palas|paddles)\b/i,   material: 'paletas'    },
  { re: /\b(pull|boya|pullbuoy)\b/i,               material: 'pull'       },
  { re: /\b(patas|aletas|fins|gear)\b/i,           material: 'patas'      },
  { re: /\b(paraca[ií]das|chute|paracaida)\b/i,    material: 'paracaidas' },
  { re: /\b(tabla|board)\b/i,                      material: 'tabla'      },
  { re: /\b(snorkel|tubo)\b/i,                     material: 'snorkel'    },
]

// Palabras que marcan un nado suelto (distancia sin "x")
const PALABRAS_NADO = /\b(ez|easy|suave|soltura|afloje|nadando|nado|swim|cr|a[1-5])\b/i

// ─── Helpers de tiempo ──────────────────────────────────────────────────────────

// Convierte un token de intervalo a segundos. Ej: "1'30s" → 90, "50s" → 50,
// "1'" → 60, "1:30" → 90, "2" → 120 (se asume minutos si es número solo y chico).
export function parseIntervalo(token: string): number | null {
  const t = token.trim().toLowerCase()

  // 1'30"  /  1'30s  /  1'30  /  1′30
  let m = t.match(/^(\d+)\s*['′]\s*(\d{1,2})\s*["”s]?$/)
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2])

  // 1:30
  m = t.match(/^(\d+)\s*:\s*(\d{1,2})$/)
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2])

  // 1'  (solo minutos)
  m = t.match(/^(\d+)\s*['′]$/)
  if (m) return parseInt(m[1]) * 60

  // 50"  /  50s  (solo segundos)
  m = t.match(/^(\d+)\s*["”s]$/)
  if (m) return parseInt(m[1])

  // número solo: si es chico (≤ 10) lo tomamos como minutos (@2 = 2:00),
  // si es grande lo tomamos como segundos (@45 = 45s)
  m = t.match(/^(\d+)$/)
  if (m) {
    const n = parseInt(m[1])
    return n <= 10 ? n * 60 : n
  }

  return null
}

function segundosATexto(seg: number): string {
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── Detección de fecha en español ───────────────────────────────────────────────

function parseFechaEspanol(texto: string): string | null {
  const m = texto.toLowerCase().match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i)
  if (!m) return null
  const dia  = parseInt(m[1])
  const mes  = MESES[m[2]]
  const anio = parseInt(m[3])
  if (!mes) return null
  return `${anio}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`
}

// ─── Clasificación de líneas ──────────────────────────────────────────────────────

const RE_ROUND  = /^\s*(\d+)\s*(?:o|or|a|-|\/)?\s*(\d+)?\s*(rounds?|vueltas?|series?|x)\s*$/i
const RE_TRIPLE = /(\d+)\s*[xX×]\s*(\d+)\s*[xX×]\s*([\d]+(?:[.,]\d+)?)/  // 5 x 6 x 7 (series compuesta)
const RE_SET    = /(\d+)\s*[xX×]\s*([\d]+(?:[.,]\d+)?)/      // 8 x 50  /  4 x 12,5
const RE_LISTA  = /^\s*\d+\s*[.)]/                            // "1. Crol" (sub-ítem)

// Extrae los descansos de una serie compuesta: el 1º entre reps, el 2º entre series.
// Ej: "@5\" / 4'" → inner 5s, outer 240s
function extraerRestsTriple(resto: string): {
  innerSeg: number; innerTxt: string; outerSeg: number; outerTxt: string
} {
  const re = /@?\s*(\d+\s*['′]\s*\d+\s*["”s]?|\d+\s*['′]|\d+\s*["”]|\d+\s*s\b|\d+\s*:\s*\d+)/gi
  const found: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(resto)) !== null) {
    const seg = parseIntervalo(m[1].replace(/\s+/g, ''))
    if (seg !== null) found.push(seg)
  }
  const inner = found[0] ?? 0
  const outer = found[1] ?? 0
  return {
    innerSeg: inner, innerTxt: inner ? segundosATexto(inner) : '',
    outerSeg: outer, outerTxt: outer ? segundosATexto(outer) : '',
  }
}

// Extrae los tiempos por repetición de una serie. Necesitan separador decimal
// (. o "): 26"3 → 26.3, 26.9 → 26.9. Así no confunde reps, distancia ni intervalos.
function extraerTiempos(resto: string): number[] {
  const re = /(\d{1,3})\s*[."]\s*(\d{1,2})\b/g
  const out: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(resto)) !== null) {
    out.push(parseInt(m[1]) + parseInt(m[2]) / Math.pow(10, m[2].length))
  }
  return out
}

function resumirTiempos(t: number[]): { prom: number; mejor: number; peor: number } {
  if (t.length === 0) return { prom: 0, mejor: 0, peor: 0 }
  const prom = Math.round((t.reduce((a, b) => a + b, 0) / t.length) * 100) / 100
  return { prom, mejor: Math.min(...t), peor: Math.max(...t) }
}

function detectarEstilo(texto: string): Stroke {
  for (const { re, estilo } of ESTILOS) if (re.test(texto)) return estilo
  return 'libre'
}

function detectarMateriales(texto: string): Material[] {
  const out: Material[] = []
  for (const { re, material } of MATERIALES) if (re.test(texto)) out.push(material)
  return out
}

function detectarIntensidad(texto: string): string {
  const t = texto.toLowerCase()
  if (/\bvel\s*(máx|max|máxima|maxima)\b/.test(t)) return 'vel máx'
  if (/\bsprint|máxim|maxim\b/.test(t))            return 'máximo'
  const ritmo = t.match(/ritmo\s*de\s*(\d+)/)
  if (ritmo)                                        return `ritmo ${ritmo[1]}`
  if (/\bprogresivo|progres\b/.test(t))             return 'progresivo'
  const zona = t.match(/\ba\s*([1-5])\b/)
  if (zona)                                         return `A${zona[1]}`
  if (/\bpqp\b/.test(t))                            return 'PQP'
  return ''
}

// Busca un intervalo en la línea: "@1'30s", "@50s", "@2"
function extraerIntervalo(texto: string): { seg: number | null; txt: string } {
  const m = texto.match(/@\s*([\d'′:."s]+)/i)
  if (!m) return { seg: null, txt: '' }
  const seg = parseIntervalo(m[1])
  return { seg, txt: seg !== null ? segundosATexto(seg) : '' }
}

// Busca descanso extra: "+50s", "+ 1'", "con 30s"
function extraerDescanso(texto: string): number {
  let total = 0
  const plus = texto.match(/\+\s*([\d'′:s]+)/i)
  if (plus) { const s = parseIntervalo(plus[1]); if (s) total += s }
  const con = texto.match(/con\s+(\d+)\s*s\b/i)
  if (con) total += parseInt(con[1])
  return total
}

// ─── Parser principal ─────────────────────────────────────────────────────────────

export interface ParseOptions {
  ritmoPer100?: number  // s/100m para estimar nados sin intervalo (def. 100)
  ritmoEz?:     number  // s/100m para nados suaves (def. 115)
}

export function parseWorkout(texto: string, opts: ParseOptions = {}): ParseResult {
  const ritmoPer100 = opts.ritmoPer100 ?? 100
  const ritmoEz     = opts.ritmoEz ?? 115

  const lineas = texto.split(/\r?\n/)

  let fecha: string | null = null
  let seccionActual = ''
  let roundPendiente = 1            // multiplicador armado por un "N round"
  let bloqueActual = -1             // id del bloque de round activo
  let bloqueCounter = 0
  let grupoCounter = 0              // id para series con partes "N x (a + b)"
  const bloques: Bloque[] = []
  const sets: ParsedSet[] = []
  const notas: string[] = []

  for (const lineaRaw of lineas) {
    const linea = lineaRaw.trim()

    // Línea vacía → corta el grupo de rounds
    if (linea === '') { roundPendiente = 1; bloqueActual = -1; continue }

    // Fecha en el encabezado (solo la primera vez)
    if (fecha === null) {
      const f = parseFechaEspanol(linea)
      if (f) { fecha = f; continue }
    }

    // Sub-ítem de lista ("1. Crol a capela") → nota, no suma metros
    if (RE_LISTA.test(linea)) { notas.push(linea); continue }

    // Round header: "1 round", "1 or 2 rounds", "3 series"
    const mRound = linea.match(RE_ROUND)
    if (mRound) {
      const min = parseInt(mRound[1]) || 1
      const max = mRound[2] ? parseInt(mRound[2]) : min
      bloqueCounter += 1
      bloqueActual = bloqueCounter
      roundPendiente = min
      bloques.push({
        id: bloqueActual,
        roundsDetectados: min,
        roundsMin: Math.min(min, max),
        roundsMax: Math.max(min, max),
        ambiguo: max !== min,
      })
      continue
    }

    // Serie con PARTES: N x ( parte1 + parte2 + … )   ej "2x (5x10 @5\" + 25 @20\")"
    const mGrupo = linea.match(/(\d+)\s*[xX×]\s*\(([^)]+)\)/)
    if (mGrupo && /\d/.test(mGrupo[2])) {
      const series  = parseInt(mGrupo[1])
      const rounds  = roundPendiente
      const grupoId = `g${grupoCounter}`
      let agregadas = 0
      for (const parteStr of mGrupo[2].split('+').map(t => t.trim()).filter(Boolean)) {
        const mS = parteStr.match(/(\d+)\s*[xX×]\s*([\d]+(?:[.,]\d+)?)/)
        let reps = 1, dist = 0
        if (mS) { reps = parseInt(mS[1]); dist = parseFloat(mS[2].replace(',', '.')) }
        else { const mD = parteStr.match(/\b(\d{1,4})\b/); if (mD) dist = parseInt(mD[1]) }
        if (dist <= 0) continue
        const { seg: intervaloSeg, txt: intervaloTexto } = extraerIntervalo(parteStr)
        const tiemposP = extraerTiempos(parteStr)
        const { prom, mejor, peor } = resumirTiempos(tiemposP)
        const metrosPorRound   = Math.round(series * reps * dist)
        const swimPerRep       = (dist / 100) * ritmoPer100
        const segundosPorRound = Math.round(series * reps * (swimPerRep + (intervaloSeg ?? 0)))
        sets.push({
          raw: parteStr, reps, distancia: dist, series, grupo: grupoId,
          rounds, bloqueId: bloqueActual,
          metrosPorRound, segundosPorRound,
          metros: metrosPorRound * rounds,
          segundos: segundosPorRound * rounds,
          intervaloSeg: intervaloSeg || null, intervaloTexto,
          descansoSeg: 0, descansoTexto: '',
          tiempoPromedio: prom, mejorTiempo: mejor, peorTiempo: peor, tiempos: tiemposP,
          estilo: detectarEstilo(parteStr),
          materiales: detectarMateriales(parteStr),
          intensidad: detectarIntensidad(parteStr),
          descripcion: parteStr,
          seccion: seccionActual,
          tipo: 'serie',
        })
        agregadas++
      }
      if (agregadas > 0) { grupoCounter++; continue }
    }

    // Serie compuesta: A x B x C  (5 x 6 x 7 = 5 series de 6×7)
    const mTriple = linea.match(RE_TRIPLE)
    if (mTriple) {
      const series = parseInt(mTriple[1])
      const reps   = parseInt(mTriple[2])
      const dist   = parseFloat(mTriple[3].replace(',', '.'))
      const rounds = roundPendiente
      const resto  = linea.slice((mTriple.index ?? 0) + mTriple[0].length)
      const { innerSeg, innerTxt, outerSeg, outerTxt } = extraerRestsTriple(resto)
      const tiemposT = extraerTiempos(resto)
      const { prom, mejor, peor } = resumirTiempos(tiemposT)
      const metrosPorRound = Math.round(series * reps * dist)

      // Duración: nado + descanso entre reps, por serie, + descanso entre series
      const swimPerRep = (dist / 100) * ritmoPer100
      const porSerie   = reps * (swimPerRep + innerSeg)
      const segundosPorRound = Math.round(series * porSerie + Math.max(0, series - 1) * outerSeg)

      sets.push({
        raw: linea, reps, distancia: dist, series, rounds, bloqueId: bloqueActual,
        metrosPorRound, segundosPorRound,
        metros: metrosPorRound * rounds,
        segundos: segundosPorRound * rounds,
        intervaloSeg: innerSeg || null, intervaloTexto: innerTxt,
        descansoSeg: outerSeg, descansoTexto: outerTxt,
        tiempoPromedio: prom, mejorTiempo: mejor, peorTiempo: peor, tiempos: tiemposT,
        estilo: detectarEstilo(linea),
        materiales: detectarMateriales(linea),
        intensidad: detectarIntensidad(linea),
        descripcion: linea,
        seccion: seccionActual,
        tipo: 'serie',
      })
      continue
    }

    // Serie: N x D
    const mSet = linea.match(RE_SET)
    if (mSet) {
      const reps = parseInt(mSet[1])
      const dist = parseFloat(mSet[2].replace(',', '.'))
      const rounds = roundPendiente
      const { seg: intervaloSeg, txt: intervaloTexto } = extraerIntervalo(linea)
      const descansoSeg = extraerDescanso(linea)
      const restoSet = linea.slice((mSet.index ?? 0) + mSet[0].length)
      const tiemposS = extraerTiempos(restoSet)
      const { prom, mejor, peor } = resumirTiempos(tiemposS)
      const metrosPorRound = Math.round(reps * dist)

      const segundosPorRound = intervaloSeg
        ? reps * intervaloSeg + descansoSeg
        : (reps * dist) / 100 * ritmoPer100 + descansoSeg * reps

      sets.push({
        raw: linea, reps, distancia: dist, series: 1, rounds, bloqueId: bloqueActual,
        metrosPorRound, segundosPorRound: Math.round(segundosPorRound),
        metros: metrosPorRound * rounds,
        segundos: Math.round(segundosPorRound) * rounds,
        intervaloSeg, intervaloTexto, descansoSeg, descansoTexto: '',
        tiempoPromedio: prom, mejorTiempo: mejor, peorTiempo: peor, tiempos: tiemposS,
        estilo: detectarEstilo(linea),
        materiales: detectarMateriales(linea),
        intensidad: detectarIntensidad(linea),
        descripcion: linea,
        seccion: seccionActual,
        tipo: 'serie',
      })
      continue
    }

    // Nado suelto: "400 ez", "200 ez", "Mínimo 400 Ez"  (pero NO "ritmo de 200")
    const mNado = linea.match(/(\d{2,4})\s*(?:m|mts|metros)?/)
    if (mNado && PALABRAS_NADO.test(linea) && !/ritmo\s*de/i.test(linea)) {
      const dist = parseInt(mNado[1])
      if (dist >= 25 && dist <= 5000) {
        const rounds = roundPendiente
        const esEz = /\b(ez|easy|suave|soltura|afloje)\b/i.test(linea)
        const segundosPorRound = Math.round(dist / 100 * (esEz ? ritmoEz : ritmoPer100))
        sets.push({
          raw: linea, reps: 1, distancia: dist, series: 1, rounds, bloqueId: bloqueActual,
          metrosPorRound: dist, segundosPorRound,
          metros: dist * rounds,
          segundos: segundosPorRound * rounds,
          intervaloSeg: null, intervaloTexto: '', descansoSeg: 0, descansoTexto: '',
          tiempoPromedio: 0, mejorTiempo: 0, peorTiempo: 0, tiempos: [],
          estilo: detectarEstilo(linea),
          materiales: detectarMateriales(linea),
          intensidad: detectarIntensidad(linea),
          descripcion: linea,
          seccion: seccionActual,
          tipo: 'nado',
        })
        continue
      }
    }

    // Si no es nada de lo anterior y no tiene dígitos sueltos raros → sección o nota.
    const tieneDigitos = /\d/.test(linea)
    if (!tieneDigitos && linea.length <= 45) {
      seccionActual = linea
      bloqueActual = -1
      roundPendiente = 1
    } else {
      notas.push(linea)
    }
  }

  // Resumen por sección
  const seccionesMap = new Map<string, number>()
  for (const s of sets) {
    const k = s.seccion || 'General'
    seccionesMap.set(k, (seccionesMap.get(k) ?? 0) + s.metros)
  }
  const secciones: SeccionResumen[] = Array.from(seccionesMap.entries())
    .map(([nombre, metros]) => ({ nombre, metros }))

  const metrosTotales    = sets.reduce((a, s) => a + s.metros, 0)
  const segundosTotales  = sets.reduce((a, s) => a + s.segundos, 0)
  const minutosEstimados = Math.round(segundosTotales / 60)

  return {
    fecha, sets, bloques, notas, secciones,
    metrosTotales, minutosEstimados, ritmoPer100,
  }
}
