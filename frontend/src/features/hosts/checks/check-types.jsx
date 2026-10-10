/**
 * Textos de cada tipo de revisión (ver backend/src/monitoring/checks).
 * SNMP y agente se muestran en la lista pero deshabilitados.
 */

/**
 * @typedef {object} CheckTypeInfo
 * @property {string} label          opción de la lista "Qué revisar"
 * @property {string} short          resumen corto en la tabla de equipos
 * @property {boolean} available     false = Próximamente
 * @property {string} [addressLabel]
 * @property {string} [placeholder]
 * @property {(host: import('../types').Host) => [string, import('react').ReactNode][]} [detailRows]
 *   filas propias del recuadro "Detalles"
 */

/** @type {Record<import('../types').CheckType, CheckTypeInfo>} */
export const CHECK_TYPES = {
  PING: {
    label: 'Que el equipo responda (ping)',
    short: 'Ping',
    available: true,
    addressLabel: 'Dirección IP o nombre del equipo',
    placeholder: 'Ej. 192.168.1.1',
  },
  TCP: {
    label: 'Que un servicio esté disponible (puerto)',
    short: 'Puerto',
    available: true,
    addressLabel: 'Dirección IP o nombre del equipo',
    placeholder: 'Ej. 192.168.1.20',
    detailRows: (host) => [['Puerto', <span key="port" className="font-mono">{host.port}</span>]],
  },
  SNMP: {
    label: 'Tráfico y estado de un equipo de red (SNMP, próximamente)',
    short: 'SNMP',
    available: false,
  },
  AGENT: {
    label: 'CPU, memoria y disco con un agente (próximamente)',
    short: 'Agente',
    available: false,
  },
}

/** Resumen corto de la revisión: "Ping", "Puerto 3389". @param {import('../types').Host} host */
export const checkSummary = (host) =>
  host.checkType === 'TCP' ? `Puerto ${host.port}` : CHECK_TYPES[host.checkType ?? 'PING'].short

/** El ping es la única revisión con varios intentos: pérdida y jitter solo tienen sentido ahí. @param {import('../types').Host} host */
export const isPing = (host) => (host.checkType ?? 'PING') === 'PING'
