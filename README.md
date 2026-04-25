# Julius — Personal Spending Tracker

Julius is an offline-first, installable PWA for tracking your monthly budget
and spending. It works fully on your device with optional cloud sync, so
your data is yours by default.

Built for ZAR (South African Rand) with a default payday on the 25th.

---

## Features

### Dashboard ("Safe to spend" home)
- Headline: **Safe to spend** = income − (Needs + Liabilities + Savings)
- Quick **+ Add Expense** and **+ Add Income** actions on first paint
- Sections for upcoming commitments, recent transactions, and potential
  savings (expenses you may want to review)
- No setup-heavy empty state — usable from the very first launch

### Transactions
- Log income or expense with amount, merchant, category, date, and optional note
- Fast path: amount → category → save (3 taps)
- `source` tracks origin (`manual`, `commitment`, `import`)
- Statements imported via bank parsers create transactions automatically

### Commitments (bills, debts, subscriptions, in one model)
- Unified list with type, due date, status, recurring flag, optional template
- Marking a commitment paid creates or links a single transaction (no
  duplicates on repeat taps)
- Migration from the old V1 "bills" model runs automatically and is
  idempotent

### Planner
- Purchase-scenario builder: model a future purchase against current
  commitments and savings to see whether you can afford it

### Budget (planning surface)
- Plan amounts per category in groups (Needs / Wants / Savings / Liabilities)
- Per-item multiplier and split ratio:
  `effectivePlanned = plannedAmount × multiplier × splitRatio`
- Copy budget structure from the previous month
- Bills, debts, and subscriptions live on **Commitments**, not here

### Recurring templates
- Define a template once; it auto-generates either a budget item, a
  commitment, or both for each new month
- Idempotent via a stable `(templateId, monthKey, outputKind)` journal —
  app open and sync replay never duplicate

### Bank statement import (CSV + PDF)
- Supported banks: FNB, Capitec, Standard Bank, Discovery, ABSA
- Detects scanned and password-protected PDFs and surfaces a clear error

### AI check-in (optional)
- Periodic financial check-in summary powered by an LLM
- Requires `OPENAI_API_KEY`; disabled gracefully when missing

### Cloud sync (optional)
- Supabase-backed, with row-level security per user
- Silent upload of local data on first login; bidirectional sync thereafter
- Last-write-wins conflict resolution by ISO timestamp

### Offline / PWA
- Installable on Android, iOS, and desktop (Add to Home Screen)
- Works fully offline after first load — all data lives in IndexedDB

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 |
| Local DB | Dexie (IndexedDB wrapper), schema v6 |
| Cloud | Supabase (auth + Postgres) |
| Bank parsing | pdfjs-dist + custom CSV/PDF parsers |
| AI | OpenAI Chat Completions |
| Date utils | date-fns |
| PWA | vite-plugin-pwa + service worker |

---

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment (see .env.example)
cp .env.example .env
# Fill in Supabase URL + anon key and (optionally) an OpenAI key

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
  main.tsx            # Entry point
  App.tsx             # Routes
  app/                # Layout, providers (Theme, Month), shell components
  auth/               # Supabase auth provider, signed-in guard
  pages/
    dashboard/        # Safe-to-spend home
    transactions/     # Transaction list + modal
    budget/           # Planning surface
    bills/            # Commitments page (file path retained from V1)
    planner/          # Purchase scenario builder
    timeline/         # Cashflow timeline
    settings/         # User settings + advanced configuration
    check-in/         # AI-assisted financial check-in
  domain/
    models/           # TypeScript models (BudgetItem, Commitment, Transaction…)
    constants/        # Default groups, categories, currency
    rules/            # Business rules (safeToSpend, reconciliation, etc.)
  data/
    repositories/     # Repository interfaces (storage-agnostic)
    local/            # Dexie schema + Dexie-backed implementations
    parsers/          # Bank statement parsers (FNB, Capitec, Standard Bank, Discovery, ABSA)
  sync/               # SyncOrchestrator (pull/push, dedup, migration)
  services/
    cloud/            # Supabase client
    crypto/           # WebCrypto helpers (AES-GCM)
    ai/openai.ts      # OpenAI integration
    config/flags.ts   # Feature flags
  pwa/                # Service worker registration
```

---

## Data Model

Key entities (see `src/domain/models/index.ts` for the canonical types):

- **BudgetMonth** — month-scoped container for plan + actuals
- **BudgetGroup** — top-level grouping (Needs / Wants / Savings / Liabilities by default)
- **Category** — sub-grouping within a group (e.g. Groceries, Rent)
- **BudgetItem** — a planning line: planned amount, multiplier, split ratio
- **Commitment** — a bill, debt, or subscription with a due date and status
- **RecurringTemplate** — blueprint that generates a BudgetItem and/or Commitment each month
- **Transaction** — actual spend or income, optionally linked to a commitment
- **BillTick** — legacy paid/unpaid marker; superseded by `Commitment.status` after migration

Default groups seeded on first launch: **Needs**, **Wants**, **Savings**, **Liabilities**.

Default categories seeded per group are listed in `src/domain/constants/index.ts`.

---

## Production Status

Julius is being hardened toward a public PWA launch. Current state and
remediation plan live in:

- [`docs/v2-status.md`](./docs/v2-status.md) — V2 implementation audit
- [`docs/superpowers/specs/`](./docs/superpowers/specs/) — design specs (when present)
- [`docs/archive/`](./docs/archive/) — historical planning artifacts (V1, V2 plans, etc.)

In-flight work tracked in `package.json` version + the project's PR queue.

---

## License

Private — not for public distribution.
