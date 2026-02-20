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

// Type for creating new entities (without id and timestamps)
export type CreateBudgetGroup = Omit<BudgetGroup, 'id' | 'createdAt' | 'updatedAt'>
export type CreateCategory = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>
export type CreateBudgetMonth = Omit<BudgetMonth, 'id' | 'createdAt' | 'updatedAt'>
export type CreateBudgetItem = Omit<BudgetItem, 'id' | 'createdAt' | 'updatedAt'>
export type CreateTransaction = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
export type CreateBillTick = Omit<BillTick, 'id' | 'createdAt' | 'updatedAt'>
export type CreateRecurringTemplate = Omit<RecurringTemplate, 'id' | 'createdAt' | 'updatedAt'>
