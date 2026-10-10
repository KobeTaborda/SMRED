// Próximamente: tráfico por interfaz, estado de puertos, CPU y memoria de routers y switches.
// Falta la librería SNMP, los campos (comunidad, OID) y su migración.

/** @type {import('./index.js').CheckDefinition} */
export const snmpCheck = {
  type: 'SNMP',
  name: 'SNMP',
  available: false,
}
