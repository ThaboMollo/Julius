# Julius vNext UI Implementation Plan

> Use this plan to implement `docs/superpowers/specs/2026-04-08-vnext-ui-build-spec.md`. Tasks use checkbox syntax and should be marked complete in this file as work lands.

**Goal:** Upgrade the app to the new 4-screen mobile-first vNext UI for Home, Transactions, Planner, and Settings without changing existing domain behavior, route structure, labels, or calculations.

**Primary constraint:** This is a UI/UX rebuild, not a product redesign. Reuse existing data contracts, repos, copy, and terminology.

---

## Review Findings

- [ ] **Confirm the shell strategy before implementation**
Current navigation is a top header plus drawer in [src/app/Layout.tsx](/Users/thabomollomponya/Dev/Julius/src/app/Layout.tsx) and [src/app/NavDrawer.tsx](/Users/thabomollomponya/Dev/Julius/src/app/NavDrawer.tsx). The spec requires a bottom-nav-first primary flow while keeping drawer routes available. Implementation should add a new mobile shell, not replace secondary routes.

- [ ] **Keep the current screen copy as the source of truth**
Most required labels already exist in [src/pages/dashboard/DashboardPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/dashboard/DashboardPage.tsx), [src/pages/transactions/TransactionsPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/transactions/TransactionsPage.tsx), [src/pages/planner/PlannerPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/planner/PlannerPage.tsx), and [src/pages/settings/SettingsPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/settings/SettingsPage.tsx). The work is mostly structural and visual, not copy generation.

- [ ] **Route-linked CTA behavior needs to stay obvious**
The dashboard currently links to `/transactions` for `+ Add Expense` and `Add income`, but does not open the transaction modal in the target state. If the vNext UI is meant to feel faster, add a route/query-driven way to open `TransactionModal` with the intended kind preselected rather than leaving this as a generic navigation.

- [ ] **The current page files are too monolithic for a clean UI rebuild**
Transactions, Planner, and Settings each contain layout plus screen logic in one file. Extracting presentational subcomponents first will reduce regression risk and make the mobile rebuild practical.

- [ ] **Theme work must extend the existing olive/gold system**
The current tokens in [src/index.css](/Users/thabomollomponya/Dev/Julius/src/index.css) and [src/app/ThemeContext.tsx](/Users/thabomollomponya/Dev/Julius/src/app/ThemeContext.tsx) already define the app’s visual identity. vNext should consolidate tokens and spacing, not introduce a competing visual language.

---

## Task 1: Build the vNext App Shell

**Files:**
- Modify: [src/app/Layout.tsx](/Users/thabomollomponya/Dev/Julius/src/app/Layout.tsx)
- Modify: [src/app/NavDrawer.tsx](/Users/thabomollomponya/Dev/Julius/src/app/NavDrawer.tsx)
- Create: `src/app/BottomNav.tsx`
- Create: `src/app/AppHeader.tsx`

- [x] Extract the current sticky header into a reusable `AppHeader` component that can be shared across the 4 primary screens.
- [x] Add a `BottomNav` component for `Home`, `Transactions`, `Planner`, and `Settings`, mapped to `/dashboard`, `/transactions`, `/planner`, and `/settings`.
- [x] Keep the drawer accessible from the shell so secondary routes remain available.
- [x] Update `Layout` so the 4 primary routes render inside a mobile-first shell with bottom-nav spacing and sticky safe-area-friendly navigation.
- [x] Verify the shell does not block non-primary routes such as Insights, Budget, Commitments, Projection, Configurations, or Check-In.
- [x] Test route highlighting and navigation state for all 4 tabs.

**Done when:**
- The app has a bottom-nav-first mobile shell.
- The drawer still exposes secondary navigation.
- No routes are removed or renamed.

---

## Task 2: Normalize Shared vNext UI Tokens and Utilities

**Files:**
- Modify: [src/index.css](/Users/thabomollomponya/Dev/Julius/src/index.css)
- Create: `src/app/ui.ts` or `src/app/ui/*` helpers if needed

