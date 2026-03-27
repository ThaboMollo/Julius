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
  Commitment,
} from '../models'
import { DEFAULT_PAYDAY_DAY } from '../constants'

function expenseTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter((tx) => (tx.kind ?? 'expense') === 'expense')
}

function incomeTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter((tx) => tx.kind === 'income')
}

// Calculate effective planned amount
export function effectivePlanned(item: BudgetItem): number {
  return item.plannedAmount * item.multiplier * item.splitRatio
}

// Aggregate planned totals by group
export function totalPlannedByGroup(items: BudgetItem[], groupId: string): number {
  return items
    .filter((item) => item.groupId === groupId)
    .reduce((sum, item) => sum + effectivePlanned(item), 0)
}

// Aggregate planned totals by category
export function totalPlannedByCategory(items: BudgetItem[], categoryId: string): number {
  return items
    .filter((item) => item.categoryId === categoryId)
    .reduce((sum, item) => sum + effectivePlanned(item), 0)
}

// Total planned for all items
export function totalPlanned(items: BudgetItem[]): number {
  return items.reduce((sum, item) => sum + effectivePlanned(item), 0)
}

export function totalIncome(transactions: Transaction[]): number {
  return incomeTransactions(transactions).reduce((sum, tx) => sum + tx.amount, 0)
}

export function totalExpenses(transactions: Transaction[]): number {
  return expenseTransactions(transactions).reduce((sum, tx) => sum + tx.amount, 0)
}

