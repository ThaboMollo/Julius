import { format } from 'date-fns'
import { useMonth } from './MonthContext'

export function MonthSelector() {
  const { selectedMonth, goToNextMonth, goToPreviousMonth, goToCurrentMonth } = useMonth()

  const isCurrentMonth = format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goToPreviousMonth}
        className="p-1.5 hover:bg-blue-700 rounded text-lg"
        aria-label="Previous month"
      >
        ‹
      </button>

      <button
        onClick={goToCurrentMonth}
        className="text-sm font-medium min-w-[100px] text-center hover:bg-blue-700 rounded px-2 py-1"
      >
        {format(selectedMonth, 'MMM yyyy')}
      </button>

      <button
        onClick={goToNextMonth}
        className="p-1.5 hover:bg-blue-700 rounded text-lg"
        aria-label="Next month"
      >
        ›
      </button>

      {!isCurrentMonth && (
        <button
          onClick={goToCurrentMonth}
          className="text-xs bg-blue-700 hover:bg-blue-600 rounded px-2 py-1 ml-1"
        >
          Today
        </button>
      )}
    </div>
  )
}
