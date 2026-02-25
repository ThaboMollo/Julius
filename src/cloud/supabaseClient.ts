import { createClient, type AuthChangeEvent, type Session } from '@supabase/supabase-js'
import { ENABLE_SUPABASE } from '../config/flags'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (ENABLE_SUPABASE && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

const clientUrl = supabaseUrl ?? 'http://localhost:54321'
const clientAnonKey = supabaseAnonKey ?? 'placeholder-anon-key'

export const supabase = createClient(clientUrl, clientAnonKey)

export function onSupabaseAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange(callback)
  return () => data.subscription.unsubscribe()
}
