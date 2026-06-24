import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'

interface DataPoint {
  semana:   string
  volumen:  number
  sesiones: number
}

interface Props {
  data:   DataPoint[]
  height?: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="font-bold">{(payload[0].value / 1000).toFixed(1)} km</p>
      <p className="text-slate-400">{payload[0].payload.sesiones} sesiones</p>
    </div>
  )
}

export function VolumeBarChart({ data, height = 160 }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        Sin datos suficientes
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="semana"
          tick={{ fontSize: 9, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="volumen" fill="#1d4ed8" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  )
}
