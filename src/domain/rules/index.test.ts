import {
  effectivePlanned,
  totalPlanned,
  totalIncome,
  totalExpenses,
  netCashflow,
  totalActualByCategory,
  unbudgetedSpending,
  categoryOverspend,
  itemOverspend,
  topOverspentCategories,
  getUpcomingCommitments,
  commitmentsProtected,
  savingsProtected,
  discretionaryExpensesRecorded,
  safeToSpend,
  calculateAffordability,
  getPotentialSavings,
} from './index'
import type {
  BudgetGroup,
  BudgetItem,
  Category,
  Commitment,
  Transaction,
} from '../models'

const scoped = {
  userId: 'user-1',
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  deletedAt: null,
}

function makeGroup(overrides: Partial<BudgetGroup> & { name: string }): BudgetGroup {
  return {
    id: `group-${overrides.name}`,
    sortOrder: 0,
    isDefault: true,
    isActive: true,
    ...scoped,
    ...overrides,
  }
}

function makeCategory(overrides: Partial<Category> & { name: string; groupId: string }): Category {
  return {
    id: `cat-${overrides.name}`,
    isDefault: true,
    isActive: true,
    ...scoped,
    ...overrides,
  }
}

function makeItem(overrides: Partial<BudgetItem>): BudgetItem {
  return {
    id: 'item-1',
    budgetMonthId: 'month-1',
    groupId: 'group-Needs',
    categoryId: 'cat-Groceries',
    name: 'Item',
    plannedAmount: 1000,
    multiplier: 1,
    splitRatio: 1,
    isBill: false,
    dueDate: null,
    isFromTemplate: false,
    templateId: null,
    ...scoped,
    ...overrides,
  }
}

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    budgetMonthId: 'month-1',
    categoryId: 'cat-Groceries',
    budgetItemId: null,
    commitmentId: null,
    amount: 100,
    date: new Date('2026-04-15'),
    kind: 'expense',
    source: 'manual',
    merchant: '',
    note: '',
    ...scoped,
    ...overrides,
  }
}

function makeCommitment(overrides: Partial<Commitment>): Commitment {
  return {
    id: 'commit-1',
    budgetMonthId: 'month-1',
    categoryId: 'cat-Groceries',
    name: 'Commitment',
    amount: 500,
    dueDate: new Date('2026-04-15'),
    type: 'bill',
    status: 'upcoming',
    isRecurring: false,
    templateId: null,
    paidTransactionId: null,
    legacyBudgetItemId: null,
    notes: '',
    ...scoped,
    ...overrides,
  }
}

describe('effectivePlanned', () => {
  it('multiplies plannedAmount by multiplier and splitRatio', () => {
    const item = makeItem({ plannedAmount: 1000, multiplier: 2, splitRatio: 0.5 })
    expect(effectivePlanned(item)).toBe(1000)
  })

  it('returns plannedAmount when multiplier and splitRatio are 1', () => {
    const item = makeItem({ plannedAmount: 600, multiplier: 1, splitRatio: 1 })
    expect(effectivePlanned(item)).toBe(600)
  })

  it('handles zero plannedAmount', () => {
    const item = makeItem({ plannedAmount: 0, multiplier: 5, splitRatio: 0.5 })
    expect(effectivePlanned(item)).toBe(0)
  })
})

describe('totalPlanned', () => {
  it('sums effectivePlanned across items', () => {
    const items = [
      makeItem({ id: 'a', plannedAmount: 100 }),
      makeItem({ id: 'b', plannedAmount: 200, multiplier: 2 }),
      makeItem({ id: 'c', plannedAmount: 600, splitRatio: 0.5 }),
    ]
    expect(totalPlanned(items)).toBe(100 + 400 + 300)
  })

  it('returns 0 for empty array', () => {
    expect(totalPlanned([])).toBe(0)
  })
})

