import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { ME_QUERY_KEY } from '@/lib/queryClient'

/** @typedef {import('./types').User} User */

/** Usuario en sesión. `null` = no autenticado. */
export function useCurrentUser() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    /** @returns {Promise<User | null>} */
    queryFn: async () => {
      try {
        return await api('/auth/me')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    /** @param {{ username: string, password: string }} credentials */
    mutationFn: (credentials) => api('/auth/login', { method: 'POST', body: credentials }),
    onSuccess: (user) => queryClient.setQueryData(ME_QUERY_KEY, user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      // Primero marcar "sin sesión" (el guard redirige al login) y luego descartar los datos cacheados.
      // No usar queryClient.clear(): deja a los componentes montados escuchando consultas eliminadas.
      queryClient.setQueryData(ME_QUERY_KEY, null)
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== ME_QUERY_KEY[0] })
    },
  })
}

export function useChangePassword() {
  const queryClient = useQueryClient()
  return useMutation({
    /** @param {{ currentPassword: string, newPassword: string }} data */
    mutationFn: (data) => api('/auth/password', { method: 'PUT', body: data }),
    // La respuesta trae el usuario actualizado (mustChangePassword: false)
    onSuccess: (user) => queryClient.setQueryData(ME_QUERY_KEY, user),
  })
}

export function useIsAdmin() {
  const { data } = useCurrentUser()
  return data?.role === 'ADMIN'
}
