import Dexie, { type Table } from 'dexie'
import type {
  BudgetGroup,
  Category,
  BudgetMonth,
  BudgetItem,
  Transaction,
  BillTick,
  RecurringTemplate,
  AppSettings,
} from '../../domain/models'

export class JuliusDB extends Dexie {
  budgetGroups!: Table<BudgetGroup, string>
  categories!: Table<Category, string>
  budgetMonths!: Table<BudgetMonth, string>
  budgetItems!: Table<BudgetItem, string>
  transactions!: Table<Transaction, string>
  billTicks!: Table<BillTick, string>
  recurringTemplates!: Table<RecurringTemplate, string>
  appSettings!: Table<AppSettings, string>

  constructor() {
    super('JuliusDB')

    this.version(1).stores({
      budgetGroups: 'id, name, sortOrder, isActive',
      categories: 'id, name, groupId, isActive',
      budgetMonths: 'id, monthKey, [year+month]',
      budgetItems: 'id, budgetMonthId, groupId, categoryId, isBill, [budgetMonthId+groupId], [budgetMonthId+categoryId], templateId',
      transactions: 'id, budgetMonthId, categoryId, budgetItemId, date, [budgetMonthId+date]',
      billTicks: 'id, [budgetMonthId+budgetItemId], budgetMonthId, budgetItemId',
      recurringTemplates: 'id, groupId, categoryId, isActive, isBill',
      appSettings: 'id',
    })
  }
}

export const db = new JuliusDB()
