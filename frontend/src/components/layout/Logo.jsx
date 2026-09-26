/**
 * Logo de SMRED: monitor con el pulso de la red + wordmark "SMR▤D",
 * donde la E son tres barras de medición. Usa currentColor y el acento del tema.
 * @param {{ size?: 'md' | 'lg' }} props
 */
export function Logo({ size = 'md' }) {
  const scale = size === 'lg' ? 1.3 : 1
  return (
    <span className="inline-flex items-center gap-2 text-ink" style={{ gap: 8 * scale }}>
      <svg width={28 * scale} height={24 * scale} viewBox="0 0 48 40" aria-hidden="true">
        <rect x="2" y="2" width="44" height="28" rx="6" fill="none" stroke="currentColor" strokeWidth="3.5" />
        <path d="M24 30 V37 M17 37 H31" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        <polyline points="9,17 16,17 20,9 26,25 30,17 39,17" fill="none" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span role="img" aria-label="SMRED" className="inline-flex items-center gap-0.5 font-logo leading-none font-bold tracking-[0.02em]" style={{ fontSize: 18 * scale }}>
        <span aria-hidden="true">SMR</span>
        <svg width={10.5 * scale} height={13 * scale} viewBox="0 0 21 26" className="mx-px" aria-hidden="true">
          <rect x="0" y="0" width="21" height="5" rx="1.2" fill="currentColor" />
          <rect x="0" y="10.5" width="12" height="5" rx="1.2" fill="var(--accent)" />
          <rect x="0" y="21" width="17" height="5" rx="1.2" fill="currentColor" />
        </svg>
        <span aria-hidden="true">D</span>
      </span>
    </span>
  )
}
