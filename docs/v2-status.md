# V2 Implementation Status (audited 2026-04-25)

This is the source of truth for what V2 work is actually done.
`V2_IMPLEMENTATION_CHECKLIST.md` (now archived) was a planning artifact and
its checkboxes were never updated as work shipped — do not trust it.

## Summary

- **Shipped: 54** items
- **Partial: 8** items
- **Missing: 4** items
- **Total: 66** material items audited (some checklist items collapsed where redundant)

**V2 is functionally ~82% complete.** Most of the remaining gaps are
non-functional (tests, conflict-resolution policy, post-migration cleanup,
documentation of inference rules), not feature work.

## Section 1 — Domain Model

| Item | State | Evidence | Action |
|---|---|---|---|
| BudgetItem is planning line, not bill surrogate | Shipped | `src/domain/models/index.ts:45-58`; `isBill` is an optional flag, identity is planning | none |
| `Transaction.kind` (income\|expense) | Shipped | `src/domain/models/index.ts:69`; `TransactionKind` type | none |
| `Transaction.merchant` | Shipped | `src/domain/models/index.ts:71` | none |
| `Transaction.source` (manual\|commitment\|import) | Shipped | `src/domain/models/index.ts:70`; `TransactionSource` type | none |
| `Transaction.commitmentId` (nullable) | Shipped | `src/domain/models/index.ts:66` | none |
| `Commitment` model (name, amount, dueDate, type, categoryId, isRecurring, templateId, status) | Shipped | `src/domain/models/index.ts:75-89`; all required fields present | none |
| `RecurringTemplate.targetKind` clarified | Partial | `src/domain/models/index.ts:112`; field exists; `seed.ts:33` infers via `targetKind ?? (isBill ? 'commitment' : 'budget_item')` | document inference as stable contract OR make targetKind required |

## Section 2 — Repository Interfaces

| Item | State | Evidence | Action |
|---|---|---|---|
| `CommitmentRepo` interface | Shipped | `src/data/repositories/CommitmentRepo.ts:1-12` | none |
| `TransactionRepo.getIncomeByMonth` | Shipped | `src/data/repositories/TransactionRepo.ts:6` | none |
| `TransactionRepo.getByCommitment` | Shipped | `src/data/repositories/TransactionRepo.ts:8` | none |
| `TransactionRepo.getRecurringCandidates` | Shipped | `src/data/repositories/TransactionRepo.ts:10` | none |
| Repository exports updated | Shipped | `src/data/repositories/index.ts` | none |

## Section 3 — Local Database Schema

| Item | State | Evidence | Action |
|---|---|---|---|
| New Dexie version with V2 tables | Shipped | `src/data/local/db.ts:131-169`; v6 with commitments + journal | none |
| `commitments` table | Shipped | `src/data/local/db.ts:28` | none |
| `recurringGenerationJournal` table | Shipped | `src/data/local/db.ts:31`; compound index `[userId+templateId+monthKey+outputKind]` | none |
| Transaction indexes for V2 fields | Shipped | `src/data/local/db.ts:137`; commitmentId, kind, source indexed | none |
| Legacy bill data readable during migration | Shipped | `src/data/local/db.ts:44-169`; all prior versions retained | none |

## Section 4 — Local Repositories

| Item | State | Evidence | Action |
|---|---|---|---|
| `CommitmentRepo.dexie.ts` | Shipped | `src/data/local/CommitmentRepo.dexie.ts:10-49`; getByMonth, getByStatus, getByLegacyBudgetItemId | none |
| Recurring generation journal repo | Shipped | `src/data/local/seed.ts:24-29`; `generationJournalId()` + journal writes | none |
| Local index updated | Shipped | `src/data/local/index.ts:7` | none |

## Section 5 — Data Migration

| Item | State | Evidence | Action |
|---|---|---|---|
| V2 migration in `migrations.ts` | Shipped | `src/data/local/migrations.ts:38-84`; `migrateLegacyBillsToCommitments()` | none |
| Bill-style BudgetItems → Commitments | Shipped | `src/data/local/migrations.ts:38-84` | none |
| Historical transactions linked to `commitmentId` | Shipped | `src/data/local/migrations.ts:74-78` | none |
| Migration idempotent | Shipped | `src/data/local/migrations.ts:50`; checks `existingCommitment` + localStorage sentinels | none |
| Paid bills → transactions migration | Shipped | `src/data/local/migrations.ts:7-36` | none |

