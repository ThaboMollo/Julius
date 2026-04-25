import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock supabase BEFORE importing SyncOrchestrator. The test rewrites the
// implementation per-case via supabaseFromMock.
const supabaseFromMock = vi.fn()
vi.mock('../cloud/supabaseClient', () => ({
  supabase: {
    from: (table: string) => supabaseFromMock(table),
  },
  onSupabaseAuthStateChange: () => () => {},
}))

import { SyncOrchestrator } from './SyncOrchestrator'
import { db } from '../data/local'
import { setActiveUserId, clearActiveUserId } from '../auth/userScope'

const TEST_USER = 'test-user-sync'

async function resetDb(): Promise<void> {
  const tables = [
    db.budgetGroups,
    db.categories,
    db.budgetMonths,
    db.budgetItems,
    db.transactions,
    db.commitments,
    db.billTicks,
    db.recurringTemplates,
    db.recurringGenerationJournal,
    db.appSettings,
    db.purchaseScenarios,
    db.scenarioExpenses,
    db.bankConfigs,
    db.statementUploads,
    db.syncStateLocal,
  ]
  await db.transaction('rw', tables, async () => {
    for (const table of tables) {
      await table.clear()
    }
  })
}

interface PullableQuery {
  select: () => PullableQuery
  eq: () => PullableQuery
  gt: () => PullableQuery
  then: (resolve: (value: { data: unknown[]; error: null }) => void) => Promise<void>
  upsert: (payload: unknown[]) => Promise<{ error: null }>
}

function makeChain(rowsByTable: Record<string, unknown[]>, table: string): PullableQuery {
  const rows = rowsByTable[table] ?? []
  const chain: PullableQuery = {
    select: () => chain,
    eq: () => chain,
    gt: () => chain,
    // Awaiting the chain resolves to {data, error}. Vitest awaits this.
    then: (resolve) => Promise.resolve().then(() => resolve({ data: rows, error: null })),
    upsert: () => Promise.resolve({ error: null }),
  }
  return chain
}

describe('SyncOrchestrator pull watermark', () => {
  beforeEach(async () => {
    setActiveUserId(TEST_USER)
    await resetDb()
    supabaseFromMock.mockReset()
  })

  afterEach(() => {
    clearActiveUserId()
  })

  it('advances lastPullAt to max(updated_at) of pulled rows, not pre-pull nowIso', async () => {
    const rowsByTable: Record<string, unknown[]> = {
      budget_groups: [
        {
          id: 'g1',
          user_id: TEST_USER,
          created_at: '2026-04-20T10:00:00.000Z',
          updated_at: '2026-04-20T10:00:00.000Z',
          deleted_at: null,
          name: 'Needs',
          sort_order: 1,
          is_default: true,
          is_active: true,
        },
        {
          id: 'g2',
          user_id: TEST_USER,
          created_at: '2026-04-22T15:30:00.000Z',
          updated_at: '2026-04-22T15:30:00.000Z',
          deleted_at: null,
          name: 'Wants',
          sort_order: 2,
          is_default: true,
          is_active: true,
        },
      ],
    }

    supabaseFromMock.mockImplementation((table: string) => makeChain(rowsByTable, table))

    const orchestrator = new SyncOrchestrator()
    await orchestrator.runOnLogin(TEST_USER)

    const state = await db.syncStateLocal.get(TEST_USER)
    expect(state).toBeDefined()
    // Watermark must be the max updated_at of pulled rows, NOT nowIso() taken
    // before the pull. This proves the race-condition fix: a row updated
    // server-side at exactly pre-pull time would otherwise be missed.
    expect(state?.lastPullAt).toBe('2026-04-22T15:30:00.000Z')
  })

  it('leaves lastPullAt null when no rows are pulled', async () => {
    supabaseFromMock.mockImplementation((table: string) => makeChain({}, table))

    const orchestrator = new SyncOrchestrator()
    await orchestrator.runOnLogin(TEST_USER)

    const state = await db.syncStateLocal.get(TEST_USER)
    expect(state?.lastPullAt).toBeNull()
  })

  it('writes pulled rows to local Dexie tables', async () => {
    const rowsByTable: Record<string, unknown[]> = {
      budget_groups: [
        {
          id: 'g1',
          user_id: TEST_USER,
          created_at: '2026-04-20T10:00:00.000Z',
          updated_at: '2026-04-20T10:00:00.000Z',
          deleted_at: null,
          name: 'Imported',
          sort_order: 5,
          is_default: false,
          is_active: true,
        },
      ],
    }
    supabaseFromMock.mockImplementation((table: string) => makeChain(rowsByTable, table))

    const orchestrator = new SyncOrchestrator()
    await orchestrator.runOnLogin(TEST_USER)

    const groups = (await db.budgetGroups.toArray()).filter((g) => g.userId === TEST_USER)
    expect(groups.find((g) => g.id === 'g1')?.name).toBe('Imported')
  })
})

describe('SyncOrchestrator deduplicates concurrent runs per user', () => {
  beforeEach(async () => {
    setActiveUserId(TEST_USER)
    await resetDb()
    supabaseFromMock.mockReset()
  })

  afterEach(() => {
    clearActiveUserId()
  })

  it('two concurrent runOnLogin calls for the same user only execute once', async () => {
    let pullCount = 0
    supabaseFromMock.mockImplementation((table: string) => {
      const rowsByTable: Record<string, unknown[]> = {}
      if (table === 'budget_groups') pullCount += 1
      return makeChain(rowsByTable, table)
    })

    const orchestrator = new SyncOrchestrator()
    await Promise.all([
      orchestrator.runOnLogin(TEST_USER),
      orchestrator.runOnLogin(TEST_USER),
    ])

    // budget_groups is the first table in TABLE_ORDER. The dedup check means
    // both Promises share the same in-flight execution, so the table is only
    // queried once.
    expect(pullCount).toBe(1)
  })
})
