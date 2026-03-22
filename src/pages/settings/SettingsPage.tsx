import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { settingsRepo } from '../../data/local'
import { BankAccountsSection } from './BankAccountsSection'
import type { AppSettings } from '../../domain/models'
import { useTheme } from '../../app/ThemeContext'
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
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-[#8A9BAA]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 dark:text-[#F0EDE4]">Settings</h1>

      {ENABLE_AUTH && ENABLE_SUPABASE && (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4]">Account</h2>
          <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">
            {offlineMode
              ? 'Offline mode is active. Local data is still fully available.'
              : user
                ? `Signed in as ${user.email ?? 'your account'}.`
                : 'Not signed in.'}
          </p>
          <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">
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
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
              >
                Logout
              </button>
            )}
            {!offlineMode ? (
              <button
                type="button"
                onClick={continueOffline}
                className="px-3 py-2 bg-gray-200 dark:bg-[#1E2330] text-gray-800 dark:text-[#F0EDE4] rounded-lg"
              >
                Continue offline
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeOnline}
                className="px-3 py-2 border border-[#A89060] text-[#A89060] rounded-lg hover:bg-[#F5EFE2]"
              >
                Resume online
              </button>
            )}
            {!user && !offlineMode && (
              <Link
                to="/login"
                className="px-3 py-2 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550]"
              >
                Login
              </Link>
            )}
            {user && !offlineMode && (
              <button
                type="button"
                onClick={() => void handleManualSync()}
                disabled={syncing}
                className="px-3 py-2 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550] disabled:opacity-60"
              >
                {syncing ? 'Syncing...' : 'Sync now'}
              </button>
            )}
          </div>
          {syncMessage && <p className="text-xs text-gray-500 dark:text-[#8A9BAA]">{syncMessage}</p>}
        </div>
      )}

      {/* Appearance */}
      <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4] mb-4">Appearance</h2>
        <div className="flex items-center justify-between py-2">
          <div>
            <label className="font-medium text-gray-700 dark:text-[#F0EDE4]">Dark Mode</label>
            <p className="text-xs text-gray-500 dark:text-[#8A9BAA]">Switch to a darker theme</p>
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

      {/* App Settings */}
      <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4] mb-4">Budget Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">
              Payday Day of Month
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={paydayDay}
              onChange={(e) => setPaydayDay(e.target.value)}
              className="w-full px-3 py-2 border dark:border-[#2E3A4E] rounded-lg bg-white dark:bg-[#1E2330] text-gray-800 dark:text-[#F0EDE4] focus:ring-2 focus:ring-[#A89060]"
            />
            <p className="text-xs text-gray-500 dark:text-[#8A9BAA] mt-1">
              The day you get paid each month (1-31)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">
              Expected Monthly Income (ZAR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              className="w-full px-3 py-2 border dark:border-[#2E3A4E] rounded-lg bg-white dark:bg-[#1E2330] text-gray-800 dark:text-[#F0EDE4] focus:ring-2 focus:ring-[#A89060]"
              placeholder="Optional"
            />
            <p className="text-xs text-gray-500 dark:text-[#8A9BAA] mt-1">
              Used for "Remaining until payday" calculation. Leave empty to use budget total.
            </p>
          </div>

          <button
            onClick={saveSettings}
            className="w-full py-2 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550]"
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Configurations */}
      <Link
        to="/configurations"
        className="bg-white dark:bg-[#252D3D] rounded-xl shadow p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#2E3A4E] transition-colors"
      >
        <div>
          <div className="font-semibold text-gray-800 dark:text-[#F0EDE4]">Configurations</div>
          <div className="text-sm text-gray-500 dark:text-[#8A9BAA]">Budget Groups, Categories, Recurring Templates</div>
        </div>
        <span className="text-gray-400 dark:text-[#8A9BAA] text-lg">›</span>
      </Link>

      {/* Bank Accounts */}
      <BankAccountsSection />

      {/* AI Check-In */}
      <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4] mb-4">AI Check-In</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">
              OpenAI API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setApiKeyStatus('none') }}
              placeholder="sk-..."
              className="w-full px-3 py-2 border dark:border-[#2E3A4E] rounded-lg bg-white dark:bg-[#1E2330] text-gray-800 dark:text-[#F0EDE4] focus:ring-2 focus:ring-[#A89060] text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-[#8A9BAA] mt-1">
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
              className="px-3 py-2 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550] text-sm"
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
              className="px-3 py-2 border border-[#A89060] text-[#A89060] rounded-lg text-sm disabled:opacity-50"
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
