# SwimTrack — MVP de Entrenamiento en Natación

App mobile-first para registrar, visualizar y analizar entrenamientos de natación.

## Cómo ejecutar el proyecto localmente

### Requisitos previos
- Node.js 18 o superior
- npm 9 o superior

### Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abrí el navegador en `http://localhost:5173`

Para mejor experiencia mobile, activá las DevTools del navegador (F12 → toggle mobile view → iPhone 14 Pro o similar).

### Build para producción

```bash
npm run build
npm run preview
```

---

## Estructura del proyecto

```
src/
├── types/          → Interfaces TypeScript (Swimmer, Session, Set, etc.)
├── data/           → Datos simulados: 5 nadadores con historial realista
├── utils/
│   ├── timeUtils.ts      → Formateo de tiempos, fechas, deltas
│   ├── swimmerStatus.ts  → Detección de estado (progreso/estancamiento)
│   └── similarity.ts     → Clave de similitud y comparación de series
├── store/
│   └── useStore.ts       → Zustand store + persistencia localStorage
├── components/
│   ├── ui/               → Button, Card, Badge, FormField
│   ├── layout/           → BottomNav, Header, PageLayout
│   └── charts/           → TimeLineChart, VolumeBarChart, RPEChart
└── pages/
    ├── RoleSelector.tsx  → Pantalla de inicio / selección de rol
    ├── coach/            → Dashboard, Nadadores, Perfil, Registrar, Comparar
    └── swimmer/          → Dashboard, Entrenos, Marcas, Evolución
```

## Roles disponibles

- **Entrenador** → ve todos los nadadores, carga entrenamientos y competencias, compara series
- **Nadador** → cada nadador ve su propio dashboard, marcas y evolución

Los datos se guardan en **localStorage** del navegador. Al recargar se mantienen.

## Datos de ejemplo incluidos

| Nadador         | Prueba         | Estado    | Patrón                    |
|-----------------|----------------|-----------|---------------------------|
| María González  | 100m Libre     | En progreso | Mejora sostenida en series y competencias |
| Tomás Herrera   | 200m Mariposa  | En progreso | Mejora constante, cerca del objetivo |
| Laura Fernández | 200m Espalda   | Estancado   | Tiempos sin cambio en 4 series repetidas |
| Martín Silva    | 400m Libre     | Sobrecarga  | RPE alto, tiempos empeorando |
| Camila Ortiz    | 100m Pecho     | En progreso | Debut en Menores, mejora visible |

## Funcionalidades implementadas

- ✅ Selección de rol (entrenador / nadador)
- ✅ Dashboard del entrenador con alertas y acciones rápidas
- ✅ Lista de nadadores con filtro por estado
- ✅ Perfil detallado de cada nadador
- ✅ Formulario multi-paso para cargar entrenamientos
- ✅ Formulario multi-paso para cargar competencias
- ✅ Clave de similitud automática para series
- ✅ Comparación de series similares con análisis de evolución
- ✅ Dashboard del nadador con progreso hacia objetivo
- ✅ Historial de entrenamientos desde la vista del nadador
- ✅ Marcas de entrenamiento y competencia separadas
- ✅ Gráficos de evolución, volumen y RPE
- ✅ Detección automática de estado (En progreso / Estancado / Sobrecarga)
- ✅ Persistencia local en localStorage

## Próximos pasos (roadmap)

- [ ] Migración a Supabase/Firebase
- [ ] Autenticación real
- [ ] Exportación a CSV
- [ ] Notificaciones push
- [ ] Registro de parciales detallados
- [ ] Comparación entrenamiento vs competencia en gráfico único
