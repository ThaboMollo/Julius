# Spending Tracker PWA — Agent Roadmap (Local‑First Option A)

Owner: Thabo (ZAR, payday 25th)  
Objective: Build an **offline‑first, installable PWA** to replace a manual notes budget.  
V1 is **local-only** (IndexedDB). No bank sync, no CSV import, no accounts, no cash — those are future phases.

> This document is a **checklist roadmap**. The agent must work top‑down and tick items as completed.  
> Each phase has: **Goal → Steps → Deliverables → Acceptance checks**.

---

## ✅ Definition of Done (V1)

- App installs as a PWA, works offline, loads fast.
- User can manage:
  - Budget groups (default Needs + Should Die; can add more)
  - Categories
  - Recurring templates (monthly)
  - Monthly budget items (one‑off and from templates)
  - Transactions (manual: amount + date)
  - Bills list with due dates and manual paid tick
- Required pages exist and are functional:
  - Dashboard, Budget, Bills, Timeline, Transactions, Settings
- Dashboard headline KPI: **Remaining until payday** (or equivalent when income not provided).
- Supports multipliers and split ratios:
  - effectivePlanned = plannedAmount * multiplier * splitRatio

---

## 0) Guardrails (READ FIRST)

### Do NOT build in V1
- CSV upload/import
- Bank accounts
- Cash spending
- Authentication / cloud sync
- Push notifications (Phase 1.1 only)

### Minimal fields for V1 transactions
- `amount`, `date` required
- category required
- budget item selection: **required when possible**
  - if category has items this month, prompt/select item

---

## 1) Phase 1 — Repo Bootstrap & Tooling

**Goal:** Create a clean, reliable base project with PWA support.

### Steps
- [ ] Create Vite React TS project
- [ ] Install dependencies:
  - [ ] react-router-dom
  - [ ] dexie
  - [ ] date-fns
  - [ ] vite-plugin-pwa
  - [ ] (optional) tailwindcss + postcss + autoprefixer OR MUI (pick ONE)
  - [ ] eslint + prettier config (or keep Vite default + minimal Prettier)
- [ ] Add folder structure (see Phase 2)
- [ ] Configure routes & base layout (Nav)
- [ ] Configure PWA:
  - [ ] manifest (name, short_name, theme_color, icons)
  - [ ] service worker registration
  - [ ] offline caching for app shell

### Deliverables
- [ ] App runs locally with `npm/yarn dev`
- [ ] `npm/yarn build` + `npm/yarn preview` works

### Acceptance checks
- [ ] Lighthouse shows “Installable” (or PWA install prompt appears)
- [ ] App loads without network after first load (airplane mode test)

---

## 2) Phase 2 — Architecture Skeleton (UI/Domain/Data/PWA)

**Goal:** Establish the layered architecture so the app scales without chaos.

### Steps
- [ ] Create directories:
```
src/
  app/ (routes, providers, layout)
  pages/ (dashboard, budget, bills, timeline, transactions, settings)
  components/ (common + feature folders)
  domain/ (models, rules, constants)
  data/
    repositories/ (interfaces)
    local/ (dexie db + repo impl)
  pwa/ (registerSW.ts)
  utils/
```
- [ ] Add a basic top nav + month selector placeholder (no logic yet)

### Deliverables
- [ ] Empty pages render via routing
- [ ] Shared layout and nav works

### Acceptance checks
- [ ] Navigating between pages works without errors
- [ ] Build passes

---

## 3) Phase 3 — Domain Models + Rules

**Goal:** Define the shapes and calculations once, then reuse everywhere.

### Steps
- [ ] Define TypeScript models in `src/domain/models/`
  - [ ] BudgetGroup
  - [ ] Category
  - [ ] BudgetMonth
  - [ ] BudgetItem
  - [ ] Transaction
  - [ ] BillTick
  - [ ] RecurringBudgetTemplate
- [ ] Add constants in `src/domain/constants/`:
  - [ ] Default groups: Needs, Should Die
  - [ ] Default categories list
  - [ ] Payday default = 25
- [ ] Implement rules in `src/domain/rules/`:
  - [ ] `effectivePlanned(item)`
  - [ ] aggregate planned totals by group/category/item
  - [ ] aggregate actual totals by category/item
  - [ ] overspend detection (leaks)
  - [ ] payday date calc + remaining until payday calc
  - [ ] timeline projection list (events)

### Deliverables
- [ ] Domain functions covered with quick unit tests OR a simple `rules.sanity.ts` runner

### Acceptance checks
- [ ] effective planned matches:
  - planned=600, multiplier=1, split=0.5 → 300
  - planned=2839.76, multiplier=2, split=1 → 5679.52

