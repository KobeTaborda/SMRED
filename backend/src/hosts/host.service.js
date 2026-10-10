import { EventEmitter } from 'node:events'
import { conflict, notFound } from '../common/errors.js'
import { getCheck } from '../monitoring/checks/index.js'

/**
 * Eventos de dominio de hosts. El futuro módulo de alertas se suscribirá a 'status-changed'
 * sin que este módulo tenga que saber que las alertas existen.
 */
export const hostEvents = new EventEmitter()

/** Se permite revisar el mismo equipo de varias formas, pero no dos veces con la misma revisión. */
function duplicated({ checkType = 'PING', address, port }) {
  const target = port ? `${address}, puerto ${port}` : address
  return conflict(`Ya existe un equipo con revisión de ${getCheck(checkType).name} para ${target}.`)
}

/**
 * @param {ReturnType<typeof import('./host.repository.js').createHostRepository>} repo
 * @param {{ logger: import('pino').Logger, events?: EventEmitter }} options
 */
export function createHostService(repo, { logger, events = hostEvents }) {
  async function getOrFail(id) {
    const host = await repo.findById(id)
    if (!host) throw notFound(`El host con id ${id} no existe.`)
    return host
  }

  return {
    list: () => repo.findAll(),
    get: getOrFail,
    listMonitored: () => repo.findMonitored(),

    async create(data) {
      if (await repo.existsByTarget(data)) throw duplicated(data)
      const host = await repo.insert(data)
      logger.info({ name: host.name, address: host.address }, 'Host creado')
      return host
    },

    async update(id, data) {
      const current = await getOrFail(id)
      if (await repo.existsByTarget(data, id)) throw duplicated(data)
      // Si cambia lo que se revisa, el estado anterior deja de aplicar
      const targetChanged =
        current.checkType !== data.checkType || current.address !== data.address || (current.port ?? null) !== (data.port ?? null)
      return repo.update(id, data, { resetCheck: targetChanged })
    },

    async remove(id) {
      const host = await getOrFail(id)
      // El historial de ping se borra en cascada en la BD (FK ON DELETE CASCADE)
      await repo.delete(id)
      logger.info({ name: host.name, address: host.address }, 'Host eliminado')
    },

    /** Guarda el resultado de una verificación y emite un evento si el estado cambió. */
    async recordCheck(hostId, { status, latencyMs, message = null, sslExpiresAt = null, checkedAt }) {
      const host = await repo.findById(hostId)
      if (!host) return // se eliminó mientras se verificaba

      const seenAt = status === 'DOWN' ? host.lastSeenAt : checkedAt
      // Si no se pudo leer el certificado en esta revisión, se conserva el anterior
      const sslExpires = sslExpiresAt ?? host.sslExpiresAt ?? null
      const statusChangedAt = host.status !== status ? checkedAt : host.statusChangedAt
      await repo.updateCheckResult(hostId, { status, latencyMs, message, sslExpiresAt: sslExpires, checkedAt, seenAt, statusChangedAt })

      if (host.status !== status) {
        const event = { hostId, name: host.name, address: host.address, previous: host.status, current: status, at: checkedAt }
        logger.info(event, `Host ${host.name} cambió de ${host.status} a ${status}`)
        events.emit('status-changed', event)
      }
    },
  }
}
