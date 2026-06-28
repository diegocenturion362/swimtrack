// ─── Enumeraciones ──────────────────────────────────────────────────────────

export type PoolSize        = '25m' | '50m'
export type TrainingType    = 'aeróbico' | 'velocidad' | 'técnica' | 'recuperación' | 'ritmo de prueba' | 'lactato' | 'mixto'
export type Stroke          = 'libre' | 'pecho' | 'espalda' | 'mariposa' | 'combinado' | 'piernas' | 'delfineo' | 'tecnica-correctivo'

// Opciones de "estilo/trabajo" y sus nombres para mostrar
export const STROKES: Stroke[] = [
  'libre', 'pecho', 'espalda', 'mariposa', 'combinado',
  'piernas', 'delfineo', 'tecnica-correctivo',
]
export const strokeLabel: Record<Stroke, string> = {
  libre: 'Libre', pecho: 'Pecho', espalda: 'Espalda', mariposa: 'Mariposa',
  combinado: 'Combinado', piernas: 'Piernas', delfineo: 'Delfineo',
  'tecnica-correctivo': 'Técnica - Correctivo',
}
export type Material        = 'paletas' | 'patas' | 'paracaidas' | 'snorkel' | 'pull' | 'tabla'

// Materiales y sus nombres para mostrar (selección múltiple)
export const MATERIALS: Material[] = ['paletas', 'patas', 'paracaidas', 'snorkel', 'pull', 'tabla']
export const materialLabel: Record<Material, string> = {
  paletas: 'Manoplas', patas: 'Patas', paracaidas: 'Paracaídas',
  snorkel: 'Snorkel', pull: 'Pull', tabla: 'Tabla',
}
export type SetObjective    = 'velocidad' | 'resistencia' | 'técnica' | 'ritmo de competencia' | 'control'
export type GeneralFeeling  = 'muy buena' | 'buena' | 'regular' | 'mala'
export type PreviousState   = 'fresco' | 'cansado' | 'pesado' | 'motivado' | 'bajo de energía'
export type SwimmerStatus   = 'En progreso' | 'Estable' | 'Estancado' | 'Sobrecarga' | 'Sin datos'
export type AlertType       = 'sin_datos' | 'mejora_reciente' | 'estancamiento' | 'carga_alta' | 'baja_asistencia' | 'buen_progreso'
export type AlertLevel      = 'info' | 'warning' | 'success' | 'danger'

// ─── Entidades ───────────────────────────────────────────────────────────────

export interface Swimmer {
  id:              string
  nombre:          string
  edad:            number   // se usa si no hay fechaNacimiento
  fechaNacimiento?: string  // ISO YYYY-MM-DD; si está, la edad se calcula sola
  sexo:            'masculino' | 'femenino'
  categoria:       string
  especialidad:    Stroke
  pruebaPrincipal: string   // ej: "100m Libre"
  piletaHabitual:  PoolSize
  marcaObjetivo:   number   // segundos
  objetivoTemporada: string
  entrenadorId:    string
  codigoAcceso?:   string   // generado por Supabase, solo visible para el nadador
}

export interface Coach {
  id:         string   // auth.uid()
  nombre:     string
  clubEquipo: string
}

export interface TrainingSession {
  id:                  string
  swimmerId:           string
  fecha:               string  // ISO date YYYY-MM-DD
  pileta:              PoolSize
  tipoEntrenamiento:   TrainingType
  volumenTotal:        number  // metros
  duracionMinutos:     number
  rpe:                 number  // 1–10
  horasSueno:          number
  sensacionGeneral:    GeneralFeeling
  estadoPrevio:        PreviousState
  comentarioPrevio?:   string  // sensaciones/observaciones ANTES del entreno
  comentarioNadador:    string  // comentario DESPUÉS del entreno
  comentarioEntrenador: string
  alimentacion?:        number    // 1–10 autoevaluación nutricional del día
  confirmacion?:        'confirmado' | 'modificado' | 'no_pudo'
  esPlaneada?:          boolean   // true = sesión planificada por el coach (no registrada aún)
}

export interface TrainingSet {
  id:                  string
  trainingSessionId:   string
  swimmerId:           string
  pileta:              PoolSize
  repeticiones:        number
  distancia:           number  // metros por repetición
  series?:             number  // multiplicador externo en series compuestas (5 x 6 x 7)
  estilo:              Stroke
  intervaloSalida:     string  // "MM:SS"
  tipoIntervaloReps?:  'salida' | 'fijo'  // cómo interpretar intervaloSalida (default: 'salida')
  descanso:            string  // "MM:SS"
  tiempoPromedio:      number  // segundos
  mejorTiempo:         number  // segundos
  peorTiempo:          number  // segundos
  variacion:           number  // segundos
  tiempos?:            number[][]  // tiempos por [serie][repetición] (0 = vacío)
  materiales:          Material[]  // materiales usados (puede ser varios juntos)
  grupo?:              string      // id del "Trabajo" cuando tiene varias partes
  tipoDescansoSeries?: 'salida' | 'fijo'  // cómo interpretar descanso entre series
  orden?:              number      // posición en la sesión (para orden determinístico)
  objetivoSerie:       SetObjective
  observacionTecnica:  string
  claveSimilitud:      string  // ej: "8x50-libre-Pileta25-Intervalo0:45"
}

export interface Competition {
  id:                  string
  swimmerId:           string
  nombreTorneo:        string
  fecha:               string
  ciudad:              string
  pileta:              PoolSize
  prueba:              string
  tiempoFinal:         number  // segundos
  parciales:           number[]
  ubicacion:           number  // puesto
  categoria:           string
  sensacionPrevia:     GeneralFeeling
  estadoPrevio?:       PreviousState  // cómo llegó a la carrera
  comentarioPrevio?:   string          // observaciones antes de la carrera
  estrategia:          string
  sensacionPosterior:  GeneralFeeling
  comentarioNadador?:  string          // reflexión del nadador post-carrera
  errorPrincipal:      string
  aprendizaje:         string
  comentarioEntrenador: string
}

export interface PersonalBest {
  id:          string
  swimmerId:   string
  prueba:      string
  tiempo:      number  // segundos
  fecha:       string
  pileta:      PoolSize
  fuente:      'entrenamiento' | 'competencia'
  contexto:    string
  observacion: string
}

export interface Alert {
  id:         string
  swimmerId:  string
  tipo:       AlertType
  mensaje:    string
  fecha:      string
  nivel:      AlertLevel
}

// ─── Vistas compuestas ───────────────────────────────────────────────────────

export interface SimilarSetEntry {
  set:     TrainingSet
  session: TrainingSession
}

export interface SimilarSetComparison {
  claveSimilitud: string
  entries:        SimilarSetEntry[]
  // Comparación entre la última y la penúltima aparición
  delta: {
    tiempoPromedio:    number  // positivo = mejoró (bajó tiempo)
    mejorTiempo:       number
    rpe:               number
    porcentajeMejora:  number
    mensaje:           string
  } | null
}

export interface SwimmerSummary {
  swimmer:     Swimmer
  status:      SwimmerStatus
  alerts:      Alert[]
  lastSession: TrainingSession | null
  bestMark:    PersonalBest | null
}
