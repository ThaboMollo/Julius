import { useEffect, useState, type ReactNode } from 'react'
import { ThemeContext } from './theme-context'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('julius-theme') === 'dark'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('julius-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('julius-theme', 'light')
    }
  }, [isDark])

  function toggleTheme() {
    setIsDark((prev) => !prev)
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
