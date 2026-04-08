import { MonthSelector } from './MonthSelector'

export function AppHeader() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-black/5 shadow-[0_10px_30px_rgba(59,74,47,0.18)]"
      style={{ background: 'linear-gradient(135deg, #3B4A2F 0%, #5A6B3F 100%)' }}
    >
      <div className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold uppercase tracking-[0.24em]" style={{ color: '#C4A86B' }}>
              Julius
            </h1>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-white/10 px-2 py-2 backdrop-blur-sm">
          <MonthSelector />
        </div>
      </div>
    </header>
  )
}
