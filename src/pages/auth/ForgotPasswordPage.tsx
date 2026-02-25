import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { ENABLE_AUTH, ENABLE_SUPABASE } from '../../config/flags'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!ENABLE_AUTH || !ENABLE_SUPABASE) {
    return <Navigate to="/dashboard" replace />
  }

  async function submitReset() {
    if (!email.trim()) {
      setMessage('Enter your email address.')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      await resetPassword(email.trim())
      setMessage('Password reset email sent. Check your inbox.')
    } catch (error) {
      const next = error instanceof Error ? error.message : 'Could not send password reset email.'
      setMessage(next)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#1E2330] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#252D3D] rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-800 dark:text-[#F0EDE4]">Forgot Password</h1>
        <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">
          Enter your account email to receive a password reset link.
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
          onClick={() => void submitReset()}
          disabled={submitting}
          className="w-full py-2 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550] disabled:opacity-60"
        >
          {submitting ? 'Sending...' : 'Send Reset Email'}
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
