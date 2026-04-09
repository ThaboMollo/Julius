import { format } from 'date-fns'
import { useMonth } from './useMonth'

export function MonthSelector() {
  const { selectedMonth, goToNextMonth, goToPreviousMonth, goToCurrentMonth } = useMonth()

  const isCurrentMonth = format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  return (
    <div className="flex items-center justify-end gap-1 text-white">
      <button
        onClick={goToPreviousMonth}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
        aria-label="Previous month"
      >
        ‹
      </button>

      <button
        onClick={goToCurrentMonth}
        className="min-w-[92px] rounded-full px-2.5 py-1.5 text-center text-sm font-medium whitespace-nowrap hover:bg-white/10"
      >
        {format(selectedMonth, 'MMM yyyy')}
      </button>

      <button
        onClick={goToNextMonth}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
        aria-label="Next month"
      >
        ›
      </button>

      {!isCurrentMonth && (
        <button
          onClick={goToCurrentMonth}
          className="ml-1 shrink-0 rounded-full bg-[#A89060] px-2.5 py-1 text-xs text-white hover:bg-[#C4A86B]"
        >
          Today
        </button>
      )}
    </div>
  )
}
