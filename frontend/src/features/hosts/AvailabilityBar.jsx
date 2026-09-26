import { formatDayTime, formatPercent, formatTime } from '@/lib/format'
import { STATUS_LABELS } from './types'

const colors = {
  UP: 'bg-accent opacity-85',
  DEGRADED: 'bg-warning',
  DOWN: 'bg-danger',
  UNKNOWN: 'bg-tile border border-line',
}

/**
 * Historial tipo "página de estado": una franja por periodo, coloreada por su estado.
 * @param {{ buckets: import('./types').Bucket[], period: '24h' | '7d' }} props
 */
export function AvailabilityBar({ buckets, period }) {
  const fmt = period === '24h' ? formatTime : formatDayTime
  return (
    <div className="flex flex-col gap-2">
      <ul aria-label="Disponibilidad por franja" className="flex h-7 gap-[3px]">
        {buckets.map((b) => {
          const text = `${fmt(b.start)}: ${b.checks ? `${STATUS_LABELS[b.status]}, ${formatPercent(b.availabilityPct)} disponible` : 'sin datos'}`
          return <li key={b.start} title={text} aria-label={text} className={`flex-1 rounded ${colors[b.status]}`} />
        })}
      </ul>
      <div className="flex justify-between font-mono text-xs text-muted">
        <span>{buckets[0] && fmt(buckets[0].start)}</span>
        <span>Ahora</span>
      </div>
    </div>
  )
}
