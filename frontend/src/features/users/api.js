import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** @typedef {import('@/features/auth/types').User} User */
/** @typedef {{ username: string, fullName: string, password: string, role: import('@/features/auth/types').Role }} CreateUserRequest */
/** @typedef {{ fullName: string, role: import('@/features/auth/types').Role, enabled: boolean }} UpdateUserRequest */

const USERS_KEY = ['users']

export function useUsers() {
  /** @type {() => Promise<User[]>} */
  const queryFn = () => api('/users')
  return useQuery({ queryKey: USERS_KEY, queryFn })
}

function useInvalidateUsers() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: USERS_KEY })
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    /** @param {CreateUserRequest} data */
    mutationFn: (data) => api('/users', { method: 'POST', body: data }),
    onSuccess: invalidate,
  })
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    /** @param {{ id: number, data: UpdateUserRequest }} params */
    mutationFn: ({ id, data }) => api(`/users/${id}`, { method: 'PUT', body: data }),
    onSuccess: invalidate,
  })
}

export function useResetPassword() {
  return useMutation({
    /** @param {{ id: number, password: string }} params */
    mutationFn: ({ id, password }) => api(`/users/${id}/password`, { method: 'PUT', body: { password } }),
  })
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    /** @param {number} id */
    mutationFn: (id) => api(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}
