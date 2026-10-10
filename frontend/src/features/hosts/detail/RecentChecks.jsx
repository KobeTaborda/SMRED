import { useId, useState } from 'react'
import { ChevronIcon } from '@/components/ui/icons'
import { GlassCard } from '@/components/ui/Feedback'
import { StatusBadge } from '@/components/ui/Status'
import { formatLatency, formatPercent, formatTimeSeconds } from '@/lib/format'
import { useLatestPings } from '../api'

const FIRST_PAGE = 6
const MAX_PAGE = 30

/** Estado de una revisión del historial, con el umbral de este equipo. */
function recordStatus(record, threshold) {
  if (!record.reachable) return 'DOWN'
  return (record.latencyMs ?? 0) > threshold || record.packetLossPct > 0 ? 'DEGRADED' : 'UP'
}

/**
 * Detalle de una revisión desplegada.
 * @param {{ record: import('./types').PingRecord, checkType: import('./types').CheckType }} props
 */
function CheckDetail({ record, checkType }) {
  return (
    <div className="flex flex-col gap-3 pb-3">
      {record.message && <p className="text-sm leading-relaxed">{record.message}</p>}
      {checkType === 'PING' && record.reachable && (
        <dl className="grid grid-cols-3 gap-2">
          {[
            ['Promedio', formatLatency(record.latencyMs)],
            ['Variación', formatLatency(record.jitterMs)],
            ['Perdidos', formatPercent(record.packetLossPct)],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5 rounded-xl bg-tile px-3 py-2">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-mono text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

/**
 * Últimas revisiones del equipo. Cada fila se despliega; la más reciente arranca abierta.
 * @param {{ host: import('./types').Host, threshold: number }} props
 */
export function RecentChecks({ host, threshold }) {
  const [limit, setLimit] = useState(FIRST_PAGE)
  const pings = useLatestPings(host.id, limit)
  // undefined: el usuario no ha abierto ninguna, se muestra la más reciente
  const [open, setOpen] = useState(/** @type {string | null | undefined} */ (undefined))
  const baseId = useId()
  const records = pings.data ?? []
  const openKey = open === undefined ? records[0]?.checkedAt : open

  return (
    <GlassCard>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Revisiones</h2>
        {records.length > 0 && <span className="text-[13px] text-muted">Toca una para ver el detalle</span>}
      </div>
      {pings.data?.length === 0 && <p className="text-sm text-muted">Aún no hay revisiones.</p>}
      <ul className={`flex flex-col ${limit > FIRST_PAGE ? 'max-h-[560px] overflow-y-auto pr-1' : ''}`}>
        {records.map((record, index) => {
          const expanded = record.checkedAt === openKey
          const panelId = `${baseId}-${index}`
          return (
            <li key={record.checkedAt} className="border-t border-line">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : record.checkedAt)}
                className="grid min-h-11 w-full grid-cols-[auto_1fr_1.2fr_auto] items-center gap-2 rounded-lg text-left text-sm hover:bg-hover/60"
              >
                <ChevronIcon className={`size-3.5 text-muted transition-transform ${expanded ? 'rotate-90' : ''}`} />
                <span className="font-mono text-muted">{formatTimeSeconds(record.checkedAt)}</span>
                <StatusBadge status={recordStatus(record, threshold)} className="text-[13px]" />
                <span className="text-right font-mono">{formatLatency(record.latencyMs)}</span>
              </button>
              {expanded && (
                <div id={panelId} className="pl-5.5">
                  <CheckDetail record={record} checkType={host.checkType ?? 'PING'} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {limit === FIRST_PAGE && records.length === limit && (
        <button type="button" onClick={() => setLimit(MAX_PAGE)} className="self-start text-sm font-semibold text-accent-strong hover:underline">
          Ver más revisiones
        </button>
      )}
      {limit > FIRST_PAGE && (
        <button type="button" onClick={() => setLimit(FIRST_PAGE)} className="self-start text-sm font-semibold text-accent-strong hover:underline">
          Ver menos
        </button>
      )}
    </GlassCard>
  )
}
