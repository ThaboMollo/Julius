import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type AuthContextValue = {
  loading: boolean
  session: Session | null
  user: User | null
  offlineMode: boolean
  syncStatus: 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
  lastSyncAt: string | null
  /** Increments each time the active user scope is established after login.
   *  Consumers can use this as a `key` or `useEffect` dep to re-fetch data. */
  dataVersion: number
  syncNow: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
  continueOffline: () => void
  resumeOnline: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
