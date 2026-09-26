import { toIso } from '../common/mappers.js'

export const HOST_TYPES = /** @type {const} */ (['SERVER', 'ROUTER', 'SWITCH', 'FIREWALL', 'WORKSTATION', 'OTHER'])
export const HOST_STATUSES = /** @type {const} */ (['UNKNOWN', 'UP', 'DEGRADED', 'DOWN'])

/**
 * @typedef {object} Host
 * @property {number} id
 * @property {string} name
 * @property {string} address
 * @property {string} type
 * @property {string|null} location
 * @property {string|null} description
 * @property {boolean} monitoringEnabled
 * @property {'UNKNOWN'|'UP'|'DEGRADED'|'DOWN'} status
 * @property {number|null} lastLatencyMs
 * @property {Date|null} lastCheckedAt
 * @property {Date|null} lastSeenAt
 * @property {Date|null} statusChangedAt
 * @property {Date} createdAt
 */

export function toHost(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    type: row.host_type,
    location: row.location,
    description: row.description,
    monitoringEnabled: Boolean(row.monitoring_enabled),
    status: row.status,
    lastLatencyMs: row.last_latency_ms,
    lastCheckedAt: row.last_checked_at,
    lastSeenAt: row.last_seen_at,
    statusChangedAt: row.status_changed_at,
    createdAt: row.created_at,
  }
}

export function toHostResponse(host) {
  return {
    ...host,
    lastCheckedAt: toIso(host.lastCheckedAt),
    lastSeenAt: toIso(host.lastSeenAt),
    statusChangedAt: toIso(host.statusChangedAt),
    createdAt: toIso(host.createdAt),
  }
}
