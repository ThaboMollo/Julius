import { NavLink } from 'react-router-dom'

export const primaryNavItems = [
  { to: '/dashboard', label: 'Home', icon: '◈' },
  { to: '/transactions', label: 'Transactions', icon: '◆' },
  { to: '/planner', label: 'Planner', icon: '◇' },
  { to: '/settings', label: 'Settings', icon: '◐' },
] as const

export function SidebarNav() {
  return (
    <aside className="w-[5.5rem] shrink-0">
      <nav
        aria-label="Primary"
        className="sticky top-[calc(5.5rem+env(safe-area-inset-top))] mx-2 mt-4 rounded-[1.75rem] border border-black/5 bg-[#F8FAF5]/92 p-2 shadow-[0_20px_50px_rgba(43,50,38,0.12)] backdrop-blur-md dark:border-white/8 dark:bg-[#1E2330]/92"
      >
        <div className="flex flex-col gap-2">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center rounded-2xl px-2 py-2 text-center transition-colors ${
                  isActive
                    ? 'bg-[#ECE4D4] text-[#6C5A36] dark:bg-[#2A2215] dark:text-[#C4A86B]'
                    : 'text-gray-500 hover:bg-black/3 hover:text-[#5A6B3F] dark:text-[#8A9BAA] dark:hover:bg-white/5 dark:hover:text-[#C4A86B]'
                }`
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em]">
                {item.label}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  )
}
