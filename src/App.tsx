import { Routes, Route, Navigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
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
import { SplashScreen } from './app/SplashScreen'
import { seedDefaults } from './data/local/seed'

function App() {
  const [dbReady, setDbReady] = useState(false)
  const [splashDone, setSplashDone] = useState(false)

  useEffect(() => {
    seedDefaults().then(() => setDbReady(true))
  }, [])

  const handleSplashDone = useCallback(() => setSplashDone(true), [])

  if (!splashDone || !dbReady) {
    return <SplashScreen onDone={handleSplashDone} />
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
