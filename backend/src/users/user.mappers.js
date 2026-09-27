import { toIso } from '../common/mappers.js'

export const ROLES = /** @type {const} */ (['ADMIN', 'VIEWER'])

/**
 * @typedef {object} User
 * @property {number} id
 * @property {string} username
 * @property {string} passwordHash
 * @property {string} fullName
 * @property {'ADMIN'|'VIEWER'} role
 * @property {boolean} enabled
 * @property {Date} createdAt
 * @property {number} tokenVersion
 * @property {boolean} mustChangePassword
 */

/** Fila de la BD (snake_case) → objeto de dominio (camelCase). */
export function toUser(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    role: row.role,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    tokenVersion: row.token_version ?? 0,
    mustChangePassword: Boolean(row.must_change_password),
  }
}

/** Lo que se envía al frontend. Nunca incluye el hash de la contraseña. */
export function toUserResponse(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    enabled: user.enabled,
    createdAt: toIso(user.createdAt),
    mustChangePassword: user.mustChangePassword,
  }
}
