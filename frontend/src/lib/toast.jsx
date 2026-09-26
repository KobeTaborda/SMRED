import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckIcon, CloseIcon } from '@/components/ui/icons'

/**
 * Avisos breves que confirman una acción ("Equipo agregado").
 * @typedef {{ id: number, title: string, description?: string, tone: 'success' | 'error' }} Toast
 */
const ToastContext = createContext({
  /** @param {{ title: string, description?: string, tone?: 'success' | 'error' }} _toast */
  notify: (_toast) => {},
})

const DURATION_MS = 4500

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState(/** @type {Toast[]} */ ([]))
  const nextId = useRef(1)

  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), [])

  const notify = useCallback(
    /** @param {{ title: string, description?: string, tone?: 'success' | 'error' }} toast */
    ({ title, description, tone = 'success' }) => {
      const id = nextId.current++
      setToasts((all) => [...all.slice(-2), { id, title, description, tone }])
      setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-3 px-4 md:bottom-8">
        {toasts.map((toast) => (
          <div key={toast.id} role="status" className="glass pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-3xl py-2.5 pr-2 pl-3">
            <span className="tile flex size-9 shrink-0 items-center justify-center rounded-full!">
              {toast.tone === 'error' ? (
                <span className="size-2.5 rounded-full bg-danger" />
              ) : (
                <CheckIcon className="size-4.5 text-accent-strong" />
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">{toast.title}</span>
              {toast.description && <span className="text-xs text-muted">{toast.description}</span>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Cerrar aviso"
              className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
