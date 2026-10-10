import { z } from 'zod'
import { ALL_CHECK_TYPES, CHECK_FIELDS, getCheck } from '../monitoring/checks/index.js'
import { HOST_TYPES } from './host.mappers.js'

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .nullish()
    .transform((value) => value || null)

/** Número entero opcional: los campos vacíos del formulario llegan como "" o null. */
const optionalInt = (min, max, message) =>
  z.preprocess(
    (value) => (value === '' || value == null ? null : Number(value)),
    z.number({ error: message }).int(message).min(min, message).max(max, message).nullable(),
  )

/**
 * Las reglas de cada tipo de revisión vienen de monitoring/checks. Los campos que no usa
 * la revisión elegida se guardan como null.
 */
export const hostSchema = z
  .object({
    name: z.string({ error: 'El nombre es obligatorio.' }).trim().min(1, 'El nombre es obligatorio.').max(100, 'Máximo 100 caracteres.'),
    address: z
      .string({ error: 'La dirección es obligatoria.' })
      .trim()
      .min(1, 'La dirección es obligatoria.')
      .max(255, 'Máximo 255 caracteres.'),
    type: z.enum(HOST_TYPES, { error: 'Selecciona un tipo válido.' }),
    location: optionalText(100),
    description: optionalText(500),
    monitoringEnabled: z.boolean().optional().default(true),
    checkType: z.enum(ALL_CHECK_TYPES, { error: 'Selecciona qué revisar.' }).optional().default('PING'),
    port: optionalInt(1, 65535, 'El puerto va de 1 a 65535.'),
    expectedStatus: optionalInt(100, 599, 'El código va de 100 a 599.'),
    keyword: optionalText(200),
    expectedIp: optionalText(45),
    degradedMs: optionalInt(1, 60000, 'Usa un valor entre 1 y 60000 ms.'),
  })
  .superRefine((host, ctx) => {
    const check = getCheck(host.checkType)
    if (!check.available) {
      ctx.addIssue({ code: 'custom', path: ['checkType'], message: 'Esta revisión estará disponible próximamente.' })
      return
    }
    if (!check.isValidAddress(host.address)) ctx.addIssue({ code: 'custom', path: ['address'], message: check.addressError })
    for (const { path, message } of check.validate?.(host) ?? []) ctx.addIssue({ code: 'custom', path: [path], message })
  })
  .transform((host) => {
    const check = getCheck(host.checkType)
    const unused = CHECK_FIELDS.filter((field) => !check.fields?.includes(field))
    return {
      ...host,
      ...Object.fromEntries(unused.map((field) => [field, null])),
      address: check.normalizeAddress?.(host.address) ?? host.address,
    }
  })
