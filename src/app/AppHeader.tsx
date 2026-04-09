import { MonthSelector } from './MonthSelector'

type AppHeaderProps = {
  showSidebarToggle?: boolean
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export function AppHeader({
  showSidebarToggle = false,
  isSidebarOpen = false,
  onToggleSidebar,
}: AppHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-black/5 shadow-[0_10px_30px_rgba(59,74,47,0.18)]"
      style={{ background: 'linear-gradient(135deg, #3B4A2F 0%, #5A6B3F 100%)' }}
    >
      <div className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-3">
          {showSidebarToggle ? (
            <button
              type="button"
              aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isSidebarOpen}
              aria-controls="primary-sidebar"
              onClick={onToggleSidebar}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              <span className="sr-only">{isSidebarOpen ? 'Close menu' : 'Open menu'}</span>
              {isSidebarOpen ? (
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6L18 18" />
                  <path d="M18 6L6 18" />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 7H20" />
                  <path d="M4 12H20" />
                  <path d="M4 17H20" />
                </svg>
              )}
            </button>
          ) : null}
          <div className="min-w-0 shrink-0">
            <h1 className="truncate text-lg font-bold uppercase tracking-[0.24em] sm:text-xl" style={{ color: '#C4A86B' }}>
              Julius
            </h1>
          </div>
          <div className="min-w-0 flex-1 rounded-2xl bg-white/10 px-2 py-2 backdrop-blur-sm">
            <MonthSelector />
          </div>
        </div>
      </div>
    </header>
  )
}
