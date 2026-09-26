import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorBanner, GlassCard, LivePill, Loading, PageHeader, StatTile } from '@/components/ui/Feedback'
import { RefreshIcon } from '@/components/ui/icons'
import { Sparkline } from '@/components/ui/Sparkline'
import { StatusBadge } from '@/components/ui/Status'
import { useIsAdmin } from '@/features/auth/useAuth'
import { useHosts, useOverview } from '@/features/hosts/api'
import { needsAttention, sortByPriority } from '@/features/hosts/types'
import { useHostActions } from '@/features/hosts/useHostActions'
import { errorMessage } from '@/lib/api'
import { formatLatency, formatRelative, formatTime } from '@/lib/format'

/** Explica en palabras simples qué le pasa a un equipo. */
function attentionMessage(host, threshold) {
  if (!host.monitoringEnabled) return 'La revisión automática está pausada.'
  if (host.status === 'DOWN') {
    return host.statusChangedAt
      ? `No responde desde las ${formatTime(host.statusChangedAt)}, ${formatRelative(host.statusChangedAt)}.`
      : 'No responde.'
  }
  if (host.status === 'DEGRADED') {
    return host.lastLatencyMs > threshold
      ? `Responde lento: ${formatLatency(host.lastLatencyMs)}. Lo normal es menos de ${threshold} ms.`
      : 'Responde, pero se perdieron paquetes en la última revisión.'
  }
  return 'Recién agregado. La primera revisión será en unos segundos.'
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

export function DashboardPage() {
  const isAdmin = useIsAdmin()
  const hosts = useHosts()
  const overview = useOverview()
  const actions = useHostActions()

  if (hosts.isPending) return <Loading />
  if (hosts.error) return <ErrorBanner message={errorMessage(hosts.error)} />

  const all = hosts.data
  if (all.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Monitoreo de red" title="Toda tu red, a la vista" description="Agrega tu primer equipo y SMRED empezará a revisarlo automáticamente." />
        <EmptyState title="Aún no hay equipos">
          {isAdmin ? (
            <Link to="/hosts" className="text-accent-strong underline">Ir a Equipos para agregar el primero</Link>
          ) : (
            'Un administrador debe agregarlos.'
          )}
        </EmptyState>
      </>
    )
  }

  const threshold = overview.data?.degradedLatencyMs ?? 200
  const interval = overview.data?.intervalSeconds ?? 30
  const attention = sortByPriority(all.filter(needsAttention))
  const up = all.filter((h) => h.status === 'UP').length
  const down = all.filter((h) => h.status === 'DOWN').length
  const slow = all.filter((h) => h.status === 'DEGRADED').length
  const responding = all.filter((h) => h.lastLatencyMs != null && h.status !== 'DOWN')
  const avgLatency = responding.length ? responding.reduce((sum, h) => sum + h.lastLatencyMs, 0) / responding.length : null
  const lastCheck = all.map((h) => h.lastCheckedAt).filter(Boolean).sort().at(-1)

  const title =
    attention.length === 0
      ? `Todo en orden: ${plural(all.length, 'equipo responde', 'equipos responden')}`
      : `${attention.length} de ${plural(all.length, 'equipo', 'equipos')} ${attention.length === 1 ? 'necesita' : 'necesitan'} atención`

  return (
    <>
      <PageHeader
        eyebrow="Monitoreo de red"
        title={title}
        description={`SMRED revisa cada equipo cada ${interval} segundos.${lastCheck ? ` La última revisión fue ${formatRelative(lastCheck)}.` : ''}`}
        actions={<LivePill />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Equipos" value={all.length} />
        <StatTile label="En línea" value={up} tone="accent" />
        <StatTile
          label="Con problemas"
          value={down + slow}
          tone={down + slow ? 'danger' : 'default'}
          note={down + slow ? `${plural(down, 'sin respuesta', 'sin respuesta')} y ${plural(slow, 'lento', 'lentos')}` : 'Ninguno'}
        />
        <StatTile label="Tiempo de respuesta" value={formatLatency(avgLatency)}>
          <Sparkline values={overview.data?.latencyTrend.map((p) => p.avgLatencyMs) ?? []} height={36} label="Tendencia del tiempo de respuesta en las últimas 2 horas" />
        </StatTile>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <GlassCard>
          <h2 className="text-lg font-semibold">{attention.length ? 'Necesitan atención' : 'Nada pendiente'}</h2>
          {attention.length === 0 && <p className="text-[15px] text-muted">Todos los equipos responden con normalidad.</p>}
          <ul className="flex flex-col">
            {attention.map((host) => (
              <li key={host.id} className="flex items-center gap-3 border-t border-line pt-3.5 pb-1">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link to={`/hosts/${host.id}`} className="font-semibold text-ink hover:underline">
                      {host.name}
                    </Link>
                    <StatusBadge status={host.status} className="text-[13px]" />
                  </div>
                  <span className="text-sm text-muted">{attentionMessage(host, threshold)}</span>
                </div>
                {isAdmin && host.monitoringEnabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<RefreshIcon className={`size-[18px] ${actions.isChecking(host.id) ? 'animate-spin' : ''}`} />}
                    disabled={actions.isChecking(host.id)}
                    onClick={() => actions.checkNow(host)}
                  >
                    Revisar ahora
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard className="pb-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Todos los equipos</h2>
            <Link to="/hosts" className="text-sm text-accent-strong hover:underline">
              Ver y editar
            </Link>
          </div>
          <ul className="flex flex-col">
            {sortByPriority(all).map((host) => (
              <li key={host.id}>
                <Link
                  to={`/hosts/${host.id}`}
                  className="grid min-h-11 grid-cols-[1.6fr_1fr_0.6fr_1.1fr] items-center gap-2.5 border-t border-line text-sm text-ink hover:bg-hover"
                >
                  <span className="truncate">{host.name}</span>
                  <span className="truncate font-mono text-muted">{host.address}</span>
                  <span className="font-mono">{formatLatency(host.lastLatencyMs)}</span>
                  <StatusBadge status={host.status} className="text-[13px]" />
                </Link>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </>
  )
}
