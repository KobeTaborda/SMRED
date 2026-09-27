import bcrypt from 'bcryptjs'
import { badRequest, businessRule, conflict, notFound } from '../common/errors.js'

/**
 * Reglas de negocio de usuarios.
 * @param {ReturnType<typeof import('./user.repository.js').createUserRepository>} repo
 * @param {{ bcryptRounds: number, logger: import('pino').Logger }} options
 */
export function createUserService(repo, { bcryptRounds, logger }) {
  // Hash válido pero inútil: se compara aunque el usuario no exista, para que la respuesta
  // tarde lo mismo y no se pueda averiguar qué usuarios existen midiendo tiempos.
  const dummyHash = bcrypt.hashSync('smred-dummy-password', bcryptRounds)

  async function getOrFail(id) {
    const user = await repo.findById(id)
    if (!user) throw notFound(`El usuario con id ${id} no existe.`)
    return user
  }

  async function ensureAnotherAdminRemains() {
    if ((await repo.countActiveAdmins()) <= 1) {
      throw businessRule('Debe quedar al menos un administrador activo.')
    }
  }

  const isSame = (a, b) => a.toLowerCase() === b.toLowerCase()

  return {
    list: () => repo.findAll(),

    hasAnyUser: async () => (await repo.count()) > 0,

    /** Devuelve el usuario si las credenciales son correctas y la cuenta está activa; si no, null. */
    async authenticate(username, password) {
      const user = await repo.findByUsername(username)
      const matches = await bcrypt.compare(password, user?.passwordHash ?? dummyHash)
      return user && matches && user.enabled ? user : null
    },

    /**
     * Las cuentas que crea un administrador deben cambiar la contraseña al primer ingreso:
     * así el administrador nunca conoce la contraseña definitiva de otra persona.
     */
    async create({ username, fullName, password, role }, { mustChangePassword = true } = {}) {
      if (await repo.existsByUsername(username)) {
        throw conflict(`Ya existe un usuario llamado ${username}.`)
      }
      const passwordHash = await bcrypt.hash(password, bcryptRounds)
      const user = await repo.insert({ username, passwordHash, fullName, role, mustChangePassword })
      logger.info({ username, role }, 'Usuario creado')
      return user
    },

    async update(id, { fullName, role, enabled }, currentUser) {
      const user = await getOrFail(id)
      const losesAdmin = user.role === 'ADMIN' && user.enabled && (role !== 'ADMIN' || !enabled)

      if (losesAdmin && isSame(user.username, currentUser.username)) {
        throw businessRule('No puedes quitarte el rol de administrador ni deshabilitar tu propia cuenta.')
      }
      if (losesAdmin) await ensureAnotherAdminRemains()

      return repo.update(id, { fullName, role, enabled })
    },

    /** Restablecimiento por un administrador: cierra las sesiones del usuario y lo obliga a elegir una nueva. */
    async resetPassword(id, password) {
      const user = await getOrFail(id)
      await repo.updatePassword(id, await bcrypt.hash(password, bcryptRounds), { mustChangePassword: true })
      logger.info({ username: user.username }, 'Contraseña restablecida por un administrador')
      return user
    },

    /** El propio usuario cambia su contraseña. Devuelve el usuario actualizado (con su nueva token_version). */
    async changeOwnPassword(user, currentPassword, newPassword) {
      const current = await getOrFail(user.id)
      if (!(await bcrypt.compare(currentPassword, current.passwordHash))) {
        throw badRequest('Revisa los campos marcados.', { errors: { currentPassword: 'La contraseña actual no es correcta.' } })
      }
      if (await bcrypt.compare(newPassword, current.passwordHash)) {
        throw badRequest('Revisa los campos marcados.', { errors: { newPassword: 'Debe ser distinta de la contraseña actual.' } })
      }
      const updated = await repo.updatePassword(user.id, await bcrypt.hash(newPassword, bcryptRounds), { mustChangePassword: false })
      logger.info({ username: user.username }, 'El usuario cambió su contraseña')
      return updated
    },

    async remove(id, currentUser) {
      const user = await getOrFail(id)
      if (isSame(user.username, currentUser.username)) {
        throw businessRule('No puedes eliminar tu propia cuenta.')
      }
      if (user.role === 'ADMIN' && user.enabled) await ensureAnotherAdminRemains()
      await repo.delete(id)
      logger.info({ username: user.username }, 'Usuario eliminado')
    },
  }
}
