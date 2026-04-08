# Julius vNext UI — Build Spec For Agent

**Date:** 2026-04-08  
**Status:** Ready for implementation

---

## 1. Objective

Implement the new **4-screen mobile UI set** while preserving exact current app language and domain model behavior.

Target screens:
1. Home (`/dashboard`)
2. Transactions (`/transactions`)
3. Planner (`/planner`)
4. Settings (`/settings`)

Primary product goal:
- Fast money awareness
- Fast transaction logging
- Lower visual clutter

Do **not** invent new features, routes, or terminology.

---

## 2. Source Of Truth

Use these files as authoritative:
- `src/pages/dashboard/DashboardPage.tsx`
- `src/pages/transactions/TransactionsPage.tsx`
- `src/pages/planner/PlannerPage.tsx`
- `src/pages/settings/SettingsPage.tsx`
- `src/app/NavDrawer.tsx`
- `src/app/Layout.tsx`
- `src/domain/constants/index.ts`

For labels and wording, UI must match those files exactly.
For money formatting, use `formatCurrency()` (`ZAR` / `R`).

---

## 3. Information Architecture

Use simplified bottom navigation in vNext UI:
- `HOME`
- `TRANSACTIONS`
- `PLANNER`
- `SETTINGS`

Map to existing routes:
- `HOME` -> `/dashboard`
- `TRANSACTIONS` -> `/transactions`
- `PLANNER` -> `/planner`
- `SETTINGS` -> `/settings`

Keep existing drawer routes available (Insights, Budget, Commitments, Projection, Check-In), but vNext primary surface is the 4-tab flow above.

---

## 4. Visual Direction

Keep current premium olive/gold identity:
- Olive gradients and gold accents
- Light background, soft cards, high whitespace
- Minimal visual noise, clear hierarchy

No playful/novel styling changes beyond current design language.

---

## 5. Global Rules

1. Currency
- Show monetary values in `R` format with 2 decimals via `formatCurrency()`.

2. Copy accuracy
- All user-facing text on these screens must match current app copy exactly unless listed under "Allowed micro-adjustments".

3. Data accuracy
- Values must be computed from existing rules/repos, not mocked in production code.

4. Interaction priority
- Primary actions must remain obvious (`+ Expense`, `+ Income`, scenario creation, save settings).

5. Accessibility
- Preserve readable contrast and tap target spacing.

Allowed micro-adjustments:
- Shortening helper text only when space-constrained in mobile card variants, without changing meaning.

---

## 6. Screen Specs

### 6.1 Home (`/dashboard`)

Header card:
- Title: `Safe to spend`
- Main value: computed `safeToSpend(...)` via domain rules
- Supporting line:
  - Left: income status (`{formatCurrency(income)} income logged` OR `No income recorded yet`)
  - Right: `{upcomingCommitments.length} commitments coming up`

Primary action cards:
- Card 1:
  - Label: `Primary action`
  - CTA: `+ Add Expense`
- Card 2:
  - Label: `Need income?`
  - CTA: `Add income` or `Add another income`

KPI cards:
- `Income`
- `Expenses`
- `Savings target`

Sections (with exact headers):
- `Potential savings` (+ `Review` link)
- `Upcoming commitments` (+ `Open list` link)
- `Recent transactions` (+ `View all` link)

Empty-state block (when no transactions):
- Header: `Start here`
- Body: `Your month is ready. Record income first, then add expenses as they happen. You do not need to set up a budget before using the app.`
- Buttons: `Add income`, `Add expense`

---

### 6.2 Transactions (`/transactions`)

Header:
- Title: `Transactions`
- Subtitle: `Net:` + formatted net value

Top actions:
- `+ Income`
- `+ Expense`

Summary cards:
- `Income`
- `Expenses`
- `Net`

Filter chips:
- `All`
- `Expenses`
- `Income`

List behavior:
- Group by date
- Show day net on each date section
- Row label resolution order:
  - `merchant` -> `note` -> budget item name -> category name -> `Unknown`
- Kind badges:
  - `Income`
  - `Expense`
- Optional badge for expense with no budget item:
  - `Unbudgeted`

Empty states:
- No transactions:
  - Title: `No Transactions Yet`
  - Body: `Start by adding income or recording your first expense.`
- Filter with no matches:
  - `No transactions match the current filter`

