/**
 * Intentos de inicio de sesión fallidos en SQL Server (tabla login_attempts).
 * @param {import('knex').Knex} db
 * @returns {import('./login-attempts.js').AttemptRepository}
 */
export function createLoginAttemptRepository(db) {
  const table = () => db('login_attempts')
  const ms = (value) => (value ? new Date(value).getTime() : null)

  return {
    async get(key) {
      const row = await table().where({ attempt_key: key }).first()
      if (!row) return null
      return { failures: row.failures, firstFailureAt: ms(row.first_failure_at), lockedUntil: ms(row.locked_until) }
    },

    async save(key, entry) {
      const row = {
        failures: entry.failures,
        first_failure_at: new Date(entry.firstFailureAt),
        locked_until: entry.lockedUntil ? new Date(entry.lockedUntil) : null,
        updated_at: new Date(),
      }
      const updated = await table().where({ attempt_key: key }).update(row)
      if (updated > 0) return
      try {
        await table().insert({ attempt_key: key, ...row })
      } catch (err) {
        // 2627 = clave duplicada: otra petición simultánea la insertó primero
        if (err.number === 2627) await table().where({ attempt_key: key }).update(row)
        else throw err
      }
    },

    async delete(key) {
      await table().where({ attempt_key: key }).del()
    },

    async deleteByUsername(username) {
      // _ y % son comodines en LIKE: se escapan para que "ana_b" no coincida también con "anaxb"
      const escaped = username.replace(/[\\%_[]/g, (char) => `\\${char}`)
      await table().whereRaw("attempt_key LIKE ? ESCAPE '\\'", [`${escaped}|%`]).del()
    },

    async deleteStale(before) {
      return table()
        .where('updated_at', '<', new Date(before))
        .andWhere((q) => q.whereNull('locked_until').orWhere('locked_until', '<', new Date()))
        .del()
    },
  }
}
