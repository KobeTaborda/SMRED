import { useId } from 'react'
import { WarnIcon } from './icons'

const controlClass =
  'w-full min-h-[46px] rounded-2xl border border-field-border bg-field px-4 text-[15px] text-ink placeholder:text-muted/70 aria-[invalid=true]:border-danger'

/**
 * Etiqueta + control + mensaje de ayuda o error, conectados para lectores de pantalla.
 * @param {{ label: string, error?: string, hint?: string,
 *   children: (props: { id: string, describedBy?: string, invalid: boolean }) => React.ReactNode }} props
 */
function FieldWrapper({ label, error, hint, children }) {
  const id = useId()
  const messageId = `${id}-msg`
  const message = error ?? hint
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-accent-strong">
        {label}
      </label>
      {children({ id, describedBy: message ? messageId : undefined, invalid: Boolean(error) })}
      {message && (
        <p id={messageId} className={`flex items-center gap-1.5 text-[13px] ${error ? 'text-danger' : 'text-muted'}`}>
          {error && <WarnIcon className="size-[15px] shrink-0" />}
          {message}
        </p>
      )}
    </div>
  )
}

/** @typedef {{ label: string, error?: string, hint?: string }} FieldProps */

/** @param {FieldProps & React.InputHTMLAttributes<HTMLInputElement>} props */
export function TextField({ label, error, hint, className = '', ...input }) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <input id={id} aria-describedby={describedBy} aria-invalid={invalid} className={`${controlClass} ${className}`} {...input} />
      )}
    </FieldWrapper>
  )
}

/** @param {FieldProps & React.SelectHTMLAttributes<HTMLSelectElement>} props */
export function SelectField({ label, error, hint, children, ...select }) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={invalid} className={controlClass} {...select}>
          {children}
        </select>
      )}
    </FieldWrapper>
  )
}

/** @param {FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>} props */
export function TextAreaField({ label, error, hint, ...area }) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <textarea id={id} aria-describedby={describedBy} aria-invalid={invalid} rows={2} className={`${controlClass} resize-none py-3`} {...area} />
      )}
    </FieldWrapper>
  )
}

/** @param {{ label: string } & React.InputHTMLAttributes<HTMLInputElement>} props */
export function CheckboxField({ label, ...input }) {
  return (
    <label className="flex min-h-11 items-center gap-2.5 text-[15px]">
      <input type="checkbox" className="size-[18px] accent-accent" {...input} />
      {label}
    </label>
  )
}
