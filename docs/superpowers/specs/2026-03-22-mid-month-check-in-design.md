# Mid-Month Check-In — Feature Design Spec

## Overview

A mid-month financial health check (available 13th–17th of each month) where the user uploads their bank statement and GPT-4o reviews it against their budget, bills, transactions, and planner scenarios. Delivers a blunt, SA-flavoured verdict with actionable suggestions. Results are persisted and visible in Analytics as a historical trend.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| OpenAI API key | User provides own key, stored locally in IndexedDB | App is offline-first PWA, no backend |
| Model | GPT-4o (hardcoded) | Best quality for financial analysis |
| Nav visibility | Hidden outside 13th–17th | Feature is a focused mid-month ritual |
| AI tone | Raw, unfiltered, South African slang | Matches brand personality |
| AI data scope | All 5 sources (bank statement, budget, transactions, bills, planner) | Full context needed for accurate verdict |
| Planner re-evaluation | Pure local recalculation, no AI | Math doesn't need opinions |
| Action model | Actionable — user can log transactions and add budget items directly from results | Reduces friction |
| Persistence | Saved to IndexedDB, viewable in Analytics history | Enables month-over-month trend tracking |
| UI pattern | Single page with collapsible sections (Approach 3) | Verdict front-and-centre, drill into detail at own pace |

---

## 1. Data Model

### New Entity: `CheckInResult`

```typescript
interface CheckInResult extends ScopedRecord {
  id: string
  budgetMonthId: string
  monthKey: string              // e.g. "2026-03" for quick lookups
  verdict: 'doing_well' | 'fucking_up'
  verdictSummary: string        // AI's blunt 2-3 sentence paragraph
  spendingProgressPercent: number // % of monthly budget spent at mid-month
  outsideBudget: OutsideBudgetItem[]
  suggestedBudgetItems: SuggestedBudgetItem[]
  plannerReview: PlannerReviewItem[]
  bankStatementDate: string     // ISO date of upload
  rawAIResponse: string         // full AI response for debugging
}

interface OutsideBudgetItem {
  description: string           // from bank statement
  amount: number
  date: string
  aiComment: string             // e.g. "R450 at Woolies? That's groceries, not 'essentials'"
  actionTaken?: 'added_transaction' | 'dismissed'
}

interface SuggestedBudgetItem {
  name: string                  // AI-suggested name
  suggestedAmount: number
  groupId?: string              // AI tries to match existing group
  categoryId?: string           // AI tries to match existing category
  aiReason: string              // why this should be budgeted
  actionTaken?: 'added_to_budget' | 'dismissed'
}

interface PlannerReviewItem {
  scenarioId: string
  scenarioName: string
  previousVerdict: 'affordable' | 'tight' | 'cannot_afford'
  newVerdict: 'affordable' | 'tight' | 'cannot_afford'
  newBaselineDisposable: number
  newRemainingAfterScenario: number
}
```

### Dexie Table

New table `checkInResults` added to JuliusDB schema (version 5):
- Indexes: `[userId+monthKey]`, `budgetMonthId`
- Follows existing `ScopedRecord` pattern (userId, createdAt, updatedAt, deletedAt)

### AppSettings Extension

New field on existing `AppSettings`:
- `openaiApiKey: string | null` — user's OpenAI API key, stored locally only

---

## 2. OpenAI Integration

### Module: `src/ai/openai.ts`

Single exported function:

```typescript
async function analyzeCheckIn(params: {
  apiKey: string
  bankTransactions: ParsedTransaction[]
  budgetItems: BudgetItem[]
  transactions: Transaction[]
  billTicks: BillTick[]
  groups: BudgetGroup[]
  categories: Category[]
  scenarios: { scenario: PurchaseScenario; expenses: ScenarioExpense[]; currentVerdict: string }[]
  monthLabel: string
}): Promise<{
  verdict: 'doing_well' | 'fucking_up'
  verdictSummary: string
  outsideBudget: OutsideBudgetItem[]
  suggestedBudgetItems: SuggestedBudgetItem[]
}>
```

### Prompt Structure

```
System: You are Julius, a brutally honest South African financial advisor.
You review someone's mid-month spending and tell them straight — no sugar coating.
Use casual SA slang. Be funny but helpful.

User: Here's my financial picture for {monthLabel}:

BANK STATEMENT (what actually happened):
[parsed transactions as date | description | amount]

BUDGET (what I planned):
[budget items grouped by group name: item name, effective planned amount, isBill, dueDate]

RECORDED TRANSACTIONS (what I logged in Julius):
[transactions: date, amount, category, note, linked budget item]

BILLS STATUS:
[bill items: name, due date, paid/unpaid, amount]

PLANNER SCENARIOS:
[active scenarios with current verdicts]

AVAILABLE GROUPS: [list with IDs]
AVAILABLE CATEGORIES: [list with IDs and parent groupIds]

Respond in this exact JSON structure:
{
  "verdict": "doing_well" | "fucking_up",
  "verdictSummary": "2-3 sentences, blunt and direct",
  "outsideBudget": [
    { "description": "...", "amount": number, "date": "ISO", "aiComment": "..." }
  ],
  "suggestedBudgetItems": [
    { "name": "...", "suggestedAmount": number, "groupId": "...|null", "categoryId": "...|null", "aiReason": "..." }
  ]
}
```

