function envFlag(name: string, fallback: boolean): boolean {
  const raw = import.meta.env[name]
  if (typeof raw !== 'string') return fallback
  const value = raw.trim().toLowerCase()
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

export const ENABLE_AUTH = envFlag('VITE_ENABLE_AUTH', true)
export const ENABLE_SUPABASE = envFlag('VITE_ENABLE_SUPABASE', true)
export const ENABLE_MIGRATION = envFlag('VITE_ENABLE_MIGRATION', true)
export const ENABLE_SYNC = envFlag('VITE_ENABLE_SYNC', false)
export const ENABLE_ENCRYPTION = envFlag('VITE_ENABLE_ENCRYPTION', false)
