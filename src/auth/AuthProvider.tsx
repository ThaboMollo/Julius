import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { onSupabaseAuthStateChange, supabase } from '../cloud/supabaseClient'
import { ENABLE_AUTH, ENABLE_SUPABASE } from '../config/flags'
import { AuthContext } from './context'
import { LOCAL_USER_ID, setActiveUserId } from './userScope'
import { SyncOrchestrator, getSyncStateForUser, type SyncStatus } from '../sync/SyncOrchestrator'
import { emit } from '../services/observability'
import { useToast } from '../app/Toaster'

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
  const [dataVersion, setDataVersion] = useState(0)

  const toast = useToast()
  const toastRef = useRef(toast)
  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  const runSync = useCallback(async () => {
    if (!user || offlineMode) return
    try {
      setSyncStatus('syncing')
      await orchestrator.runOnLogin(user.id)
      // Set active user scope AFTER migration completes so UI queries see
      // the migrated data on first render.
      setActiveUserId(user.id)
      setDataVersion((v) => v + 1)
      const state = await getSyncStateForUser(user.id)
      setLastSyncAt(state.lastSyncAt)
      setSyncStatus('synced')
    } catch (err) {
      // Even if cloud sync fails, local rows were re-scoped in pass 1 of
      // migrateLocalRowsToUser, so set active user so the UI can see them.
      const message = err instanceof Error ? err.message : String(err)
      emit({ type: 'sync.failure', userId: user.id, stage: 'unknown', message })
      toastRef.current.error("Sync failed — your data is safe locally. We'll retry on the next sync.")
      setActiveUserId(user.id)
      setDataVersion((v) => v + 1)
      setSyncStatus('error')
      throw err // re-throw so manual callers can display the message
    }
  }, [offlineMode, user])

  useEffect(() => {
    if (!ENABLE_AUTH || !ENABLE_SUPABASE) {
      // Auth is fully disabled — always use local scope.
      setActiveUserId(LOCAL_USER_ID)
      return
    }
    if (offlineMode) {
      // Don't reset activeUserId here. After migration, data is scoped to
      // user.id. Resetting to __local__ would make it invisible offline.
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
      // Don't touch activeUserId — migrated data is scoped to user.id and
      // must remain visible when the user goes offline or logs out.
      return
    }

    if (user) {
      // runSync sets activeUserId after migrateLocalRowsToUser completes.
      const timer = window.setTimeout(() => {
        void runSync()
      }, 0)
      return () => window.clearTimeout(timer)
    }

    // user is null (session expired / not logged in). Keep the existing
    // activeUserId so migrated data remains accessible. Only if no real
    // user has ever logged in will this still be __local__.
  }, [offlineMode, runSync, user])

  // Auto-recover from a failed sync when the window regains focus or the
  // browser reports we're back online. The orchestrator's inFlightByUser
  // map dedupes against the on-login sync, so we cannot double-fire.
  const syncStatusRef = useRef(syncStatus)
  useEffect(() => {
    syncStatusRef.current = syncStatus
  }, [syncStatus])

  useEffect(() => {
    if (offlineMode || !user) return

    const tryRetry = () => {
      if (syncStatusRef.current === 'error' || syncStatusRef.current === 'idle') {
        void runSync().catch(() => {
          // already surfaced via toast + observability; swallow here.
        })
      }
    }
    window.addEventListener('focus', tryRetry)
    window.addEventListener('online', tryRetry)
    return () => {
      window.removeEventListener('focus', tryRetry)
      window.removeEventListener('online', tryRetry)
    }
  }, [offlineMode, runSync, user])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!ENABLE_AUTH || !ENABLE_SUPABASE) {
      throw new Error('Auth is disabled by feature flag.')
    }

    localStorage.removeItem(OFFLINE_MODE_KEY)
    setOfflineMode(false)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!ENABLE_AUTH || !ENABLE_SUPABASE) {
      throw new Error('Auth is disabled by feature flag.')
    }

    localStorage.removeItem(OFFLINE_MODE_KEY)
    setOfflineMode(false)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
  }, [])

  const continueOffline = useCallback(() => {
    localStorage.setItem(OFFLINE_MODE_KEY, 'true')
    setOfflineMode(true)
    setSession(null)
    setUser(null)
    setAuthLoading(false)
    // Do NOT reset activeUserId. After first login, data is scoped to user.id.
    // Resetting to __local__ here would make all migrated data invisible offline.
    setSyncStatus('offline')
    setLastSyncAt(null)
  }, [])

  const signOut = useCallback(async () => {
    if (!ENABLE_AUTH || !ENABLE_SUPABASE) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
    continueOffline()
  }, [continueOffline])

  const resetPassword = useCallback(async (email: string) => {
    if (!ENABLE_AUTH || !ENABLE_SUPABASE) {
      throw new Error('Auth is disabled by feature flag.')
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) throw error
  }, [])

  const resumeOnline = useCallback(() => {
    localStorage.removeItem(OFFLINE_MODE_KEY)
    setOfflineMode(false)
    setAuthLoading(true)
    setSyncStatus('idle')
  }, [])

  const loading = ENABLE_AUTH && ENABLE_SUPABASE && !offlineMode ? authLoading : false

  const value = useMemo(
    () => ({
      loading,
      session,
      user,
      offlineMode,
      syncStatus,
      lastSyncAt,
      dataVersion,
      syncNow: runSync,
      signUp,
      signIn,
      resetPassword,
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
      dataVersion,
      runSync,
      signUp,
      signIn,
      resetPassword,
      signOut,
      continueOffline,
      resumeOnline,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