---

## 4) Phase 4 — Local Database (Dexie) + Repositories

**Goal:** Local-first persistence with clean abstractions.

### Steps
- [ ] Create Dexie DB in `src/data/local/db.ts`
- [ ] Define tables:
  - [ ] budgetMonths
  - [ ] budgetGroups
  - [ ] categories
  - [ ] budgetItems
  - [ ] transactions
  - [ ] billTicks
  - [ ] recurringTemplates
- [ ] Add indexes:
  - [ ] budgetItems: `[budgetMonthId+groupId]`, `budgetMonthId`, `categoryId`, `isBill`
  - [ ] transactions: `date`, `categoryId`, `budgetItemId`
  - [ ] billTicks: `[budgetMonthId+budgetItemId]`
- [ ] Create repository interfaces in `src/data/repositories/`:
  - [ ] BudgetMonthRepo
  - [ ] BudgetItemRepo
  - [ ] TransactionRepo
  - [ ] BillTickRepo
  - [ ] TemplateRepo
- [ ] Create Dexie implementations in `src/data/local/`:
  - [ ] BudgetMonthRepo.dexie.ts
  - [ ] BudgetItemRepo.dexie.ts
  - [ ] TransactionRepo.dexie.ts
  - [ ] BillTickRepo.dexie.ts
  - [ ] TemplateRepo.dexie.ts
- [ ] Create a `seedDefaults()` function:
  - [ ] seed Needs + Should Die groups if none exist
  - [ ] seed default categories if none exist

### Deliverables
- [ ] Seed runs on app start (idempotent)
- [ ] CRUD works in console test

### Acceptance checks
- [ ] Reloading app keeps data
- [ ] No duplicate seeds after refresh

---

## 5) Phase 5 — Month Lifecycle (Create / Select / Copy)

**Goal:** The “monthly budget” UX is stable.

### Steps
- [ ] Implement `getOrCreateMonth(year, month)`
- [ ] Implement month selection store (simple React state + localStorage)
- [ ] Implement “Create month from templates”:
  - [ ] When month created, generate budget items from active templates
  - [ ] Convert template dueDayOfMonth → dueDate in that month
- [ ] Implement “Copy previous month” button on Budget page:
  - [ ] Copy month items (one-offs optional; recommend copy recurring-derived only)
  - [ ] Ensure unique IDs

### Deliverables
- [ ] Month picker works and shows correct month’s data

### Acceptance checks
- [ ] Switching months shows different budgets/transactions
- [ ] Creating new month auto-adds recurring items

---

## 6) Phase 6 — Budget Page (Groups + Items CRUD)

**Goal:** Fully manage budget structure.

### Steps
- [ ] Budget page layout:
  - [ ] Group sections with totals (planned)
  - [ ] Item rows: name, category, planned, multiplier, split, effective planned, due date (if bill)
- [ ] Add/Edit Budget Item modal:
  - [ ] group (select)
  - [ ] category (select)
  - [ ] name
  - [ ] plannedAmount
  - [ ] multiplier (default 1)
  - [ ] splitRatio (default 1; allow entering as 0.5 OR “1/2” helper)
  - [ ] type: recurring/oneoff (note: recurring should primarily be managed as templates; if chosen here, also create/attach template)
  - [ ] isBill toggle + due date picker
- [ ] Delete item confirmation

### Deliverables
- [ ] User can recreate the screenshot budget structure in the app

### Acceptance checks
- [ ] Effective planned totals match expected
- [ ] Items appear under correct group

---

## 7) Phase 7 — Templates (Recurring Items)

**Goal:** Monthly recurring items are handled cleanly.

### Steps
- [ ] Settings page section: “Recurring Templates”
- [ ] CRUD templates:
  - [ ] name, group, category, plannedAmount, multiplier, splitRatio
  - [ ] isBill + dueDayOfMonth
  - [ ] active/inactive
- [ ] Ensure month creation uses templates

### Deliverables
- [ ] User can set up recurring templates once and they populate each month

### Acceptance checks
- [ ] New month includes all active templates
- [ ] Deactivated templates do not populate

---

## 8) Phase 8 — Transactions Page (Manual Entry + Linking)

**Goal:** Track actual spending and map it to budget.

### Steps
- [ ] Transaction add form:
  - [ ] amount (required)
  - [ ] date (required)
  - [ ] category (required)
  - [ ] budget item (required when category has month items; otherwise optional)
  - [ ] note optional
- [ ] Transactions list:
  - [ ] sort by date desc
  - [ ] filter by category
  - [ ] show totals
- [ ] Aggregate actuals by category/item using domain rules