describe('totalIncome / totalExpenses / netCashflow', () => {
  it('separates income from expense by kind', () => {
    const txs = [
      makeTx({ id: 't1', kind: 'income', amount: 5000 }),
      makeTx({ id: 't2', kind: 'income', amount: 200 }),
      makeTx({ id: 't3', kind: 'expense', amount: 100 }),
      makeTx({ id: 't4', kind: 'expense', amount: 50 }),
    ]
    expect(totalIncome(txs)).toBe(5200)
    expect(totalExpenses(txs)).toBe(150)
    expect(netCashflow(txs)).toBe(5050)
  })

  it('treats missing kind as expense (legacy data)', () => {
    const txs = [makeTx({ kind: undefined as unknown as Transaction['kind'], amount: 100 })]
    expect(totalExpenses(txs)).toBe(100)
    expect(totalIncome(txs)).toBe(0)
  })
})

describe('totalActualByCategory / categoryOverspend', () => {
  it('sums expenses for a category and detects overspend', () => {
    const items = [
      makeItem({ id: 'i1', categoryId: 'cat-Food', plannedAmount: 200 }),
      makeItem({ id: 'i2', categoryId: 'cat-Food', plannedAmount: 100 }),
    ]
    const txs = [
      makeTx({ id: 't1', categoryId: 'cat-Food', amount: 250 }),
      makeTx({ id: 't2', categoryId: 'cat-Food', amount: 80 }),
      makeTx({ id: 't3', categoryId: 'cat-Other', amount: 999 }),
    ]
    expect(totalActualByCategory(txs, 'cat-Food')).toBe(330)
    expect(categoryOverspend(items, txs, 'cat-Food')).toBe(30)
    expect(categoryOverspend(items, txs, 'cat-Food-empty')).toBe(0)
  })

  it('income transactions do not count toward category actual', () => {
    const txs = [makeTx({ kind: 'income', categoryId: 'cat-Food', amount: 9999 })]
    expect(totalActualByCategory(txs, 'cat-Food')).toBe(0)
  })
})

describe('itemOverspend', () => {
  it('only counts transactions linked to the item', () => {
    const item = makeItem({ id: 'i1', plannedAmount: 100 })
    const txs = [
      makeTx({ id: 't1', budgetItemId: 'i1', amount: 80 }),
      makeTx({ id: 't2', budgetItemId: 'i1', amount: 50 }),
      makeTx({ id: 't3', budgetItemId: 'i2', amount: 999 }),
    ]
    expect(itemOverspend(item, txs)).toBe(30)
  })
})

describe('unbudgetedSpending', () => {
  it('sums expenses with no budgetItemId', () => {
    const txs = [
      makeTx({ id: 't1', budgetItemId: null, amount: 100 }),
      makeTx({ id: 't2', budgetItemId: 'i1', amount: 50 }),
      makeTx({ id: 't3', budgetItemId: null, amount: 25 }),
    ]
    expect(unbudgetedSpending(txs)).toBe(125)
  })
})

describe('topOverspentCategories', () => {
  it('returns categories sorted by overspend descending, limited', () => {
    const cats = [
      makeCategory({ id: 'a', name: 'A', groupId: 'g1' }),
      makeCategory({ id: 'b', name: 'B', groupId: 'g1' }),
      makeCategory({ id: 'c', name: 'C', groupId: 'g1' }),
    ]
    const items = [
      makeItem({ id: 'ia', categoryId: 'a', plannedAmount: 100 }),
      makeItem({ id: 'ib', categoryId: 'b', plannedAmount: 100 }),
      makeItem({ id: 'ic', categoryId: 'c', plannedAmount: 100 }),
    ]
    const txs = [
      makeTx({ id: 't1', categoryId: 'a', amount: 150 }),
      makeTx({ id: 't2', categoryId: 'b', amount: 250 }),
      makeTx({ id: 't3', categoryId: 'c', amount: 110 }),
    ]
    const top = topOverspentCategories(items, txs, cats, 2)
    expect(top).toHaveLength(2)
    expect(top[0].category.id).toBe('b')
    expect(top[0].overspend).toBe(150)
    expect(top[1].category.id).toBe('a')
    expect(top[1].overspend).toBe(50)
  })
})

