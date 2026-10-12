/** Mensajes en español para los errores de red de Node. */
const MESSAGES = {
  ECONNREFUSED: 'Conexión rechazada: el puerto está cerrado o el servicio no está corriendo.',
  ENOTFOUND: 'El nombre no existe en DNS.',
  EAI_AGAIN: 'No se pudo consultar el DNS para encontrar el equipo.',
  EHOSTUNREACH: 'No hay ruta de red hacia el equipo.',
  ENETUNREACH: 'No hay ruta de red hacia el equipo.',
  ECONNRESET: 'El servidor cerró la conexión de forma inesperada.',
  ETIMEDOUT: 'Se agotó el tiempo de espera.',
  EPROTO: 'Error en la negociación del cifrado (TLS).',
  CERT_HAS_EXPIRED: 'El certificado SSL está vencido.',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'El certificado SSL es autofirmado: el navegador no confiaría en él.',
  SELF_SIGNED_CERT_IN_CHAIN: 'El certificado SSL usa una entidad no reconocida (autofirmada).',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'No se pudo verificar el certificado SSL.',
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: 'No se pudo verificar quién emitió el certificado SSL.',
  ERR_TLS_CERT_ALTNAME_INVALID: 'El certificado SSL no corresponde a este dominio.',
}

/** @param {any} err */
export function networkErrorMessage(err) {
  return MESSAGES[err?.code] ?? `Error de conexión (${err?.code ?? err?.message ?? 'desconocido'}).`
}

export const round1 = (value) => (value == null ? null : Math.round(value * 10) / 10)

/** 10000 → "10 s", 1500 → "1,5 s" */
export const seconds = (ms) => `${String(round1(ms / 1000)).replace('.', ',')} s`

/** Resultado de una revisión fallida (sin latencia). @param {string} message */
export const failed = (message, extra = {}) => ({ reachable: false, avgLatencyMs: null, packetLossPct: 100, message, ...extra })