- [x] Add shared CSS variables or utility classes for page gutters, card surfaces, section spacing, muted text, and olive/gold action states.
- [x] Standardize card radius, shadows, and section spacing used by all 4 screens.
- [x] Add shared styles for status badges, filter chips, and section link actions so the same patterns are not reimplemented per page.
- [x] Preserve existing dark mode behavior while aligning dark surfaces with the same premium hierarchy.
- [x] Remove one-off styling duplication only where it does not alter behavior.

**Done when:**
- All 4 vNext screens can reuse the same card, chip, and section primitives.
- Light and dark themes remain consistent with the existing identity.

---

## Task 3: Refactor Dashboard Into the vNext Home Screen

**Files:**
- Modify: [src/pages/dashboard/DashboardPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/dashboard/DashboardPage.tsx)
- Create: `src/pages/dashboard/components/*` as needed

- [x] Preserve the existing data loading and calculations for `safeToSpend`, income, expenses, planned savings, potential savings, commitments, and recent transactions.
- [x] Extract presentational blocks for the header card, primary action cards, KPI cards, and section cards.
- [x] Rebuild the page into the vNext mobile hierarchy:
`Safe to spend` hero, two primary action cards, three KPI cards, then `Potential savings`, `Upcoming commitments`, and `Recent transactions`.
- [x] Preserve exact copy for empty states and section headings from the spec and current page.
- [x] Ensure action links use existing routes and remain obvious on mobile.
- [x] Confirm all money display uses `formatCurrency()`.

**Done when:**
- `/dashboard` matches the vNext Home information hierarchy.
- All existing calculations and labels still match current app behavior.

---

## Task 4: Upgrade Transactions for Faster Logging and Scanning

**Files:**
- Modify: [src/pages/transactions/TransactionsPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/transactions/TransactionsPage.tsx)
- Modify: [src/pages/transactions/TransactionModal.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/transactions/TransactionModal.tsx)
- Create: `src/pages/transactions/components/*` as needed

- [x] Extract summary cards, filter chips, grouped-date sections, and transaction rows into focused subcomponents.
- [x] Preserve existing totals and grouped-by-date behavior.
- [x] Preserve the row label resolution order exactly: `merchant` -> `note` -> budget item name -> category name -> `Unknown`.
- [x] Preserve `Income`, `Expense`, and optional `Unbudgeted` badges.
- [x] Rework the page header and action area to fit a mobile-first layout without losing `+ Income` and `+ Expense` prominence.
- [x] Add route or query-state handling so dashboard and shell actions can open `TransactionModal` directly in income or expense mode.
- [x] Keep edit and delete behavior intact.
- [x] Preserve the two empty states exactly as specified.

**Done when:**
- `/transactions` is faster to scan on mobile.
- Primary add actions can open directly in the intended mode.
- Existing totals, filters, and edit behavior still work.

---

## Task 5: Simplify Planner List and Form Flow

**Files:**
- Modify: [src/pages/planner/PlannerPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/planner/PlannerPage.tsx)
- Create: `src/pages/planner/components/*` as needed

- [x] Separate the planner list screen UI from the scenario detail view UI so the list can be rebuilt cleanly.
- [x] Rebuild the list screen header and `+ New Scenario` action for the vNext shell.
- [x] Convert the new-scenario form into a cleaner mobile card or sheet while preserving `New Scenario`, `Create`, and `Cancel`.
- [x] Keep scenario CRUD behavior unchanged.
- [x] Preserve affordability verdict computation via `calculateAffordability(...)`.
- [x] Preserve verdict badge labels: `Affordable`, `Tight`, `Can't Afford`.
- [x] Preserve the `X expense(s) · {formatCurrency(total)}/mo` meta line.
- [x] Keep delete action accessible without making accidental taps likely.

**Done when:**
- `/planner` feels like a focused scenario list on mobile.
- Scenario creation, deletion, and verdict calculation behave exactly as before.

