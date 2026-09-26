import { NavLink, Outlet } from 'react-router'
import { IconButton } from '@/components/ui/Button'
import { DeviceIcon, HomeIcon, LogoutIcon, UsersIcon } from '@/components/ui/icons'
import { ROLE_LABELS } from '@/features/auth/types'
import { useCurrentUser, useLogout } from '@/features/auth/useAuth'
import { initials } from '@/lib/format'
import { Background } from './Background'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

const links = [
  { to: '/', label: 'Inicio', end: true, adminOnly: false, Icon: HomeIcon },
  { to: '/hosts', label: 'Equipos', end: false, adminOnly: false, Icon: DeviceIcon },
  { to: '/users', label: 'Usuarios', end: false, adminOnly: true, Icon: UsersIcon },
]

export function AppLayout() {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const visible = links.filter((link) => !link.adminOnly || user?.role === 'ADMIN')

  return (
    <div className="relative min-h-screen">
      <Background />
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-7 px-4 pt-4 pb-28 md:px-8 md:pt-6 md:pb-12">
        {/* Barra superior en píldora de vidrio */}
        <header className="glass flex h-[60px] shrink-0 items-center gap-4 rounded-full pr-2 pl-5 md:gap-7">
          <NavLink to="/" aria-label="SMRED, ir a Inicio" className="shrink-0">
            <Logo />
          </NavLink>
          <nav aria-label="Principal" className="ml-3 hidden gap-1 md:flex">
            {visible.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex min-h-11 items-center rounded-full px-4 text-sm transition ${isActive ? 'bg-hover font-semibold text-ink' : 'font-medium text-muted hover:text-ink'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <div className="hidden flex-col items-end leading-tight lg:flex">
              <span className="text-sm font-semibold">{user?.fullName}</span>
              <span className="text-xs text-muted">{user && ROLE_LABELS[user.role]}</span>
            </div>
            <span aria-hidden="true" className="mx-1 inline-flex size-9 items-center justify-center rounded-full border border-accent-border bg-accent-bg text-[13px] font-semibold">
              {user && initials(user.fullName)}
            </span>
            <IconButton label="Cerrar sesión" onClick={() => logout.mutate()}>
              <LogoutIcon className="size-[18px]" />
            </IconButton>
          </div>
        </header>

        <main className="flex flex-col gap-7">
          <Outlet />
        </main>
      </div>

      {/* Navegación inferior en celulares: al alcance del pulgar */}
      <nav aria-label="Principal" className="glass fixed inset-x-4 bottom-4 z-40 flex gap-1 rounded-[32px] p-1.5 md:hidden">
        {visible.map(({ to, label, end, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[26px] text-[11px] font-semibold ${isActive ? 'bg-hover text-ink' : 'text-muted'}`
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
