import { useTheme } from '@/lib/theme'

/**
 * Mini gráfica de tendencia, sin ejes. Los huecos (null) cortan la línea.
 * @param {{ values: (number | null)[], height?: number, label: string }} props
 */
export function Sparkline({ values, height = 48, label }) {
  const { colors } = useTheme()
  const numbers = values.filter((v) => v != null)
  if (numbers.length < 2) return <div style={{ height }} aria-hidden="true" />

  const width = 300
  const max = Math.max(...numbers) * 1.15 || 1
  const step = width / (values.length - 1)
  const segments = []
  let current = []
  values.forEach((v, i) => {
    if (v == null) {
      if (current.length) segments.push(current)
      current = []
    } else {
      current.push(`${(i * step).toFixed(1)},${(height - (v / max) * height).toFixed(1)}`)
    }
  })
  if (current.length) segments.push(current)

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label}>
      {segments.map((points, i) => (
        <polyline key={i} points={points.join(' ')} fill="none" stroke={colors.accent} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}
