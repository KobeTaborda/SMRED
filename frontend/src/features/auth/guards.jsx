import { Navigate, useLocation } from 'react-router'
import { ErrorBanner, Loading } from '@/components/ui/Feedback'
import { errorMessage } from '@/lib/api'
import { useCurrentUser } from './useAuth'

/** @param {{ children: React.ReactNode }} props */
export function RequireAuth({ children }) {
  const { data: user, isPending, error } = useCurrentUser()
  const location = useLocation()

  if (isPending) return <Loading label="Verificando sesión…" />
  if (error) {
    return (
      <div className="mx-auto max-w-md p-8">
        <ErrorBanner message={errorMessage(error)} />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

/** @param {{ children: React.ReactNode }} props */
export function RequireAdmin({ children }) {
  const { data: user } = useCurrentUser()
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />
  return children
}
