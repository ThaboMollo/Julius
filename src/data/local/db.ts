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
  PurchaseScenario,
  ScenarioExpense,
  BankConfig,
  StatementUpload,
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
  purchaseScenarios!: Table<PurchaseScenario, string>
  scenarioExpenses!: Table<ScenarioExpense, string>
  bankConfigs!: Table<BankConfig, string>
  statementUploads!: Table<StatementUpload, string>

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

    this.version(2).stores({
      budgetGroups: 'id, name, sortOrder, isActive',
      categories: 'id, name, groupId, isActive',
      budgetMonths: 'id, monthKey, [year+month]',
      budgetItems: 'id, budgetMonthId, groupId, categoryId, isBill, [budgetMonthId+groupId], [budgetMonthId+categoryId], templateId',
      transactions: 'id, budgetMonthId, categoryId, budgetItemId, date, [budgetMonthId+date]',
      billTicks: 'id, [budgetMonthId+budgetItemId], budgetMonthId, budgetItemId',
      recurringTemplates: 'id, groupId, categoryId, isActive, isBill',
      appSettings: 'id',
      purchaseScenarios: 'id',
      scenarioExpenses: 'id, scenarioId',
      bankConfigs: 'id, bankCode',
      statementUploads: 'id, bankConfigId',
    })
  }
}

export const db = new JuliusDB()
