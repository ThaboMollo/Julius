import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { onSupabaseAuthStateChange, supabase } from '../cloud/supabaseClient'
import { ENABLE_AUTH, ENABLE_SUPABASE } from '../config/flags'
import { AuthContext } from './context'
import { clearActiveUserId, LOCAL_USER_ID, setActiveUserId } from './userScope'
import { SyncOrchestrator, getSyncStateForUser, type SyncStatus } from '../sync/SyncOrchestrator'

const OFFLINE_MODE_KEY = 'julius-offline-mode'
const orchestrator = new SyncOrchestrator()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authLoading, setAuthLoading] = useState(() => {
    return ENABLE_AUTH && ENABLE_SUPABASE && localStorage.getItem(OFFLINE_MODE_KEY) !== 'true'
  })
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [offlineMode, setOfflineMode] = useState(() => {
    return localStorage.getItem(OFFLINE_MODE_KEY) === 'true'
  })
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(offlineMode ? 'offline' : 'idle')
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)

  const runSync = useCallback(async () => {
    if (!user || offlineMode) return
    try {
      setSyncStatus('syncing')
      await orchestrator.runOnLogin(user.id, session)
      const state = await getSyncStateForUser(user.id)
      setLastSyncAt(state.lastSyncAt)
      setSyncStatus('synced')
    } catch {
      setSyncStatus('error')
    }
  }, [offlineMode, session, user])

  useEffect(() => {
    if (!ENABLE_AUTH || !ENABLE_SUPABASE || offlineMode) {
      setActiveUserId(LOCAL_USER_ID)
      return
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    })

    const unsubscribe = onSupabaseAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setAuthLoading(false)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [offlineMode])

  useEffect(() => {
    if (offlineMode) {
      setActiveUserId(LOCAL_USER_ID)
      return
    }

    if (user) {
      setActiveUserId(user.id)
      void runSync()
      return
    }

    clearActiveUserId()
  }, [offlineMode, runSync, user])

  async function signInWithOtp(email: string) {
    if (!ENABLE_AUTH || !ENABLE_SUPABASE) {
      throw new Error('Auth is disabled by feature flag.')
    }

    localStorage.removeItem(OFFLINE_MODE_KEY)
    setOfflineMode(false)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) throw error
  }

  async function signOut() {
    if (!ENABLE_AUTH || !ENABLE_SUPABASE) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
    continueOffline()
  }

  function continueOffline() {
    localStorage.setItem(OFFLINE_MODE_KEY, 'true')
    setOfflineMode(true)
    setSession(null)
    setUser(null)
    setAuthLoading(false)
    setActiveUserId(LOCAL_USER_ID)
    setSyncStatus('offline')
    setLastSyncAt(null)
  }

  function resumeOnline() {
    localStorage.removeItem(OFFLINE_MODE_KEY)
    setOfflineMode(false)
    setAuthLoading(true)
    setSyncStatus('idle')
  }

  const loading = ENABLE_AUTH && ENABLE_SUPABASE && !offlineMode ? authLoading : false

  const value = useMemo(
    () => ({
      loading,
      session,
      user,
      offlineMode,
      syncStatus,
      lastSyncAt,
      syncNow: runSync,
      signInWithOtp,
      signOut,
      continueOffline,
      resumeOnline,
    }),
    [
      loading,
      session,
      user,
      offlineMode,
      syncStatus,
      lastSyncAt,
      runSync,
      signInWithOtp,
      signOut,
      continueOffline,
      resumeOnline,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
