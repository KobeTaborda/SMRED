import { hostSchema } from '../hosts/host.schemas.js'
import { createUserSchema } from '../users/user.schemas.js'

/**
 * Cuenta del profesor y hosts de prueba para entornos locales (nunca en producción).
 * Solo crea lo que falte: no toca cuentas existentes, así no se pisa una contraseña cambiada.
 * La contraseña inicial está en el README y se pide cambiarla en el primer ingreso.
 */
export const DEMO_USERS = [
  { username: 'profesor', fullName: 'Profesor evaluador', password: 'Profesor-Smred-2026', role: 'ADMIN' },
]

export const DEMO_HOSTS = [
  { name: 'Cloudflare DNS', address: '1.1.1.1', type: 'SERVER', checkType: 'PING', description: 'Host de prueba: DNS público de Cloudflare' },
  { name: 'Google DNS', address: '8.8.8.8', type: 'SERVER', checkType: 'PING', description: 'Host de prueba: DNS público de Google' },
]

/** Identifica una revisión: el mismo equipo puede revisarse de varias formas. */
const targetKey = ({ checkType = 'PING', address, port = null }) => `${checkType}|${address.toLowerCase()}|${port ?? ''}`

/**
 * @param {{ userService: any, hostService: any, isProduction: boolean, logger: import('pino').Logger }} deps
 */
export async function seedDemoData({ userService, hostService, isProduction, logger }) {
  if (isProduction) return

  const usernames = new Set((await userService.list()).map((u) => u.username.toLowerCase()))
  for (const demo of DEMO_USERS) {
    if (usernames.has(demo.username.toLowerCase())) continue
    await userService.create(createUserSchema.parse(demo))
    logger.info({ username: demo.username }, 'Cuenta de demostración creada')
  }

  const existing = new Set((await hostService.list()).map(targetKey))
  for (const demo of DEMO_HOSTS) {
    const host = hostSchema.parse(demo)
    if (existing.has(targetKey(host))) continue
    await hostService.create(host)
  }
}
