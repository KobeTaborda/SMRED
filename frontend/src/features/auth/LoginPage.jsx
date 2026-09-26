import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Background } from '@/components/layout/Background'
import { Logo } from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/Feedback'
import { TextField } from '@/components/ui/Field'
import { StatusBadge } from '@/components/ui/Status'
import { errorMessage } from '@/lib/api'
import { useCurrentUser, useLogin } from './useAuth'

export function LoginPage() {
  const { data: user } = useCurrentUser()
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const from = location.state?.from ?? '/'
  if (user) return <Navigate to={from} replace />

  function handleSubmit(event) {
    event.preventDefault()
    login.mutate({ username, password }, { onSuccess: () => navigate(from, { replace: true }) })
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <Background />
      <header className="flex items-center justify-between px-6 pt-6 md:px-12 md:pt-8">
        <Logo size="lg" />
        <ThemeToggle />
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-10 md:px-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-20">
        <div className="flex max-w-xl flex-col gap-5">
          <span className="eyebrow">Monitoreo de red</span>
          <h1 className="text-[44px] leading-[1.02] font-semibold tracking-[-0.025em] text-balance md:text-[64px]">Toda tu red, a la vista</h1>
          <p className="text-lg leading-relaxed text-muted">
            SMRED revisa tus computadores, impresoras, routers y servidores cada pocos segundos y te avisa cuando algo deja de responder.
          </p>
          <div className="mt-1 flex flex-wrap gap-5">
            <StatusBadge status="UP" />
            <StatusBadge status="DEGRADED" />
            <StatusBadge status="DOWN" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass flex flex-col gap-5 rounded-[28px] p-7 md:p-8">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[26px] font-semibold">Inicia sesión</h2>
            <p className="text-[15px] text-muted">Usa la cuenta que te creó un administrador.</p>
          </div>
          {login.error && <ErrorBanner message={errorMessage(login.error)} />}
          <TextField label="Usuario" name="username" autoComplete="username" required autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
          <TextField
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" loading={login.isPending} className="min-h-12 text-base font-semibold">
            Iniciar sesión
          </Button>
          <p className="text-[13px] leading-relaxed text-muted">¿Olvidaste tu contraseña? Un administrador puede restablecerla desde Usuarios.</p>
        </form>
      </main>
    </div>
  )
}
