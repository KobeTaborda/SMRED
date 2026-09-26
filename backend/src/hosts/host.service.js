import { EventEmitter } from 'node:events'
import { conflict, notFound } from '../common/errors.js'

/**
 * Eventos de dominio de hosts. El futuro módulo de alertas se suscribirá a 'status-changed'
 * sin que este módulo tenga que saber que las alertas existen.
 */
export const hostEvents = new EventEmitter()

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
      if (await repo.existsByAddress(data.address)) {
        throw conflict(`Ya existe un host con la dirección ${data.address}.`)
      }
      const host = await repo.insert(data)
      logger.info({ name: host.name, address: host.address }, 'Host creado')
      return host
    },

    async update(id, data) {
      await getOrFail(id)
      if (await repo.existsByAddress(data.address, id)) {
        throw conflict(`Ya existe otro host con la dirección ${data.address}.`)
      }
      return repo.update(id, data)
    },

    async remove(id) {
      const host = await getOrFail(id)
      // El historial de ping se borra en cascada en la BD (FK ON DELETE CASCADE)
      await repo.delete(id)
      logger.info({ name: host.name, address: host.address }, 'Host eliminado')
    },

    /** Guarda el resultado de una verificación y emite un evento si el estado cambió. */
    async recordCheck(hostId, { status, latencyMs, checkedAt }) {
      const host = await repo.findById(hostId)
      if (!host) return // se eliminó mientras se verificaba

      const seenAt = status === 'DOWN' ? host.lastSeenAt : checkedAt
      const statusChangedAt = host.status !== status ? checkedAt : host.statusChangedAt
      await repo.updateCheckResult(hostId, { status, latencyMs, checkedAt, seenAt, statusChangedAt })

      if (host.status !== status) {
        const event = { hostId, name: host.name, address: host.address, previous: host.status, current: status, at: checkedAt }
        logger.info(event, `Host ${host.name} cambió de ${host.status} a ${status}`)
        events.emit('status-changed', event)
      }
    },
  }
}
