import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorBanner, GlassCard, Loading, StatTile } from '@/components/ui/Feedback'
import { ChevronIcon, EditIcon, RefreshIcon, TrashIcon } from '@/components/ui/icons'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge, StatusPill } from '@/components/ui/Status'
import { useIsAdmin } from '@/features/auth/useAuth'
import { ApiError, errorMessage } from '@/lib/api'
import { formatDate, formatLatency, formatPercent, formatRelative, formatTime, formatTimeSeconds } from '@/lib/format'
import { useHost, useHostStats, useLatestPings } from './api'
import { AvailabilityBar } from './AvailabilityBar'
import { HostForm } from './HostForm'
import { LatencyChart } from './LatencyChart'
import { HOST_TYPE_LABELS } from './types'
import { useHostActions } from './useHostActions'

const PERIODS = [
  { key: '24h', label: '24 horas', bucket: '30 minutos' },
  { key: '7d', label: '7 días', bucket: '4 horas' },
]

/** Frase que explica el estado actual en palabras simples. @param {import('./types').Host} host */
function statusSentence(host) {
  const since = host.statusChangedAt ? ` desde las ${formatTime(host.statusChangedAt)}` : ''
  if (!host.monitoringEnabled) return 'La revisión automática está pausada.'
  switch (host.status) {
    case 'UP': return `Responde con normalidad${since}.`
    case 'DEGRADED': return `Responde lento${since}.`
    case 'DOWN': return `No responde${since}.`
    default: return 'Aún no se ha revisado. La primera revisión será en unos segundos.'
  }
}

