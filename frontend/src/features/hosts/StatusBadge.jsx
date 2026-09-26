import { STATUS_LABELS } from './types'

// El estado se comunica con forma + texto, no solo con color (accesibilidad WCAG 1.4.1)
const styles = {
  UP: { dot: 'bg-status-up', symbol: '●' },
  DEGRADED: { dot: 'bg-status-degraded', symbol: '▲' },
  DOWN: { dot: 'bg-status-down', symbol: '■' },
  UNKNOWN: { dot: 'bg-status-unknown', symbol: '○' },
}

/** @param {{ status: import('./types').HostStatus }} props */
export function StatusBadge({ status }) {
  const style = styles[status] ?? styles.UNKNOWN
  return (
    <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
      <span aria-hidden="true" className={`inline-flex size-4 items-center justify-center rounded-full text-[9px] text-canvas ${style.dot}`}>
        {style.symbol}
      </span>
      {STATUS_LABELS[status]}
    </span>
  )
}
