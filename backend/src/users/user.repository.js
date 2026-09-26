import { toUser } from './user.mappers.js'

/**
 * Acceso a la tabla users. Knex genera consultas parametrizadas (protección contra inyección SQL).
 * La intercalación por defecto de SQL Server no distingue mayúsculas: "Admin" y "admin" son el mismo usuario.
 * @param {import('knex').Knex} db
 */
export function createUserRepository(db) {
  const table = () => db('users')

  return {
    async findAll() {
      return (await table().select('*').orderBy('username')).map(toUser)
    },

    async findById(id) {
      return toUser(await table().where({ id }).first())
    },

    async findByUsername(username) {
      return toUser(await table().where({ username }).first())
    },

    async existsByUsername(username) {
      return Boolean(await table().where({ username }).first('id'))
    },

    async count() {
      const [{ total }] = await table().count({ total: '*' })
      return Number(total)
    },

    async countActiveAdmins() {
      const [{ total }] = await table().where({ role: 'ADMIN', enabled: true }).count({ total: '*' })
      return Number(total)
    },

    async insert({ username, passwordHash, fullName, role }) {
      const [{ id }] = await table().insert(
        { username, password_hash: passwordHash, full_name: fullName, role },
        ['id'],
      )
      return this.findById(id)
    },

    async update(id, { fullName, role, enabled }) {
      await table().where({ id }).update({ full_name: fullName, role, enabled, updated_at: new Date() })
      return this.findById(id)
    },

    async updatePassword(id, passwordHash) {
      await table().where({ id }).update({ password_hash: passwordHash, updated_at: new Date() })
    },

    async delete(id) {
      await table().where({ id }).del()
    },
  }
}
