import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { ENABLE_AUTH, ENABLE_SUPABASE } from '../../config/flags'

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading, offlineMode, signInWithOtp, continueOffline, resumeOnline } = useAuth()

  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const redirectPath = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  if (!ENABLE_AUTH || !ENABLE_SUPABASE) {
    return <Navigate to="/dashboard" replace />
  }

  if (user && !offlineMode && !loading) {
    return <Navigate to={redirectPath} replace />
  }

  async function submitOtp() {
    if (!email.trim()) {
      setMessage('Enter your email address first.')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      await signInWithOtp(email.trim())
      setMessage('Magic link sent. Open your email and return to the app.')
    } catch (error) {
      const next = error instanceof Error ? error.message : 'Could not send login email.'
      setMessage(next)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#1E2330] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#252D3D] rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-800 dark:text-[#F0EDE4]">Sign in to cloud</h1>
        <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">
          Use email OTP for cloud backup and sync. You can continue offline without signing in.
        </p>

        <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4]">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1E2330] dark:border-[#2E3A4E] text-gray-800 dark:text-[#F0EDE4]"
          placeholder="you@example.com"
        />

        <button
          type="button"
          onClick={() => void submitOtp()}
          disabled={submitting}
          className="w-full py-2 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550] disabled:opacity-60"
        >
          {submitting ? 'Sending...' : 'Send OTP'}
        </button>

        <button
          type="button"
          onClick={() => {
            continueOffline()
            navigate('/dashboard', { replace: true })
          }}
          className="w-full py-2 bg-gray-200 dark:bg-[#1E2330] text-gray-800 dark:text-[#F0EDE4] rounded-lg"
        >
          Continue offline without login
        </button>

        {offlineMode && (
          <button
            type="button"
            onClick={resumeOnline}
            className="w-full py-2 border border-[#A89060] text-[#A89060] rounded-lg hover:bg-[#F5EFE2]"
          >
            Resume online mode
          </button>
        )}

        <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">{message}</p>

        <div className="text-sm">
          <Link to="/dashboard" className="text-[#A89060] hover:underline">
            Back to app
          </Link>
        </div>
      </div>
    </div>
  )
}
