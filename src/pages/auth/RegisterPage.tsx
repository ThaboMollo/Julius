import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { ENABLE_AUTH, ENABLE_SUPABASE } from '../../config/flags'

export function RegisterPage() {
  const navigate = useNavigate()
  const { user, offlineMode, signUp } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!ENABLE_AUTH || !ENABLE_SUPABASE) {
    return <Navigate to="/dashboard" replace />
  }

  if (user && !offlineMode) {
    return <Navigate to="/dashboard" replace />
  }

  async function submitRegister() {
    if (!email.trim()) {
      setMessage('Enter your email address.')
      return
    }
    if (!password) {
      setMessage('Enter a password.')
      return
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      await signUp(email.trim(), password)
      setMessage('Account created. If email confirmation is enabled, check your inbox before logging in.')
      setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (error) {
      const next = error instanceof Error ? error.message : 'Could not create account.'
      setMessage(next)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#1E2330] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#252D3D] rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-800 dark:text-[#F0EDE4]">Register</h1>
        <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">
          Create an account to enable cloud backup and cross-device sync.
        </p>

        <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4]">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1E2330] dark:border-[#2E3A4E] text-gray-800 dark:text-[#F0EDE4]"
          placeholder="you@example.com"
        />

        <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4]">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1E2330] dark:border-[#2E3A4E] text-gray-800 dark:text-[#F0EDE4]"
          placeholder="At least 6 characters"
        />

        <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4]">Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1E2330] dark:border-[#2E3A4E] text-gray-800 dark:text-[#F0EDE4]"
          placeholder="Re-enter password"
        />

        <button
          type="button"
          onClick={() => void submitRegister()}
          disabled={submitting}
          className="w-full py-2 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550] disabled:opacity-60"
        >
          {submitting ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">{message}</p>

        <div className="text-sm">
          <Link to="/login" className="text-[#A89060] hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
