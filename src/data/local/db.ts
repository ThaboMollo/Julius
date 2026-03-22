import Dexie, { type Table, type Transaction } from 'dexie'
import type {
  BudgetGroup,
  Category,
  BudgetMonth,
  BudgetItem,
  Transaction as TxModel,
  BillTick,
  RecurringTemplate,
  AppSettings,
  PurchaseScenario,
  ScenarioExpense,
  BankConfig,
  StatementUpload,
  MigrationJournalEntry,
  SyncStateLocal,
  CheckInResult,
} from '../../domain/models'

export class JuliusDB extends Dexie {
  budgetGroups!: Table<BudgetGroup, string>
  categories!: Table<Category, string>
  budgetMonths!: Table<BudgetMonth, string>
  budgetItems!: Table<BudgetItem, string>
  transactions!: Table<TxModel, string>
  billTicks!: Table<BillTick, string>
  recurringTemplates!: Table<RecurringTemplate, string>
  appSettings!: Table<AppSettings, string>
  purchaseScenarios!: Table<PurchaseScenario, string>
  scenarioExpenses!: Table<ScenarioExpense, string>
  bankConfigs!: Table<BankConfig, string>
  statementUploads!: Table<StatementUpload, string>
  migrationJournal!: Table<MigrationJournalEntry, string>
  syncStateLocal!: Table<SyncStateLocal, string>
  checkInResults!: Table<CheckInResult, string>

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

    this.version(3)
      .stores({
        budgetGroups: 'id, userId, name, sortOrder, isActive, [userId+isActive]',
        categories: 'id, userId, name, groupId, isActive, [userId+groupId]',
        budgetMonths: 'id, userId, monthKey, year, month, [userId+monthKey], [userId+year+month]',
        budgetItems: 'id, userId, budgetMonthId, groupId, categoryId, isBill, templateId, [userId+budgetMonthId+groupId], [userId+budgetMonthId+categoryId]',
        transactions: 'id, userId, budgetMonthId, categoryId, budgetItemId, date, [userId+budgetMonthId+date]',
        billTicks: 'id, userId, budgetMonthId, budgetItemId, [userId+budgetMonthId+budgetItemId]',
        recurringTemplates: 'id, userId, groupId, categoryId, isActive, isBill, [userId+groupId]',
        appSettings: 'id, userId',
        purchaseScenarios: 'id, userId',
        scenarioExpenses: 'id, userId, scenarioId',
        bankConfigs: 'id, userId, bankCode',
        statementUploads: 'id, userId, bankConfigId',
        migrationJournal: 'id, userId, status',
        syncStateLocal: 'id, userId, lastSyncAt',
      })
      .upgrade(async (tx) => {
        await stampAllTables(tx)
      })

    // Compatibility migration for any client that already opened earlier v3.
    this.version(4)
      .stores({
        budgetGroups: 'id, userId, name, sortOrder, isActive, [userId+isActive]',
        categories: 'id, userId, name, groupId, isActive, [userId+groupId]',
        budgetMonths: 'id, userId, monthKey, year, month, [userId+monthKey], [userId+year+month]',
        budgetItems: 'id, userId, budgetMonthId, groupId, categoryId, isBill, templateId, [userId+budgetMonthId+groupId], [userId+budgetMonthId+categoryId]',
        transactions: 'id, userId, budgetMonthId, categoryId, budgetItemId, date, [userId+budgetMonthId+date]',
        billTicks: 'id, userId, budgetMonthId, budgetItemId, [userId+budgetMonthId+budgetItemId]',
        recurringTemplates: 'id, userId, groupId, categoryId, isActive, isBill, [userId+groupId]',
        appSettings: 'id, userId',
        purchaseScenarios: 'id, userId',
        scenarioExpenses: 'id, userId, scenarioId',
        bankConfigs: 'id, userId, bankCode',
        statementUploads: 'id, userId, bankConfigId',
        migrationJournal: 'id, userId, status',
        syncStateLocal: 'id, userId, lastSyncAt',
      })
      .upgrade(async (tx) => {
        await stampAllTables(tx)
      })

    this.version(5).stores({
      budgetGroups: 'id, userId, name, sortOrder, isActive, [userId+isActive]',
      categories: 'id, userId, name, groupId, isActive, [userId+groupId]',
      budgetMonths: 'id, userId, monthKey, year, month, [userId+monthKey], [userId+year+month]',
      budgetItems: 'id, userId, budgetMonthId, groupId, categoryId, isBill, templateId, [userId+budgetMonthId+groupId], [userId+budgetMonthId+categoryId]',
      transactions: 'id, userId, budgetMonthId, categoryId, budgetItemId, date, [userId+budgetMonthId+date]',
      billTicks: 'id, userId, budgetMonthId, budgetItemId, [userId+budgetMonthId+budgetItemId]',
      recurringTemplates: 'id, userId, groupId, categoryId, isActive, isBill, [userId+groupId]',
      appSettings: 'id, userId',
      purchaseScenarios: 'id, userId',
      scenarioExpenses: 'id, userId, scenarioId',
      bankConfigs: 'id, userId, bankCode',
      statementUploads: 'id, userId, bankConfigId',
      migrationJournal: 'id, userId, status',
      syncStateLocal: 'id, userId, lastSyncAt',
      checkInResults: 'id, userId, monthKey, budgetMonthId, [userId+monthKey]',
    })
  }
}

async function stampAllTables(tx: Transaction): Promise<void> {
  const now = new Date().toISOString()
  const tables = [
    'budgetGroups',
    'categories',
    'budgetMonths',
    'budgetItems',
    'transactions',
    'billTicks',
    'recurringTemplates',
    'appSettings',
    'purchaseScenarios',
    'scenarioExpenses',
    'bankConfigs',
    'statementUploads',
    'migrationJournal',
  ]

  for (const tableName of tables) {
    const table = tx.table(tableName)
    await table.toCollection().modify((record: Record<string, unknown>) => {
      if (!record.userId) record.userId = '__local__'
      if (!record.createdAt) record.createdAt = now
      if (!record.updatedAt) record.updatedAt = now
      if (!Object.prototype.hasOwnProperty.call(record, 'deletedAt')) record.deletedAt = null
    })
  }
}

export const db = new JuliusDB()
