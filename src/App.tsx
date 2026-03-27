import { Routes, Route, Navigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { Layout } from './app/Layout'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { BudgetPage } from './pages/budget/BudgetPage'
import { CommitmentsPage } from './pages/bills/BillsPage'
import { TimelinePage } from './pages/timeline/TimelinePage'
import { TransactionsPage } from './pages/transactions/TransactionsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { ConfigurationsPage } from './pages/settings/ConfigurationsPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { AnalyticsPage } from './pages/analytics/AnalyticsPage'
import { PlannerPage } from './pages/planner/PlannerPage'
import { CheckInPage } from './pages/check-in/CheckInPage'
import { MonthProvider } from './app/MonthContext'
import { SplashScreen } from './app/SplashScreen'
import { seedDefaults } from './data/local/seed'
import { initializeLocalData } from './data/local/migrations'

function App() {
  const [dbReady, setDbReady] = useState(false)
  const [splashDone, setSplashDone] = useState(false)
  const [globalError, setGlobalError] = useState('')

  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      setGlobalError(`${e.message}\n${e.filename}:${e.lineno}:${e.colno}`)
    }
    const rejectionHandler = (e: PromiseRejectionEvent) => {
      const msg = e.reason instanceof Error ? `${e.reason.message}\n${e.reason.stack?.split('\n').slice(0, 3).join('\n')}` : String(e.reason)
      setGlobalError(msg)
    }
    window.addEventListener('error', handler)
    window.addEventListener('unhandledrejection', rejectionHandler)
    return () => {
      window.removeEventListener('error', handler)
      window.removeEventListener('unhandledrejection', rejectionHandler)
    }
  }, [])

  useEffect(() => {
    seedDefaults()
      .then(() => initializeLocalData())
      .then(() => setDbReady(true))
  }, [])

  const handleSplashDone = useCallback(() => setSplashDone(true), [])

  if (!splashDone || !dbReady) {
    return <SplashScreen onDone={handleSplashDone} />
  }

  return (
    <MonthProvider>
      {globalError && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999, background: '#fee', padding: '12px', fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: '40vh', overflow: 'auto', borderTop: '2px solid red' }}>
          <strong>Error:</strong> {globalError}
          <button onClick={() => setGlobalError('')} style={{ float: 'right', padding: '4px 8px' }}>Dismiss</button>
        </div>
      )}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="bills" element={<Navigate to="/commitments" replace />} />
          <Route path="commitments" element={<CommitmentsPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="planner" element={<PlannerPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="configurations" element={<ConfigurationsPage />} />
          <Route path="check-in" element={<CheckInPage />} />
        </Route>
      </Routes>
    </MonthProvider>
  )
}

export default App
