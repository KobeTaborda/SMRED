/**
 * Crea el primer administrador SOLO si no hay usuarios. Las credenciales vienen del .env,
 * nunca del código. Las cuentas del resto del equipo se crean desde la pantalla Usuarios.
 */
export async function seedInitialAdmin({ userService, seedAdmin, logger }) {
  if (await userService.hasAnyUser()) return

  const { username, password, fullName } = seedAdmin
  if (!username || !password) {
    logger.warn('No hay usuarios. Define SMRED_ADMIN_USERNAME y SMRED_ADMIN_PASSWORD en .env y reinicia.')
    return
  }
  if (password.length < 10) {
    logger.warn('SMRED_ADMIN_PASSWORD debe tener al menos 10 caracteres. No se creó el administrador.')
    return
  }
  await userService.create({ username, password, fullName, role: 'ADMIN' })
  logger.info({ username }, 'Administrador inicial creado')
}
