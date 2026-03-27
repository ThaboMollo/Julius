# JULIUS V2 IMPLEMENTATION CHECKLIST

## 1. Domain Model

- [ ] Update [src/domain/models/index.ts](/Users/thabomollomponya/Dev/Julius/src/domain/models/index.ts) so `BudgetItem` is a planning line, not a bill surrogate.
- [ ] Extend `Transaction` with the fields V2 needs for first-run UX and later analytics:
  - [ ] `kind` (`income` | `expense`)
  - [ ] `merchant` or `payee`
  - [ ] `source` (`manual` | `commitment` | `import`)
  - [ ] `commitmentId` (nullable)
- [ ] Add a `Commitment` model for bills, debts, and subscriptions with:
  - [ ] `name`
  - [ ] `amount`
  - [ ] `dueDate`
  - [ ] `type`
  - [ ] `categoryId`
  - [ ] `isRecurring`
  - [ ] `templateId`
  - [ ] `status`
- [ ] Clarify whether `RecurringTemplate` generates monthly plan rows, commitment rows, or both.

## 2. Repository Interfaces

- [ ] Add [src/data/repositories/CommitmentRepo.ts](/Users/thabomollomponya/Dev/Julius/src/data/repositories/CommitmentRepo.ts).
- [ ] Update [src/data/repositories/TransactionRepo.ts](/Users/thabomollomponya/Dev/Julius/src/data/repositories/TransactionRepo.ts) with queries for:
  - [ ] income by month
  - [ ] transactions by commitment
  - [ ] recurring detection candidates
- [ ] Update [src/data/repositories/index.ts](/Users/thabomollomponya/Dev/Julius/src/data/repositories/index.ts) exports.

## 3. Local Database Schema

- [ ] Add a new Dexie version in [src/data/local/db.ts](/Users/thabomollomponya/Dev/Julius/src/data/local/db.ts).
- [ ] Add a `commitments` table.
- [ ] Add any idempotency journal table needed for recurring generation.
- [ ] Extend `transactions` indexes if the new fields need indexed queries.
- [ ] Keep legacy bill data readable during migration until all UI paths stop depending on it.

## 4. Local Repositories

- [ ] Add [src/data/local/CommitmentRepo.dexie.ts](/Users/thabomollomponya/Dev/Julius/src/data/local/CommitmentRepo.dexie.ts).
- [ ] Add a recurring generation journal repo if needed.
- [ ] Update [src/data/local/index.ts](/Users/thabomollomponya/Dev/Julius/src/data/local/index.ts) to export the new repos.

## 5. Data Migration

- [ ] Add V2 migration logic in [src/data/local/migrations.ts](/Users/thabomollomponya/Dev/Julius/src/data/local/migrations.ts).
- [ ] Convert existing bill-style `BudgetItem` rows into `Commitment` rows.
- [ ] Link historical bill payment transactions to `commitmentId` where possible.
- [ ] Make the migration safe to rerun without duplicate commitments or duplicate links.

## 6. Defaults And Seeding

- [ ] Replace the current defaults in [src/domain/constants/index.ts](/Users/thabomollomponya/Dev/Julius/src/domain/constants/index.ts):
  - [ ] Groups: `Needs`, `Wants`, `Savings`, `Liabilities`
  - [ ] Categories from `V2_PLAN.md`
- [ ] Decide whether `Uncategorised` stays as an import-only technical category.
- [ ] Update [src/data/local/seed.ts](/Users/thabomollomponya/Dev/Julius/src/data/local/seed.ts) so seeding is idempotent per user.
- [ ] Ensure existing users do not get duplicate default groups/categories after the V2 rollout.

## 7. Month Bootstrapping

- [ ] Update the implementation behind [src/data/repositories/BudgetMonthRepo.ts](/Users/thabomollomponya/Dev/Julius/src/data/repositories/BudgetMonthRepo.ts).
- [ ] Ensure `getOrCreate(year, month)` always guarantees:
  - [ ] defaults exist
  - [ ] the month exists
  - [ ] required recurring instances for that month exist exactly once
- [ ] Keep this process idempotent on repeated app opens.

## 8. Rules Layer

- [ ] Add a canonical `safeToSpend` calculation under [src/domain/rules](/Users/thabomollomponya/Dev/Julius/src/domain/rules).
- [ ] Add helpers for:
  - [ ] total income
  - [ ] commitments due
  - [ ] unpaid commitments
  - [ ] savings protected
  - [ ] discretionary spend
- [ ] Replace bill-specific rules with commitment-aware rules.
- [ ] Ensure no rule depends on planned amounts being nonzero unless that dependency is explicit.

## 9. Dashboard / Home

- [ ] Refactor [src/pages/dashboard/DashboardPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/dashboard/DashboardPage.tsx) into the V2 home screen.
- [ ] Replace `Remaining until payday` with `Safe to spend`.
- [ ] Make first-run usable without setup:
  - [ ] prompt to add income
  - [ ] primary `+ Add Expense` action
