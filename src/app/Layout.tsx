import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AppHeader } from './AppHeader'
import { SidebarNav } from './BottomNav'

export function Layout() {
  const { dataVersion } = useAuth()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const primaryRoutes = new Set(['/dashboard', '/transactions', '/planner', '/settings'])
  const showBottomNav = primaryRoutes.has(location.pathname)

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        showSidebarToggle={showBottomNav}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />
      <div className="mx-auto flex w-full max-w-6xl flex-1 items-start">
        {showBottomNav && <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />}
        <main className="min-w-0 flex-1">
          <Outlet key={dataVersion} />
        </main>
      </div>
    </div>
  )
}