// Aggregate actual spending by item
export function totalActualByItem(transactions: Transaction[], itemId: string): number {
  return expenseTransactions(transactions)
    .filter((tx) => tx.budgetItemId === itemId)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

// Aggregate actual spending by category
export function totalActualByCategory(transactions: Transaction[], categoryId: string): number {
  return expenseTransactions(transactions)
    .filter((tx) => tx.categoryId === categoryId)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

// Aggregate actual spending by group
export function totalActualByGroup(transactions: Transaction[], items: BudgetItem[], groupId: string): number {
  const groupItemIds = new Set(items.filter((item) => item.groupId === groupId).map((item) => item.id))
  return expenseTransactions(transactions)
    .filter((tx) => tx.budgetItemId && groupItemIds.has(tx.budgetItemId))
    .reduce((sum, tx) => sum + tx.amount, 0)
}

// Total actual spending
export function totalActual(transactions: Transaction[]): number {
  return totalExpenses(transactions)
}

export function netCashflow(transactions: Transaction[]): number {
  return totalIncome(transactions) - totalExpenses(transactions)
}

// Overspend (leak) detection for a category
export function categoryOverspend(items: BudgetItem[], transactions: Transaction[], categoryId: string): number {
  const planned = totalPlannedByCategory(items, categoryId)
  const actual = totalActualByCategory(transactions, categoryId)
  return Math.max(0, actual - planned)
}

// Overspend for an item
export function itemOverspend(item: BudgetItem, transactions: Transaction[]): number {
  const planned = effectivePlanned(item)
  const actual = totalActualByItem(transactions, item.id)
  return Math.max(0, actual - planned)
}

// Get top overspent categories
export function topOverspentCategories(
  items: BudgetItem[],
  transactions: Transaction[],
  categories: Category[],
  limit: number = 5,
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
  return expenseTransactions(transactions)
    .filter((tx) => !tx.budgetItemId)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

// Get payday date for a given month
export function getPaydayDate(year: number, month: number, paydayDay: number = DEFAULT_PAYDAY_DAY): Date {
  const monthDate = new Date(year, month - 1, 1)
  const lastDayOfMonth = endOfMonth(monthDate).getDate()
  const day = Math.min(paydayDay, lastDayOfMonth)
  return setDate(startOfMonth(monthDate), day)
}

// Calculate remaining until payday
export function remainingUntilPayday(
  items: BudgetItem[],
  transactions: Transaction[],
  expectedIncome: number | null,
): number {
  const planned = totalPlanned(items)
  const spent = totalExpenses(transactions)

  if (expectedIncome !== null) {
    return expectedIncome - spent
  }

  return planned - spent
}

// Days until payday
export function daysUntilPayday(year: number, month: number, paydayDay: number = DEFAULT_PAYDAY_DAY): number {
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
  paydayDay: number = DEFAULT_PAYDAY_DAY,
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

export function getCommitmentStatus(commitment: Commitment): BillDueStatus {
  if (commitment.status === 'paid') return 'paid'
  if (!commitment.dueDate) return 'upcoming'

  const dueDate = new Date(commitment.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isToday(dueDate)) return 'due_today'
  if (isTomorrow(dueDate)) return 'due_tomorrow'
  if (isBefore(dueDate, today)) return 'overdue'
  return 'upcoming'
}

// Timeline event types
export interface TimelineEvent {
  date: Date
  type: 'commitment' | 'payday'
  item?: BudgetItem
  commitment?: Commitment
  amount: number
  runningBalance?: number
}

// Build timeline projection
export function buildTimeline(
  commitments: Commitment[],
  year: number,
  month: number,
  startingBalance: number,
  paydayDay: number = DEFAULT_PAYDAY_DAY,
): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const payday = getPaydayDate(year, month, paydayDay)
  const monthEnd = endOfMonth(new Date(year, month - 1, 1))
  const endDate = isAfter(monthEnd, payday) ? monthEnd : payday

  commitments
    .filter((commitment) => commitment.status !== 'paid' && commitment.dueDate)
    .forEach((commitment) => {
      const dueDate = new Date(commitment.dueDate as Date)
      if (!isBefore(dueDate, today) && !isAfter(dueDate, endDate)) {
        events.push({
          date: dueDate,
          type: 'commitment',
          commitment,
          amount: -commitment.amount,
        })
      }
    })

  if (!isBefore(payday, today)) {
    events.push({
      date: payday,
      type: 'payday',
      amount: 0,
    })
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime())

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

export function getGroupSummaries(groups: BudgetGroup[], items: BudgetItem[], transactions: Transaction[]): GroupSummary[] {
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

export function getRecentTransactions(transactions: Transaction[], limit: number = 5): Transaction[] {
  return [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}

export function getUpcomingCommitments(commitments: Commitment[], limit: number = 5): Commitment[] {
  return commitments
    .filter((commitment) => commitment.status !== 'paid')
    .sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
      return aTime - bTime
    })
    .slice(0, limit)
}

export interface PotentialSavingsItem {
  label: string
  amount: number
  reason: string
}

export function getPotentialSavings(
  transactions: Transaction[],
  categories: Category[],
  items: BudgetItem[],
  limit: number = 3,
): PotentialSavingsItem[] {
  const overspends = topOverspentCategories(items, transactions, categories, limit).map((entry) => ({
    label: entry.category.name,
    amount: entry.overspend,
    reason: 'Over planned spend this month',
  }))

  const repeatedMerchants = Array.from(
    expenseTransactions(transactions)
      .filter((tx) => tx.merchant.trim().length > 0)
      .reduce((acc, tx) => {
        const key = tx.merchant.trim().toLowerCase()
        const current = acc.get(key) ?? { label: tx.merchant.trim(), amount: 0, count: 0 }
        current.amount += tx.amount
        current.count += 1
        acc.set(key, current)
        return acc
      }, new Map<string, { label: string; amount: number; count: number }>())
      .values(),
  )
    .filter((entry) => entry.count >= 2)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((entry) => ({
      label: entry.label,
      amount: entry.amount,
      reason: 'Repeated expense this month',
    }))

  return [...overspends, ...repeatedMerchants]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

function buildCategoryGroupNameMap(categories: Category[], groups: BudgetGroup[]): Map<string, string> {
  const groupsById = new Map(groups.map((group) => [group.id, group.name]))
  return new Map(categories.map((category) => [category.id, groupsById.get(category.groupId) ?? '']))
}

export function savingsProtected(items: BudgetItem[], groups: BudgetGroup[]): number {
  const savingsGroup = groups.find((group) => group.name === 'Savings')
  if (!savingsGroup) return 0
  return totalPlannedByGroup(items, savingsGroup.id)
}

export function commitmentsProtected(
  commitments: Commitment[],
  categories: Category[],
  groups: BudgetGroup[],
): { needs: number; liabilities: number } {
  const categoryGroupNames = buildCategoryGroupNameMap(categories, groups)

  return commitments
    .filter((commitment) => commitment.status !== 'paid')
    .reduce(
      (acc, commitment) => {
        const groupName = categoryGroupNames.get(commitment.categoryId)
        if (groupName === 'Needs') acc.needs += commitment.amount
        if (groupName === 'Liabilities') acc.liabilities += commitment.amount
        return acc
      },
      { needs: 0, liabilities: 0 },
    )
}

export function discretionaryExpensesRecorded(
  transactions: Transaction[],
  categories: Category[],
  groups: BudgetGroup[],
): number {
  const categoryGroupNames = buildCategoryGroupNameMap(categories, groups)
  return expenseTransactions(transactions)
    .filter((tx) => categoryGroupNames.get(tx.categoryId) === 'Wants')
    .reduce((sum, tx) => sum + tx.amount, 0)
}

export function safeToSpend(
  items: BudgetItem[],
  transactions: Transaction[],
  commitments: Commitment[],
  categories: Category[],
  groups: BudgetGroup[],
): number {
  const income = totalIncome(transactions)
  if (income <= 0) return 0

  const protectedCommitments = commitmentsProtected(commitments, categories, groups)
  const savings = savingsProtected(items, groups)
  const wantsSpend = discretionaryExpensesRecorded(transactions, categories, groups)

  return income - protectedCommitments.needs - protectedCommitments.liabilities - savings - wantsSpend
}

// ─────────────────────────────────────────────
// Affordability calculation
// ─────────────────────────────────────────────

export type AffordabilityVerdict = 'affordable' | 'tight' | 'cannot_afford'

export interface AffordabilityResult {
  baselineDisposable: number
  spendingTrend: 'increasing' | 'decreasing' | 'stable'
  newMonthlyObligations: number
  remainingAfterScenario: number
  verdict: AffordabilityVerdict
}

export function calculateAffordability(
  recentMonths: { totalActual: number; expectedIncome: number }[],
  scenarioMonthlyTotal: number,
): AffordabilityResult {
  if (recentMonths.length === 0) {
    return {
      baselineDisposable: 0,
      spendingTrend: 'stable',
      newMonthlyObligations: scenarioMonthlyTotal,
      remainingAfterScenario: -scenarioMonthlyTotal,
      verdict: 'cannot_afford',
    }
  }

  const disposableValues = recentMonths.map((m) => m.expectedIncome - m.totalActual)
  const baselineDisposable = disposableValues.reduce((sum, value) => sum + value, 0) / disposableValues.length

  let spendingTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (recentMonths.length >= 2) {
    const first = recentMonths[0].totalActual
    const last = recentMonths[recentMonths.length - 1].totalActual
    const delta = last - first
    if (delta > 200) spendingTrend = 'increasing'
    else if (delta < -200) spendingTrend = 'decreasing'
  }

  const remainingAfterScenario = baselineDisposable - scenarioMonthlyTotal

  let verdict: AffordabilityVerdict = 'affordable'
  if (remainingAfterScenario < 0) verdict = 'cannot_afford'
  else if (remainingAfterScenario < baselineDisposable * 0.2) verdict = 'tight'

  return {
    baselineDisposable,
    spendingTrend,
    newMonthlyObligations: scenarioMonthlyTotal,
    remainingAfterScenario,
    verdict,
  }
}