---

### 6.3 Planner (`/planner`)

List screen header:
- Title: `Planner`
- Subtitle: `Model major purchases`
- CTA: `+ New Scenario`

New scenario form:
- Title: `New Scenario`
- Inputs:
  - `Name (e.g. New Car)`
  - `Description (optional)`
- Actions:
  - `Create`
  - `Cancel`

No-scenarios state:
- Title: `No Scenarios Yet`
- Body: `Create a scenario to model a major purchase and see if you can afford it.`

Scenario cards:
- Name + optional verdict badge (`Affordable`, `Tight`, `Can't Afford`)
- Meta line: `X expense(s) · {formatCurrency(total)}/mo`
- Delete action remains available

---

### 6.4 Settings (`/settings`)

Header:
- Title: `Settings`

Sections and labels:
1. `Account`
- Signed-in / offline status text
- Cloud backup status text
- Actions like `Logout`, `Continue offline`, `Resume online`, `Login`, `Sync now`

2. `Appearance`
- `Dark Mode`
- Helper: `Switch to a darker theme`

3. `Budget Settings`
- `Payday Day of Month`
- `Expected Monthly Income (ZAR)`
- Save button: `Save Settings`

4. `Configurations` link card
- Subtitle: `Budget Groups, Categories, Recurring Templates`

5. `BankAccountsSection` embedded

6. `AI Check-In`
- `OpenAI API Key`
- Buttons: `Save`, `Test`
- Status labels: `✓ Valid`, `✕ Invalid`

---

## 7. Component/Token Guidance

Use existing app tokens/styles and keep consistency with current theme implementation:
- Olive/gold accents for primary CTA and active nav
- Neutral surfaces for cards
- Keep title scale and section spacing consistent across all 4 screens

Do not introduce a second visual system.

---

## 8. Data Contracts To Preserve

- Home:
  - `safeToSpend(items, transactions, commitments, categories, groups)`
  - `getPotentialSavings(...)`
  - `getUpcomingCommitments(...)`
  - `getRecentTransactions(...)`

- Transactions:
  - `totalIncome(transactions)`
  - `totalExpenses(transactions)`
  - day-grouped transaction list

- Planner:
  - scenario CRUD via repos
  - affordability verdict via `calculateAffordability(...)`

- Settings:
  - app settings save/validation
  - auth/sync status and actions
  - theme toggle
  - OpenAI key save/test

---

## 9. Acceptance Criteria (Strict)

A build is accepted only if:

1. Screen set
- Exactly these 4 primary screens are implemented and polished: Home, Transactions, Planner, Settings.

2. Copy parity
- All section headers, CTA labels, and critical helper text match source files.

3. Currency parity
- All money values are `R` formatted with 2 decimals.

4. Route parity
- Screen actions navigate to existing routes only.

5. Data parity
- No hardcoded business values for production screens; use repository/rule outputs.

6. Interaction parity
- Transactions add/edit/delete flow still works.
- Planner scenario create/edit/delete flow still works.
- Settings save/test/sync/theme controls still work.

7. Visual quality
- Reduced clutter vs old mixed-layout approach.
- No overlapping/clipped content at common mobile sizes.

---

## 10. Suggested Build Order For Your Agent

1. Shell + navigation pass
- Ensure 4-tab vNext shell and active states

2. Home parity pass
- Match copy and metrics blocks exactly

3. Transactions parity pass
- Match headers, chips, row labels, and modals

4. Planner parity pass
- Match list, empty state, and new scenario form

5. Settings parity pass
- Match section order and labels

6. Final QA pass
- Copy diff vs source files
- Currency format check
- route/action smoke test

---

## 11. QA Checklist

- [ ] Home uses `Safe to spend` and correct supporting text variants
- [ ] Home shows `Potential savings`, `Upcoming commitments`, `Recent transactions`
- [ ] Transactions shows `Net:` + correct summary cards and chips (`All`, `Expenses`, `Income`)
- [ ] Planner uses `Model major purchases` + `No Scenarios Yet` state text
- [ ] Settings includes `Account`, `Appearance`, `Budget Settings`, `Configurations`, `AI Check-In`
- [ ] All currency labels show `R` with 2 decimals
- [ ] No placeholder/mock text remains
- [ ] No clipped/overlapping mobile layout issues

