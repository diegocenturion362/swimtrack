import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { formatDate } from '../../utils/timeUtils'

interface DataPoint {
  fecha: string
  rpe:   number
}

interface Props {
  data:   DataPoint[]
  height?: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-0.5">{label}</p>
      <p className="font-bold text-base">RPE {payload[0].value}</p>
    </div>
  )
}

export function RPEChart({ data, height = 140 }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
        Sin datos
      </div>
    )
  }

  const formatted = data.map(d => ({ ...d, displayDate: formatDate(d.fecha) }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rpeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f97316" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="displayDate"
          tick={{ fontSize: 9, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 10]}
          ticks={[0, 3, 6, 8, 10]}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          width={18}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="3 2" strokeOpacity={0.5} />
        <Area
          type="monotone"
          dataKey="rpe"
          stroke="#f97316"
          strokeWidth={2}
          fill="url(#rpeGrad)"
          dot={{ fill: '#f97316', r: 3, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
