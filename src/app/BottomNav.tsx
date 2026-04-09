import { NavLink } from 'react-router-dom'

export const primaryNavItems = [
  { to: '/dashboard', label: 'Home', icon: '◈' },
  { to: '/transactions', label: 'Transactions', icon: '◆' },
  { to: '/planner', label: 'Planner', icon: '◇' },
  { to: '/settings', label: 'Settings', icon: '◐' },
] as const

type SidebarNavProps = {
  isOpen: boolean
  onClose: () => void
}

export function SidebarNav({ isOpen, onClose }: SidebarNavProps) {
  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[#1E2330]/40 backdrop-blur-[2px] transition-opacity duration-200 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <nav
        id="primary-sidebar"
        aria-label="Primary"
        className={`fixed left-4 top-[calc(5.5rem+env(safe-area-inset-top))] z-50 w-[6.75rem] rounded-[1.9rem] border border-black/5 bg-[#F8FAF5]/92 p-3 shadow-[0_20px_50px_rgba(43,50,38,0.12)] backdrop-blur-md transition duration-200 dark:border-white/8 dark:bg-[#1E2330]/92 ${
          isOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-[calc(100%+1.5rem)] opacity-0'
        }`}
      >
        <div className="flex flex-col gap-4">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex min-h-[4.75rem] flex-col items-center justify-center rounded-[1.4rem] px-4 py-4 text-center transition-colors ${
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
    </>
  )
}
