import { db } from '../data/local'
import { supabase } from '../cloud/supabaseClient'
import type {
  AppSettings,
  BankConfig,
  BillTick,
  BudgetGroup,
  BudgetItem,
  BudgetMonth,
  Category,
  PurchaseScenario,
  RecurringTemplate,
  ScenarioExpense,
  StatementUpload,
  SyncStateLocal,
  Transaction,
} from '../domain/models'
import { nowIso } from '../auth/userScope'

const DEVICE_ID_KEY = 'julius-device-id'

const TABLE_ORDER = [
  { local: 'budgetGroups', cloud: 'budget_groups' },
  { local: 'categories', cloud: 'categories' },
  { local: 'budgetMonths', cloud: 'budget_months' },
  { local: 'recurringTemplates', cloud: 'recurring_templates' },
  { local: 'budgetItems', cloud: 'budget_items' },
  { local: 'billTicks', cloud: 'bill_ticks' },
  { local: 'transactions', cloud: 'transactions' },
  { local: 'appSettings', cloud: 'app_settings' },
  { local: 'purchaseScenarios', cloud: 'purchase_scenarios' },
  { local: 'scenarioExpenses', cloud: 'scenario_expenses' },
  { local: 'bankConfigs', cloud: 'bank_configs' },
  { local: 'statementUploads', cloud: 'statement_uploads' },
] as const

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

export class SyncOrchestrator {
  private inFlightByUser = new Map<string, Promise<void>>()

  async runOnLogin(userId: string): Promise<void> {
    if (this.inFlightByUser.has(userId)) {
      await this.inFlightByUser.get(userId)
      return
    }

    const runPromise = this.runInternal(userId)
    this.inFlightByUser.set(userId, runPromise)

    try {
      await runPromise
    } finally {
      this.inFlightByUser.delete(userId)
    }
  }

  private async runInternal(userId: string): Promise<void> {
    const syncState = await ensureSyncState(userId)

    await migrateLocalRowsToUser(userId)

    const pullAt = nowIso()
    for (const table of TABLE_ORDER) {
      await pullTable(table.local, table.cloud, userId, syncState.lastPullAt)
    }
    await db.syncStateLocal.update(userId, { lastPullAt: pullAt })

    const pushAt = nowIso()
    for (const table of TABLE_ORDER) {
      await pushTable(table.local, table.cloud, userId, syncState.lastPushAt)
    }
    await db.syncStateLocal.update(userId, {
      lastPushAt: pushAt,
      lastLoginAt: nowIso(),
      lastSyncAt: nowIso(),
      deviceId: getDeviceId(),
    })
  }
}

export async function getSyncStateForUser(userId: string): Promise<SyncStateLocal> {
  return ensureSyncState(userId)
}

function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const created = crypto.randomUUID()
  localStorage.setItem(DEVICE_ID_KEY, created)
  return created
}

async function ensureSyncState(userId: string): Promise<SyncStateLocal> {
  const existing = await db.syncStateLocal.get(userId)
  if (existing) {
    return existing
  }

  const state: SyncStateLocal = {
    id: userId,
    userId,
    deviceId: getDeviceId(),
    lastPullAt: null,
    lastPushAt: null,
    lastLoginAt: null,
    lastSyncAt: null,
  }
  await db.syncStateLocal.put(state)
  return state
}

async function migrateLocalRowsToUser(userId: string): Promise<void> {
  for (const table of TABLE_ORDER) {
    const localTable = db.table(table.local)
    const localRows = (await localTable.toArray()).filter(
      (row) => row.userId === '__local__' && row.deletedAt === null,
    )
    if (localRows.length === 0) continue

    const cloudPayload = localRows.map((row) => toCloudRecord(table.local, row, userId))
    const { error } = await supabase.from(table.cloud).upsert(cloudPayload, { onConflict: 'id' })
    if (error) {
      throw new Error(`Silent upload failed for ${table.cloud}: ${error.message}`)
    }

    const updatedAt = nowIso()
    for (const row of localRows) {
      await localTable.update(row.id, {
        userId,
        updatedAt,
      })
    }
  }
}

async function pullTable(
  localTableName: (typeof TABLE_ORDER)[number]['local'],
  cloudTableName: (typeof TABLE_ORDER)[number]['cloud'],
  userId: string,
  lastPullAt: string | null,
): Promise<void> {
  let query = supabase.from(cloudTableName).select('*').eq('user_id', userId)
  if (lastPullAt) {
    query = query.gt('updated_at', lastPullAt)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(`Pull failed for ${cloudTableName}: ${error.message}`)
  }

  const localTable = db.table(localTableName)
  for (const cloudRow of data ?? []) {
    const local = await localTable.get(cloudRow.id)
    if (!local) {
      await localTable.put(fromCloudRecord(localTableName, cloudRow, userId))
      continue
    }

    const localUpdated = String(local.updatedAt ?? '')
    const cloudUpdated = String(cloudRow.updated_at ?? '')

    if (cloudUpdated >= localUpdated) {
      await localTable.put(fromCloudRecord(localTableName, cloudRow, userId))
    }
  }
}

