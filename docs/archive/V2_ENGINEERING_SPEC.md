# JULIUS V2 ENGINEERING SPEC

Owner: Thabo  
Status: Draft for implementation  
Primary reference: [V2_PLAN.md](/Users/thabomollomponya/Dev/Julius/V2_PLAN.md)  
Execution checklist: [V2_IMPLEMENTATION_CHECKLIST.md](/Users/thabomollomponya/Dev/Julius/V2_IMPLEMENTATION_CHECKLIST.md)

## 1. Objective

Julius V2 must reduce onboarding friction to near-zero while preserving the current local-first architecture and avoiding destructive migration behavior.

The product goal is:
- users can open the app and use it immediately
- users do not need to configure a system before recording money activity
- complexity is progressively revealed after first value is delivered

## 2. Non-Negotiable Constraints

- Existing local data must not be lost.
- Migration logic must be idempotent.
- First-run bootstrapping must be idempotent.
- Sync must not silently duplicate seeded defaults or generated recurring records.
- `Safe to spend` must be computed from clearly defined data, not implied from placeholder budget rows.
- V2 must remain usable without authentication.

## 3. Product Decisions Locked For V2

These decisions should be treated as settled unless the product direction changes explicitly.

### 3.1 Default groups

V2 default budget groups:
- `Needs`
- `Wants`
- `Savings`
- `Liabilities`

These are auto-created on first use and are editable later. They should not be deletable during initial bootstrapping.

### 3.2 Default categories

Default categories:

`Needs`
- `Rent`
- `Groceries`
- `Transport`
- `Utilities`
- `Insurance`

`Wants`
- `Entertainment`
- `Subscriptions`
- `Eating Out`
- `Shopping`

`Savings`
- `Emergency Fund`
- `Investments`

`Liabilities`
- `Credit Card`
- `Personal Loan`
- `Car Payment`
- `Debt Repayment`

### 3.3 First-run UX

On first open the app must:
- create default groups
- create default categories
- create the current month record
- make the home screen usable without any further setup

The first screen must present:
- `Safe to spend`
- a prompt to add income if no income exists
- a primary `+ Add Expense` action

### 3.4 Planning versus recording

Budget planning is secondary in V2.

Users must be able to:
- record an expense immediately
- record income immediately
- review commitments immediately

Users must not be required to:
- create templates
- configure categories
- add budget lines before logging activity

### 3.5 Commitments model

`Bills`, `debts`, and `subscriptions` are unified into `Commitments`.

The commitment concept must support:
- name
- amount
- due date
- type
- category
- recurring or one-off behavior
- payment state

### 3.6 Waste detection framing

V2 should not ship with hard judgmental messaging like "You are wasting".

Initial V2 language should be neutral:
- `Potential savings`
- `Spending to review`

### 3.7 Deferred scope

These are out of scope for initial V2 delivery:
- advanced reports
- bank uploads as a required V2 dependency
- multi-account budgeting

## 4. Domain Model Specification

### 4.1 `BudgetMonth`

`BudgetMonth` remains the container for a calendar month.

Requirements:
- unique per `userId + monthKey`
- created automatically on access
- stores planning context for that month

Acceptance criteria:
- opening the same month twice does not create duplicates
- a month always exists before month-scoped UI loads

### 4.2 `BudgetItem`

`BudgetItem` is a monthly planning row only.

It must represent:
- a category allocation or target
- optional user-defined naming within the month

It must not be the canonical representation of:
- a bill payment
- a subscription instance
- a debt tracking item

Acceptance criteria:
- deleting or editing a `BudgetItem` does not delete transactions
- the commitments UI does not depend on `BudgetItem.isBill`

### 4.3 `Transaction`

`Transaction` becomes the canonical record of recorded money movement.

Required fields:
- `id`
- `budgetMonthId`
- `categoryId`
- `amount`
- `date`
- `kind` = `income | expense`
- `merchant` or `payee`
- `note`
- `source` = `manual | commitment | import`
- `budgetItemId` nullable
- `commitmentId` nullable

Behavior:
- income and expense must both be supported
- manual entry should default `source = manual`
- payment of a commitment should set `source = commitment`

Acceptance criteria:
- users can create income without creating a budget item first
- users can create expense without creating a budget item first
- transactions linked to commitments remain linked after reload and sync

