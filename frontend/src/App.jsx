import { lazy, Suspense } from 'react'
import { createBrowserRouter, Link, RouterProvider } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { EmptyState, Loading } from '@/components/ui/Feedback'
import { RequireAdmin, RequireAuth } from '@/features/auth/guards'
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { HostsPage } from '@/features/hosts/HostsPage'
import { UsersPage } from '@/features/users/UsersPage'

// El detalle usa la librería de gráficas (pesada): se descarga solo al abrir un equipo
const HostDetailPage = lazy(() => import('@/features/hosts/HostDetailPage').then((m) => ({ default: m.HostDetailPage })))

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/cambiar-contrasena', element: <ChangePasswordPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'hosts', element: <HostsPage /> },
      {
        path: 'hosts/:id',
        element: (
          <Suspense fallback={<Loading />}>
            <HostDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'users',
        element: (
          <RequireAdmin>
            <UsersPage />
          </RequireAdmin>
        ),
      },
      {
        path: '*',
        element: (
          <EmptyState title="Esta página no existe">
            <Link to="/" className="text-accent-strong underline">Volver al inicio</Link>
          </EmptyState>
        ),
      },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
