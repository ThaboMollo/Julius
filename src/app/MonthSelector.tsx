import { format } from 'date-fns'
import { useMonth } from './MonthContext'

export function MonthSelector() {
  const { selectedMonth, goToNextMonth, goToPreviousMonth, goToCurrentMonth } = useMonth()

  const isCurrentMonth = format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goToPreviousMonth}
        className="p-1.5 hover:bg-white/10 rounded text-lg text-white"
        aria-label="Previous month"
      >
        ‹
      </button>

      <button
        onClick={goToCurrentMonth}
        className="text-sm font-medium min-w-[100px] text-center hover:bg-white/10 rounded px-2 py-1 text-white"
      >
        {format(selectedMonth, 'MMM yyyy')}
      </button>

      <button
        onClick={goToNextMonth}
        className="p-1.5 hover:bg-white/10 rounded text-lg text-white"
        aria-label="Next month"
      >
        ›
      </button>

      {!isCurrentMonth && (
        <button
          onClick={goToCurrentMonth}
          className="text-xs bg-[#A89060] hover:bg-[#C4A86B] text-white rounded px-2 py-1 ml-1"
        >
          Today
        </button>
      )}
    </div>
  )
}
