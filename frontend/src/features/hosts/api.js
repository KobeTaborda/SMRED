import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** @typedef {import('./types').Host} Host */
/** @typedef {import('./types').HostRequest} HostRequest */

const HOSTS_KEY = ['hosts']
const REFRESH_MS = 10_000

export function useHosts() {
  return useQuery({
    queryKey: HOSTS_KEY,
    /** @returns {Promise<Host[]>} */
    queryFn: () => api('/hosts'),
    refetchInterval: REFRESH_MS,
  })
}

/** @param {number} id */
export function useHost(id) {
  return useQuery({
    queryKey: [...HOSTS_KEY, id],
    /** @returns {Promise<Host>} */
    queryFn: () => api(`/hosts/${id}`),
    refetchInterval: REFRESH_MS,
  })
}

/** @param {number} id @param {'24h' | '7d'} period */
export function useHostStats(id, period) {
  return useQuery({
    queryKey: [...HOSTS_KEY, id, 'stats', period],
    /** @returns {Promise<import('./types').HostStats>} */
    queryFn: () => api(`/hosts/${id}/stats?period=${period}`),
    refetchInterval: 30_000,
    placeholderData: (previous) => previous,
  })
}

/** @param {number} id @param {number} limit */
export function useLatestPings(id, limit = 6) {
  return useQuery({
    queryKey: [...HOSTS_KEY, id, 'pings', limit],
    /** @returns {Promise<import('./types').PingRecord[]>} */
    queryFn: () => api(`/hosts/${id}/pings?limit=${limit}`),
    refetchInterval: REFRESH_MS,
  })
}

export function useOverview() {
  return useQuery({
    queryKey: ['overview'],
    /** @returns {Promise<{ intervalSeconds: number, degradedLatencyMs: number, latencyTrend: { start: string, avgLatencyMs: number | null }[] }>} */
    queryFn: () => api('/overview'),
    refetchInterval: 60_000,
  })
}

function useInvalidateHosts() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: HOSTS_KEY })
}

export function useSaveHost() {
  const invalidate = useInvalidateHosts()
  return useMutation({
    /** @param {{ id?: number, data: HostRequest }} params @returns {Promise<Host>} */
    mutationFn: ({ id, data }) =>
      id ? api(`/hosts/${id}`, { method: 'PUT', body: data }) : api('/hosts', { method: 'POST', body: data }),
    onSuccess: invalidate,
  })
}

export function useDeleteHost() {
  const invalidate = useInvalidateHosts()
  return useMutation({
    /** @param {number} id */
    mutationFn: (id) => api(`/hosts/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function useCheckHost() {
  const invalidate = useInvalidateHosts()
  return useMutation({
    /** @param {number} id @returns {Promise<{ status: import('./types').HostStatus, latencyMs: number | null }>} */
    mutationFn: (id) => api(`/hosts/${id}/check`, { method: 'POST' }),
    onSuccess: invalidate,
  })
}
