import { STATUS_LABELS } from '@/features/hosts/types'

/**
 * Cada estado tiene color Y forma distintos (círculo, rombo, cuadrado, círculo hueco),
 * para que se distingan también sin percibir el color (WCAG 1.4.1).
 */
const styles = {
  UP: { dot: 'rounded-full bg-accent shadow-[0_0_0_4px_var(--accent-bg)]', text: 'text-accent-strong' },
  DEGRADED: { dot: 'rotate-45 rounded-[2px] bg-warning shadow-[0_0_0_4px_var(--warning-bg)]', text: 'text-warning' },
  DOWN: { dot: 'blink rounded-[2px] bg-danger shadow-[0_0_0_4px_var(--danger-bg)]', text: 'text-danger' },
  UNKNOWN: { dot: 'rounded-full border-2 border-muted', text: 'text-muted' },
}

/** @param {{ status: import('@/features/hosts/types').HostStatus, className?: string }} props */
export function StatusDot({ status, className = 'size-2' }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 ${styles[status]?.dot ?? styles.UNKNOWN.dot} ${className}`} />
}

/** @param {{ status: import('@/features/hosts/types').HostStatus, label?: string, className?: string }} props */
export function StatusBadge({ status, label, className = 'text-sm' }) {
  const style = styles[status] ?? styles.UNKNOWN
  return (
    <span className={`inline-flex items-center gap-2.5 font-medium whitespace-nowrap ${style.text} ${className}`}>
      <StatusDot status={status} />
      {label ?? STATUS_LABELS[status]}
    </span>
  )
}

/** Versión en píldora para encabezados. @param {{ status: import('@/features/hosts/types').HostStatus }} props */
export function StatusPill({ status }) {
  const bg = { UP: 'bg-accent-bg border-accent-border', DEGRADED: 'bg-warning-bg border-warning/40', DOWN: 'bg-danger-bg border-danger/40', UNKNOWN: 'bg-tile border-line' }[status]
  return (
    <span className={`inline-flex rounded-full border px-3.5 py-1.5 ${bg}`}>
      <StatusBadge status={status} />
    </span>
  )
}
