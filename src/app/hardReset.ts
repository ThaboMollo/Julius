import { supabase } from '../cloud/supabaseClient'
import { db } from '../data/local/db'

export async function hardResetApp(): Promise<void> {
  try {
    await supabase.auth.signOut()
  } catch {
    // Continue with local reset even if remote sign-out fails.
  }

  await db.close()
  await db.delete()

  localStorage.clear()
  sessionStorage.clear()

  if ('caches' in window) {
    const cacheKeys = await caches.keys()
    await Promise.all(cacheKeys.map((key) => caches.delete(key)))
  }
}