---

## Task 6: Rebuild Settings Into Clear Mobile Sections

**Files:**
- Modify: [src/pages/settings/SettingsPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/settings/SettingsPage.tsx)
- Modify: [src/pages/settings/BankAccountsSection.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/settings/BankAccountsSection.tsx) if spacing or card structure needs alignment
- Create: `src/pages/settings/components/*` as needed

- [x] Extract `Account`, `Appearance`, `Budget Settings`, `Configurations`, and `AI Check-In` into section components.
- [x] Preserve existing auth, offline-mode, and sync actions exactly.
- [x] Keep `Dark Mode` and its helper text unchanged.
- [x] Preserve budget settings validation and save behavior.
- [x] Keep the Configurations card linked to `/configurations`.
- [x] Visually align `BankAccountsSection` with the rest of the vNext settings surface without changing its domain behavior.
- [x] Preserve `OpenAI API Key`, `Save`, `Test`, `✓ Valid`, and `✕ Invalid` behavior and labels.

**Done when:**
- `/settings` is split into clear mobile sections with unchanged functionality.
- Account/sync/theme/settings flows still work end to end.

---

## Task 7: Add Shared Navigation-Driven Action Flows

**Files:**
- Modify: [src/pages/dashboard/DashboardPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/dashboard/DashboardPage.tsx)
- Modify: [src/pages/transactions/TransactionsPage.tsx](/Users/thabomollomponya/Dev/Julius/src/pages/transactions/TransactionsPage.tsx)
- Modify: [src/app/Layout.tsx](/Users/thabomollomponya/Dev/Julius/src/app/Layout.tsx) if shared handling belongs there

- [x] Implement a small navigation contract for primary actions that need to land on `/transactions` with context, such as “open income modal” or “open expense modal”.
- [x] Ensure `+ Add Expense`, `Add income`, and `Add another income` can trigger the intended transaction entry flow.
- [x] Keep the solution lightweight and route-safe; do not add new routes for this behavior.
- [x] Clear transient navigation state after the modal opens so refresh/back behavior stays predictable.

**Done when:**
- Home-screen CTAs feel direct rather than indirect.
- Transaction-entry intent survives navigation cleanly.

---

## Task 8: QA, Regression Checks, and Completion Pass

**Files:**
- Verify across the 4 primary pages and shared shell

- [x] Run typecheck and fix any regressions.
- [x] Run lint and fix UI rebuild issues introduced by refactoring.
- [ ] Manually test light mode and dark mode on all 4 primary screens.
- [ ] Manually test bottom nav, drawer access, month switching, and safe-area spacing on a narrow mobile viewport.
- [x] Verify money formatting is still `R` with 2 decimals everywhere touched by this work.
- [x] Verify no copy drift on the specified labels, section headers, and empty states.
- [x] Verify all existing secondary routes remain accessible.
- [x] Update this plan by marking completed items as work lands.

**Done when:**
- The vNext UI is complete across the 4 target screens.
- Core navigation and domain behaviors remain intact.

---

## Suggested Execution Order

- [x] Task 1: Build the shell first.
- [x] Task 2: Normalize shared tokens before page-by-page styling.
- [x] Task 3: Upgrade Home.
- [x] Task 4: Upgrade Transactions.
- [x] Task 7: Add shared navigation-driven action flows once Home and Transactions are both in place.
- [x] Task 5: Upgrade Planner.
- [x] Task 6: Upgrade Settings.
- [ ] Task 8: Finish with regression testing and plan cleanup.

Note: `npm run lint` still reports pre-existing issues outside the vNext UI files, including `src/app/MonthContext.tsx`, `src/app/ThemeContext.tsx`, `src/auth/AuthProvider.tsx`, `src/pages/budget/BudgetItemModal.tsx`, `src/pages/check-in/CheckInPage.tsx`, `src/pages/check-in/VerdictCard.tsx`, and `src/pages/settings/ConfigurationsPage.tsx`.
