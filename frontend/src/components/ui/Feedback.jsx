/** @param {{ message: string }} props */
export function ErrorBanner({ message }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/50 bg-danger-bg px-4 py-3 text-sm text-danger">
      {message}
    </div>
  )
}

/** @param {{ title: string, children?: React.ReactNode }} props */
export function EmptyState({ title, children }) {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-[28px] px-6 py-14 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="max-w-md text-[15px] text-muted">{children}</div>}
    </div>
  )
}

/** @param {{ label?: string }} props */
export function Loading({ label = 'Cargando…' }) {
  return (
    <p role="status" className="py-10 text-center text-muted">
      {label}
    </p>
  )
}

/** @param {{ title: string, description?: string, eyebrow?: string, actions?: React.ReactNode }} props */
export function PageHeader({ title, description, eyebrow, actions }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 px-1 md:px-2">
      <div className="flex flex-col gap-2.5">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="text-[32px] leading-[1.05] font-semibold tracking-[-0.025em] md:text-[44px]">{title}</h1>
        {description && <p className="text-base leading-relaxed text-muted">{description}</p>}
      </div>
      {actions}
    </header>
  )
}

/** @param {{ className?: string, children: React.ReactNode, as?: 'section' | 'div' }} props */
export function GlassCard({ className = '', children, as: Tag = 'section' }) {
  return <Tag className={`glass flex min-w-0 flex-col gap-4 rounded-[28px] px-6 py-5 ${className}`}>{children}</Tag>
}

/** @param {{ label: string, value: React.ReactNode, tone?: 'default' | 'accent' | 'danger' | 'warning', note?: string, children?: React.ReactNode }} props */
export function StatTile({ label, value, tone = 'default', note, children }) {
  const color = { default: 'text-ink', accent: 'text-accent-strong', danger: 'text-danger', warning: 'text-warning' }[tone]
  return (
    <div className="tile flex min-w-0 flex-col gap-1 px-4 py-3.5">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={`text-[30px] leading-tight font-semibold ${color}`}>{value}</span>
      {note && <span className="text-xs text-muted">{note}</span>}
      {children}
    </div>
  )
}

export function LivePill() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-tile px-3 py-1.5 text-[13px] text-muted">
      <span className="size-[7px] rounded-full bg-accent shadow-[0_0_0_4px_var(--accent-bg)]" />
      En vivo
    </span>
  )
}
