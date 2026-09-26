import { useState } from 'react'
import { errorMessage } from '@/lib/api'
import { formatLatency } from '@/lib/format'
import { useToast } from '@/lib/toast'
import { useCheckHost, useDeleteHost } from './api'
import { STATUS_LABELS } from './types'

/**
 * Acciones comunes sobre un equipo (revisar ahora, eliminar con confirmación)
 * con sus avisos. La usan la lista de Equipos, el Inicio y el detalle.
 * @param {{ onDeleted?: () => void }} [options]
 */
export function useHostActions({ onDeleted } = {}) {
  const { notify } = useToast()
  const check = useCheckHost()
  const remove = useDeleteHost()
  const [toDelete, setToDelete] = useState(/** @type {import('./types').Host | null} */ (null))

  /** @param {import('./types').Host} host */
  function checkNow(host) {
    check.mutate(host.id, {
      onSuccess: (result) =>
        notify({
          title: `${host.name} revisado`,
          description: result.status === 'DOWN' ? 'No respondió.' : `${STATUS_LABELS[result.status]}, responde en ${formatLatency(result.latencyMs)}.`,
          tone: result.status === 'DOWN' ? 'error' : 'success',
        }),
      onError: (error) => notify({ title: 'No se pudo revisar', description: errorMessage(error), tone: 'error' }),
    })
  }

  function confirmDelete() {
    if (!toDelete) return
    const host = toDelete
    remove.mutate(host.id, {
      onSuccess: () => {
        setToDelete(null)
        notify({ title: 'Equipo eliminado', description: `${host.name} y su historial.` })
        onDeleted?.()
      },
    })
  }

  return {
    checkNow,
    isChecking: (id) => check.isPending && check.variables === id,
    toDelete,
    askDelete: setToDelete,
    cancelDelete: () => {
      setToDelete(null)
      remove.reset()
    },
    confirmDelete,
    deleting: remove.isPending,
    deleteError: remove.error ? errorMessage(remove.error) : null,
  }
}
