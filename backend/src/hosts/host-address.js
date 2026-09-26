import { isIP } from 'node:net'

const DIGITS_AND_DOTS = /^[0-9.]+$/
const HOSTNAME =
  /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/

/**
 * Acepta IPv4, IPv6 o nombre de host (RFC 1123).
 * Importante para la seguridad: rechaza valores que empiezan con "-", así nadie puede
 * inyectar opciones al comando ping del sistema.
 * @param {string} value
 */
export function isValidHostAddress(value) {
  if (typeof value !== 'string' || value.length === 0) return false
  if (DIGITS_AND_DOTS.test(value)) return isIP(value) === 4
  if (value.includes(':')) return isIP(value) === 6
  return HOSTNAME.test(value)
}
