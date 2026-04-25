import { Component, type ErrorInfo, type ReactNode } from 'react'
import { emit } from '../services/observability'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    emit({
      type: 'render.error',
      componentStack: info.componentStack ?? '',
      message: error.message,
    })
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback({ error, reset: this.reset })
      }
      return <DefaultFallback error={error} reset={this.reset} />
    }
    return this.props.children
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }): ReactNode {
  return (
    <div role="alert" className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Something broke</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Julius hit an unexpected error. Your data is safe in your device — only this view crashed.
      </p>
      <details className="w-full rounded-md border border-zinc-300 bg-zinc-50 p-2 text-left text-xs dark:border-zinc-700 dark:bg-zinc-900">
        <summary className="cursor-pointer select-none font-mono">{error.name}: {error.message}</summary>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-zinc-500">
          {error.stack ?? ''}
        </pre>
      </details>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Reload app
        </button>
      </div>
    </div>
  )
}
