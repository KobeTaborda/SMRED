import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/Feedback'
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { ApiError, errorMessage } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { useOverview, useSaveHost } from './api'
import { CheckFields } from './checks/CheckFields'
import { CHECK_TYPES } from './checks/check-types'
import { HOST_TYPE_LABELS } from './types'

/** Los campos numéricos vacíos se guardan como texto vacío; el backend los convierte en null. */
const asText = (value) => (value == null ? '' : String(value))

/**
 * Formulario para agregar o editar un equipo.
 * @param {{ host?: import('./types').Host, onDone: () => void }} props
 */
export function HostForm({ host, onDone }) {
  const save = useSaveHost()
  const overview = useOverview()
  const { notify } = useToast()
  const [form, setForm] = useState({
    name: host?.name ?? '',
    checkType: host?.checkType ?? 'PING',
    address: host?.address ?? '',
    port: asText(host?.port),
    expectedStatus: asText(host?.expectedStatus),
    keyword: host?.keyword ?? '',
    expectedIp: host?.expectedIp ?? '',
    degradedMs: asText(host?.degradedMs),
    type: host?.type ?? 'SERVER',
    location: host?.location ?? '',
    description: host?.description ?? '',
    monitoringEnabled: host?.monitoringEnabled ?? true,
  })

  const fieldErrors = save.error instanceof ApiError ? save.error.fieldErrors : {}
  const generalError = save.error && Object.keys(fieldErrors).length === 0 ? errorMessage(save.error) : null
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const check = CHECK_TYPES[form.checkType]
  const defaultSlowMs = overview.data?.degradedLatencyMs ?? 200

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

      <SelectField label="Qué revisar" value={form.checkType} error={fieldErrors.checkType} onChange={(e) => update('checkType', e.target.value)}>
        {Object.entries(CHECK_TYPES).map(([value, { label, available }]) => (
          <option key={value} value={value} disabled={!available}>
            {label}
          </option>
        ))}
      </SelectField>

      <TextField
        label={check.addressLabel}
        required
        placeholder={check.placeholder}
        className="font-mono"
        value={form.address}
        error={fieldErrors.address}
        onChange={(e) => update('address', e.target.value)}
      />
      <CheckFields checkType={form.checkType} form={form} errors={fieldErrors} update={update} />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Tipo de equipo" value={form.type} error={fieldErrors.type} onChange={(e) => update('type', e.target.value)}>
          {Object.entries(HOST_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <TextField label="Ubicación" placeholder="Ej. Bloque B, piso 2" value={form.location} error={fieldErrors.location} onChange={(e) => update('location', e.target.value)} />
      </div>
      <TextAreaField label="Descripción" value={form.description} error={fieldErrors.description} onChange={(e) => update('description', e.target.value)} />
      <TextField
        label="Considerar lento desde (ms)"
        type="number"
        min={1}
        max={60000}
        inputMode="numeric"
        placeholder={String(defaultSlowMs)}
        hint={`Vacío: ${defaultSlowMs} ms, el valor general.`}
        className="font-mono"
        value={form.degradedMs}
        error={fieldErrors.degradedMs}
        onChange={(e) => update('degradedMs', e.target.value)}
      />
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
