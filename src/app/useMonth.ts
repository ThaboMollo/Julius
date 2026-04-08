import { useContext } from 'react'
import { MonthContext } from './month-context'

export function useMonth() {
  const context = useContext(MonthContext)
  if (!context) {
    throw new Error('useMonth must be used within a MonthProvider')
  }
  return context
}