### API Call Details

- Endpoint: `https://api.openai.com/v1/chat/completions`
- Model: `gpt-4o`
- `response_format: { type: "json_object" }` for guaranteed parseable JSON
- Temperature: `0.8` (personality with structured output)
- Timeout: 30 seconds
- Direct `fetch` call — no SDK dependency
- Error handling: network errors, invalid key, rate limits, malformed response

### What the AI Does NOT Do

The planner re-evaluation is pure local math. The AI only produces:
- Verdict + summary
- Outside-budget items
- Suggested budget additions

---

## 3. Check-In Page

### Route: `/check-in`

### State 1: Upload Screen

- Heading: "Mid-Month Check-In"
- Subtext: "Upload your bank statement and let's see how you're doing"
- Bank selector dropdown (from existing `bankConfigs`)
- CSV file upload button (reuses existing parser infrastructure from `src/data/parsers/`)
- Guard: if no bank accounts configured → prompt to add in Settings
- Guard: if no OpenAI API key set → prompt to add in Settings

### State 2: Loading

- Skeleton/spinner with rotating blunt messages:
  - "Checking your damage..."
  - "Counting the Uber Eats orders..."
  - "Let's see who's been naughty..."
  - "Judging your life choices..."

### State 3: Results

#### Verdict Card (sticky on scroll)

- **Spending progress ring** — circular gauge showing % of monthly budget spent at mid-month. At ~50% of the month, ~50% spent is healthy. Visual gut-punch at 80%+.
- Large verdict label: "You're doing well" (green/gold) or "You're fucking up" (red)
- AI's `verdictSummary` paragraph
- Month label ("March 2026 — Mid-Month Check-In")
- **Animation on load:** confetti burst for "doing well", shake animation for "fucking up"
- **Sticky behaviour:** when scrolling, card compresses to a single line (ring + verdict label) pinned at top

#### KPI Summary Strip

Horizontal strip of 4 mini cards between verdict and collapsible sections:
- **Spent so far** — total from bank statement (debits)
- **Budget remaining** — planned minus actual
- **Bills left** — unpaid count + total amount
- **Days to payday** — from existing `getPaydayDate` logic

#### Collapsible Section 1: "Outside Your Budget"

- Collapsed by default, count badge on header
- List of bank transactions the AI flagged as unbudgeted
- Each row: description, amount (ZAR formatted), date, AI comment
- **Swipe right** → opens existing `TransactionModal` pre-filled with amount, date, description as note
- **Swipe left** → dismisses, fades row
- Fallback tap buttons for non-touch: "Log Transaction" and "Dismiss"
- Action updates `CheckInResult.outsideBudget[].actionTaken` in IndexedDB

#### Collapsible Section 2: "Should Be On Your Budget"

- Collapsed by default, count badge on header
- AI-suggested recurring items the user doesn't budget for
- Each row: suggested name, monthly amount, AI reason
- **Swipe right** → opens existing `BudgetItemModal` pre-filled with name, amount, matched group/category
- **Swipe left** → dismisses, fades row
- Fallback tap buttons: "Add to Budget" and "Dismiss"
- Action updates `CheckInResult.suggestedBudgetItems[].actionTaken` in IndexedDB

#### Collapsible Section 3: "Planner Reality Check"

