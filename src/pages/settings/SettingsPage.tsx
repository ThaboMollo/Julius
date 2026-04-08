import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { settingsRepo } from '../../data/local'
import { BankAccountsSection } from './BankAccountsSection'
import type { AppSettings } from '../../domain/models'
import { useTheme } from '../../app/useTheme'
import { ENABLE_AUTH, ENABLE_SUPABASE } from '../../config/flags'
import { useAuth } from '../../auth/useAuth'
import { getOpenAIKey, setOpenAIKey, clearOpenAIKey, testOpenAIKey } from '../../ai/openai'

export function SettingsPage() {
  const { isDark, toggleTheme } = useTheme()
  const { user, offlineMode, signOut, continueOffline, resumeOnline, syncStatus, lastSyncAt, syncNow } = useAuth()
  const [syncMessage, setSyncMessage] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<AppSettings | null>(null)

  // Form states
  const [paydayDay, setPaydayDay] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiKeyTesting, setApiKeyTesting] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState<'none' | 'valid' | 'invalid'>('none')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const sets = await settingsRepo.get()
      setSettings(sets)
      setPaydayDay(sets.paydayDayOfMonth.toString())
      setMonthlyIncome(sets.expectedMonthlyIncome?.toString() || '')
      const existingKey = getOpenAIKey()
      if (existingKey) setApiKey(existingKey)
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    const day = parseInt(paydayDay, 10)
    if (isNaN(day) || day < 1 || day > 31) {
      alert('Payday must be between 1 and 31')
      return
    }

    const income = monthlyIncome ? parseFloat(monthlyIncome) : null
    if (monthlyIncome && (isNaN(income!) || income! < 0)) {
      alert('Please enter a valid income amount')
      return
    }

    await settingsRepo.update({
      paydayDayOfMonth: day,
      expectedMonthlyIncome: income,
    })

    alert('Settings saved!')
    await loadData()
  }

  async function handleManualSync() {
    if (!user) {
      setSyncMessage('Sign in first to run cloud sync.')
      return
    }

    setSyncing(true)
    setSyncMessage('Sync in progress...')
    try {
      await syncNow()
      setSyncMessage('Sync complete.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed.'
      alert(`Sync failed:\n\n${message}`)
      setSyncMessage('')
    } finally {
      setSyncing(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="page-shell page-shell-bottom-nav">
        <div className="vnext-card flex items-center justify-center p-8">
          <div className="vnext-muted">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell page-shell-bottom-nav space-y-5">
      <div className="vnext-card p-5">
        <h1 className="vnext-section-title text-[1.35rem]">Settings</h1>
      </div>

      {ENABLE_AUTH && ENABLE_SUPABASE && (
        <div className="vnext-card p-5 space-y-3">
          <h2 className="vnext-section-title">Account</h2>
          <p className="vnext-muted text-sm">
            {offlineMode
              ? 'Offline mode is active. Local data is still fully available.'
              : user
                ? `Signed in as ${user.email ?? 'your account'}.`
                : 'Not signed in.'}
          </p>
          <p className="vnext-muted text-sm">
            Cloud backup status:{' '}
            {offlineMode
              ? 'Offline'
              : syncStatus === 'syncing'
                ? 'Syncing...'
                : syncStatus === 'synced'
                  ? `Synced ✅${lastSyncAt ? ` (${new Date(lastSyncAt).toLocaleString()})` : ''}`
                  : syncStatus === 'error'
                    ? 'Sync failed — tap Sync now to retry'
                    : 'Idle'}
          </p>
          <div className="flex flex-wrap gap-2">
            {!offlineMode && user && (
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-2xl bg-gray-700 px-4 py-2.5 text-white hover:bg-gray-800"
              >
                Logout
              </button>
            )}
            {!offlineMode ? (
              <button
                type="button"
                onClick={continueOffline}
                className="vnext-button-secondary rounded-2xl px-4 py-2.5"
              >
                Continue offline
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeOnline}
                className="rounded-2xl border border-[#A89060] px-4 py-2.5 text-[#A89060] hover:bg-[#F5EFE2] dark:hover:bg-[#2A2215]"
              >
                Resume online
              </button>
            )}
            {!user && !offlineMode && (
              <Link
                to="/login"
                className="vnext-button-primary rounded-2xl px-4 py-2.5"
              >
                Login
              </Link>
            )}
            {user && !offlineMode && (
              <button
                type="button"
                onClick={() => void handleManualSync()}
                disabled={syncing}
                className="vnext-button-primary rounded-2xl px-4 py-2.5 disabled:opacity-60"
              >
                {syncing ? 'Syncing...' : 'Sync now'}
              </button>
            )}
          </div>
          {syncMessage && <p className="vnext-muted text-xs">{syncMessage}</p>}
        </div>
      )}

      <div className="vnext-card p-5">
        <h2 className="vnext-section-title mb-4">Appearance</h2>
        <div className="flex items-center justify-between py-2">
          <div>
            <label className="font-medium text-[var(--text-primary)]">Dark Mode</label>
            <p className="vnext-muted text-xs">Switch to a darker theme</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              isDark ? 'bg-[#A89060]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                isDark ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>
      </div>

      <div className="vnext-card p-5">
        <h2 className="vnext-section-title mb-4">Budget Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Payday Day of Month
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={paydayDay}
              onChange={(e) => setPaydayDay(e.target.value)}
              className="vnext-input"
            />
            <p className="vnext-muted mt-1 text-xs">
              The day you get paid each month (1-31)
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Expected Monthly Income (ZAR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              className="vnext-input"
              placeholder="Optional"
            />
            <p className="vnext-muted mt-1 text-xs">
              Used for "Remaining until payday" calculation. Leave empty to use budget total.
            </p>
          </div>

          <button
            onClick={saveSettings}
            className="vnext-button-primary w-full rounded-2xl py-3 font-semibold"
          >
            Save Settings
          </button>
        </div>
      </div>

      <Link
        to="/configurations"
        className="vnext-card flex items-center justify-between p-5 transition-colors hover:bg-[var(--surface-secondary)]"
      >
        <div>
          <div className="font-semibold text-[var(--text-primary)]">Configurations</div>
          <div className="vnext-muted text-sm">Budget Groups, Categories, Recurring Templates</div>
        </div>
        <span className="text-gray-400 dark:text-[#8A9BAA] text-lg">›</span>
      </Link>

      <BankAccountsSection />

      <div className="vnext-card p-5">
        <h2 className="vnext-section-title mb-4">AI Check-In</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              OpenAI API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setApiKeyStatus('none') }}
              placeholder="sk-..."
              className="vnext-input text-sm"
            />
            <p className="vnext-muted mt-1 text-xs">
              Your key stays on this device. Only used for mid-month check-ins.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (apiKey.trim()) {
                  setOpenAIKey(apiKey.trim())
                  alert('API key saved!')
                } else {
                  clearOpenAIKey()
                  alert('API key removed.')
                }
              }}
              className="vnext-button-primary rounded-2xl px-4 py-2.5 text-sm font-semibold"
            >
              Save
            </button>
            <button
              type="button"
              disabled={!apiKey.trim() || apiKeyTesting}
              onClick={async () => {
                setApiKeyTesting(true)
                setApiKeyStatus('none')
                const valid = await testOpenAIKey(apiKey.trim())
                setApiKeyStatus(valid ? 'valid' : 'invalid')
                setApiKeyTesting(false)
              }}
              className="rounded-2xl border border-[#A89060] px-4 py-2.5 text-sm font-semibold text-[#A89060] disabled:opacity-50"
            >
              {apiKeyTesting ? 'Testing...' : 'Test'}
            </button>
            {apiKeyStatus === 'valid' && <span className="self-center text-green-500 text-sm">✓ Valid</span>}
            {apiKeyStatus === 'invalid' && <span className="self-center text-red-500 text-sm">✕ Invalid</span>}
          </div>
        </div>
      </div>

    </div>
  )
}
