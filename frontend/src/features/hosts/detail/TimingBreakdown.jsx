import { formatLatency } from '@/lib/format'

/** Fases de una petición web, en el orden en que ocurren. */
const PHASES = [
  { key: 'dnsMs', label: 'Buscar el dominio (DNS)', color: 'var(--light-3)' },
  { key: 'connectMs', label: 'Conectar', color: 'var(--accent)' },
  { key: 'tlsMs', label: 'Cifrar la conexión (TLS)', color: 'var(--light-2)' },
  { key: 'ttfbMs', label: 'Esperar al servidor', color: 'var(--accent-strong)' },
  { key: 'downloadMs', label: 'Descargar la página', color: 'var(--muted)' },
]

/**
 * Desglose del tiempo de respuesta por fase (DNS, conexión, TLS, servidor, descarga).
 * @param {{ timings: import('./types').CheckTimings, totalMs: number | null }} props
 */
export function TimingBreakdown({ timings, totalMs }) {
  const measured = (timings.dnsMs ?? 0) + (timings.connectMs ?? 0) + (timings.tlsMs ?? 0) + (timings.ttfbMs ?? 0)
  // Solo las páginas web tienen descarga
  const downloadMs = timings.ttfbMs != null && totalMs != null ? Math.max(totalMs - measured, 0) : null
  const values = { ...timings, downloadMs }
  const phases = PHASES.filter(({ key }) => values[key] != null)
  const total = phases.reduce((sum, { key }) => sum + values[key], 0) || 1

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-tile" aria-hidden="true">
        {phases.map(({ key, color }) => (
          <span key={key} style={{ width: `${(values[key] / total) * 100}%`, background: color }} className="min-w-[3px]" />
        ))}
      </div>
      <dl className="flex flex-col">
        {phases.map(({ key, label, color }) => (
          <div key={key} className="flex min-h-9 items-center justify-between gap-3 border-t border-line text-sm">
            <dt className="flex items-center gap-2 text-muted">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
              {label}
            </dt>
            <dd className="font-mono">{formatLatency(Math.round(values[key] * 10) / 10)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
