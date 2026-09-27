import { Navigate, useNavigate } from 'react-router'
import { Background } from '@/components/layout/Background'
import { Logo } from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { GlassCard, Loading } from '@/components/ui/Feedback'
import { useToast } from '@/lib/toast'
import { ChangePasswordForm } from './ChangePasswordForm'
import { useCurrentUser, useLogout } from './useAuth'

/**
 * Pantalla obligatoria del primer ingreso (o tras un restablecimiento):
 * la cuenta no puede usar la app hasta elegir su propia contraseña.
 */
export function ChangePasswordPage() {
  const { data: user, isPending } = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()
  const { notify } = useToast()

  if (isPending) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (!user.mustChangePassword) return <Navigate to="/" replace />

  return (
    <div className="relative flex min-h-screen flex-col">
      <Background />
      <header className="flex items-center justify-between px-6 pt-6 md:px-12 md:pt-8">
        <Logo size="lg" />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <GlassCard className="flex w-full max-w-[440px] flex-col gap-5 p-7 md:p-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-[26px] font-semibold">Crea tu contraseña</h1>
            <p className="text-[15px] leading-relaxed text-muted">
              Hola, {user.fullName}. Tu cuenta tiene una contraseña temporal. Elige una propia para continuar: solo tú la conocerás.
            </p>
          </div>
          <ChangePasswordForm
            submitLabel="Guardar y continuar"
            onDone={() => {
              notify({ title: 'Contraseña guardada', description: 'Ya puedes usar SMRED.' })
              navigate('/', { replace: true })
            }}
          />
          <Button variant="ghost" onClick={() => logout.mutate()} className="self-center">
            Salir
          </Button>
        </GlassCard>
      </main>
    </div>
  )
}
