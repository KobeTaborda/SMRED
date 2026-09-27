import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/Feedback'
import { TextField } from '@/components/ui/Field'
import { ApiError, errorMessage } from '@/lib/api'
import { useChangePassword } from './useAuth'

/**
 * Formulario para que el usuario cambie su propia contraseña.
 * Se usa en "Mi cuenta" y en la pantalla obligatoria del primer ingreso.
 * @param {{ onDone: () => void, onCancel?: () => void, submitLabel?: string }} props
 */
export function ChangePasswordForm({ onDone, onCancel, submitLabel = 'Cambiar contraseña' }) {
  const change = useChangePassword()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [confirmError, setConfirmError] = useState(/** @type {string | null} */ (null))

  const fieldErrors = change.error instanceof ApiError ? change.error.fieldErrors : {}
  const generalError = change.error && Object.keys(fieldErrors).length === 0 ? errorMessage(change.error) : null
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  function handleSubmit(event) {
    event.preventDefault()
    if (form.newPassword !== form.confirm) {
      setConfirmError('Las contraseñas no coinciden.')
      return
    }
    setConfirmError(null)
    change.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {generalError && <ErrorBanner message={generalError} />}
      <TextField
        label="Contraseña actual"
        type="password"
        autoComplete="current-password"
        value={form.currentPassword}
        error={fieldErrors.currentPassword}
        onChange={update('currentPassword')}
      />
      <TextField
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        hint="Mínimo 10 caracteres. Usa una que no uses en otros sitios."
        value={form.newPassword}
        error={fieldErrors.newPassword}
        onChange={update('newPassword')}
      />
      <TextField
        label="Repite la nueva contraseña"
        type="password"
        autoComplete="new-password"
        value={form.confirm}
        error={confirmError ?? undefined}
        onChange={update('confirm')}
      />
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={change.isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
