// Próximamente: agente instalado en el servidor que envía CPU, RAM, disco y servicios.
// Necesita además una ruta en la API para recibir los reportes.

/** @type {import('./index.js').CheckDefinition} */
export const agentCheck = {
  type: 'AGENT',
  name: 'agente',
  available: false,
}
