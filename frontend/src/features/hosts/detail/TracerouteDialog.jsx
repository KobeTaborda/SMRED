import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/Feedback'
import { Modal } from '@/components/ui/Modal'
import { errorMessage } from '@/lib/api'
import { formatLatency } from '@/lib/format'

/**
 * Resultado del traceroute: saltos hasta el equipo.
 * @param {{ open: boolean, onClose: () => void, onRetry: () => void,
 *   trace: import('@tanstack/react-query').UseMutationResult<import('./types').TracerouteResult, Error, number> }} props
 */
export function TracerouteDialog({ open, onClose, onRetry, trace }) {
  const result = trace.data
  return (
    <Modal open={open} title="Ruta hasta el equipo" onClose={onClose}>
      {trace.isPending && (
        <p role="status" className="py-6 text-center text-muted">
          Trazando la ruta… puede tardar hasta un minuto.
        </p>
      )}
      {trace.error && <ErrorBanner message={errorMessage(trace.error)} />}
      {result && (
        <>
          <p className="text-[15px] text-muted">
            {result.hops.length} {result.hops.length === 1 ? 'salto' : 'saltos'} hasta <span className="font-mono text-ink">{result.target}</span>, en{' '}
            {Math.round(result.durationMs / 1000)} s.
          </p>
          <ol className="flex flex-col">
            {result.hops.map((hop) => (
              <li key={hop.hop} className="grid min-h-10 grid-cols-[2rem_1fr_auto] items-center gap-3 border-t border-line text-sm">
                <span className="font-mono text-muted">{hop.hop}</span>
                {hop.address ? <span className="truncate font-mono">{hop.address}</span> : <span className="text-muted">Sin respuesta</span>}
                <span className="text-right font-mono">{formatLatency(hop.latencyMs)}</span>
              </li>
            ))}
          </ol>
          {result.hops.some((hop) => !hop.address) && (
            <p className="text-[13px] leading-relaxed text-muted">
              Un salto sin respuesta suele ser un router configurado para no contestar estas pruebas. Solo es un problema si a partir de ahí ningún salto responde.
            </p>
          )}
        </>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
        {!trace.isPending && (
          <Button variant="primary" onClick={onRetry}>
            Trazar de nuevo
          </Button>
        )}
      </div>
    </Modal>
  )
}
