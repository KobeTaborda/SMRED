/**
 * Bloqueo temporal tras varios intentos fallidos (freno a ataques de fuerza bruta).
 *
 * - El contador es por USUARIO + EQUIPO DE ORIGEN (IP). Si alguien escribe mal tu contraseña
 *   desde otro equipo, se bloquea él, no tú: puedes seguir entrando desde el tuyo.
 * - Los intentos se guardan en la base de datos (tabla login_attempts), así el bloqueo
 *   se mantiene aunque el servidor se reinicie.
 * - Los fallos cuentan dentro de una ventana de tiempo: 5 errores repartidos en varios días no bloquean.
 *
 * @typedef {{ failures: number, firstFailureAt: number, lockedUntil: number | null }} AttemptEntry
 * @typedef {{
 *   get: (key: string) => Promise<AttemptEntry | null>,
 *   save: (key: string, entry: AttemptEntry) => Promise<void>,
 *   delete: (key: string) => Promise<void>,
 *   deleteStale: (before: number) => Promise<number>,
 *   deleteByUsername: (username: string) => Promise<void>,
 * }} AttemptRepository
 */
export class LoginAttempts {
  /**
   * @param {{ repository: AttemptRepository, maxAttempts: number, lockMs: number, windowMs?: number, now?: () => number }} options
   */
  constructor({ repository, maxAttempts, lockMs, windowMs = lockMs, now = Date.now }) {
    this.repository = repository
    this.maxAttempts = maxAttempts
    this.lockMs = lockMs
    this.windowMs = windowMs
    this.now = now
  }

  static normalize(username) {
    return String(username).trim().toLowerCase()
  }

  static key(username, ip) {
    return `${LoginAttempts.normalize(username)}|${ip || 'desconocido'}`.slice(0, 200)
  }

  /** Milisegundos de bloqueo restantes para este usuario desde este equipo, o 0. */
  async remainingLockMs(username, ip) {
    const key = LoginAttempts.key(username, ip)
    const entry = await this.repository.get(key)
    if (!entry?.lockedUntil) return 0
    const remaining = entry.lockedUntil - this.now()
    if (remaining > 0) return remaining
    await this.repository.delete(key)
    return 0
  }

  async recordFailure(username, ip) {
    const key = LoginAttempts.key(username, ip)
    const now = this.now()
    const entry = await this.repository.get(key)
    const expired = !entry || now - entry.firstFailureAt > this.windowMs || (entry.lockedUntil !== null && entry.lockedUntil <= now)
    const failures = expired ? 1 : entry.failures + 1
    await this.repository.save(key, {
      failures,
      firstFailureAt: expired ? now : entry.firstFailureAt,
      lockedUntil: failures >= this.maxAttempts ? now + this.lockMs : null,
    })
  }

  async recordSuccess(username, ip) {
    await this.repository.delete(LoginAttempts.key(username, ip))
  }

  /** Quita el bloqueo del usuario en todos los equipos (cuando un administrador restablece su contraseña). */
  async clearUser(username) {
    await this.repository.deleteByUsername(LoginAttempts.normalize(username))
  }

  /** Borra registros viejos sin bloqueo vigente. Lo llama la limpieza diaria. */
  async purgeStale() {
    return this.repository.deleteStale(this.now() - this.windowMs)
  }
}

/** Repositorio en memoria: para tests. */
export function createMemoryAttemptRepository() {
  const entries = new Map()
  return {
    async get(key) {
      return entries.has(key) ? { ...entries.get(key) } : null
    },
    async save(key, entry) {
      entries.set(key, { ...entry, updatedAt: Date.now() })
    },
    async delete(key) {
      entries.delete(key)
    },
    async deleteByUsername(username) {
      for (const key of entries.keys()) if (key.startsWith(`${username}|`)) entries.delete(key)
    },
    async deleteStale(before) {
      let removed = 0
      for (const [key, entry] of entries) {
        const lockActive = entry.lockedUntil !== null && entry.lockedUntil > Date.now()
        if (entry.updatedAt < before && !lockActive) {
          entries.delete(key)
          removed++
        }
      }
      return removed
    },
  }
}
