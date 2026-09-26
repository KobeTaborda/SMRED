import { toHost } from './host.mappers.js'

/** @param {import('knex').Knex} db */
export function createHostRepository(db) {
  const table = () => db('hosts')

  const toColumns = (data) => ({
    name: data.name,
    address: data.address,
    host_type: data.type,
    location: data.location,
    description: data.description,
    monitoring_enabled: data.monitoringEnabled,
  })

  return {
    async findAll() {
      return (await table().select('*').orderBy('name')).map(toHost)
    },

    async findById(id) {
      return toHost(await table().where({ id }).first())
    },

    async findMonitored() {
      return (await table().where({ monitoring_enabled: true }).select('*')).map(toHost)
    },

    async existsByAddress(address, excludeId) {
      const query = table().where({ address })
      if (excludeId) query.whereNot({ id: excludeId })
      return Boolean(await query.first('id'))
    },

    async insert(data) {
      const [{ id }] = await table().insert(toColumns(data), ['id'])
      return this.findById(id)
    },

    async update(id, data) {
      await table().where({ id }).update({ ...toColumns(data), updated_at: new Date() })
      return this.findById(id)
    },

    async delete(id) {
      await table().where({ id }).del()
    },

    /**
     * UPDATE puntual de los campos de estado. Solo toca estas columnas, así no pisa
     * cambios que un administrador esté haciendo en el mismo host al mismo tiempo.
     */
    async updateCheckResult(id, { status, latencyMs, checkedAt, seenAt, statusChangedAt }) {
      await table().where({ id }).update({
        status,
        last_latency_ms: latencyMs,
        last_checked_at: checkedAt,
        last_seen_at: seenAt,
        status_changed_at: statusChangedAt,
      })
    },
  }
}
