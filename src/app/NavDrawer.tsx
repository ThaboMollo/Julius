import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { checkInResultRepo } from '../data/local'

interface NavDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { to: '/dashboard', label: 'Home', icon: '◈' },
  { to: '/analytics', label: 'Insights', icon: '◑' },
  { to: '/budget', label: 'Budget', icon: '◉' },
  { to: '/commitments', label: 'Commitments', icon: '◎' },
  { to: '/timeline', label: 'Projection', icon: '◷' },
  { to: '/planner', label: 'Planner', icon: '◇' },
  { to: '/transactions', label: 'Transactions', icon: '◆' },
  { to: '/settings', label: 'Settings', icon: '◐' },
]

export function NavDrawer({ isOpen, onClose }: NavDrawerProps) {
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [checkInDone, setCheckInDone] = useState(false)

  useEffect(() => {
    const now = new Date()
    const day = now.getDate()
    const isWindow = day >= 13 && day <= 17
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    checkInResultRepo.getByMonthKey(monthKey).then((r) => {
      const done = !!r
      setCheckInDone(done)
      // Show if in the window OR if they haven't done a check-in this month yet
      setShowCheckIn(isWindow || !done)
    })
  }, [])

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'linear-gradient(180deg, #3B4A2F 0%, #2A3520 100%)' }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'rgba(196,168,107,0.2)' }}
        >
          <h2 className="text-xl font-bold tracking-widest uppercase" style={{ color: '#C4A86B' }}>
            Julius
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: '#C4A86B' }}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav items */}
        <nav className="py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-4 px-5 py-3.5 text-base transition-colors ${
                  isActive
                    ? 'text-[#C4A86B] bg-white/10'
                    : 'text-[#A8B8A0] hover:text-[#C4A86B] hover:bg-white/5'
                }`
              }
            >
              <span className="text-xl w-7 text-center">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
          {showCheckIn && (
            <NavLink
              to="/check-in"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-4 px-5 py-3.5 text-base transition-colors ${
                  isActive
                    ? 'text-[#C4A86B] bg-white/10'
                    : 'text-[#C4A86B] hover:bg-white/5'
                }`
              }
            >
              <span className="text-xl w-7 text-center">♡</span>
              <span className="font-medium">Check-In</span>
              {checkInDone && (
                <span className="w-2 h-2 rounded-full bg-green-400 ml-auto" />
              )}
            </NavLink>
          )}
        </nav>
      </div>
    </>
  )
}
