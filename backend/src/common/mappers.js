/** Las fechas viajan al frontend como texto ISO 8601 en UTC. */
export const toIso = (value) => (value ? new Date(value).toISOString() : null)
