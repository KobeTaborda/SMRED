import { TextField } from '@/components/ui/Field'

/**
 * Campos extra del formulario según el tipo de revisión. Ping no tiene campos propios.
 *
 * @typedef {object} FieldsProps
 * @property {Record<string, any>} form
 * @property {Record<string, string>} errors
 * @property {(key: string, value: any) => void} update
 */

/** Puertos comunes, como ayuda al escribir. */
const COMMON_PORTS = 'Ej. 3389 escritorio remoto, 22 SSH, 1433 SQL Server, 443 web, 9100 impresora'

/** @param {FieldsProps} props */
function TcpFields({ form, errors, update }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="sm:w-48">
        <TextField
          label="Puerto"
          required
          type="number"
          min={1}
          max={65535}
          inputMode="numeric"
          className="font-mono"
          value={form.port}
          error={errors.port}
          onChange={(e) => update('port', e.target.value)}
        />
      </div>
      {!errors.port && <p className="text-[13px] text-muted">{COMMON_PORTS}</p>}
    </div>
  )
}

/** @param {FieldsProps} props */
function HttpFields({ form, errors, update }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
      <TextField
        label="Código esperado"
        type="number"
        min={100}
        max={599}
        inputMode="numeric"
        placeholder="200"
        className="font-mono"
        value={form.expectedStatus}
        error={errors.expectedStatus}
        onChange={(e) => update('expectedStatus', e.target.value)}
      />
      <TextField
        label="Texto que debe aparecer"
        placeholder="Ej. Bienvenidos"
        hint="Opcional. Si la página no lo contiene, se marca sin respuesta."
        value={form.keyword}
        error={errors.keyword}
        onChange={(e) => update('keyword', e.target.value)}
      />
    </div>
  )
}

/** @param {FieldsProps} props */
function DnsFields({ form, errors, update }) {
  return (
    <TextField
      label="IP esperada"
      placeholder="Ej. 200.12.180.5"
      hint="Opcional. Avisa si el dominio empieza a apuntar a otra IP."
      className="font-mono"
      value={form.expectedIp}
      error={errors.expectedIp}
      onChange={(e) => update('expectedIp', e.target.value)}
    />
  )
}

/** @type {Partial<Record<import('../types').CheckType, (props: FieldsProps) => import('react').ReactNode>>} */
const FIELDS = { TCP: TcpFields, HTTP: HttpFields, DNS: DnsFields }

/** Campos del tipo de revisión elegido (nada si el tipo no tiene campos propios). @param {FieldsProps & { checkType: string }} props */
export function CheckFields({ checkType, ...props }) {
  const Fields = FIELDS[checkType]
  return Fields ? <Fields {...props} /> : null
}
