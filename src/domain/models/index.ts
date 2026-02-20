// Budget Group - e.g., "Needs", "Should Die"
export interface BudgetGroup {
  id: string
  name: string
  sortOrder: number
  isDefault: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Category - e.g., "Groceries", "Transport"
export interface Category {
  id: string
  name: string
  groupId: string
  isDefault: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Budget Month - represents a specific month's budget
export interface BudgetMonth {
  id: string
  year: number
  month: number // 1-12
  monthKey: string // "2025-02"
  expectedIncome: number | null
  createdAt: Date
  updatedAt: Date
}

// Budget Item - a specific budget line item for a month
export interface BudgetItem {
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
  createdAt: Date
  updatedAt: Date
}

// Transaction - manual spending entry
export interface Transaction {
  id: string
  budgetMonthId: string
  categoryId: string
  budgetItemId: string | null // can be null for unbudgeted spend
  amount: number
  date: Date
  note: string
  createdAt: Date
  updatedAt: Date
}

// Bill Tick - tracks whether a bill has been paid for a specific month
export interface BillTick {
  id: string
  budgetMonthId: string
  budgetItemId: string
  isPaid: boolean
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// Recurring Budget Template - for monthly recurring items
export interface RecurringTemplate {
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
  createdAt: Date
  updatedAt: Date
}

// App Settings
export interface AppSettings {
  id: string
  paydayDayOfMonth: number // default 25
  expectedMonthlyIncome: number | null
  updatedAt: Date
}

// Purchase Scenario - a named "what if" affordability scenario
export interface PurchaseScenario {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

// Scenario Expense - a monthly cost line item within a scenario
export interface ScenarioExpense {
  id: string
  scenarioId: string
  name: string
  monthlyAmount: number
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

// Bank Config - a configured bank account for reconciliation
export interface BankConfig {
  id: string
  bankName: string
  bankCode: 'fnb' | 'capitec' | 'standard_bank' | 'discovery' | 'absa'
  uploadFrequency: 'daily' | 'weekly' | 'monthly'
  isActive: boolean
  lastUploadAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Statement Upload - a record of a CSV bank statement upload
export interface StatementUpload {
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

// Type for creating new entities (without id and timestamps)
export type CreateBudgetGroup = Omit<BudgetGroup, 'id' | 'createdAt' | 'updatedAt'>
export type CreateCategory = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>
export type CreateBudgetMonth = Omit<BudgetMonth, 'id' | 'createdAt' | 'updatedAt'>
export type CreateBudgetItem = Omit<BudgetItem, 'id' | 'createdAt' | 'updatedAt'>
export type CreateTransaction = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
export type CreateBillTick = Omit<BillTick, 'id' | 'createdAt' | 'updatedAt'>
export type CreateRecurringTemplate = Omit<RecurringTemplate, 'id' | 'createdAt' | 'updatedAt'>
export type CreatePurchaseScenario = Omit<PurchaseScenario, 'id' | 'createdAt' | 'updatedAt'>
export type CreateScenarioExpense = Omit<ScenarioExpense, 'id' | 'createdAt' | 'updatedAt'>
export type CreateBankConfig = Omit<BankConfig, 'id' | 'createdAt' | 'updatedAt'>
export type CreateStatementUpload = Omit<StatementUpload, 'id'>