describe('getUpcomingCommitments', () => {
  it('filters out paid commitments and sorts by dueDate ascending', () => {
    const commitments = [
      makeCommitment({ id: 'c1', dueDate: new Date('2026-04-20'), status: 'upcoming' }),
      makeCommitment({ id: 'c2', dueDate: new Date('2026-04-10'), status: 'paid' }),
      makeCommitment({ id: 'c3', dueDate: new Date('2026-04-15'), status: 'upcoming' }),
      makeCommitment({ id: 'c4', dueDate: null, status: 'upcoming' }),
    ]
    const result = getUpcomingCommitments(commitments)
    expect(result.map((c) => c.id)).toEqual(['c3', 'c1', 'c4'])
  })

  it('respects limit', () => {
    const commitments = Array.from({ length: 10 }, (_, i) =>
      makeCommitment({ id: `c${i}`, dueDate: new Date(`2026-04-${(i + 1).toString().padStart(2, '0')}`) }),
    )
    expect(getUpcomingCommitments(commitments, 3)).toHaveLength(3)
  })
})

describe('commitmentsProtected', () => {
  const groups = [
    makeGroup({ id: 'g-needs', name: 'Needs' }),
    makeGroup({ id: 'g-wants', name: 'Wants' }),
    makeGroup({ id: 'g-savings', name: 'Savings' }),
    makeGroup({ id: 'g-liab', name: 'Liabilities' }),
  ]
  const cats = [
    makeCategory({ id: 'c-rent', name: 'Rent', groupId: 'g-needs' }),
    makeCategory({ id: 'c-fun', name: 'Fun', groupId: 'g-wants' }),
    makeCategory({ id: 'c-loan', name: 'Loan', groupId: 'g-liab' }),
  ]

  it('sums by Needs and Liabilities, ignoring paid', () => {
    const commitments = [
      makeCommitment({ id: 'co1', categoryId: 'c-rent', amount: 5000, status: 'upcoming' }),
      makeCommitment({ id: 'co2', categoryId: 'c-loan', amount: 1000, status: 'upcoming' }),
      makeCommitment({ id: 'co3', categoryId: 'c-loan', amount: 500, status: 'paid' }),
      makeCommitment({ id: 'co4', categoryId: 'c-fun', amount: 200, status: 'upcoming' }),
    ]
    expect(commitmentsProtected(commitments, cats, groups)).toEqual({
      needs: 5000,
      liabilities: 1000,
    })
  })
})

describe('savingsProtected', () => {
  it('sums planned amounts in the Savings group', () => {
    const groups = [
      makeGroup({ id: 'g-needs', name: 'Needs' }),
      makeGroup({ id: 'g-savings', name: 'Savings' }),
    ]
    const items = [
      makeItem({ id: 'i1', groupId: 'g-savings', plannedAmount: 1000 }),
      makeItem({ id: 'i2', groupId: 'g-savings', plannedAmount: 500 }),
      makeItem({ id: 'i3', groupId: 'g-needs', plannedAmount: 9999 }),
    ]
    expect(savingsProtected(items, groups)).toBe(1500)
  })

  it('returns 0 when Savings group is missing', () => {
    expect(savingsProtected([makeItem({})], [])).toBe(0)
  })
})

describe('discretionaryExpensesRecorded', () => {
  it('sums Wants-group expense actuals only', () => {
    const groups = [
      makeGroup({ id: 'g-needs', name: 'Needs' }),
      makeGroup({ id: 'g-wants', name: 'Wants' }),
    ]
    const cats = [
      makeCategory({ id: 'c-food', name: 'Food', groupId: 'g-needs' }),
      makeCategory({ id: 'c-fun', name: 'Fun', groupId: 'g-wants' }),
    ]
    const txs = [
      makeTx({ id: 't1', categoryId: 'c-fun', amount: 200, kind: 'expense' }),
      makeTx({ id: 't2', categoryId: 'c-fun', amount: 50, kind: 'expense' }),
      makeTx({ id: 't3', categoryId: 'c-fun', amount: 9999, kind: 'income' }),
      makeTx({ id: 't4', categoryId: 'c-food', amount: 100, kind: 'expense' }),
    ]
    expect(discretionaryExpensesRecorded(txs, cats, groups)).toBe(250)
  })
})

