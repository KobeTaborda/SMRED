/**
 * Bloqueo temporal tras varios intentos fallidos (freno a ataques de fuerza bruta).
 * En memoria: suficiente para una sola instancia del servidor. Con varias, moverlo a la BD.
 */
const MAX_TRACKED = 10_000

export class LoginAttempts {
  /**
   * @param {{ maxAttempts: number, lockMs: number, now?: () => number }} options
   */
  constructor({ maxAttempts, lockMs, now = Date.now }) {
    this.maxAttempts = maxAttempts
    this.lockMs = lockMs
    this.now = now
    /** @type {Map<string, { failures: number, lockedUntil: number | null }>} */
    this.entries = new Map()
  }

  /** Milisegundos de bloqueo restantes, o 0 si no está bloqueado. */
  remainingLockMs(username) {
    const key = normalize(username)
    const entry = this.entries.get(key)
    if (!entry?.lockedUntil) return 0
    const remaining = entry.lockedUntil - this.now()
    if (remaining > 0) return remaining
    this.entries.delete(key)
    return 0
  }

  recordFailure(username) {
    if (this.entries.size > MAX_TRACKED) this.evictExpired()
    const key = normalize(username)
    const failures = (this.entries.get(key)?.failures ?? 0) + 1
    const lockedUntil = failures >= this.maxAttempts ? this.now() + this.lockMs : null
    this.entries.set(key, { failures, lockedUntil })
  }

  recordSuccess(username) {
    this.entries.delete(normalize(username))
  }

  evictExpired() {
    const now = this.now()
    for (const [key, entry] of this.entries) {
      if (!entry.lockedUntil || entry.lockedUntil <= now) this.entries.delete(key)
    }
  }
}

const normalize = (username) => String(username).trim().toLowerCase()
