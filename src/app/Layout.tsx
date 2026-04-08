import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AppHeader } from './AppHeader'
import { BottomNav } from './BottomNav'

export function Layout() {
  const { dataVersion } = useAuth()
  const location = useLocation()

  const primaryRoutes = new Set(['/dashboard', '/transactions', '/planner', '/settings'])
  const showBottomNav = primaryRoutes.has(location.pathname)

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className={`flex-1 ${showBottomNav ? 'pb-24' : ''}`}>
        <Outlet key={dataVersion} />
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  )
}
