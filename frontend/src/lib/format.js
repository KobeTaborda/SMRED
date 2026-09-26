const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
const date = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
const time = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
const timeSeconds = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const dayTime = new Intl.DateTimeFormat('es-CO', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

export function formatLatency(ms) {
  if (ms == null) return '—'
  // Decimales solo cuando aportan: 0.4 ms y 2.5 ms, pero 2 ms (no 2.0) y 245 ms
  if (ms >= 10 || Number.isInteger(ms)) return `${Math.round(ms)} ms`
  return `${ms.toFixed(1)} ms`
}

export function formatRelative(iso) {
  if (!iso) return 'Nunca'
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return relative.format(seconds, 'second')
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour')
  return relative.format(Math.round(seconds / 86400), 'day')
}

export const formatDateTime = (iso) => (iso ? dateTime.format(new Date(iso)) : '—')
export const formatDate = (iso) => (iso ? date.format(new Date(iso)) : '—')
export const formatTime = (iso) => (iso ? time.format(new Date(iso)) : '—')
export const formatTimeSeconds = (iso) => (iso ? timeSeconds.format(new Date(iso)) : '—')
export const formatDayTime = (iso) => (iso ? dayTime.format(new Date(iso)) : '—')

export function formatPercent(value) {
  if (value == null) return '—'
  return `${Number.isInteger(value) ? value : value.toFixed(1).replace('.', ',')} %`
}

/** Iniciales para el avatar: "Kobe Taborda" → "KT". */
export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}
