import { Outlet, NavLink } from 'react-router-dom'
import { MonthSelector } from './MonthSelector'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '◈' },
  { to: '/budget', label: 'Budget', icon: '◉' },
  { to: '/bills', label: 'Bills', icon: '◎' },
  { to: '/timeline', label: 'Timeline', icon: '◷' },
  { to: '/transactions', label: 'Spend', icon: '◆' },
  { to: '/settings', label: 'Settings', icon: '◐' },
]

export function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{ background: 'linear-gradient(135deg, #3B4A2F 0%, #5A6B3F 100%)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold tracking-widest uppercase" style={{ color: '#C4A86B' }}>
            Julius
          </h1>
          <MonthSelector />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1A2030] border-t border-gray-200 dark:border-[#2E3A4E] z-50">
        <div className="flex justify-around items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-1 text-xs ${
                  isActive
                    ? 'text-[#A89060] dark:text-[#C4A86B]'
                    : 'text-gray-400 dark:text-[#8A9BAA]'
                }`
              }
            >
              <span className="text-lg mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
