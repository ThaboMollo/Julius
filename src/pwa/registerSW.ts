import { registerSW } from 'virtual:pwa-register'

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const updateSW = registerSW({
      onNeedRefresh() {
        if (confirm('New content available. Reload?')) {
          updateSW(true)
        }
      },
    })
  }
}
