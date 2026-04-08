import { createContext } from 'react'

export interface MonthContextType {
  selectedMonth: Date
  monthKey: string
  setSelectedMonth: (date: Date) => void
  goToNextMonth: () => void
  goToPreviousMonth: () => void
  goToCurrentMonth: () => void
}

export const MonthContext = createContext<MonthContextType | null>(null)
