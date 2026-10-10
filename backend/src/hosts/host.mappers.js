import { toIso } from '../common/mappers.js'

export const HOST_TYPES = /** @type {const} */ (['SERVER', 'ROUTER', 'SWITCH', 'FIREWALL', 'WORKSTATION', 'WEBSITE', 'OTHER'])
export const HOST_STATUSES = /** @type {const} */ (['UNKNOWN', 'UP', 'DEGRADED', 'DOWN'])

// Los tipos de revisión (checkType) se definen en monitoring/checks/index.js

/**
 * @typedef {object} Host
 * @property {number} id
 * @property {string} name
 * @property {string} address IP o nombre (PING, TCP, DNS) o URL completa (HTTP)
 * @property {string} type
 * @property {string|null} location
 * @property {string|null} description
 * @property {boolean} monitoringEnabled
 * @property {string} checkType ver monitoring/checks/index.js
 * @property {number|null} port
 * @property {number|null} expectedStatus
 * @property {string|null} keyword
 * @property {string|null} expectedIp
 * @property {number|null} degradedMs
 * @property {'UNKNOWN'|'UP'|'DEGRADED'|'DOWN'} status
 * @property {number|null} lastLatencyMs
 * @property {string|null} lastMessage
 * @property {Date|null} sslExpiresAt
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
    checkType: row.check_type ?? 'PING',
    port: row.port ?? null,
    expectedStatus: row.expected_status ?? null,
    keyword: row.keyword ?? null,
    expectedIp: row.expected_ip ?? null,
    degradedMs: row.degraded_ms ?? null,
    status: row.status,
    lastLatencyMs: row.last_latency_ms,
    lastMessage: row.last_message ?? null,
    sslExpiresAt: row.ssl_expires_at ?? null,
    lastCheckedAt: row.last_checked_at,
    lastSeenAt: row.last_seen_at,
    statusChangedAt: row.status_changed_at,
    createdAt: row.created_at,
  }
}

export function toHostResponse(host) {
  return {
    ...host,
    sslExpiresAt: toIso(host.sslExpiresAt),
    lastCheckedAt: toIso(host.lastCheckedAt),
    lastSeenAt: toIso(host.lastSeenAt),
    statusChangedAt: toIso(host.statusChangedAt),
    createdAt: toIso(host.createdAt),
  }
}
