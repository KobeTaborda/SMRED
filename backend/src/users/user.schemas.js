import { z } from 'zod'
import { ROLES } from './user.mappers.js'

const password = z
  .string({ error: 'La contraseña es obligatoria.' })
  .min(10, 'Debe tener entre 10 y 72 caracteres.')
  .max(72, 'Debe tener entre 10 y 72 caracteres.')

const fullName = z
  .string({ error: 'El nombre es obligatorio.' })
  .trim()
  .min(1, 'El nombre es obligatorio.')
  .max(100, 'Máximo 100 caracteres.')

const role = z.enum(ROLES, { error: 'Selecciona un rol válido.' })

export const createUserSchema = z.object({
  username: z
    .string({ error: 'El usuario es obligatorio.' })
    .trim()
    .min(3, 'Debe tener entre 3 y 50 caracteres.')
    .max(50, 'Debe tener entre 3 y 50 caracteres.')
    .regex(/^[A-Za-z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo.'),
  fullName,
  password,
  role,
})

export const updateUserSchema = z.object({
  fullName,
  role,
  enabled: z.boolean({ error: 'Indica si la cuenta está activa.' }),
})

export const resetPasswordSchema = z.object({ password })
