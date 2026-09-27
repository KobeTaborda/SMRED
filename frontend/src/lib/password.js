// Contraseñas temporales generadas en el navegador con el generador criptográfico (crypto.getRandomValues).
// Se omiten caracteres que se confunden al dictarlos o copiarlos a mano: 0/O, 1/l/I.
const SETS = {
  lower: 'abcdefghijkmnopqrstuvwxyz',
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  digits: '23456789',
  symbols: '-_.*@%+',
}

/** Entero al azar en [0, max) sin sesgo (descarta los valores que no reparten parejo). */
function randomInt(max) {
  const buffer = new Uint32Array(1)
  const limit = Math.floor(0x1_0000_0000 / max) * max
  do crypto.getRandomValues(buffer)
  while (buffer[0] >= limit)
  return buffer[0] % max
}

/**
 * Contraseña de 14 caracteres con al menos una minúscula, una mayúscula, un número y un símbolo.
 * @returns {string}
 */
export function generatePassword(length = 14) {
  const all = Object.values(SETS).join('')
  const pick = (set) => set[randomInt(set.length)]
  const chars = [pick(SETS.lower), pick(SETS.upper), pick(SETS.digits), pick(SETS.symbols)]
  while (chars.length < length) chars.push(pick(all))
  // Mezcla (Fisher-Yates) para que los obligatorios no queden siempre al inicio
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
