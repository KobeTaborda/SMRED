import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/Feedback'
import { CheckboxField, SelectField, TextField } from '@/components/ui/Field'
import { ApiError, errorMessage } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { useCreateUser, useResetPassword, useUpdateUser } from './api'

/** @typedef {import('@/features/auth/types').User} User */
/** @typedef {import('@/features/auth/types').Role} Role */

const PASSWORD_HINT = 'Mínimo 10 caracteres.'

function formErrors(error) {
  const fieldErrors = error instanceof ApiError ? error.fieldErrors : {}
  const general = error && Object.keys(fieldErrors).length === 0 ? errorMessage(error) : null
  return { fieldErrors, general }
}

/** @param {{ value: Role, onChange: (role: Role) => void, error?: string }} props */
function RoleSelect({ value, onChange, error }) {
  return (
    <SelectField label="Rol" value={value} error={error} onChange={(e) => onChange(/** @type {Role} */ (e.target.value))}>
      <option value="VIEWER">Solo lectura: ve el estado de la red</option>
      <option value="ADMIN">Administrador: agrega equipos y cuentas</option>
    </SelectField>
  )
}

/** @param {{ onCancel: () => void, loading: boolean, submitLabel: string }} props */
function FormActions({ onCancel, loading, submitLabel }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <Button variant="ghost" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" loading={loading}>
        {submitLabel}
      </Button>
    </div>
  )
}

/** @param {{ onDone: () => void }} props */
export function CreateUserForm({ onDone }) {
  const create = useCreateUser()
  const { notify } = useToast()
  const [form, setForm] = useState({ username: '', fullName: '', password: '', role: /** @type {Role} */ ('VIEWER') })
  const { fieldErrors, general } = formErrors(create.error)

  function handleSubmit(event) {
    event.preventDefault()
    create.mutate(form, {
      onSuccess: (user) => {
        notify({ title: 'Usuario creado', description: `${user.fullName} ya puede iniciar sesión como ${user.username}.` })
        onDone()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {general && <ErrorBanner message={general} />}
      <TextField label="Usuario" autoComplete="off" className="font-mono" value={form.username} error={fieldErrors.username}
        onChange={(e) => setForm({ ...form, username: e.target.value })} />
      <TextField label="Nombre completo" value={form.fullName} error={fieldErrors.fullName}
        onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
      <TextField label="Contraseña" type="password" autoComplete="new-password" hint={PASSWORD_HINT}
        value={form.password} error={fieldErrors.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <RoleSelect value={form.role} error={fieldErrors.role} onChange={(role) => setForm({ ...form, role })} />
      <FormActions onCancel={onDone} loading={create.isPending} submitLabel="Crear usuario" />
    </form>
  )
}

/** @param {{ user: User, onDone: () => void }} props */
export function EditUserForm({ user, onDone }) {
  const update = useUpdateUser()
  const { notify } = useToast()
  const [form, setForm] = useState({ fullName: user.fullName, role: user.role, enabled: user.enabled })
  const { fieldErrors, general } = formErrors(update.error)

  function handleSubmit(event) {
    event.preventDefault()
    update.mutate({ id: user.id, data: form }, {
      onSuccess: () => {
        notify({ title: 'Cambios guardados', description: user.fullName })
        onDone()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {general && <ErrorBanner message={general} />}
      <TextField label="Nombre completo" value={form.fullName} error={fieldErrors.fullName}
        onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
      <RoleSelect value={form.role} error={fieldErrors.role} onChange={(role) => setForm({ ...form, role })} />
      <CheckboxField label="Cuenta activa" checked={form.enabled}
        onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
      <FormActions onCancel={onDone} loading={update.isPending} submitLabel="Guardar cambios" />
    </form>
  )
}

/** @param {{ user: User, onDone: () => void }} props */
export function ResetPasswordForm({ user, onDone }) {
  const reset = useResetPassword()
  const { notify } = useToast()
  const [password, setPassword] = useState('')
  const { fieldErrors, general } = formErrors(reset.error)

  function handleSubmit(event) {
    event.preventDefault()
    reset.mutate({ id: user.id, password }, {
      onSuccess: () => {
        notify({ title: 'Contraseña restablecida', description: `Compártela con ${user.fullName} por un medio seguro.` })
        onDone()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {general && <ErrorBanner message={general} />}
      <p className="text-[15px] text-muted">Nueva contraseña para <span className="font-mono text-ink">{user.username}</span>.</p>
      <TextField label="Nueva contraseña" type="password" autoComplete="new-password" hint={PASSWORD_HINT}
        value={password} error={fieldErrors.password} onChange={(e) => setPassword(e.target.value)} />
      <FormActions onCancel={onDone} loading={reset.isPending} submitLabel="Restablecer contraseña" />
    </form>
  )
}