## Section 6 — Defaults and Seeding

| Item | State | Evidence | Action |
|---|---|---|---|
| `DEFAULT_GROUPS = [Needs, Wants, Savings, Liabilities]` | Shipped | `src/domain/constants/index.ts:2-7` | none |
| `DEFAULT_CATEGORIES` per V2_PLAN | Shipped | `src/domain/constants/index.ts:10-38`; matches spec | none |
| Uncategorised stays import-only | Shipped | `src/domain/constants/index.ts:59`; `seed.ts:117` marks Imports group inactive except Income | none |
| Idempotent seeding per user | Shipped | `src/data/local/seed.ts:43-126`; `findLiveGroupByName()` + userId scope | none |
| No duplicate defaults after rollout | Shipped | `LEGACY_DEFAULT_GROUP_RENAMES` handles "Should Die" → "Wants" | none |

## Section 7 — Month Bootstrapping

| Item | State | Evidence | Action |
|---|---|---|---|
| `getOrCreate` guarantees defaults exist | Shipped | `src/data/local/BudgetMonthRepo.dexie.ts:27-58`; calls `ensureMonthBootstrap()` | none |
| Month exists guarantee | Shipped | `BudgetMonthRepo.dexie.ts:33` | none |
| Recurring instances exactly once | Shipped | `seed.ts:128-239`; journal check via `generationJournalId(templateId, monthKey, outputKind)` | none |
| Idempotent on repeated app opens | Shipped | `seed.ts:142`; existing-journal check skips re-generation | none |

## Section 8 — Rules Layer

| Item | State | Evidence | Action |
|---|---|---|---|
| `safeToSpend` exists | Shipped | `src/domain/rules/index.ts:412-427`; `(items, transactions, commitments, categories, groups) → number` | none |
| `totalIncome` helper | Shipped | `src/domain/rules/index.ts:53-55` | none |
| `commitmentsProtected` helper | Shipped | `src/domain/rules/index.ts:381-399`; sums Needs + Liabilities | none |
| `unpaidCommitments` filter | Shipped | `src/domain/rules/index.ts:314-323`; `getUpcomingCommitments` | none |
| `savingsProtected` helper | Shipped | `src/domain/rules/index.ts:375-379` | none |
| `discretionaryExpensesRecorded` helper | Shipped | `src/domain/rules/index.ts:401-410` | none |
| Rules robust to zero/null planned amounts | Shipped | early-return guards throughout | none |

## Section 9 — Dashboard / Home

All items **Shipped**. `src/pages/dashboard/DashboardPage.tsx`:

- L204 — exact text "Safe to spend" in `HomeHeroCard`
- L120-136 — potential savings section
- L138-155 — upcoming commitments section
- L158-184 — recent transactions section
- L91-108 — primary "+ Add Expense" + "+ Add Income" actions
- L265-282 — minimal `EmptyStartCard`, no setup-heavy empty state
- L270 — copy: "You do not need to set up a budget before using the app."

## Section 10 — Transaction Flow

All items **Shipped**. `src/pages/transactions/TransactionModal.tsx`:

- L50, 76-83 — kind toggle (expense/income) with two-button UI
- L59 — merchant input
- L52-54 — date defaults to today, editable
- L60 — optional note
- L174-189 — minimal-required-inputs fast path

## Section 11 — Planning UI

All items **Shipped**. `BudgetPage.tsx` is a clear planning surface; `BudgetItemModal.tsx:44` treats `isBill` as optional flag, not core identity. Planned vs actual cleanly separated.

## Section 12 — Commitments UI

| Item | State | Evidence | Action |
|---|---|---|---|
| BillsPage refactored to CommitmentsPage | Shipped | `src/pages/bills/BillsPage.tsx:21-100+`; exports `CommitmentsPage()` | optional: rename directory `bills/` → `commitments/` for consistency |
| Bills/debts/subscriptions unified | Shipped | `commitmentRepo.getByMonth()` returns `Commitment[]` with `type` field | none |
| Payment creates/links one transaction | Shipped | `BillsPage.tsx:76-100`; `togglePaid` → handler creates or updates linked tx | none |
| Repeated taps don't duplicate | Shipped | `BillsPage.tsx:79-90`; `paidTransactionId` check before create | none |
| No direct BillTick dependence | Partial | `src/data/local/BillTickRepo.dexie.ts` still exists; CommitmentsPage doesn't use it | post-migration cleanup: archive/soft-delete BillTick records once migration window closes |
| Nav label "Commitments" | Shipped | `src/App.tsx:7, 74`; `/bills` → `/commitments` redirect at L73 | none |

