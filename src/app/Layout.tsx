import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { MonthSelector } from './MonthSelector'
import { NavDrawer } from './NavDrawer'

export function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { dataVersion } = useAuth()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{ background: 'linear-gradient(135deg, #3B4A2F 0%, #5A6B3F 100%)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-2xl leading-none mr-3"
            style={{ color: '#C4A86B' }}
            aria-label="Open menu"
          >
            ☰
          </button>
          <h1 className="text-xl font-bold tracking-widest uppercase flex-1" style={{ color: '#C4A86B' }}>
            Julius
          </h1>
          <MonthSelector />
        </div>
      </header>

      {/* Nav Drawer */}
      <NavDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Main content */}
      <main className="flex-1">
        <Outlet key={dataVersion} />
      </main>
    </div>
  )
}
