import { format } from 'date-fns'
import { useMonth } from './useMonth'

export function MonthSelector() {
  const { selectedMonth, goToNextMonth, goToPreviousMonth, goToCurrentMonth } = useMonth()

  const isCurrentMonth = format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  return (
    <div className="flex items-center gap-1.5 text-white">
      <button
        onClick={goToPreviousMonth}
        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
        aria-label="Previous month"
      >
        ‹
      </button>

      <button
        onClick={goToCurrentMonth}
        className="min-w-[104px] rounded-full px-3 py-2 text-center text-sm font-medium hover:bg-white/10"
      >
        {format(selectedMonth, 'MMM yyyy')}
      </button>

      <button
        onClick={goToNextMonth}
        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
        aria-label="Next month"
      >
        ›
      </button>

      {!isCurrentMonth && (
        <button
          onClick={goToCurrentMonth}
          className="ml-1 rounded-full bg-[#A89060] px-2.5 py-1 text-xs text-white hover:bg-[#C4A86B]"
        >
          Today
        </button>
      )}
    </div>
  )
}
