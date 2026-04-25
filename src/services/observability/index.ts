const RING_KEY = 'julius-event-log'
const RING_SIZE = 50

export type ObservabilityEvent =
  | { type: 'sync.start'; userId: string }
  | { type: 'sync.success'; userId: string; durationMs: number }
  | { type: 'sync.failure'; userId: string; stage: 'pull' | 'push' | 'migrate' | 'dedup' | 'unknown'; message: string }
  | { type: 'sync.retry'; userId: string; attempt: number; nextDelayMs: number }
  | { type: 'sync.dead-letter'; userId: string; table: string; rowId: string; reason: string }
  | { type: 'render.error'; componentStack: string; message: string }
  | { type: 'parser.failure'; bank: string; filename: string; message: string }
  | { type: 'ai.failure'; stage: string; message: string }
  | { type: 'storage.quota'; operation: string; message: string }

export interface RecordedEvent extends Record<string, unknown> {
  type: ObservabilityEvent['type']
  at: string
}

function readRing(): RecordedEvent[] {
  try {
    const raw = localStorage.getItem(RING_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RecordedEvent[]) : []
  } catch {
    return []
  }
}

function writeRing(events: RecordedEvent[]): void {
  try {
    const trimmed = events.slice(-RING_SIZE)
    localStorage.setItem(RING_KEY, JSON.stringify(trimmed))
  } catch {
    // localStorage full or unavailable — drop on the floor; never throw from
    // observability code, that would defeat the purpose.
  }
}

export function emit(event: ObservabilityEvent): void {
  const record: RecordedEvent = {
    ...event,
    at: new Date().toISOString(),
  }

  const ring = readRing()
  ring.push(record)
  writeRing(ring)

  if (import.meta.env.DEV) {
    console.warn(`[julius:obs] ${event.type}`, event)
  }
}

export function getRecentEvents(): RecordedEvent[] {
  return readRing()
}

export function clearRecentEvents(): void {
  try {
    localStorage.removeItem(RING_KEY)
  } catch {
    // ignore
  }
}
