import {
  startOfMonth,
  endOfMonth,
  setDate,
  isAfter,
  isBefore,
  isToday,
  isTomorrow,
  differenceInDays,
} from 'date-fns'
import type {
  BudgetItem,
  Transaction,
  BillTick,
  BudgetGroup,
  Category,
} from '../models'
import { DEFAULT_PAYDAY_DAY } from '../constants'

// Calculate effective planned amount
export function effectivePlanned(item: BudgetItem): number {
  return item.plannedAmount * item.multiplier * item.splitRatio
}

// Aggregate planned totals by group
export function totalPlannedByGroup(
  items: BudgetItem[],
  groupId: string
): number {
  return items
    .filter((item) => item.groupId === groupId)
    .reduce((sum, item) => sum + effectivePlanned(item), 0)
}

// Aggregate planned totals by category
export function totalPlannedByCategory(
  items: BudgetItem[],
  categoryId: string
): number {
  return items
    .filter((item) => item.categoryId === categoryId)
    .reduce((sum, item) => sum + effectivePlanned(item), 0)
}

// Total planned for all items
export function totalPlanned(items: BudgetItem[]): number {
  return items.reduce((sum, item) => sum + effectivePlanned(item), 0)
}

// Aggregate actual spending by item
export function totalActualByItem(
  transactions: Transaction[],
  itemId: string
): number {
  return transactions
    .filter((tx) => tx.budgetItemId === itemId)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

// Aggregate actual spending by category
export function totalActualByCategory(
  transactions: Transaction[],
  categoryId: string
): number {
  return transactions
    .filter((tx) => tx.categoryId === categoryId)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

// Aggregate actual spending by group
export function totalActualByGroup(
  transactions: Transaction[],
  items: BudgetItem[],
  groupId: string
): number {
  const groupItemIds = new Set(
    items.filter((item) => item.groupId === groupId).map((item) => item.id)
  )
  return transactions
    .filter((tx) => tx.budgetItemId && groupItemIds.has(tx.budgetItemId))
    .reduce((sum, tx) => sum + tx.amount, 0)
}

// Total actual spending
export function totalActual(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0)
}

// Overspend (leak) detection for a category
export function categoryOverspend(
  items: BudgetItem[],
  transactions: Transaction[],
  categoryId: string
): number {
  const planned = totalPlannedByCategory(items, categoryId)
  const actual = totalActualByCategory(transactions, categoryId)
  return Math.max(0, actual - planned)
}

// Overspend for an item
export function itemOverspend(
  item: BudgetItem,
  transactions: Transaction[]
): number {
  const planned = effectivePlanned(item)
  const actual = totalActualByItem(transactions, item.id)
  return Math.max(0, actual - planned)
}

// Get top overspent categories
export function topOverspentCategories(
  items: BudgetItem[],
  transactions: Transaction[],
  categories: Category[],
  limit: number = 5
): Array<{ category: Category; overspend: number; planned: number; actual: number }> {
  const results = categories
    .map((category) => {
      const planned = totalPlannedByCategory(items, category.id)
      const actual = totalActualByCategory(transactions, category.id)
      const overspend = Math.max(0, actual - planned)
      return { category, overspend, planned, actual }
    })
    .filter((r) => r.overspend > 0)
    .sort((a, b) => b.overspend - a.overspend)

  return results.slice(0, limit)
}

// Unbudgeted spending (transactions without a matching budget item)
export function unbudgetedSpending(transactions: Transaction[]): number {
  return transactions
    .filter((tx) => !tx.budgetItemId)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

// Get payday date for a given month
export function getPaydayDate(
  year: number,
  month: number,
  paydayDay: number = DEFAULT_PAYDAY_DAY
): Date {
  const monthDate = new Date(year, month - 1, 1)
  const lastDayOfMonth = endOfMonth(monthDate).getDate()
  const day = Math.min(paydayDay, lastDayOfMonth)
  return setDate(startOfMonth(monthDate), day)
}

// Calculate remaining until payday
export function remainingUntilPayday(
  items: BudgetItem[],
  transactions: Transaction[],
  expectedIncome: number | null
): number {
  const planned = totalPlanned(items)
  const actual = totalActual(transactions)

  if (expectedIncome !== null) {
    // Remaining = Income - Spent
    return expectedIncome - actual
  }

  // Remaining = Planned - Spent (budget-based view)
  return planned - actual
}

// Days until payday
export function daysUntilPayday(
  year: number,
  month: number,
  paydayDay: number = DEFAULT_PAYDAY_DAY
): number {
  const payday = getPaydayDate(year, month, paydayDay)
  const today = new Date()
  const diff = differenceInDays(payday, today)
  return Math.max(0, diff)
}

// Bill due status
export type BillDueStatus =
  | 'overdue'
  | 'due_today'
  | 'due_tomorrow'
  | 'due_before_payday'
  | 'upcoming'
  | 'paid'

export function getBillDueStatus(
  item: BudgetItem,
  billTick: BillTick | undefined,
  year: number,
  month: number,
  paydayDay: number = DEFAULT_PAYDAY_DAY
): BillDueStatus {
  if (billTick?.isPaid) {
    return 'paid'
  }

  if (!item.dueDate) {
    return 'upcoming'
  }

  const dueDate = new Date(item.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isToday(dueDate)) {
    return 'due_today'
  }

  if (isTomorrow(dueDate)) {
    return 'due_tomorrow'
  }

  if (isBefore(dueDate, today)) {
    return 'overdue'
  }

  const payday = getPaydayDate(year, month, paydayDay)
  if (isBefore(dueDate, payday) || dueDate.getTime() === payday.getTime()) {
    return 'due_before_payday'
  }

  return 'upcoming'
}

// Timeline event types
export interface TimelineEvent {
  date: Date
  type: 'bill' | 'payday'
  item?: BudgetItem
  amount: number
  runningBalance?: number
}

// Build timeline projection
export function buildTimeline(
  items: BudgetItem[],
  billTicks: BillTick[],
  year: number,
  month: number,
  startingBalance: number,
  paydayDay: number = DEFAULT_PAYDAY_DAY
): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const payday = getPaydayDate(year, month, paydayDay)
  const monthEnd = endOfMonth(new Date(year, month - 1, 1))
  const endDate = isAfter(monthEnd, payday) ? monthEnd : payday

  // Add bill events (unpaid only)
  const billTickMap = new Map(billTicks.map((bt) => [bt.budgetItemId, bt]))

  items
    .filter((item) => item.isBill && item.dueDate)
    .forEach((item) => {
      const tick = billTickMap.get(item.id)
      if (!tick?.isPaid) {
        const dueDate = new Date(item.dueDate!)
        if (!isBefore(dueDate, today) && !isAfter(dueDate, endDate)) {
          events.push({
            date: dueDate,
            type: 'bill',
            item,
            amount: -effectivePlanned(item),
          })
        }
      }
    })

  // Add payday
  if (!isBefore(payday, today)) {
    events.push({
      date: payday,
      type: 'payday',
      amount: 0, // Will be updated if income is known
    })
  }

  // Sort by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Calculate running balance
  let balance = startingBalance
  events.forEach((event) => {
    balance += event.amount
    event.runningBalance = balance
  })

  return events
}

// Group summary
export interface GroupSummary {
  group: BudgetGroup
  planned: number
  actual: number
  remaining: number
  overspend: number
}

export function getGroupSummaries(
  groups: BudgetGroup[],
  items: BudgetItem[],
  transactions: Transaction[]
): GroupSummary[] {
  return groups
    .filter((g) => g.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((group) => {
      const planned = totalPlannedByGroup(items, group.id)
      const actual = totalActualByGroup(transactions, items, group.id)
      const remaining = Math.max(0, planned - actual)
      const overspend = Math.max(0, actual - planned)
      return { group, planned, actual, remaining, overspend }
    })
}

// ─────────────────────────────────────────────
// Affordability calculation
// ─────────────────────────────────────────────

export type AffordabilityVerdict = 'affordable' | 'tight' | 'cannot_afford'

export interface AffordabilityResult {
  baselineDisposable: number    // avg monthly disposable over recent months
  spendingTrend: 'increasing' | 'decreasing' | 'stable'
  newMonthlyObligations: number // sum of scenario expenses
  remainingAfterScenario: number
  verdict: AffordabilityVerdict
}

export function calculateAffordability(
  recentMonths: { totalActual: number; expectedIncome: number }[],
  scenarioMonthlyTotal: number
): AffordabilityResult {
  if (recentMonths.length === 0) {
    return {
      baselineDisposable: 0,
      spendingTrend: 'stable',
      newMonthlyObligations: scenarioMonthlyTotal,
      remainingAfterScenario: -scenarioMonthlyTotal,
      verdict: scenarioMonthlyTotal === 0 ? 'affordable' : 'cannot_afford',
    }
  }

  const disposables = recentMonths.map((m) => m.expectedIncome - m.totalActual)
  const baselineDisposable = disposables.reduce((s, d) => s + d, 0) / disposables.length

  // Trend: compare first half avg vs second half avg of actuals
  const actuals = recentMonths.map((m) => m.totalActual)
  const mid = Math.floor(actuals.length / 2)
  const firstHalfAvg = actuals.slice(0, mid || 1).reduce((s, v) => s + v, 0) / (mid || 1)
  const secondHalfAvg = actuals.slice(mid).reduce((s, v) => s + v, 0) / (actuals.length - mid)
  const trendDiff = secondHalfAvg - firstHalfAvg
  const spendingTrend: AffordabilityResult['spendingTrend'] =
    trendDiff > 100 ? 'increasing' : trendDiff < -100 ? 'decreasing' : 'stable'

  const remainingAfterScenario = baselineDisposable - scenarioMonthlyTotal

  let verdict: AffordabilityVerdict
  if (remainingAfterScenario < 0) {
    verdict = 'cannot_afford'
  } else if (baselineDisposable > 0 && remainingAfterScenario / baselineDisposable < 0.2) {
    verdict = 'tight'
  } else {
    verdict = 'affordable'
  }

  return {
    baselineDisposable,
    spendingTrend,
    newMonthlyObligations: scenarioMonthlyTotal,
    remainingAfterScenario,
    verdict,
  }
}
