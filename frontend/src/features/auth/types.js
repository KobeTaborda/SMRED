/**
 * Tipos compartidos (solo documentación: el editor los usa para autocompletar y detectar errores).
 * @typedef {'ADMIN' | 'VIEWER'} Role
 *
 * @typedef {object} User
 * @property {number} id
 * @property {string} username
 * @property {string} fullName
 * @property {Role} role
 * @property {boolean} enabled
 * @property {string} createdAt
 * @property {boolean} mustChangePassword
 */

export const ROLE_LABELS = { ADMIN: 'Administrador', VIEWER: 'Solo lectura' }