export function HostDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const [period, setPeriod] = useState(/** @type {'24h' | '7d'} */ ('24h'))
  const [editing, setEditing] = useState(false)
  const host = useHost(id)
  const stats = useHostStats(id, period)
  const pings = useLatestPings(id, 6)
  const actions = useHostActions({ onDeleted: () => navigate('/hosts', { replace: true }) })

  if (host.isPending) return <Loading />
  if (host.error instanceof ApiError && host.error.status === 404) {
    return (
      <EmptyState title="Este equipo no existe">
        Puede que lo hayan eliminado. <Link to="/hosts" className="text-accent-strong underline">Volver a Equipos</Link>
      </EmptyState>
    )
  }
  if (host.error) return <ErrorBanner message={errorMessage(host.error)} />

  const h = host.data
  const summary = stats.data?.summary
  const threshold = stats.data?.degradedLatencyMs ?? 200
  const current = PERIODS.find((p) => p.key === period)

  return (
    <>
      <nav aria-label="Ruta" className="-mb-3 flex items-center gap-1.5 px-1 text-sm text-muted md:px-2">
        <Link to="/hosts" className="text-accent-strong hover:underline">
          Equipos
        </Link>
        <ChevronIcon className="size-3.5" />
        <span aria-current="page" className="truncate">{h.name}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4 px-1 md:px-2">
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-[32px] leading-[1.05] font-semibold tracking-[-0.025em] md:text-[44px]">{h.name}</h1>
            <StatusPill status={h.status} />
          </div>
          <p className="text-base text-muted">
            <span className="font-mono text-ink">{h.address}</span>, {HOST_TYPE_LABELS[h.type].toLowerCase()}
            {h.location && ` en ${h.location}`}. {statusSentence(h)}
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" icon={<TrashIcon />} className="text-danger!" onClick={() => actions.askDelete(h)}>
              Eliminar
            </Button>
            <Button variant="ghost" icon={<EditIcon />} onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button variant="glass" icon={<RefreshIcon className={`size-[18px] ${actions.isChecking(h.id) ? 'animate-spin' : ''}`} />} disabled={actions.isChecking(h.id)} onClick={() => actions.checkNow(h)}>
              Revisar ahora
            </Button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={`Disponible, últimas ${current.label}`}
          value={formatPercent(summary?.availabilityPct)}
          tone={summary?.availabilityPct == null ? 'default' : summary.availabilityPct >= 99 ? 'accent' : summary.availabilityPct >= 90 ? 'warning' : 'danger'}
          note={summary ? `${summary.checks} revisiones` : undefined}
        />
        <StatTile label="Respuesta promedio" value={formatLatency(summary?.avgLatencyMs)} />
        <StatTile
          label="Respuesta más lenta"
          value={formatLatency(summary?.maxLatencyMs)}
          tone={(summary?.maxLatencyMs ?? 0) > threshold ? 'warning' : 'default'}
          note={summary?.maxLatencyAt ? `A las ${formatTime(summary.maxLatencyAt)}` : undefined}
        />
        <StatTile label="Paquetes perdidos" value={formatPercent(summary?.packetLossPct)} tone={(summary?.packetLossPct ?? 0) > 0 ? 'warning' : 'default'} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <GlassCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Tiempo de respuesta</h2>
              <div role="group" aria-label="Periodo" className="flex gap-1 rounded-full bg-tile p-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={period === p.key}
                    onClick={() => setPeriod(/** @type {'24h' | '7d'} */ (p.key))}
                    className={`min-h-9 rounded-full px-3.5 text-[13px] font-semibold ${period === p.key ? 'bg-hover text-ink' : 'text-muted hover:text-ink'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {stats.error && <ErrorBanner message={errorMessage(stats.error)} />}
            {stats.data && (stats.data.summary.checks === 0 ? (
              <p className="py-16 text-center text-muted">Todavía no hay revisiones en este periodo.</p>
            ) : (
              <LatencyChart buckets={stats.data.buckets} threshold={threshold} period={period} />
            ))}
          </GlassCard>

          <GlassCard>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">Disponibilidad</h2>
              <span className="text-[13px] text-muted">Cada franja son {current.bucket}</span>
            </div>
            {stats.data && <AvailabilityBar buckets={stats.data.buckets} period={period} />}
          </GlassCard>
        </div>

        <div className="flex flex-col gap-6">
          <GlassCard>
            <h2 className="text-lg font-semibold">Detalles</h2>
            <dl className="flex flex-col">
              {[
                ['Tipo', HOST_TYPE_LABELS[h.type]],
                ['Ubicación', h.location || '—'],
                ['Revisión automática', h.monitoringEnabled ? 'Activa' : 'Pausada'],
                ['Última respuesta', formatRelative(h.lastSeenAt)],
                ['Agregado', formatDate(h.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex min-h-10 items-center justify-between gap-4 border-t border-line">
                  <dt className="text-sm text-muted">{k}</dt>
                  <dd className="text-right text-sm">{v}</dd>
                </div>
              ))}
            </dl>
            {h.description && <p className="text-sm leading-relaxed text-muted">{h.description}</p>}
          </GlassCard>

          <GlassCard>
            <h2 className="text-lg font-semibold">Últimas revisiones</h2>
            {pings.data?.length === 0 && <p className="text-sm text-muted">Aún no hay revisiones.</p>}
            <ul className="flex flex-col">
              {pings.data?.map((p) => {
                const status = !p.reachable ? 'DOWN' : (p.latencyMs ?? 0) > threshold || p.packetLossPct > 0 ? 'DEGRADED' : 'UP'
                return (
                  <li key={p.checkedAt} className="grid min-h-10 grid-cols-[1fr_1.3fr_0.8fr] items-center gap-2 border-t border-line text-sm">
                    <span className="font-mono text-muted">{formatTimeSeconds(p.checkedAt)}</span>
                    <StatusBadge status={status} className="text-[13px]" />
                    <span className="text-right font-mono">{formatLatency(p.latencyMs)}</span>
                  </li>
                )
              })}
            </ul>
          </GlassCard>
        </div>
      </div>

      <Modal open={editing} title="Editar equipo" onClose={() => setEditing(false)}>
        {editing && <HostForm host={h} onDone={() => setEditing(false)} />}
      </Modal>

      <ConfirmDialog
        open={actions.toDelete !== null}
        title="¿Eliminar este equipo?"
        confirmLabel="Eliminar equipo"
        loading={actions.deleting}
        error={actions.deleteError}
        onCancel={actions.cancelDelete}
        onConfirm={actions.confirmDelete}
      >
        Se eliminará <strong className="font-semibold text-ink">{h.name}</strong> <span className="font-mono text-sm">{h.address}</span> y todo su historial de revisiones. No se puede deshacer.
      </ConfirmDialog>
    </>
  )
}
