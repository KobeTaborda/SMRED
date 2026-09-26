import { useEffect, useRef } from 'react'
import { CloseIcon } from './icons'
import { IconButton } from './Button'

/**
 * Diálogo de vidrio sobre el elemento <dialog> nativo: foco atrapado y cierre con Esc sin librerías.
 * @param {{ open: boolean, title: string, onClose: () => void, children: React.ReactNode, size?: 'md' | 'sm' }} props
 */
export function Modal({ open, title, onClose, children, size = 'md' }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="modal-title"
      className={`glass m-auto w-[calc(100%-2rem)] rounded-[28px] p-0 text-ink ${size === 'sm' ? 'max-w-md' : 'max-w-xl'}`}
    >
      {open && (
        <div className="flex flex-col gap-5 px-7 py-6">
          <div className="flex items-center justify-between gap-4">
            <h2 id="modal-title" className="text-2xl font-semibold">
              {title}
            </h2>
            <IconButton label="Cerrar" onClick={onClose}>
              <CloseIcon className="size-5" />
            </IconButton>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
