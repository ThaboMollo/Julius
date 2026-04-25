import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type ToastKind = 'info' | 'success' | 'error'

export interface Toast {
  id: string
  kind: ToastKind
  message: string
}

interface ToastApi {
  toasts: Toast[]
  push: (kind: ToastKind, message: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const DEFAULT_DURATION_MS = 5000

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts((current) => [...current, { id, kind, message }])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), DEFAULT_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [toast.id, onDismiss])

  const tone =
    toast.kind === 'error'
      ? 'border-red-500/60 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100'
      : toast.kind === 'success'
        ? 'border-green-500/60 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100'
        : 'border-zinc-300 bg-white text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 text-sm shadow-lg ${tone}`}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="text-xs opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </div>
  )
}

export function useToast(): { info: (m: string) => void; success: (m: string) => void; error: (m: string) => void } {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside <ToasterProvider>')
  }
  return {
    info: (message: string) => ctx.push('info', message),
    success: (message: string) => ctx.push('success', message),
    error: (message: string) => ctx.push('error', message),
  }
}
