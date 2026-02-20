# Julius — Personal Spending Tracker

Julius is an offline-first, installable PWA for tracking your monthly budget and spending. It replaces manual note-keeping with a structured budget manager that works entirely on your device — no accounts, no cloud, no bank sync required.

Built for ZAR (South African Rand) with a payday on the 25th as the default.

---

## Features

### Dashboard
- **Remaining until payday** headline KPI
- Budget overview: planned vs spent vs remaining
- Per-group summaries with progress bars (Needs, Should Die, custom groups)
- Money leaks: overspent categories and unbudgeted transactions

### Budget
- Organize spending into **budget groups** and **categories**
- Per-item support for **multipliers** and **split ratios**
  - `effectivePlanned = plannedAmount × multiplier × splitRatio`
  - Example: R600 electricity split 50/50 = R300 effective
- Mark items as **bills** with a due date
- Copy budget structure from the previous month

### Recurring Templates
- Define templates once; they auto-populate each new month
- Active/inactive toggle to skip a template for a period

### Transactions
- Manually log spending: amount, date, category, and optional budget item link
- Grouped by date, filterable by category
- Actuals update budget item and category totals immediately

### Bills
- Bills list derived from budget items flagged as bills
- Manual paid/unpaid tick that persists across sessions
- Status badges: Overdue, Due Today, Due Tomorrow, Due Before Payday
- Filter by due status

### Timeline
- Chronological view of upcoming bills and payday
- Running balance projection to show cashflow pressure points
- Warns when the projected balance goes negative

### Settings
- Configure payday day-of-month (default: 25th)
- Set expected monthly income (optional)
- Manage budget groups and categories (safe delete — blocks removal if referenced)
- Manage recurring templates

### Offline / PWA
- Installable on Android and desktop (Add to Home Screen)
- Works fully offline after first load — all data stays on your device in IndexedDB

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 |
| Local DB | Dexie (IndexedDB wrapper) |
| Date utils | date-fns |
| PWA | vite-plugin-pwa + service worker |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview the production build
npm run preview
```

---

## Project Structure

```
src/
  app/          # Routes, providers, layout
  pages/        # Dashboard, Budget, Bills, Timeline, Transactions, Settings
  components/   # Shared and feature-specific UI components
  domain/       # TypeScript models, constants, business rules
  data/
    repositories/   # Repository interfaces
    local/          # Dexie DB schema + repository implementations
  pwa/          # Service worker registration
  utils/        # Shared utilities
```

---

## Data Model

All data is stored locally in IndexedDB (via Dexie). Nothing leaves your device.

Key entities:
- **BudgetMonth** — the active month's budget container
- **BudgetGroup** — top-level grouping (e.g. Needs, Should Die)
- **Category** — sub-grouping within a month (e.g. Groceries, Rent)
- **BudgetItem** — a line item with planned amount, multiplier, split ratio, and optional bill flag
- **RecurringTemplate** — blueprint for items that repeat every month
- **Transaction** — a manual spend entry linked to a category and optionally a budget item
- **BillTick** — tracks paid/unpaid state per bill per month

Default budget groups seeded on first launch: **Needs** and **Should Die**.

---

## V1 Scope

V1 is intentionally local-only. The following are not implemented and left as future phases:

- CSV statement upload
- Bank sync
- Cash spending tracking
- Cloud sync and authentication
- Push notifications

---

## License

Private — not for public distribution.
