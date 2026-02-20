import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Layout } from './app/Layout'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { BudgetPage } from './pages/budget/BudgetPage'
import { BillsPage } from './pages/bills/BillsPage'
import { TimelinePage } from './pages/timeline/TimelinePage'
import { TransactionsPage } from './pages/transactions/TransactionsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { AnalyticsPage } from './pages/analytics/AnalyticsPage'
import { PlannerPage } from './pages/planner/PlannerPage'
import { MonthProvider } from './app/MonthContext'
import { seedDefaults } from './data/local/seed'

function App() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    seedDefaults().then(() => setIsReady(true))
  }, [])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <MonthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="bills" element={<BillsPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="planner" element={<PlannerPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </MonthProvider>
  )
}

export default App
