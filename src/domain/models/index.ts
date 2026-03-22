import type { AffordabilityVerdict } from '../rules'

export interface ScopedRecord {
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// Budget Group - e.g., "Needs", "Should Die"
export interface BudgetGroup extends ScopedRecord {
  id: string
  name: string
  sortOrder: number
  isDefault: boolean
  isActive: boolean
}

// Category - e.g., "Groceries", "Transport"
export interface Category extends ScopedRecord {
  id: string
  name: string
  groupId: string
  isDefault: boolean
  isActive: boolean
}

// Budget Month - represents a specific month's budget
export interface BudgetMonth extends ScopedRecord {
  id: string
  year: number
  month: number // 1-12
  monthKey: string // "2025-02"
  expectedIncome: number | null
}

// Budget Item - a specific budget line item for a month
export interface BudgetItem extends ScopedRecord {
  id: string
  budgetMonthId: string
  groupId: string
  categoryId: string
  name: string
  plannedAmount: number
  multiplier: number // default 1
  splitRatio: number // default 1, e.g., 0.5 for splitting
  isBill: boolean
  dueDate: Date | null // only for bills
  isFromTemplate: boolean
  templateId: string | null
}

// Transaction - manual spending entry
export interface Transaction extends ScopedRecord {
  id: string
  budgetMonthId: string
  categoryId: string
  budgetItemId: string | null // can be null for unbudgeted spend
  amount: number
  date: Date
  note: string
}

// Bill Tick - tracks whether a bill has been paid for a specific month
export interface BillTick extends ScopedRecord {
  id: string
  budgetMonthId: string
  budgetItemId: string
  isPaid: boolean
  paidAt: Date | null
}

// Recurring Budget Template - for monthly recurring items
export interface RecurringTemplate extends ScopedRecord {
  id: string
  groupId: string
  categoryId: string
  name: string
  plannedAmount: number
  multiplier: number
  splitRatio: number
  isBill: boolean
  dueDayOfMonth: number | null // 1-31, only for bills
  isActive: boolean
}

// App Settings
export interface AppSettings extends ScopedRecord {
  id: string
  paydayDayOfMonth: number // default 25
  expectedMonthlyIncome: number | null
  cloudModeEnabled?: boolean
}

export interface MigrationJournalEntry extends ScopedRecord {
  id: string
  status: 'not_started' | 'running' | 'completed' | 'failed'
  lastStep: string
  startedAt: string | null
  completedAt: string | null
  error: string | null
}

export interface SyncStateLocal {
  id: string
  userId: string
  deviceId: string
  lastPullAt: string | null
  lastPushAt: string | null
  lastLoginAt: string | null
  lastSyncAt: string | null
}

// Purchase Scenario - a named "what if" affordability scenario
export interface PurchaseScenario extends ScopedRecord {
  id: string
  name: string
  description?: string
}

// Scenario Expense - a monthly cost line item within a scenario
export interface ScenarioExpense extends ScopedRecord {
  id: string
  scenarioId: string
  name: string
  monthlyAmount: number
  sortOrder: number
}

// Bank Config - a configured bank account for reconciliation
export interface BankConfig extends ScopedRecord {
  id: string
  bankName: string
  bankCode: 'fnb' | 'capitec' | 'standard_bank' | 'discovery' | 'absa'
  uploadFrequency: 'daily' | 'weekly' | 'monthly'
  isActive: boolean
  lastUploadAt?: Date
}

// Statement Upload - a record of a CSV bank statement upload
export interface StatementUpload extends ScopedRecord {
  id: string
  bankConfigId: string
  filename: string
  uploadedAt: Date
  periodStart: Date
  periodEnd: Date
  totalTransactions: number
  matchedCount: number
  unmatchedCount: number
}

// Mid-Month Check-In result
export interface OutsideBudgetItem {
  description: string
  amount: number
  date: string
  aiComment: string
  actionTaken?: 'added_transaction' | 'dismissed'
}

export interface SuggestedBudgetItem {
  name: string
  suggestedAmount: number
  groupId?: string
  categoryId?: string
  aiReason: string
  actionTaken?: 'added_to_budget' | 'dismissed'
}

export interface PlannerReviewItem {
  scenarioId: string
  scenarioName: string
  previousVerdict: AffordabilityVerdict
  newVerdict: AffordabilityVerdict
  newBaselineDisposable: number
  newRemainingAfterScenario: number
}

export interface CheckInResult extends ScopedRecord {
  id: string
  budgetMonthId: string
  monthKey: string
  verdict: 'doing_well' | 'fucking_up'
  verdictSummary: string
  spendingProgressPercent: number
  outsideBudget: OutsideBudgetItem[]
  suggestedBudgetItems: SuggestedBudgetItem[]
  plannerReview: PlannerReviewItem[]
  bankStatementDate: string
  rawAIResponse: string
}

// Type for creating new entities (without id and scoped timestamps)
export type CreateBudgetGroup = Omit<BudgetGroup, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type CreateCategory = Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type CreateBudgetMonth = Omit<BudgetMonth, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type CreateBudgetItem = Omit<BudgetItem, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type CreateTransaction = Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type CreateBillTick = Omit<BillTick, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type CreateRecurringTemplate = Omit<RecurringTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type CreatePurchaseScenario = Omit<PurchaseScenario, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type CreateScenarioExpense = Omit<ScenarioExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type CreateBankConfig = Omit<BankConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type CreateStatementUpload = Omit<StatementUpload, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type CreateCheckInResult = Omit<CheckInResult, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
