import { QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

export const ME_QUERY_KEY = ['auth', 'me']

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Si la sesión expiró en cualquier consulta, se marca como no autenticado y el router lleva al login
      if (error instanceof ApiError && error.status === 401) {
        queryClient.setQueryData(ME_QUERY_KEY, null)
      }
    },
  }),
  defaultOptions: {
    queries: {
      // No reintentar errores del cliente (4xx); sí errores de red o del servidor, hasta 2 veces
      retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < 2,
      refetchOnWindowFocus: true,
    },
  },
})
