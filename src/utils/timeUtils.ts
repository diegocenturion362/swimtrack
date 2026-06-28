// Formatea segundos a  28"32  o  1'23"23
export function formatTime(seconds: number): string {
  return formatRepTime(seconds) || '—'
}

// Formatea "M:SS.x" largo para marcas en competencia
export function formatTimeLong(seconds: number): string {
  if (seconds <= 0) return '—'
  if (seconds < 60) {
    return `${seconds.toFixed(2)}"`
  }
  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(2).padStart(5, '0')
  return `${m}'${s}"`
}

// Diferencia en segundos. Positivo = mejoró (el tiempo bajó)
export function timeDelta(prev: number, curr: number): number {
  return parseFloat((prev - curr).toFixed(2))
}

// Porcentaje de mejora respecto al tiempo anterior
export function improvementPct(prev: number, curr: number): number {
  if (prev === 0) return 0
  return parseFloat((((prev - curr) / prev) * 100).toFixed(2))
}

// Devuelve etiqueta de delta con signo y color
export function deltaLabel(delta: number): { text: string; positive: boolean } {
  if (delta === 0) return { text: '0.0s', positive: true }
  const sign  = delta > 0 ? '−' : '+'
  const value = Math.abs(delta).toFixed(1)
  return { text: `${sign}${value}s`, positive: delta > 0 }
}

// Parsea un tiempo de repetición tipeado a segundos.
// Acepta:  1'28"32  ·  28"32  ·  28"3  ·  1'28  ·  28.32  ·  1:02.3  ·  28
//   '  = minutos   ·   "  = separador de segundos/centésimas
export function parseRepTime(str: string): number {
  const t = str.trim()
  if (!t) return 0
  let min = 0
  let resto = t
  const apos = t.match(/^(\d+)\s*['′]\s*(.*)$/)   // 1'28"32  → min=1, resto=28"32
  if (apos) { min = parseInt(apos[1]); resto = apos[2].trim() }
  resto = resto.replace(/[“\x22]/g, '.').replace(',', '.').replace(/^:/, '')
  let seg: number
  if (resto.includes(':')) {
    const [a, b] = resto.split(':')
    min += parseInt(a) || 0
    seg = parseFloat(b) || 0
  } else {
    seg = parseFloat(resto) || 0
  }
  return min * 60 + seg
}

// Escritura inteligente: el usuario tipea SOLO números y aparecen los símbolos.
// Los 2 últimos dígitos = centésimas, los 2 anteriores = segundos, el resto = minutos.
//   2832    → 28"32        12832 → 1'28"32        012323 → 1'23"23
// Así no hace falta poner ' ni " a mano (cómodo en el celular).
export function formatSmartTime(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(-6)   // me quedo con los últimos 6 dígitos
  if (!d) return ''
  if (d.length <= 2) return d                  // "2" / "28" → todavía sin símbolos
  const cc = d.slice(-2)
  const ss = d.slice(-4, -2)
  const mm = d.slice(0, -4)
  let out = ''
  if (mm) out += `${parseInt(mm)}'` + ss.padStart(2, '0')
  else    out += String(parseInt(ss))
  return `${out}"${cc}`
}

// Formatea segundos al formato de pileta:  1'28"32  o  28"32
export function formatRepTime(seconds: number): string {
  if (!seconds || seconds <= 0) return ''
  let m = Math.floor(seconds / 60)
  const rest = seconds - m * 60
  let s = Math.floor(rest)
  let c = Math.round((rest - s) * 100)
  if (c === 100) { c = 0; s += 1 }
  if (s === 60) { s = 0; m += 1 }
  const cc = String(c).padStart(2, '0')
  return m > 0 ? `${m}'${String(s).padStart(2, '0')}"${cc}` : `${s}"${cc}`
}

// Parsea "M:SS" o "M:SS.x" a segundos
export function parseInterval(str: string): number {
  const parts = str.split(':')
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseFloat(parts[1])
  }
  return parseFloat(str)
}

// Ordena fechas ISO ascendente
export function sortByDate<T extends { fecha: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// Formatea fecha ISO a "DD/MM/YYYY"
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Suma (o resta) días a una fecha ISO, usando fecha local (sin corrimiento de zona)
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// Calcula la edad (años cumplidos) a partir de una fecha de nacimiento ISO
export function calcularEdad(fechaNac: string): number {
  if (!fechaNac) return 0
  const [y, m, d] = fechaNac.split('-').map(Number)
  const hoy = new Date()
  let edad = hoy.getFullYear() - y
  const mesActual = hoy.getMonth() + 1
  if (mesActual < m || (mesActual === m && hoy.getDate() < d)) edad--
  return edad
}

// Fecha de hoy en ISO (YYYY-MM-DD), según la hora local
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// "DD/MM" corto
export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// Devuelve "hace X días" relativo a hoy
export function relativeDate(iso: string): string {
  const ms   = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / 86_400_000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days <  7)  return `Hace ${days} días`
  if (days < 30)  return `Hace ${Math.floor(days / 7)} sem.`
  if (days < 365) return `Hace ${Math.floor(days / 30)} mes.`
  return `Hace ${Math.floor(days / 365)} año/s`
}

// Formatea parciales de competencia como "tramo (acumulado) ; tramo (acumulado)"
// Detecta automáticamente si el array son tiempos acumulados o tiempos por tramo.
export function formatearParciales(parciales: number[], tiempoFinal: number): string {
  if (!parciales.length) return ''
  const sumP = parseFloat(parciales.reduce((a, b) => a + b, 0).toFixed(2))
  const isLapTimes = tiempoFinal > 0 && Math.abs(sumP - tiempoFinal) < 1
  let cums: number[]
  if (isLapTimes) {
    let acc = 0
    cums = parciales.map(lap => { acc = parseFloat((acc + lap).toFixed(2)); return acc })
  } else {
    cums = [...parciales]
    if (tiempoFinal > 0 && parciales[parciales.length - 1] < tiempoFinal - 0.01) cums.push(tiempoFinal)
  }
  return cums.map((c, i) => {
    const lap = i === 0 ? c : parseFloat((c - cums[i - 1]).toFixed(2))
    return `${formatRepTime(lap)} (${formatRepTime(c)})`
  }).join(' ; ')
}

// Devuelve los 7 días (Lun–Dom) de la semana que contiene la fecha ISO dada
export function getWeekDays(anchor: string): string[] {
  const [y, m, d] = anchor.split('-').map(Number)
  const dt  = new Date(y, m - 1, d)
  const dow = dt.getDay() || 7   // 1=Lun … 7=Dom
  const mon = new Date(y, m - 1, d - (dow - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  })
}

// Semanas del año para agrupar por semana
export function weekKey(iso: string): string {
  const d   = new Date(iso)
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const y   = d.getFullYear()
  const w   = Math.ceil(((d.getTime() - new Date(y, 0, 1).getTime()) / 86_400_000 + 1) / 7)
  return `${y}-W${String(w).padStart(2, '0')}`
}