- Collapsed by default, only renders if user has active scenarios
- Each active scenario row:
  - Scenario name
  - Previous verdict → New verdict (with color coding: green/amber/red)
  - New `baselineDisposable` and `remainingAfterScenario` numbers
  - **Trend arrow** (if previous month's check-in exists): up/down/flat comparing verdict movement
- Informational only — no action buttons (user goes to Planner page to adjust)

---

## 4. Planner Re-Evaluation

### Logic (no AI involved)

For each active `PurchaseScenario`:

1. Get the scenario's current verdict by calling existing `calculateAffordability` with the standard 3-month lookback
2. Recalculate with **real mid-month data**: replace the current month's `totalActual` with the actual bank statement total (sum of all debits from parsed transactions)
3. Store both `previousVerdict` and `newVerdict` in `PlannerReviewItem`

### Data Sources

- `calculateAffordability` from `src/domain/rules/index.ts` (lines 335-379)
- Bank statement total: `Math.abs(sum of parsed transactions where amount < 0)`
- Scenario expenses: `scenarioExpenseRepo.getByScenario(scenarioId)`

---

## 5. Analytics Integration

### New Section: "Check-In History"

Added below existing spending trend chart on `AnalyticsPage.tsx`:

- **Timeline row per month**: months with a saved `CheckInResult`
- Each row: month label, verdict badge (green "Doing Well" / red "Fucking Up" pill), spending progress %, first sentence of `verdictSummary`
- **Tap row** → opens read-only version of check-in results page:
  - Same layout (verdict card, KPI strip, collapsible sections)
  - Action buttons replaced with status labels ("Logged", "Added to Budget", "Dismissed", "No action taken")
- **Sparkline trend** (visible with 3+ check-ins): line chart of `spendingProgressPercent` values across months, showing improvement or decline over time

---

## 6. Settings Changes

### New Section: "AI Check-In"

Positioned below existing "Appearance" toggle on `SettingsPage.tsx`:

- Label: "OpenAI API Key"
- Password-type input (masked by default, eye icon to reveal)
- "Save" button → stores to `AppSettings.openaiApiKey` in IndexedDB
- Helper text: "Your key stays on this device. Only used for mid-month check-ins."
- "Test" button → minimal API call to validate key, shows green tick or red error

---

## 7. NavDrawer Gating

### Visibility Logic

In `NavDrawer.tsx`:

- Check `new Date().getDate()` on render — include "Check-In" nav item only if day is 13–17 inclusive
- Distinct icon (pulse/heartbeat or clipboard-check) with gold accent colour
- If check-in already completed this month (`checkInResultRepo.getByMonthKey(currentMonthKey)` returns result), show green dot on nav item — user can tap to review results
- Route `/check-in` still accessible directly outside the window (for Analytics history drill-through), but nav item is hidden

---

## 8. New Files

| File | Purpose |
|------|---------|
| `src/ai/openai.ts` | OpenAI API integration — `analyzeCheckIn()` function |
| `src/pages/check-in/CheckInPage.tsx` | Main check-in page (upload, loading, results) |
| `src/pages/check-in/VerdictCard.tsx` | Verdict card with progress ring, sticky behaviour |
| `src/pages/check-in/KPISummaryStrip.tsx` | 4-card KPI strip |
| `src/pages/check-in/OutsideBudgetSection.tsx` | Collapsible section with swipe actions |
| `src/pages/check-in/SuggestedBudgetSection.tsx` | Collapsible section with swipe actions |
| `src/pages/check-in/PlannerReviewSection.tsx` | Collapsible planner re-evaluation section |
| `src/pages/check-in/SwipeableRow.tsx` | Reusable swipe-to-action row component |
| `src/pages/check-in/CheckInHistoryView.tsx` | Read-only historical view (used from Analytics) |
| `src/data/repositories/CheckInResultRepo.ts` | Repository interface |
| `src/data/local/CheckInResultRepo.dexie.ts` | Dexie implementation |

### Modified Files

| File | Change |
|------|--------|
| `src/domain/models/index.ts` | Add `CheckInResult`, `OutsideBudgetItem`, `SuggestedBudgetItem`, `PlannerReviewItem` interfaces |
| `src/data/local/db.ts` | Add `checkInResults` table in schema v5 |
| `src/app/NavDrawer.tsx` | Add date-gated "Check-In" nav item |
| `src/App.tsx` | Add `/check-in` and `/check-in/:monthKey` routes |
| `src/pages/settings/SettingsPage.tsx` | Add "AI Check-In" section with API key input |
| `src/pages/analytics/AnalyticsPage.tsx` | Add "Check-In History" section |

---

## 9. End-to-End Flow

1. **User opens app between 13th–17th** → "Check-In" appears in nav with gold accent
2. **Taps Check-In** → Upload screen with bank selector and CSV input
3. **CSV parsed** → existing parser infrastructure extracts `ParsedTransaction[]`
4. **App gathers context locally** → budget items, transactions, bill ticks, planner scenarios for current month
5. **Planner recalculation runs locally** → `calculateAffordability` with real mid-month bank data
6. **Data sent to OpenAI GPT-4o** → structured prompt, returns verdict + outside-budget + suggestions as JSON
7. **Results composed** → AI response merged with local planner recalculation into `CheckInResult`
8. **Results page renders** → confetti/shake animation, sticky verdict card with progress ring, KPI strip, three collapsible sections with swipe actions
9. **User takes actions** → swipe right to log transactions/add budget items, swipe left to dismiss. Each action updates `CheckInResult` and creates actual records
10. **Check-in saved to IndexedDB** → viewable from Analytics "Check-In History" section, even after the 17th