### Deliverables
- [ ] Spending can be entered quickly

### Acceptance checks
- [ ] Category totals update immediately
- [ ] Item totals update immediately

---

## 9) Phase 9 — Bills Page (Due List + Manual Tick)

**Goal:** Bills are trackable and highlight what’s due before payday.

### Steps
- [ ] Bills list derived from budget items where `isBill=true`
- [ ] Show:
  - name, due date, effective planned, group, category
  - paid checkbox (BillTick)
- [ ] Filters:
  - [ ] Overdue
  - [ ] Due today
  - [ ] Due tomorrow
  - [ ] Due before payday
- [ ] Visual badges for due states (no push notifications in V1)

### Deliverables
- [ ] Bills due workflow works like a checklist

### Acceptance checks
- [ ] Ticking paid persists across refresh
- [ ] “Due before payday” filter matches payday rules

---

## 10) Phase 10 — Timeline Page (Payday Projection)

**Goal:** Show cashflow events from now until payday.

### Steps
- [ ] Determine payday date (25th) for selected month
- [ ] Build timeline events:
  - bills (unpaid only) with due dates
  - payday marker
- [ ] Projection math:
  - start with “remaining budget” baseline (or expected income if configured)
  - subtract bills as they occur
- [ ] Display:
  - chronological list with running balance

### Deliverables
- [ ] User can see upcoming financial pressure points

### Acceptance checks
- [ ] Balance decreases at each bill date
- [ ] Payday is clearly marked

---

## 11) Phase 11 — Dashboard Page (Leaks + KPI)

**Goal:** Provide the “why am I broke?” view (leak detection).

### Steps
- [ ] Headline KPI: Remaining until payday
- [ ] Totals:
  - planned total, spent total, remaining
- [ ] Leaks:
  - [ ] top 5 categories overspent by amount
  - [ ] unbudgeted spend (transactions without matching budget item OR category not planned)
- [ ] Group totals (Needs vs Should Die + custom)

### Deliverables
- [ ] Dashboard answers “where money leaks” immediately

### Acceptance checks
- [ ] Overspend calculations correct
- [ ] KPI updates when transactions added/ticks changed

---

## 12) Phase 12 — Settings (Groups, Categories, Payday, Income)

**Goal:** Allow configuration without breaking data.

### Steps
- [ ] Manage groups CRUD (cannot delete if referenced; allow deactivate)
- [ ] Manage categories CRUD (same rule)
- [ ] Payday day-of-month (default 25; allow change)
- [ ] Expected monthly income (optional)
  - If not set, dashboard uses “remaining budget before payday” formula

### Deliverables
- [ ] Settings stable and safe

### Acceptance checks
- [ ] No orphaned references after edits
- [ ] Payday changes update timeline and KPI

---

## 13) Phase 13 — Polish, QA & Mobile UX

**Goal:** Make it feel like a real app, not a prototype.

### Steps
- [ ] Empty states on all pages
- [ ] Basic validation on forms
- [ ] Persist month selection
- [ ] Offline indicator
- [ ] Responsive/mobile layouts
- [ ] Quick add improvements (optional): last-used category/item preselected

### Deliverables
- [ ] Smooth daily use on phone

### Acceptance checks
- [ ] No console errors
- [ ] App usable one-handed on mobile
- [ ] Offline mode does not crash

---

## 14) Smoke Test Scenario (Agent must run)

Recreate a sample month similar to the notes screenshot:
- Groups:
  - Needs
  - Should Die
- Add templates/items:
  - Rent 5631 (bill due 1st)
  - WiFi 400 (bill due 2nd)
  - Vodacom 2839.76 x2 (bill due 5th)
  - Electricity 600 split 1/2 (bill due 10th)
  - Groceries 1500 (non-bill category item)
- Add transactions:
  - Groceries 250 on Feb 3
  - Transport 120 on Feb 4 (unbudgeted if no transport item)
- Verify:
  - Bills show due statuses
  - Dashboard shows unbudgeted spend + leaks
  - KPI “Remaining until payday” updates

---

## 15) Future Phase Hooks (leave extension points only)

- CSV statement upload at month-end (accountability)
- Bank sync
- Cash spending
- Cloud sync + login
- Push notifications (1 day before due)

---

## Agent Progress Log Template (use this)

Add a section at the bottom of the PR/branch description or a `PROGRESS.md`:

- Phase 1: ☐ ☐ ☐
- Phase 2: ☐ ☐ ☐
...
- Phase 13: ☐ ☐ ☐

For each completed phase, record:
- ✅ Completed
- Notes/decisions
- Screenshots (optional)
- Any known bugs