## Section 13 — Recurring Generation

| Item | State | Evidence | Action |
|---|---|---|---|
| TemplateRepo recurring logic updated | Shipped | `seed.ts:128-239`; handles both budget_item and commitment outputs | none |
| Stable generation key | Shipped | `seed.ts:24-29`; `generationJournalId(templateId, monthKey, outputKind)` | none |
| Per-template targetKind decision | Partial | inferred via fallback; not always explicit | document inference rule OR make required |
| Generated-instance tracking persisted | Shipped | `db.ts:141`; journal table | none |
| App-open + sync replay idempotent | Shipped | `seed.ts:141-143`; existing-journal short-circuit | none |

## Section 14 — Sync

| Item | State | Evidence | Action |
|---|---|---|---|
| SyncOrchestrator includes V2 tables | Shipped | `src/sync/SyncOrchestrator.ts:23-37`; `TABLE_ORDER` includes commitments | none |
| Dedup: default groups/categories | Shipped | `seed.ts:36-126` | none |
| Dedup: generated recurring rows | Shipped | journal check | none |
| Dedup: commitments from migrated bills | Shipped | `migrations.ts:50`; `getByLegacyBudgetItemId` check | none |
| **Conflict handling for multi-device edits** | **Missing** | no documented LWW/CRDT/merge strategy in SyncOrchestrator | **Phase 2: implement hardened LWW with documented policy** |
| Silent upload dedup on first login | Shipped | `SyncOrchestrator.ts:116-150`; `migrateLocalRowsToUser` + `deduplicateLocalData` | none |

## Section 15 — Settings and Configuration

All items **Shipped**. `src/pages/settings/SettingsPage.tsx` retains payday, expected income, theme, sync, API key. No "must configure before use" copy. `ConfigurationsPage` accessible via direct route only.

## Section 16 — App Shell and Navigation

All items **Shipped**.

- `App.tsx:7, 74` — `CommitmentsPage` imported and routed to `/commitments`
- `App.tsx:73` — `/bills` redirects to `/commitments`
- `BottomNav.tsx:3-8` — primary nav: Home, Transactions, Planner, Settings (no Bills)
- DashboardPage primary actions are quick-log buttons

## Section 17 — Tests

All items **Missing**. No test files anywhere in `src/`. **Phase 2 of the remediation plan is the test harness build-out.**

Required tests:
- Default seeding idempotency
- Month bootstrapping
- V2 migration (bills → commitments)
- Idempotent recurring generation
- `safeToSpend`
- Income/expense transaction creation
- Sync dedup after login

## Action Items (consolidated)

### Critical (Phase 2 — stability foundation PR)

1. **Define and implement sync conflict-resolution policy** — hardened last-write-wins with documented rules. Fix the orphaned-migration bug and the premature-checkpoint bug at the same time. Add retry queue + outbox.
2. **Add Vitest + RTL + fake-indexeddb harness** with the seven test categories above (~30 tests).

### Cleanup (Phase 3 — small now, since V2 is mostly shipped)

3. **Rename `src/pages/bills/` → `src/pages/commitments/`** for directory consistency (route is already `/commitments`).
4. **Document `targetKind` inference rule** OR make `RecurringTemplate.targetKind` a required field.
5. **BillTick post-migration cleanup** — soft-delete archive once migration window closes (or leave indefinitely as safety net).
6. **Update README.md** to reflect actual V2 state (this audit moves the goal posts — README still describes V1).

### Quality (Phase 4)

7. Strict TS, jsx-a11y, route splitting, CI workflow.

## What this audit changes about the remediation plan

**Phase 3 is dramatically smaller than originally planned.** The plan was
written under the assumption that V2 had substantial UI gaps. In reality,
the V2 UI is shipped; only directory hygiene (`bills/` → `commitments/`)
and inference-rule documentation remain. We can fold most of Phase 3 into
Phase 2's PR or address it in a small follow-up PR.

**Phase 2 remains the real work** — sync hardening, error boundary,
observability, and the test harness — and now also bears the burden of
defining the conflict-resolution policy that V2 deferred.
