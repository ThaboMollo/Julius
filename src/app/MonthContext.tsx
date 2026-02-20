import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { format, startOfMonth, addMonths, subMonths } from 'date-fns'

interface MonthContextType {
  selectedMonth: Date
  monthKey: string
  setSelectedMonth: (date: Date) => void
  goToNextMonth: () => void
  goToPreviousMonth: () => void
  goToCurrentMonth: () => void
}

const MonthContext = createContext<MonthContextType | null>(null)

const STORAGE_KEY = 'julius_selected_month'

export function MonthProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonthState] = useState<Date>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = new Date(stored)
      if (!isNaN(parsed.getTime())) {
        return startOfMonth(parsed)
      }
    }
    return startOfMonth(new Date())
  })

  const monthKey = format(selectedMonth, 'yyyy-MM')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedMonth.toISOString())
  }, [selectedMonth])

  const setSelectedMonth = (date: Date) => {
    setSelectedMonthState(startOfMonth(date))
  }

  const goToNextMonth = () => {
    setSelectedMonthState((prev) => addMonths(prev, 1))
  }

  const goToPreviousMonth = () => {
    setSelectedMonthState((prev) => subMonths(prev, 1))
  }

  const goToCurrentMonth = () => {
    setSelectedMonthState(startOfMonth(new Date()))
  }

  return (
    <MonthContext.Provider
      value={{
        selectedMonth,
        monthKey,
        setSelectedMonth,
        goToNextMonth,
        goToPreviousMonth,
        goToCurrentMonth,
      }}
    >
      {children}
    </MonthContext.Provider>
  )
}

export function useMonth() {
  const context = useContext(MonthContext)
  if (!context) {
    throw new Error('useMonth must be used within a MonthProvider')
  }
  return context
}