- [ ] Add sections for:
  - [ ] safe to spend
  - [ ] potential savings / spending to review
  - [ ] upcoming commitments
  - [ ] recent transactions
- [ ] Remove the current setup-heavy empty state.

## 10. Transaction Flow

- [ ] Update [src/pages/transactions/TransactionModal.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/transactions/TransactionModal.tsx) to support:
  - [ ] `income` and `expense`
  - [ ] merchant/payee
  - [ ] auto-filled but editable date
  - [ ] optional note
- [ ] Keep the fast path to amount + category + save.
- [ ] Update [src/pages/transactions/TransactionsPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/transactions/TransactionsPage.tsx) to display the richer transaction model.

## 11. Planning UI

- [ ] Refactor [src/pages/budget/BudgetPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/budget/BudgetPage.tsx) so it is clearly a planning surface, not a prerequisite for usage.
- [ ] Remove bill-specific assumptions from item rendering and editing.
- [ ] Keep planned amounts separate from the source-of-truth transaction and commitment logic.
- [ ] Update [src/pages/budget/BudgetItemModal.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/budget/BudgetItemModal.tsx) to match the new role of `BudgetItem`.

## 12. Commitments UI

- [ ] Refactor [src/pages/bills/BillsPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/bills/BillsPage.tsx) into a commitments page.
- [ ] Show bills, debts, and subscriptions in one model and one list.
- [ ] Define the payment interaction clearly:
  - [ ] paying a commitment creates or links one transaction
  - [ ] repeated taps do not duplicate records
- [ ] Remove direct dependence on `BillTick` after migration is complete.

## 13. Recurring Generation

- [ ] Update recurring logic around [src/data/repositories/TemplateRepo.ts](/Users/thabomollomponya/Dev/Julius/src/data/repositories/TemplateRepo.ts).
- [ ] Decide and document whether each recurring template generates:
  - [ ] a monthly plan row
  - [ ] a monthly commitment
  - [ ] both
- [ ] Add a stable generation key such as `templateId + monthKey`.
- [ ] Persist generated-instance tracking so app open and sync replay are idempotent.

## 14. Sync

- [ ] Update [src/sync/SyncOrchestrator.ts](/Users/thabomollomponya/Dev/Julius/src/sync/SyncOrchestrator.ts) to include the new V2 tables.
- [ ] Add deduplication rules for:
  - [ ] default groups/categories
  - [ ] generated recurring rows
  - [ ] commitments created from migrated bills
- [ ] Define conflict handling for edits made on multiple devices.
- [ ] Keep silent upload from duplicating seeded records on first login.

## 15. Settings And Configuration

- [ ] Review [src/pages/settings/SettingsPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/settings/SettingsPage.tsx).
- [ ] Keep only settings that still make sense in V2.
- [ ] Remove language that suggests the product must be configured before use.
- [ ] Review [src/pages/settings/ConfigurationsPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/settings/ConfigurationsPage.tsx) and keep advanced configuration accessible but secondary.

## 16. App Shell And Navigation

- [ ] Update navigation labels in:
  - [ ] [src/App.tsx](/Users/thabomollomponya/Dev/Julius/src/App.tsx)
  - [ ] [src/app/Layout.tsx](/Users/thabomollomponya/Dev/Julius/src/app/Layout.tsx)
  - [ ] [src/app/NavDrawer.tsx](/Users/thabomollomponya/Dev/Julius/src/app/NavDrawer.tsx)
- [ ] Rename `Bills` to `Commitments` where appropriate.
- [ ] Make the home entry point emphasize quick logging.

## 17. Tests

- [ ] Add or update tests for:
  - [ ] default seeding
  - [ ] month bootstrapping
  - [ ] V2 migration from bills to commitments
  - [ ] idempotent recurring generation
  - [ ] `safeToSpend`
  - [ ] income transaction creation
  - [ ] expense transaction creation
  - [ ] sync dedup after login
- [ ] If needed, set up a test harness before the deeper refactors land.

## 18. Suggested Delivery Order

1. [ ] `src/domain/models/index.ts`
2. [ ] `src/data/repositories/*`
3. [ ] `src/data/local/db.ts`
4. [ ] `src/data/local/*Repo.dexie.ts`
5. [ ] `src/data/local/migrations.ts`
6. [ ] `src/domain/constants/index.ts`
7. [ ] `src/data/local/seed.ts`
8. [ ] `src/domain/rules/*`
9. [ ] `src/pages/dashboard/DashboardPage.tsx`
10. [ ] `src/pages/transactions/*`
11. [ ] `src/pages/budget/*`
12. [ ] `src/pages/bills/BillsPage.tsx`
13. [ ] `src/sync/SyncOrchestrator.ts`
14. [ ] `src/pages/settings/*`
15. [ ] app shell and navigation
16. [ ] tests

## 19. Suggested PR Breakdown

- [ ] PR 1: schema, repos, Dexie migration, defaults, seed logic
- [ ] PR 2: rules, dashboard, transaction flow, first-run UX
- [ ] PR 3: commitments, recurring generation, sync dedup, settings cleanup
