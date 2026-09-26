import { Link } from 'react-router'

const variants = {
  // Acción principal: píldora con borde lila
  primary: 'border border-accent bg-accent-bg text-ink hover:brightness-125',
  // Botón de vidrio, para acciones destacadas sobre el fondo
  glass: 'glass border-accent! text-ink hover:brightness-110',
  ghost: 'border border-transparent text-accent-strong hover:bg-hover',
  danger: 'border border-danger bg-danger-bg text-ink hover:brightness-110',
}

/**
 * @typedef {'primary' | 'glass' | 'ghost' | 'danger'} Variant
 * @param {React.ButtonHTMLAttributes<HTMLButtonElement> & {
 *   variant?: Variant, size?: 'sm' | 'md', loading?: boolean, icon?: React.ReactNode, to?: string }} props
 */
export function Button({ variant = 'primary', size = 'md', loading = false, icon, to, disabled, className = '', children, ...rest }) {
  const sizing = size === 'sm' ? 'px-4 text-sm' : 'px-5 text-[15px]'
  const classes = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${variants[variant]} ${className}`

  if (to) {
    return (
      <Link to={to} className={classes}>
        {icon}
        {children}
      </Link>
    )
  }
  return (
    <button type="button" disabled={disabled || loading} aria-busy={loading || undefined} className={classes} {...rest}>
      {icon}
      {loading ? 'Procesando…' : children}
    </button>
  )
}

/**
 * Botón solo con ícono. `label` es obligatorio: es lo que lee un lector de pantalla.
 * @param {React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string, tone?: 'default' | 'danger' }} props
 */
export function IconButton({ label, tone = 'default', className = '', children, ...rest }) {
  const color = tone === 'danger' ? 'text-danger' : 'text-muted hover:text-ink'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full transition hover:bg-hover disabled:opacity-40 ${color} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