### 4.4 `Commitment`

Add a new `Commitment` model.

Required fields:
- `id`
- `budgetMonthId`
- `categoryId`
- `name`
- `amount`
- `dueDate`
- `type` = `bill | debt | subscription | other`
- `status` = `upcoming | paid | skipped | overdue`
- `isRecurring`
- `templateId` nullable

Optional fields:
- `paidTransactionId` nullable
- `notes`

Behavior:
- commitments are month-specific instances
- recurring commitments are generated from templates
- one commitment can link to at most one payment transaction in V2

Acceptance criteria:
- the commitments list can render without referencing `BillTick`
- marking a commitment paid twice does not create two payment transactions

### 4.5 `RecurringTemplate`

`RecurringTemplate` stays as the reusable generator definition.

Decision for V2:
- a recurring template may generate a monthly `BudgetItem`
- a recurring template may generate a monthly `Commitment`
- each template must declare which output it generates

Required additional rule:
- generated rows must carry a stable generation identity, for example `templateId + monthKey + outputType`

Acceptance criteria:
- opening the app multiple times in the same month does not create duplicate generated rows
- sync replay does not create duplicate generated rows

## 5. Data Semantics

### 5.1 Source of truth

The source of truth for actual cash movement is `Transaction`.

The source of truth for scheduled obligations is `Commitment`.

The source of truth for planned category intent is `BudgetItem`.

### 5.2 Category membership

Transactions and commitments must both belong to a category.

Budget items must belong to a category and derive their group through that category or keep the current group reference until refactoring is complete.

### 5.3 Local-only bootstrapping

Seeded defaults must be deterministic.

A seeded record must be identifiable as a default so sync deduplication can distinguish:
- seeded default records
- user-created records

## 6. Safe To Spend Specification

### 6.1 Problem statement

The current V2 plan formula is too ambiguous if planned rows default to zero.

V2 therefore needs a concrete operational definition.

### 6.2 V2 definition

`Safe to spend` is the amount of money that can still be used for discretionary spending in the current month.

Initial formula for implementation:

`safeToSpend = totalRecordedIncome - unpaidNeedCommitments - unpaidLiabilityCommitments - savingsTargets - discretionaryExpensesRecorded`

Definitions:
- `totalRecordedIncome`: sum of `Transaction.kind === income` for the selected month
- `unpaidNeedCommitments`: unpaid `Commitment.amount` where the category is in `Needs`
- `unpaidLiabilityCommitments`: unpaid `Commitment.amount` where the category is in `Liabilities`
- `savingsTargets`: total planned `BudgetItem` amounts in the `Savings` group for the selected month
- `discretionaryExpensesRecorded`: sum of expense transactions in `Wants`

Implementation note:
- if no income has been recorded, `safeToSpend` defaults to `0`
- the value may go negative

Acceptance criteria:
- with no income, `safeToSpend` shows `0`
- adding income updates `safeToSpend` immediately
- paying or recording a need/liability reduces the outstanding protected amount correctly
- the number turns negative when protected obligations exceed available income

## 7. First-Run Home Screen Specification

The home screen must be the fastest path to value.

Required sections:
- `Safe to spend`
- `Potential savings`
- `Upcoming commitments`
- `Recent transactions`
- primary `+ Add Expense` action

Required first-run behavior:
- no dead-end empty state
- if no income exists, show prompt to add income
- if no expenses exist, still show working categories and actions

Acceptance criteria:
- a first-time user can record an expense in one primary flow without navigating to settings
- a first-time user can find where to add income from the home screen

## 8. Transaction Capture Specification

### 8.1 Add expense

Required minimum flow:
1. enter amount
2. select category
3. save

Additional fields may be visible or progressively disclosed:
- date
- merchant or payee
- note
- optional plan link

### 8.2 Add income

Income must be a first-class transaction flow, not only a settings value.

Requirements:
- user can record amount and date quickly
- the transaction is clearly marked as income
- income affects `safeToSpend` immediately

Acceptance criteria:
- recording income does not require creating a category manually
- income appears in recent transactions

## 9. Commitments Specification

### 9.1 List behavior

The commitments surface must show:
- upcoming commitments
- overdue commitments
- paid commitments

