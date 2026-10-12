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
    check_type: data.checkType,
    port: data.port,
    expected_status: data.expectedStatus,
    keyword: data.keyword,
    expected_ip: data.expectedIp,
    degraded_ms: data.degradedMs,
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

    /** ¿Ya hay un host con la misma revisión (tipo + dirección + puerto)? */
    async existsByTarget({ checkType, address, port }, excludeId) {
      const query = table().where({ check_type: checkType, address })
      if (port == null) query.whereNull('port')
      else query.andWhere({ port })
      if (excludeId) query.whereNot({ id: excludeId })
      return Boolean(await query.first('id'))
    },

    async insert(data) {
      const [{ id }] = await table().insert(toColumns(data), ['id'])
      return this.findById(id)
    },

    async update(id, data, { resetCheck = false } = {}) {
      const reset = resetCheck
        ? { status: 'UNKNOWN', last_latency_ms: null, last_message: null, ssl_expires_at: null, status_changed_at: null }
        : {}
      await table().where({ id }).update({ ...toColumns(data), ...reset, updated_at: new Date() })
      return this.findById(id)
    },

    async delete(id) {
      await table().where({ id }).del()
    },

    /**
     * UPDATE puntual de los campos de estado. Solo toca estas columnas, así no pisa
     * cambios que un administrador esté haciendo en el mismo host al mismo tiempo.
     */
    async updateCheckResult(id, { status, latencyMs, message, sslExpiresAt, checkedAt, seenAt, statusChangedAt }) {
      await table().where({ id }).update({
        status,
        last_latency_ms: latencyMs,
        last_message: message,
        ssl_expires_at: sslExpiresAt,
        last_checked_at: checkedAt,
        last_seen_at: seenAt,
        status_changed_at: statusChangedAt,
      })
    },
  }
}
