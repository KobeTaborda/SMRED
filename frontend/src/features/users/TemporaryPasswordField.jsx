import { useId, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CheckIcon, KeyIcon, WarnIcon } from '@/components/ui/icons'
import { generatePassword } from '@/lib/password'

/**
 * Contraseña temporal para una cuenta: el administrador la escribe o la genera al azar.
 * Se muestra visible (no con puntos) porque el administrador debe poder leerla y compartirla.
 * @param {{ value: string, onChange: (value: string) => void, error?: string, label?: string }} props
 */
export function TemporaryPasswordField({ value, onChange, error, label = 'Contraseña temporal' }) {
  const id = useId()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* sin permiso de portapapeles: el administrador puede seleccionarla y copiarla a mano */
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-accent-strong">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={id}
          type="text"
          autoComplete="off"
          spellCheck="false"
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-msg`}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escríbela o genera una"
          className="min-h-[46px] min-w-0 flex-1 rounded-2xl border border-field-border bg-field px-4 font-mono text-[15px] text-ink placeholder:font-sans placeholder:text-muted/70 aria-[invalid=true]:border-danger"
        />
        <Button variant="ghost" size="sm" icon={<KeyIcon className="size-4" />} onClick={() => onChange(generatePassword())}>
          Generar
        </Button>
        <Button variant="ghost" size="sm" disabled={!value} icon={copied ? <CheckIcon className="size-4" /> : null} onClick={copy}>
          {copied ? 'Copiada' : 'Copiar'}
        </Button>
      </div>
      <p id={`${id}-msg`} className={`flex items-center gap-1.5 text-[13px] ${error ? 'text-danger' : 'text-muted'}`}>
        {error && <WarnIcon className="size-[15px] shrink-0" />}
        {error ?? 'Mínimo 10 caracteres. Cópiala antes de guardar: la persona la usará una vez y luego elegirá la suya.'}
      </p>
    </div>
  )
}
