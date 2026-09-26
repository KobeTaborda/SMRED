import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/Feedback'
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { ApiError, errorMessage } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { useSaveHost } from './api'
import { HOST_TYPE_LABELS } from './types'

/**
 * Formulario para agregar o editar un equipo.
 * @param {{ host?: import('./types').Host, onDone: () => void }} props
 */
export function HostForm({ host, onDone }) {
  const save = useSaveHost()
  const { notify } = useToast()
  const [form, setForm] = useState({
    name: host?.name ?? '',
    address: host?.address ?? '',
    type: host?.type ?? 'SERVER',
    location: host?.location ?? '',
    description: host?.description ?? '',
    monitoringEnabled: host?.monitoringEnabled ?? true,
  })

  const fieldErrors = save.error instanceof ApiError ? save.error.fieldErrors : {}
  const generalError = save.error && Object.keys(fieldErrors).length === 0 ? errorMessage(save.error) : null
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  function handleSubmit(event) {
    event.preventDefault()
    save.mutate(
      { id: host?.id, data: form },
      {
        onSuccess: (saved) => {
          notify({ title: host ? 'Cambios guardados' : 'Equipo agregado', description: host ? saved.name : `${saved.name} se revisará en unos segundos.` })
          onDone()
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {generalError && <ErrorBanner message={generalError} />}
      <TextField label="Nombre" required placeholder="Ej. Router principal" value={form.name} error={fieldErrors.name} onChange={(e) => update('name', e.target.value)} />
      <TextField
        label="Dirección IP o nombre del equipo"
        required
        placeholder="Ej. 192.168.1.1"
        className="font-mono"
        value={form.address}
        error={fieldErrors.address}
        onChange={(e) => update('address', e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Tipo" value={form.type} error={fieldErrors.type} onChange={(e) => update('type', e.target.value)}>
          {Object.entries(HOST_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <TextField label="Ubicación" placeholder="Ej. Bloque B, piso 2" value={form.location} error={fieldErrors.location} onChange={(e) => update('location', e.target.value)} />
      </div>
      <TextAreaField label="Descripción" value={form.description} error={fieldErrors.description} onChange={(e) => update('description', e.target.value)} />
      <CheckboxField label="Revisar este equipo automáticamente" checked={form.monitoringEnabled} onChange={(e) => update('monitoringEnabled', e.target.checked)} />
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {host ? 'Guardar cambios' : 'Agregar equipo'}
        </Button>
      </div>
    </form>
  )
}
