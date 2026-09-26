import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Button, IconButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorBanner, GlassCard, Loading, PageHeader } from '@/components/ui/Feedback'
import { EditIcon, PlusIcon, RefreshIcon, SearchIcon, TrashIcon } from '@/components/ui/icons'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/Status'
import { useIsAdmin } from '@/features/auth/useAuth'
import { errorMessage } from '@/lib/api'
import { formatLatency, formatRelative } from '@/lib/format'
import { useHosts } from './api'
import { HostForm } from './HostForm'
import { HOST_TYPE_LABELS } from './types'
import { useHostActions } from './useHostActions'

const FILTERS = [
  { key: 'ALL', label: 'Todos' },
  { key: 'DOWN', label: 'Sin respuesta' },
  { key: 'DEGRADED', label: 'Lentos' },
  { key: 'UNKNOWN', label: 'Sin verificar' },
  { key: 'UP', label: 'En línea' },
]
const COLUMNS = 'grid-cols-[1.1fr_1.7fr_1.1fr_1fr_0.7fr_0.9fr_140px]'

/** @typedef {{ mode: 'create' } | { mode: 'edit', host: import('./types').Host } | null} Editing */

export function HostsPage() {
  const isAdmin = useIsAdmin()
  const hosts = useHosts()
  const actions = useHostActions()
  const [editing, setEditing] = useState(/** @type {Editing} */ (null))
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const counts = useMemo(() => {
    const all = hosts.data ?? []
    return Object.fromEntries(FILTERS.map(({ key }) => [key, key === 'ALL' ? all.length : all.filter((h) => h.status === key).length]))
  }, [hosts.data])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (hosts.data ?? []).filter(
      (h) => (filter === 'ALL' || h.status === filter) && (!term || h.name.toLowerCase().includes(term) || h.address.toLowerCase().includes(term)),
    )
  }, [hosts.data, filter, search])

  return (
    <>
      <PageHeader
        title="Equipos"
        description="Computadores, impresoras, routers y servidores que SMRED revisa automáticamente."
        actions={
          isAdmin && (
            <Button variant="glass" icon={<PlusIcon />} onClick={() => setEditing({ mode: 'create' })}>
              Agregar equipo
            </Button>
          )
        }
      />

      {hosts.isPending && <Loading />}
      {hosts.error && <ErrorBanner message={errorMessage(hosts.error)} />}
      {hosts.data?.length === 0 && (
        <EmptyState title="Aún no hay equipos">
          {isAdmin ? 'Agrega el primero con el botón “Agregar equipo”.' : 'Un administrador debe agregarlos.'}
        </EmptyState>
      )}

      {hosts.data && hosts.data.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 px-1 md:px-2">
            <label className="flex min-h-11 w-full items-center gap-2.5 rounded-full border border-field-border bg-tile px-4 text-muted sm:w-[340px]">
              <SearchIcon />
              <input
                type="search"
                aria-label="Buscar equipos"
                placeholder="Buscar por nombre o dirección"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/70"
              />
            </label>
            <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
              {FILTERS.filter(({ key }) => key === 'ALL' || counts[key] > 0).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${filter === key ? 'border-accent bg-accent-bg' : 'border-field-border bg-tile hover:bg-hover'}`}
                >
                  {label}
                  <span className="font-mono text-muted">{counts[key]}</span>
                </button>
              ))}
            </div>
          </div>

          <GlassCard className="gap-0! overflow-x-auto px-0! py-0!">
            <div className="min-w-[980px]">
              <div className={`grid ${COLUMNS} gap-3 px-6 pt-4 pb-3 text-[13px] font-medium text-muted`}>
                <span>Estado</span>
                <span>Nombre</span>
                <span>Dirección</span>
                <span>Tipo</span>
                <span>Respuesta</span>
                <span>Revisado</span>
                <span className="sr-only">Acciones</span>
              </div>
              {visible.length === 0 && <p className="border-t border-line px-6 py-8 text-center text-muted">Ningún equipo coincide con la búsqueda.</p>}
              {visible.map((host) => (
                <div key={host.id} className={`grid ${COLUMNS} min-h-[60px] items-center gap-3 border-t border-line pr-2 pl-6`}>
                  <StatusBadge status={host.status} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Link to={`/hosts/${host.id}`} className="truncate text-[15px] font-semibold text-ink hover:underline">
                      {host.name}
                    </Link>
                    <span className="truncate text-[13px] text-muted">
                      {host.monitoringEnabled ? host.location || '—' : 'Revisión automática pausada'}
                    </span>
                  </div>
                  <span className="truncate font-mono text-sm">{host.address}</span>
                  <span className="text-sm text-muted">{HOST_TYPE_LABELS[host.type]}</span>
                  <span className={`font-mono text-sm ${host.status === 'DEGRADED' ? 'text-warning' : ''}`}>{formatLatency(host.lastLatencyMs)}</span>
                  <span className="text-[13px] text-muted">{formatRelative(host.lastCheckedAt)}</span>
                  <div className="flex justify-end">
                    {isAdmin && (
                      <>
                        <IconButton label={`Revisar ${host.name}`} disabled={actions.isChecking(host.id)} onClick={() => actions.checkNow(host)}>
                          <RefreshIcon className={`size-[18px] ${actions.isChecking(host.id) ? 'animate-spin' : ''}`} />
                        </IconButton>
                        <IconButton label={`Editar ${host.name}`} onClick={() => setEditing({ mode: 'edit', host })}>
                          <EditIcon />
                        </IconButton>
                        <IconButton label={`Eliminar ${host.name}`} tone="danger" onClick={() => actions.askDelete(host)}>
                          <TrashIcon />
                        </IconButton>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}

      <Modal open={editing !== null} title={editing?.mode === 'edit' ? 'Editar equipo' : 'Agregar equipo'} onClose={() => setEditing(null)}>
        {editing && (
          <HostForm
            key={editing.mode === 'edit' ? editing.host.id : 'new'}
            host={editing.mode === 'edit' ? editing.host : undefined}
            onDone={() => setEditing(null)}
          />
        )}
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
        Se eliminará <strong className="font-semibold text-ink">{actions.toDelete?.name}</strong>{' '}
        <span className="font-mono text-sm">{actions.toDelete?.address}</span> y todo su historial de revisiones. No se puede deshacer.
      </ConfirmDialog>
    </>
  )
}
