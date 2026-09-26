/** Las tres luces de color detrás del vidrio. Decorativas: fijas y fuera del flujo. */
export function Background() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-20 size-[620px] rounded-full opacity-85 blur-[30px]" style={{ background: 'radial-gradient(circle, var(--light-1) 0%, transparent 68%)' }} />
      <div className="absolute -bottom-52 -left-40 size-[560px] rounded-full opacity-80 blur-[30px]" style={{ background: 'radial-gradient(circle, var(--light-2) 0%, transparent 68%)' }} />
      <div className="absolute top-[45%] left-[40%] size-[420px] rounded-full opacity-70 blur-[30px]" style={{ background: 'radial-gradient(circle, var(--light-3) 0%, transparent 68%)' }} />
    </div>
  )
}