describe('safeToSpend', () => {
  const groups = [
    makeGroup({ id: 'g-needs', name: 'Needs' }),
    makeGroup({ id: 'g-wants', name: 'Wants' }),
    makeGroup({ id: 'g-savings', name: 'Savings' }),
    makeGroup({ id: 'g-liab', name: 'Liabilities' }),
  ]
  const cats = [
    makeCategory({ id: 'c-rent', name: 'Rent', groupId: 'g-needs' }),
    makeCategory({ id: 'c-fun', name: 'Fun', groupId: 'g-wants' }),
    makeCategory({ id: 'c-loan', name: 'Loan', groupId: 'g-liab' }),
  ]

  it('returns 0 when income is 0 (no income recorded)', () => {
    expect(safeToSpend([], [], [], cats, groups)).toBe(0)
  })

  it('income minus needs commitments minus liabilities minus savings minus wants spend', () => {
    const items = [
      makeItem({ id: 'i1', groupId: 'g-savings', plannedAmount: 1000 }),
    ]
    const txs = [
      makeTx({ id: 't-income', kind: 'income', amount: 10_000 }),
      makeTx({ id: 't-fun', kind: 'expense', categoryId: 'c-fun', amount: 800 }),
    ]
    const commitments = [
      makeCommitment({ id: 'co-rent', categoryId: 'c-rent', amount: 5000 }),
      makeCommitment({ id: 'co-loan', categoryId: 'c-loan', amount: 1500 }),
    ]
    // 10000 - 5000(needs) - 1500(liab) - 1000(savings) - 800(wants spend) = 1700
    expect(safeToSpend(items, txs, commitments, cats, groups)).toBe(1700)
  })

  it('paid commitments do not reduce safe-to-spend (already paid)', () => {
    const txs = [makeTx({ id: 't-income', kind: 'income', amount: 5000 })]
    const commitments = [
      makeCommitment({ id: 'co-paid', categoryId: 'c-rent', amount: 3000, status: 'paid' }),
    ]
    expect(safeToSpend([], txs, commitments, cats, groups)).toBe(5000)
  })

  it('can go negative when obligations exceed income', () => {
    const txs = [makeTx({ id: 't-income', kind: 'income', amount: 1000 })]
    const commitments = [makeCommitment({ id: 'co', categoryId: 'c-rent', amount: 5000 })]
    expect(safeToSpend([], txs, commitments, cats, groups)).toBe(-4000)
  })
})

describe('getPotentialSavings', () => {
  it('detects repeated merchants of the same expense (count >= 2)', () => {
    const cats = [makeCategory({ id: 'c1', name: 'C', groupId: 'g1' })]
    const items: BudgetItem[] = []
    const txs = [
      makeTx({ id: 't1', merchant: 'Netflix', amount: 200 }),
      makeTx({ id: 't2', merchant: 'Netflix', amount: 200 }),
      makeTx({ id: 't3', merchant: 'Spotify', amount: 100 }),
    ]
    const result = getPotentialSavings(txs, cats, items, 5)
    expect(result.find((r) => r.label === 'Netflix')?.amount).toBe(400)
    expect(result.find((r) => r.label === 'Spotify')).toBeUndefined()
  })
})

describe('calculateAffordability', () => {
  it('returns cannot_afford with zero history', () => {
    const result = calculateAffordability([], 1000)
    expect(result.verdict).toBe('cannot_afford')
    expect(result.baselineDisposable).toBe(0)
  })

  it('returns affordable when scenario fits comfortably', () => {
    const months = [
      { totalActual: 5000, expectedIncome: 10000 },
      { totalActual: 5500, expectedIncome: 10000 },
    ]
    const result = calculateAffordability(months, 1000)
    expect(result.verdict).toBe('affordable')
    expect(result.baselineDisposable).toBeGreaterThan(0)
  })

  it('returns cannot_afford when scenario exceeds disposable income', () => {
    const months = [{ totalActual: 9500, expectedIncome: 10000 }]
    const result = calculateAffordability(months, 2000)
    expect(result.verdict).toBe('cannot_afford')
  })

  it('detects increasing spending trend', () => {
    const months = [
      { totalActual: 4000, expectedIncome: 10000 },
      { totalActual: 5000, expectedIncome: 10000 },
      { totalActual: 6000, expectedIncome: 10000 },
    ]
    const result = calculateAffordability(months, 100)
    expect(result.spendingTrend).toBe('increasing')
  })
})
