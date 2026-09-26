import { IconButton } from '@/components/ui/Button'
import { MoonIcon, SunIcon } from '@/components/ui/icons'
import { useTheme } from '@/lib/theme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const toLight = theme === 'dark'
  return (
    <IconButton label={toLight ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} onClick={toggle}>
      {toLight ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
    </IconButton>
  )
}
