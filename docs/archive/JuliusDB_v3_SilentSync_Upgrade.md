# Dexie Upgrade Plan — JuliusDB v3 (User Scoping + Silent Sync Support)

Owner: Thabo  
Goal: Upgrade JuliusDB to support:
- Silent login-based cloud upload
- Bidirectional sync
- No user-facing migration UI
- No data loss for existing users

This document contains EXACT instructions and code to safely upgrade Dexie from version 2 → version 3.

====================================================================
SECTION 1 — What We Are Adding
====================================================================

All tables must now include:

- userId: string
- createdAt: string (ISO)
- updatedAt: string (ISO)
- deletedAt?: string | null

Existing local data must NOT be deleted.

Existing rows will be stamped with:
- userId = "__local__"
- createdAt = now
- updatedAt = now
- deletedAt = null

This ensures safe upload after login.

====================================================================
SECTION 2 — JuliusDB Version 3 Upgrade
====================================================================

Add the following Dexie version AFTER version(2):

this.version(3).stores({
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
  migrationJournal: 'id, userId, status'
}).upgrade(async (tx) => {

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
    'statementUploads'
  ]

  for (const tableName of tables) {
    const table = tx.table(tableName)
    await table.toCollection().modify((record: any) => {
      if (!record.userId) record.userId = "__local__"
      if (!record.createdAt) record.createdAt = now
      if (!record.updatedAt) record.updatedAt = now
      if (!('deletedAt' in record)) record.deletedAt = null
    })
  }
})

====================================================================
SECTION 3 — Repository Write Rules (MANDATORY)
====================================================================

Every create/update must:
- set updatedAt = now
- preserve createdAt
- stamp userId from active profile

Every delete must:
- set deletedAt = now (soft delete)
- bump updatedAt

Never hard-delete rows.

All queries in UI must filter:
- where deletedAt == null

====================================================================
SECTION 4 — Login-Based Silent Migration Logic
====================================================================

When user logs in:

1) Fetch all rows where userId == "__local__"
2) Upsert those rows to Supabase under auth.uid()
3) After successful upsert:
   - Update local rows:
     record.userId = auth.uid()
     record.updatedAt = now

No wizard. No UI. Fully automatic.

====================================================================
SECTION 5 — Bidirectional Sync After Login
====================================================================

For each table (in dependency order):

Pull:
- Fetch cloud rows for user where updated_at > lastPullAt
- Insert or overwrite local if cloud.updated_at newer
- Apply soft deletes

Push:
- Fetch local rows where updatedAt > lastPushAt
- Upsert to cloud by id
- Include deletedAt

Conflict rule:
- Newest updatedAt wins
- Tie → cloud wins

====================================================================
SECTION 6 — No Data Loss Guarantee
====================================================================

This upgrade:
- Does NOT delete any existing data
- Does NOT break current offline users
- Allows safe future cloud upload
- Allows device 2 sync behavior

====================================================================
END OF DOCUMENT
====================================================================

## Execution Status

- ✅ Step 1 — Removed user-visible migration/setup UI routes and settings links. Settings now shows only account + sync status.
- ✅ Step 2 — Dexie upgraded with user scope + timestamps + soft delete fields, plus `syncStateLocal` table and backfill stamping for legacy rows.
- ✅ Step 3 — Local repositories now stamp scoped metadata on create/update and perform soft delete instead of hard delete; list queries filter `deletedAt == null` for active user.
- ✅ Step 4 — Supabase OTP auth/session provider supports login/logout + continue offline using `userId=\"__local__\"`.
- ✅ Step 5 — Supabase SQL outputs in repo (`schema.sql`, `rls.sql`, `README.md`) with no frontend setup UI.
- ✅ Step 6 — Silent local upload on first login implemented (`__local__` rows upserted to cloud, then restamped to authenticated `userId`).
- ✅ Step 7 — Bidirectional sync-on-login implemented with pull then push, conflict rule `newest updatedAt wins`, ties prefer cloud.
- ✅ Step 8 — Minimal sync status indicator added in Settings (`Offline`, `Syncing...`, `Synced ✅`, error fallback).
- ✅ Step 9 — Build verification executed (`npm run build` passes).
