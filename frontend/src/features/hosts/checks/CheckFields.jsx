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

/** @type {Partial<Record<import('../types').CheckType, (props: FieldsProps) => import('react').ReactNode>>} */
const FIELDS = { TCP: TcpFields }

/** Campos del tipo de revisión elegido (nada si el tipo no tiene campos propios). @param {FieldsProps & { checkType: string }} props */
export function CheckFields({ checkType, ...props }) {
  const Fields = FIELDS[checkType]
  return Fields ? <Fields {...props} /> : null
}
