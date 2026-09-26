import { z } from 'zod'
import { isValidHostAddress } from './host-address.js'
import { HOST_TYPES } from './host.mappers.js'

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .nullish()
    .transform((value) => value || null)

export const hostSchema = z.object({
  name: z.string({ error: 'El nombre es obligatorio.' }).trim().min(1, 'El nombre es obligatorio.').max(100, 'Máximo 100 caracteres.'),
  address: z
    .string({ error: 'La dirección es obligatoria.' })
    .trim()
    .min(1, 'La dirección es obligatoria.')
    .max(255, 'Máximo 255 caracteres.')
    .refine(isValidHostAddress, 'Ingresa una IP válida (ej. 192.168.1.1) o un nombre de host (ej. servidor.local).'),
  type: z.enum(HOST_TYPES, { error: 'Selecciona un tipo válido.' }),
  location: optionalText(100),
  description: optionalText(500),
  monitoringEnabled: z.boolean().optional().default(true),
})
