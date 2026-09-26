import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/** @typedef {'dark' | 'light'} Theme */

const STORAGE_KEY = 'smred-theme'

/**
 * Colores que las gráficas (SVG) necesitan como valores concretos.
 * Deben coincidir con las variables de styles/index.css.
 */
const CHART_COLORS = {
  dark: { accent: '#9184D9', warning: '#F2C77A', danger: '#F0937B', muted: '#A4A6BA', line: 'rgba(255,255,255,0.1)', text: '#E9E9ED' },
  light: { accent: '#5B4FB0', warning: '#8A5A00', danger: '#B03A22', muted: '#55586F', line: 'rgba(28,30,48,0.1)', text: '#1C1E30' },
}

const ThemeContext = createContext({ theme: /** @type {Theme} */ ('dark'), toggle: () => {}, colors: CHART_COLORS.dark })

function initialTheme() {
  const attr = document.documentElement.getAttribute('data-theme')
  return attr === 'light' ? 'light' : 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(/** @type {Theme} */ (initialTheme()))

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* sin localStorage: el cambio dura solo esta visita */
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, toggle, colors: CHART_COLORS[theme] }), [theme, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
