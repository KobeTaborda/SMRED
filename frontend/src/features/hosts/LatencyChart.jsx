import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDayTime, formatLatency, formatTime } from '@/lib/format'
import { useTheme } from '@/lib/theme'

/**
 * Tiempo de respuesta promedio por franja, con la línea del umbral de "Lento".
 * Los puntos por encima del umbral se marcan en ámbar.
 * @param {{ buckets: import('./types').Bucket[], threshold: number, period: '24h' | '7d' }} props
 */
export function LatencyChart({ buckets, threshold, period }) {
  const { colors } = useTheme()
  const data = buckets.map((b) => ({ ...b, label: period === '24h' ? formatTime(b.start) : formatDayTime(b.start) }))
  const maxValue = Math.max(threshold * 1.25, ...data.map((d) => d.avgLatencyMs ?? 0))
  const tick = { fill: colors.muted, fontSize: 12, fontFamily: 'DM Mono, monospace' }
  const slowCount = data.filter((d) => (d.avgLatencyMs ?? 0) > threshold).length

  return (
    <div role="img" aria-label={`Tiempo de respuesta promedio por franja. ${slowCount} franjas superan ${threshold} ms.`} className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={colors.line} />
          <XAxis padding={{ left: 8, right: 24 }} dataKey="label" tick={tick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={48} />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={64} domain={[0, Math.ceil(maxValue / 50) * 50]} tickFormatter={(value) => `${value} ms`} />
          <ReferenceLine
            y={threshold}
            stroke={colors.warning}
            strokeDasharray="6 5"
            strokeWidth={1.5}
            label={{ value: `Lento desde ${threshold} ms`, position: 'insideTopRight', fill: colors.warning, fontSize: 12 }}
          />
          <Tooltip
            cursor={{ stroke: colors.line }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const b = payload[0].payload
              return (
                <div className="glass rounded-2xl px-3.5 py-2.5 text-sm">
                  <p className="font-semibold">{period === '24h' ? formatTime(b.start) : formatDayTime(b.start)}</p>
                  <p className="text-muted">
                    Promedio <span className="font-mono text-ink">{formatLatency(b.avgLatencyMs)}</span>
                  </p>
                  <p className="text-muted">
                    Más lento <span className="font-mono text-ink">{formatLatency(b.maxLatencyMs)}</span>
                  </p>
                </div>
              )
            }}
          />
          <Line
            type="monotone"
            dataKey="avgLatencyMs"
            stroke={colors.accent}
            strokeWidth={2.5}
            connectNulls={false}
            isAnimationActive={false}
            activeDot={{ r: 5, fill: colors.accent, stroke: 'none' }}
            dot={(props) => {
              const { cx, cy, payload, index } = props
              if (payload.avgLatencyMs == null || payload.avgLatencyMs <= threshold) return <g key={index} />
              return <circle key={index} cx={cx} cy={cy} r={3.5} fill={colors.warning} />
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