async function pushTable(
  localTableName: (typeof TABLE_ORDER)[number]['local'],
  cloudTableName: (typeof TABLE_ORDER)[number]['cloud'],
  userId: string,
  lastPushAt: string | null,
): Promise<void> {
  const localTable = db.table(localTableName)
  let rows = (await localTable.toArray()).filter((row) => row.userId === userId)

  if (lastPushAt) {
    rows = rows.filter((row) => String(row.updatedAt ?? '') > lastPushAt)
  }

  if (rows.length === 0) return

  const payload = rows.map((row) => toCloudRecord(localTableName, row, userId))
  const { error } = await supabase.from(cloudTableName).upsert(payload, { onConflict: 'id' })
  if (error) {
    throw new Error(`Push failed for ${cloudTableName}: ${error.message}`)
  }
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (value === null || typeof value === 'undefined') return null
  if (value instanceof Date) return value.toISOString()
  return value
}

function toIsoDateOnly(value: Date | string | null | undefined): string | null {
  const iso = toIsoDate(value)
  if (!iso) return null
  return iso.split('T')[0]
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') return new Date(value)
  return new Date()
}

type LocalSyncRow = Record<string, unknown> & {
  id: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

type CloudSyncRow = Record<string, unknown> & {
  id: string
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

function toCloudRecord(
  localTable: (typeof TABLE_ORDER)[number]['local'],
  row: LocalSyncRow,
  userId: string,
): Record<string, unknown> {
  const base = {
    id: row.id,
    user_id: userId,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt,
  }

  switch (localTable) {
    case 'budgetGroups':
      return { ...base, name: row.name, sort_order: row.sortOrder, is_default: row.isDefault, is_active: row.isActive }
    case 'categories':
      return { ...base, name: row.name, group_id: row.groupId, is_default: row.isDefault, is_active: row.isActive }
    case 'budgetMonths':
      return { ...base, year: row.year, month: row.month, month_key: row.monthKey, expected_income: row.expectedIncome }
    case 'recurringTemplates':
      return {
        ...base,
        group_id: row.groupId,
        category_id: row.categoryId,
        name: row.name,
        planned_amount: row.plannedAmount,
        multiplier: row.multiplier,
        split_ratio: row.splitRatio,
        is_bill: row.isBill,
        due_day_of_month: row.dueDayOfMonth,
        is_active: row.isActive,
      }
    case 'budgetItems':
      return {
        ...base,
        budget_month_id: row.budgetMonthId,
        group_id: row.groupId,
        category_id: row.categoryId,
        name: row.name,
        planned_amount: row.plannedAmount,
        multiplier: row.multiplier,
        split_ratio: row.splitRatio,
        is_bill: row.isBill,
        due_date: toIsoDateOnly(row.dueDate as Date | string | null | undefined),
        is_from_template: row.isFromTemplate,
        template_id: row.templateId,
      }
    case 'billTicks':
      return {
        ...base,
        budget_month_id: row.budgetMonthId,
        budget_item_id: row.budgetItemId,
        is_paid: row.isPaid,
        paid_at: toIsoDate(row.paidAt as Date | string | null | undefined),
      }
    case 'transactions':
      return {
        ...base,
        budget_month_id: row.budgetMonthId,
        category_id: row.categoryId,
        budget_item_id: row.budgetItemId,
        amount: row.amount,
        date: toIsoDateOnly(row.date as Date | string | null | undefined),
        note: row.note,
      }
    case 'appSettings':
      return {
        ...base,
        payday_day_of_month: row.paydayDayOfMonth,
        expected_monthly_income: row.expectedMonthlyIncome,
        cloud_mode_enabled: row.cloudModeEnabled ?? false,
      }
    case 'purchaseScenarios':
      return { ...base, name: row.name, description: row.description ?? null }
    case 'scenarioExpenses':
      return {
        ...base,
        scenario_id: row.scenarioId,
        name: row.name,
        monthly_amount: row.monthlyAmount,
        sort_order: row.sortOrder,
      }
    case 'bankConfigs':
      return {
        ...base,
        bank_name: row.bankName,
        bank_code: row.bankCode,
        upload_frequency: row.uploadFrequency,
        is_active: row.isActive,
        last_upload_at: toIsoDate(row.lastUploadAt as Date | string | null | undefined),
      }
    case 'statementUploads':
      return {
        ...base,
        bank_config_id: row.bankConfigId,
        filename: row.filename,
        uploaded_at: toIsoDate(row.uploadedAt as Date | string | null | undefined),
        period_start: toIsoDate(row.periodStart as Date | string | null | undefined),
        period_end: toIsoDate(row.periodEnd as Date | string | null | undefined),
        total_transactions: row.totalTransactions,
        matched_count: row.matchedCount,
        unmatched_count: row.unmatchedCount,
      }
    default:
      return base
  }
}

function fromCloudRecord(
  localTable: (typeof TABLE_ORDER)[number]['local'],
  row: CloudSyncRow,
  userId: string,
): BudgetGroup | Category | BudgetMonth | RecurringTemplate | BudgetItem | BillTick | Transaction | AppSettings | PurchaseScenario | ScenarioExpense | BankConfig | StatementUpload {
  const base = {
    id: String(row.id),
    userId,
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  }

  switch (localTable) {
    case 'budgetGroups':
      return {
        ...base,
        name: String(row.name ?? ''),
        sortOrder: Number(row.sort_order ?? 0),
        isDefault: Boolean(row.is_default),
        isActive: Boolean(row.is_active),
      }
    case 'categories':
      return {
        ...base,
        name: String(row.name ?? ''),
        groupId: String(row.group_id ?? ''),
        isDefault: Boolean(row.is_default),
        isActive: Boolean(row.is_active),
      }
    case 'budgetMonths':
      return {
        ...base,
        year: Number(row.year ?? 0),
        month: Number(row.month ?? 0),
        monthKey: String(row.month_key ?? ''),
        expectedIncome: row.expected_income === null ? null : Number(row.expected_income ?? 0),
      }
    case 'recurringTemplates':
      return {
        ...base,
        groupId: String(row.group_id ?? ''),
        categoryId: String(row.category_id ?? ''),
        name: String(row.name ?? ''),
        plannedAmount: Number(row.planned_amount ?? 0),
        multiplier: Number(row.multiplier ?? 1),
        splitRatio: Number(row.split_ratio ?? 1),
        isBill: Boolean(row.is_bill),
        dueDayOfMonth: row.due_day_of_month === null ? null : Number(row.due_day_of_month ?? 1),
        isActive: Boolean(row.is_active),
      }
    case 'budgetItems':
      return {
        ...base,
        budgetMonthId: String(row.budget_month_id ?? ''),
        groupId: String(row.group_id ?? ''),
        categoryId: String(row.category_id ?? ''),
        name: String(row.name ?? ''),
        plannedAmount: Number(row.planned_amount ?? 0),
        multiplier: Number(row.multiplier ?? 1),
        splitRatio: Number(row.split_ratio ?? 1),
        isBill: Boolean(row.is_bill),
        dueDate: row.due_date ? toDate(row.due_date) : null,
        isFromTemplate: Boolean(row.is_from_template),
        templateId: row.template_id ? String(row.template_id) : null,
      }
    case 'billTicks':
      return {
        ...base,
        budgetMonthId: String(row.budget_month_id ?? ''),
        budgetItemId: String(row.budget_item_id ?? ''),
        isPaid: Boolean(row.is_paid),
        paidAt: row.paid_at ? toDate(row.paid_at) : null,
      }
    case 'transactions':
      return {
        ...base,
        budgetMonthId: String(row.budget_month_id ?? ''),
        categoryId: String(row.category_id ?? ''),
        budgetItemId: row.budget_item_id ? String(row.budget_item_id) : null,
        amount: Number(row.amount ?? 0),
        date: toDate(row.date),
        note: String(row.note ?? ''),
      }
    case 'appSettings':
      return {
        ...base,
        paydayDayOfMonth: Number(row.payday_day_of_month ?? 25),
        expectedMonthlyIncome: row.expected_monthly_income === null ? null : Number(row.expected_monthly_income ?? 0),
        cloudModeEnabled: Boolean(row.cloud_mode_enabled),
      }
    case 'purchaseScenarios':
      return {
        ...base,
        name: String(row.name ?? ''),
        description: row.description ? String(row.description) : undefined,
      }
    case 'scenarioExpenses':
      return {
        ...base,
        scenarioId: String(row.scenario_id ?? ''),
        name: String(row.name ?? ''),
        monthlyAmount: Number(row.monthly_amount ?? 0),
        sortOrder: Number(row.sort_order ?? 0),
      }
    case 'bankConfigs':
      return {
        ...base,
        bankName: String(row.bank_name ?? ''),
        bankCode: String(row.bank_code ?? 'fnb') as BankConfig['bankCode'],
        uploadFrequency: String(row.upload_frequency ?? 'monthly') as BankConfig['uploadFrequency'],
        isActive: Boolean(row.is_active),
        lastUploadAt: row.last_upload_at ? toDate(row.last_upload_at) : undefined,
      }
    case 'statementUploads':
      return {
        ...base,
        bankConfigId: String(row.bank_config_id ?? ''),
        filename: String(row.filename ?? ''),
        uploadedAt: toDate(row.uploaded_at),
        periodStart: toDate(row.period_start),
        periodEnd: toDate(row.period_end),
        totalTransactions: Number(row.total_transactions ?? 0),
        matchedCount: Number(row.matched_count ?? 0),
        unmatchedCount: Number(row.unmatched_count ?? 0),
      }
    default:
      return base as BudgetGroup
  }
}

export type { SyncStatus }
