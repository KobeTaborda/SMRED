/**
 * @typedef {'UNKNOWN' | 'UP' | 'DEGRADED' | 'DOWN'} HostStatus
 * @typedef {'SERVER' | 'ROUTER' | 'SWITCH' | 'FIREWALL' | 'WORKSTATION' | 'OTHER'} HostType
 * @typedef {'PING' | 'SNMP' | 'AGENT'} CheckType SNMP y AGENT: próximamente
 *
 * @typedef {object} Host
 * @property {number} id
 * @property {string} name
 * @property {string} address
 * @property {HostType} type
 * @property {string | null} location
 * @property {string | null} description
 * @property {boolean} monitoringEnabled
 * @property {CheckType} checkType
 * @property {number | null} port
 * @property {number | null} expectedStatus
 * @property {string | null} keyword
 * @property {string | null} expectedIp
 * @property {number | null} degradedMs
 * @property {HostStatus} status
 * @property {number | null} lastLatencyMs
 * @property {string | null} lastMessage
 * @property {string | null} sslExpiresAt
 * @property {string | null} lastCheckedAt
 * @property {string | null} lastSeenAt
 * @property {string | null} statusChangedAt
 * @property {string} createdAt
 *
 * @typedef {object} HostRequest
 * @property {string} name
 * @property {string} address
 * @property {HostType} type
 * @property {string} location
 * @property {string} description
 * @property {boolean} monitoringEnabled
 * @property {CheckType} checkType
 * @property {number | string | null} port
 * @property {number | string | null} expectedStatus
 * @property {string} keyword
 * @property {string} expectedIp
 * @property {number | string | null} degradedMs
 *
 * @typedef {object} Bucket
 * @property {string} start
 * @property {number} checks
 * @property {number | null} availabilityPct
 * @property {number | null} avgLatencyMs
 * @property {number | null} maxLatencyMs
 * @property {HostStatus} status
 *
 * @typedef {object} HostStats
 * @property {'24h' | '7d'} period
 * @property {number} degradedLatencyMs umbral de "lento" de este equipo
 * @property {{ checks: number, availabilityPct: number | null, avgLatencyMs: number | null,
 *   maxLatencyMs: number | null, maxLatencyAt: string | null, packetLossPct: number | null,
 *   avgJitterMs: number | null }} summary
 * @property {Bucket[]} buckets
 *
 * @typedef {object} CheckTimings
 * @property {number | null} dnsMs
 * @property {number | null} connectMs
 * @property {number | null} tlsMs
 * @property {number | null} ttfbMs
 *
 * @typedef {object} PingRecord una revisión del historial (de cualquier tipo)
 * @property {string} checkedAt
 * @property {boolean} reachable
 * @property {number | null} latencyMs
 * @property {number} packetLossPct
 * @property {number | null} jitterMs
 * @property {CheckTimings | null} timings
 * @property {number | null} statusCode
 * @property {string | null} message
 */

/** @type {Record<HostType, string>} */
export const HOST_TYPE_LABELS = {
  SERVER: 'Servidor',
  ROUTER: 'Router',
  SWITCH: 'Switch',
  FIREWALL: 'Firewall',
  WORKSTATION: 'Computador o impresora',
  OTHER: 'Otro',
}

// Los tipos de revisión (textos, campos, filas de detalle) están en checks/check-types.jsx

/** Palabras simples, entendibles sin saber de redes. @type {Record<HostStatus, string>} */
export const STATUS_LABELS = {
  UP: 'En línea',
  DEGRADED: 'Lento',
  DOWN: 'Sin respuesta',
  UNKNOWN: 'Sin verificar',
}

/** Orden de prioridad: primero lo que necesita atención. */
export const STATUS_PRIORITY = ['DOWN', 'DEGRADED', 'UNKNOWN', 'UP']

/** @param {Host[]} hosts */
export const sortByPriority = (hosts) =>
  [...hosts].sort((a, b) => STATUS_PRIORITY.indexOf(a.status) - STATUS_PRIORITY.indexOf(b.status) || a.name.localeCompare(b.name))

/** @param {Host} host */
export const needsAttention = (host) => host.status !== 'UP'