It must support:
- filtering by status
- marking paid
- opening an item to edit

### 9.2 Payment behavior

Paying a commitment must either:
- create one linked transaction, or
- attach one existing transaction

V2 default behavior:
- marking paid from the commitment list creates one linked expense transaction using the commitment amount, category, and due date as defaults

Acceptance criteria:
- repeated payment actions do not duplicate the linked transaction
- unpaying a commitment does not silently delete unrelated transactions

## 10. Recurring Generation Specification

Recurring generation must be deterministic and idempotent.

Rules:
- generated rows are derived from templates
- generation happens on month bootstrap
- generation identity must be persisted
- generation must tolerate app reload, offline usage, and sync replay

Acceptance criteria:
- the same template produces at most one matching monthly instance per output type
- sync pull of a generated row does not cause the local generator to create another copy

## 11. Migration Specification

### 11.1 Legacy compatibility

Current bill-centric data must remain readable during migration.

Migration strategy:
- add new tables and fields first
- backfill commitments from legacy bill-shaped rows
- link payment transactions where possible
- switch reads to the new model
- only then deprecate legacy bill reads

### 11.2 Mapping rules

Legacy mappings:
- `BudgetItem.isBill === true` -> candidate `Commitment`
- `BillTick.isPaid === true` -> `Commitment.status = paid`
- linked bill transaction -> `paidTransactionId` or `commitmentId`

Acceptance criteria:
- existing users still see their bill-like items after upgrade
- a migrated paid bill does not appear both unpaid and paid
- rerunning migration does not create duplicate commitments

## 12. Sync Specification

### 12.1 Silent upload limits

Silent upload is allowed only when deterministic deduplication exists.

Cases that must be handled:
- local defaults uploaded into an empty cloud account
- authenticated user already has cloud defaults
- generated recurring rows exist both locally and in cloud

### 12.2 Conflict rules

Initial V2 conflict rule:
- last write wins by `updatedAt`
- if timestamps are equal, prefer cloud

Additional dedup keys:
- seeded defaults by logical default identity
- recurring rows by generation key
- migrated commitments by legacy source identity

Acceptance criteria:
- login does not create duplicate default groups
- login does not create duplicate monthly generated rows
- sync does not orphan linked commitment transactions

## 13. Settings And Navigation Specification

Settings must support the product, not front-load setup.

Requirements:
- keep only settings still required for V2 behavior
- remove copy that suggests the app is configuration-first
- keep advanced configuration accessible but not central

Navigation requirements:
- `Bills` becomes `Commitments`
- home route should clearly act as the quick action surface

Acceptance criteria:
- a new user can ignore settings entirely and still use the product

## 14. Observability And Metrics

Track at minimum:
- time to first expense
- time to first income
- whether the user reached home with a usable bootstrapped state

Operational definition for retention metric:
- replace "High Day 1 retention" with a measurable target before release planning

## 15. Out Of Scope For Initial Build

- aggressive AI-based waste judgments
- hard dependency on bank imports
- multi-account cash-flow modeling
- deletion of legacy bill tables during the same rollout as the first V2 UI migration

## 16. Delivery Gates

### Gate 1: Schema ready

Must be true before UI refactor starts:
- domain types updated
- Dexie schema updated
- migration written
- seed behavior updated

### Gate 2: Core UX ready

Must be true before commitments refactor lands:
- home screen shows `Safe to spend`
- income capture works
- expense capture works
- first-run is usable without setup

### Gate 3: Commitments ready

Must be true before V2 rollout:
- commitments list works
- payment flow is idempotent
- recurring generation is idempotent
- sync dedup covers defaults and recurring rows

## 17. Test Requirements

Minimum automated coverage should verify:
- seeded defaults are created once
- month bootstrap is idempotent
- `safeToSpend` produces expected values
- income and expense transaction creation both work
- migrated bill data becomes commitments without duplication
- recurring generation is idempotent
- sync login path does not duplicate defaults or generated rows

## 18. Recommended Implementation Order

1. domain model changes
2. repository contracts
3. local database schema and migration
4. seed/default updates
5. rules layer
6. transaction flows
7. home/dashboard
8. commitments UI
9. recurring generation hardening
10. sync dedup hardening
11. settings and navigation cleanup
12. tests and rollout validation
