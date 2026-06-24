import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { formatTime, formatDate } from '../../utils/timeUtils'

interface DataPoint {
  fecha:  string
  tiempo: number
  label?: string
}

interface Props {
  data:      DataPoint[]
  objetivo?: number
  color?:    string
  height?:   number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-0.5">{label}</p>
      <p className="font-bold text-base">{formatTime(payload[0].value)}</p>
    </div>
  )
}

export function TimeLineChart({ data, objetivo, color = '#1d4ed8', height = 200 }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        Sin datos suficientes
      </div>
    )
  }

  const formatted = data.map(d => ({
    ...d,
    displayDate: formatDate(d.fecha),
  }))

  // Invertir eje Y: tiempo menor = mejor (arriba)
  const times  = data.map(d => d.tiempo)
  const minT   = Math.min(...times)
  const maxT   = Math.max(...times)
  const pad    = (maxT - minT) * 0.15 || 2

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formatted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="displayDate"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[minT - pad, maxT + pad]}
          reversed
          tickFormatter={formatTime}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} />
        {objetivo && (
          <ReferenceLine
            y={objetivo}
            stroke="#c9a227"
            strokeDasharray="4 2"
            label={{ value: 'Objetivo', fill: '#c9a227', fontSize: 10, position: 'right' }}
          />
        )}
        <Line
          type="monotone"
          dataKey="tiempo"
          stroke={color}
          strokeWidth={2.5}
          dot={{ fill: color, r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
