import { Button } from './Button'
import { ErrorBanner } from './Feedback'
import { Modal } from './Modal'
import { TrashIcon } from './icons'

/**
 * Confirmación de acciones destructivas (reemplaza el window.confirm del navegador).
 * @param {{ open: boolean, title: string, children: React.ReactNode, confirmLabel: string,
 *   onConfirm: () => void, onCancel: () => void, loading?: boolean, error?: string | null }} props
 */
export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel, loading = false, error = null }) {
  return (
    <Modal open={open} title={title} onClose={onCancel} size="sm">
      <div className="text-base leading-relaxed text-muted">{children}</div>
      {error && <ErrorBanner message={error} />}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" icon={<TrashIcon />} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
