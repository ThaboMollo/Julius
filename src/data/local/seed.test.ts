import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from './db'
import { seedDefaults, ensureMonthBootstrap } from './seed'
import { setActiveUserId, clearActiveUserId } from '../../auth/userScope'
import { templateRepo } from './TemplateRepo.dexie'
import { budgetMonthRepo } from './BudgetMonthRepo.dexie'

const TEST_USER = 'test-user-1'

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
  ]
  await db.transaction('rw', tables, async () => {
    for (const table of tables) {
      await table.clear()
    }
  })
}

describe('seedDefaults', () => {
  beforeEach(async () => {
    setActiveUserId(TEST_USER)
    await resetDb()
  })

  afterEach(() => {
    clearActiveUserId()
  })

  it('creates V2 default groups (Needs, Wants, Savings, Liabilities) on first run', async () => {
    await seedDefaults()

    const groups = await db.budgetGroups.toArray()
    const userGroups = groups.filter((g) => g.userId === TEST_USER && g.deletedAt === null)
    const names = userGroups.map((g) => g.name).sort()

    expect(names).toContain('Needs')
    expect(names).toContain('Wants')
    expect(names).toContain('Savings')
    expect(names).toContain('Liabilities')
  })

  it('is idempotent: a second call creates no duplicate groups', async () => {
    await seedDefaults()
    const before = (await db.budgetGroups.toArray()).filter(
      (g) => g.userId === TEST_USER && g.deletedAt === null,
    )

    await seedDefaults()
    const after = (await db.budgetGroups.toArray()).filter(
      (g) => g.userId === TEST_USER && g.deletedAt === null,
    )

    expect(after).toHaveLength(before.length)

    const namesBefore = before.map((g) => g.name).sort()
    const namesAfter = after.map((g) => g.name).sort()
    expect(namesAfter).toEqual(namesBefore)
  })

  it('is idempotent: a second call creates no duplicate categories', async () => {
    await seedDefaults()
    const before = (await db.categories.toArray()).filter(
      (c) => c.userId === TEST_USER && c.deletedAt === null,
    )

    await seedDefaults()
    const after = (await db.categories.toArray()).filter(
      (c) => c.userId === TEST_USER && c.deletedAt === null,
    )

    expect(after).toHaveLength(before.length)
  })

  it('renames legacy "Should Die" group to "Wants" on subsequent run', async () => {
    // Pre-seed a legacy V1 setup
    await db.budgetGroups.put({
      id: 'legacy-shoulddie',
      name: 'Should Die',
      userId: TEST_USER,
      sortOrder: 1,
      isDefault: true,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      deletedAt: null,
    })

    await seedDefaults()

    const wantsGroup = (await db.budgetGroups.toArray()).find(
      (g) => g.name === 'Wants' && g.userId === TEST_USER && g.deletedAt === null,
    )
    const shouldDieGroup = (await db.budgetGroups.toArray()).find(
      (g) => g.name === 'Should Die' && g.userId === TEST_USER && g.deletedAt === null,
    )

    expect(wantsGroup).toBeDefined()
    expect(shouldDieGroup).toBeUndefined()
  })

  it('creates Imports as a hidden technical group (not active)', async () => {
    await seedDefaults()
    const importsGroup = (await db.budgetGroups.toArray()).find(
      (g) => g.name === 'Imports' && g.userId === TEST_USER && g.deletedAt === null,
    )
    expect(importsGroup).toBeDefined()
    expect(importsGroup?.isActive).toBe(false)
  })
})

describe('ensureMonthBootstrap recurring generation', () => {
  beforeEach(async () => {
    setActiveUserId(TEST_USER)
    await resetDb()
    await seedDefaults()
  })

  afterEach(() => {
    clearActiveUserId()
  })

  it('generates a budget item from a non-bill template exactly once across multiple bootstraps', async () => {
    const groups = await db.budgetGroups.toArray()
    const needs = groups.find((g) => g.name === 'Needs' && g.userId === TEST_USER)!
    const cats = await db.categories.toArray()
    const someCat = cats.find((c) => c.userId === TEST_USER && c.groupId === needs.id)!

    await templateRepo.create({
      groupId: needs.id,
      categoryId: someCat.id,
      name: 'Recurring savings',
      plannedAmount: 1000,
      multiplier: 1,
      splitRatio: 1,
      isBill: false,
      dueDayOfMonth: null,
      isActive: true,
    })

    const month = await budgetMonthRepo.getOrCreate(2026, 4)

    await ensureMonthBootstrap(month)
    await ensureMonthBootstrap(month)
    await ensureMonthBootstrap(month)

    const items = (await db.budgetItems.toArray()).filter(
      (i) => i.userId === TEST_USER && i.deletedAt === null && i.budgetMonthId === month.id,
    )
    const journal = (await db.recurringGenerationJournal.toArray()).filter(
      (j) => j.userId === TEST_USER && j.deletedAt === null,
    )

    expect(items).toHaveLength(1)
    expect(journal).toHaveLength(1)
    expect(journal[0].outputKind).toBe('budget_item')
  })

  it('generates a commitment from a bill template (default routing for isBill)', async () => {
    const groups = await db.budgetGroups.toArray()
    const needs = groups.find((g) => g.name === 'Needs' && g.userId === TEST_USER)!
    const cats = await db.categories.toArray()
    const someCat = cats.find((c) => c.userId === TEST_USER && c.groupId === needs.id)!

    await templateRepo.create({
      groupId: needs.id,
      categoryId: someCat.id,
      name: 'Rent',
      plannedAmount: 5000,
      multiplier: 1,
      splitRatio: 1,
      isBill: true,
      dueDayOfMonth: 1,
      isActive: true,
      targetKind: 'commitment',
    })

    const month = await budgetMonthRepo.getOrCreate(2026, 4)

    await ensureMonthBootstrap(month)
    await ensureMonthBootstrap(month) // second call must be a no-op

    const commitments = (await db.commitments.toArray()).filter(
      (c) => c.userId === TEST_USER && c.deletedAt === null && c.budgetMonthId === month.id,
    )

    expect(commitments).toHaveLength(1)
    expect(commitments[0].name).toBe('Rent')
    expect(commitments[0].amount).toBe(5000)
    expect(commitments[0].type).toBe('bill')
  })
})
