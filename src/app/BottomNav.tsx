import { NavLink } from 'react-router-dom'

const primaryNavItems = [
  { to: '/dashboard', label: 'Home', icon: '◈' },
  { to: '/transactions', label: 'Transactions', icon: '◆' },
  { to: '/planner', label: 'Planner', icon: '◇' },
  { to: '/settings', label: 'Settings', icon: '◐' },
] as const

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-[#F8FAF5]/95 backdrop-blur-md dark:border-white/8 dark:bg-[#1E2330]/95"
    >
      <div className="mx-auto grid max-w-3xl grid-cols-4 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center rounded-2xl px-2 py-2 text-center transition-colors ${
                isActive
                  ? 'bg-[#ECE4D4] text-[#6C5A36] dark:bg-[#2A2215] dark:text-[#C4A86B]'
                  : 'text-gray-500 hover:bg-black/3 hover:text-[#5A6B3F] dark:text-[#8A9BAA] dark:hover:bg-white/5 dark:hover:text-[#C4A86B]'
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em]">
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
