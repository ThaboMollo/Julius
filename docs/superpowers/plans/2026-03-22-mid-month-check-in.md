# Mid-Month Check-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mid-month financial health check feature where users upload a bank statement (13th–17th), GPT-4o reviews it against their budget, and delivers an actionable verdict with persistent history.

**Architecture:** New page at `/check-in` with 3 states (upload, loading, results). OpenAI integration via direct fetch (no SDK). Data persisted in new `checkInResults` Dexie table. Results viewable historically from Analytics page. API key stored in localStorage (not IndexedDB) to prevent cloud sync.

**Tech Stack:** React 19, TypeScript, Dexie (IndexedDB), OpenAI REST API (GPT-4o), Tailwind CSS, date-fns

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/ai/openai.ts` | OpenAI API key storage (localStorage), `analyzeCheckIn()` fetch call, response parsing |
| `src/data/local/CheckInResultRepo.dexie.ts` | CRUD for `checkInResults` table, `getByMonthKey()` lookup |
| `src/pages/check-in/CheckInPage.tsx` | Main page: upload → loading → results state machine |
| `src/pages/check-in/VerdictCard.tsx` | Progress ring, verdict label, summary, confetti/shake, sticky scroll |
| `src/pages/check-in/KPISummaryStrip.tsx` | 4-card horizontal strip (spent, remaining, bills left, days to payday) |
| `src/pages/check-in/OutsideBudgetSection.tsx` | Collapsible accordion with swipeable action rows |
| `src/pages/check-in/SuggestedBudgetSection.tsx` | Collapsible accordion with swipeable action rows |
| `src/pages/check-in/PlannerReviewSection.tsx` | Collapsible planner re-evaluation (informational) |
| `src/pages/check-in/SwipeableRow.tsx` | Reusable touch swipe-to-action row component |
| `src/pages/check-in/CheckInHistoryView.tsx` | Read-only historical view (opened from Analytics) |

### Modified Files

| File | Change |
|------|--------|
| `src/domain/models/index.ts` | Add `CheckInResult`, `OutsideBudgetItem`, `SuggestedBudgetItem`, `PlannerReviewItem`, `CreateCheckInResult` |
| `src/data/local/db.ts` | Add `checkInResults` table property + v5 schema |
| `src/data/local/index.ts` | Export `checkInResultRepo` |
| `src/app/NavDrawer.tsx` | Conditional Check-In nav item (13th–17th only) |
| `src/App.tsx` | Add `/check-in` route (history drill-through uses modal overlay from Analytics, not a separate route) |
| `src/pages/settings/SettingsPage.tsx` | Add "AI Check-In" section with API key input |
| `src/pages/analytics/AnalyticsPage.tsx` | Add "Check-In History" section at bottom |

---

## Task 1: Data Model — Interfaces and Types

**Files:**
- Modify: `src/domain/models/index.ts:149-162`

- [ ] **Step 1: Add CheckInResult and related interfaces**

Add after line 149 (after `StatementUpload`), before the Create types.

Note: `AffordabilityVerdict` is defined in `src/domain/rules/index.ts` — import it at the top of models/index.ts:
```typescript
import type { AffordabilityVerdict } from '../rules'
```

Then add the interfaces:

```typescript
// Mid-Month Check-In result
export interface OutsideBudgetItem {
  description: string
  amount: number
  date: string
  aiComment: string
  actionTaken?: 'added_transaction' | 'dismissed'
}

export interface SuggestedBudgetItem {
  name: string
  suggestedAmount: number
  groupId?: string
  categoryId?: string
  aiReason: string
  actionTaken?: 'added_to_budget' | 'dismissed'
}

export interface PlannerReviewItem {
  scenarioId: string
  scenarioName: string
  previousVerdict: AffordabilityVerdict
  newVerdict: AffordabilityVerdict
  newBaselineDisposable: number
  newRemainingAfterScenario: number
}

export interface CheckInResult extends ScopedRecord {
  id: string
  budgetMonthId: string
  monthKey: string
  verdict: 'doing_well' | 'fucking_up'
  verdictSummary: string
  spendingProgressPercent: number
  outsideBudget: OutsideBudgetItem[]
  suggestedBudgetItems: SuggestedBudgetItem[]
  plannerReview: PlannerReviewItem[]
  bankStatementDate: string
  rawAIResponse: string
}
```

- [ ] **Step 2: Add CreateCheckInResult type**

Add after the existing Create types (after line 162):

```typescript
export type CreateCheckInResult = Omit<CheckInResult, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
```

- [ ] **Step 3: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to model types

- [ ] **Step 4: Commit**

```bash
git add src/domain/models/index.ts
git commit -m "feat(check-in): add CheckInResult data model interfaces"
```

---

## Task 2: Database Schema — Dexie v5

**Files:**
- Modify: `src/data/local/db.ts:1-138`

- [ ] **Step 1: Add CheckInResult import**

At line 2, add `CheckInResult` to the import:

```typescript
import type {
  BudgetGroup,
  Category,
  BudgetMonth,
  BudgetItem,
  Transaction as TxModel,
  BillTick,
  RecurringTemplate,
  AppSettings,
  PurchaseScenario,
  ScenarioExpense,
  BankConfig,
  StatementUpload,
  MigrationJournalEntry,
  SyncStateLocal,
  CheckInResult,
} from '../../domain/models'
```

- [ ] **Step 2: Add table property to JuliusDB class**

After line 33 (`syncStateLocal!: Table<SyncStateLocal, string>`), add:

```typescript
  checkInResults!: Table<CheckInResult, string>
```

- [ ] **Step 3: Add version 5 schema**

After line 105 (the closing of the v4 `.upgrade()` block), before the constructor's closing `}`:

```typescript
    this.version(5).stores({
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
      migrationJournal: 'id, userId, status',
      syncStateLocal: 'id, userId, lastSyncAt',
      checkInResults: 'id, userId, monthKey, budgetMonthId, [userId+monthKey]',
    })
```

No upgrade callback needed — new table, no existing data to migrate.

- [ ] **Step 4: Verify the app loads without DB errors**

Run: `npm run dev`
Open browser, check console for Dexie upgrade errors.

- [ ] **Step 5: Commit**

```bash
git add src/data/local/db.ts
git commit -m "feat(check-in): add checkInResults table in Dexie v5 schema"
```

---

## Task 3: Repository — CheckInResultRepo

**Files:**
- Create: `src/data/local/CheckInResultRepo.dexie.ts`
- Modify: `src/data/local/index.ts:14`

- [ ] **Step 1: Create the repository**

Create `src/data/local/CheckInResultRepo.dexie.ts`:

```typescript
import { db } from './db'
import type { CheckInResult, CreateCheckInResult } from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete, stampUpdate } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

export const checkInResultRepo = {
  async getAll(): Promise<CheckInResult[]> {
    return forActiveUser(await db.checkInResults.toArray())
  },

  async getById(id: string): Promise<CheckInResult | undefined> {
    const row = await db.checkInResults.get(id)
    if (!row) return undefined
    return row.userId === activeUserId() && row.deletedAt === null ? row : undefined
  },

  async getByMonthKey(monthKey: string): Promise<CheckInResult | undefined> {
    const userId = activeUserId()
    const rows = await db.checkInResults
      .where('[userId+monthKey]')
      .equals([userId, monthKey])
      .toArray()
    return rows.find((r) => r.deletedAt === null)
  },

  async create(data: CreateCheckInResult): Promise<CheckInResult> {
    const result: CheckInResult = {
      ...stampNew(data),
      id: generateId(),
    }
    await db.checkInResults.add(result)
    return result
  },

  async update(id: string, updates: Partial<CheckInResult>): Promise<void> {
    await db.checkInResults.update(id, stampUpdate(updates))
  },

  async delete(id: string): Promise<void> {
    await db.checkInResults.update(id, stampSoftDelete())
  },
}
```

- [ ] **Step 2: Export from index**

Add to `src/data/local/index.ts` after line 14:

```typescript
export { checkInResultRepo } from './CheckInResultRepo.dexie'
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/data/local/CheckInResultRepo.dexie.ts src/data/local/index.ts
git commit -m "feat(check-in): add CheckInResult Dexie repository"
```

---

## Task 4: OpenAI Integration Module

**Files:**
- Create: `src/ai/openai.ts`

- [ ] **Step 1: Create the OpenAI module**

Create `src/ai/openai.ts`:

```typescript
import type {
  BudgetItem,
  Transaction,
  BillTick,
  BudgetGroup,
  Category,
  PurchaseScenario,
  ScenarioExpense,
  OutsideBudgetItem,
  SuggestedBudgetItem,
} from '../domain/models'
import type { ParsedTransaction } from '../data/parsers/types'
import { effectivePlanned } from '../domain/rules'
import { formatCurrency } from '../domain/constants'

const STORAGE_KEY = 'julius-openai-key'

export function getOpenAIKey(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setOpenAIKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key)
}

export function clearOpenAIKey(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export async function testOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    })
    return res.ok
  } catch {
    return false
  }
}

interface AnalyzeParams {
  apiKey: string
  bankTransactions: ParsedTransaction[]
  budgetItems: BudgetItem[]
  transactions: Transaction[]
  billTicks: BillTick[]
  groups: BudgetGroup[]
  categories: Category[]
  scenarios: { scenario: PurchaseScenario; expenses: ScenarioExpense[]; currentVerdict: string }[]
  monthLabel: string
}

interface AnalyzeResponse {
  verdict: 'doing_well' | 'fucking_up'
  verdictSummary: string
  outsideBudget: OutsideBudgetItem[]
  suggestedBudgetItems: SuggestedBudgetItem[]
}

export async function analyzeCheckIn(params: AnalyzeParams): Promise<AnalyzeResponse> {
  const {
    apiKey,
    bankTransactions,
    budgetItems,
    transactions,
    billTicks,
    groups,
    categories,
    scenarios,
    monthLabel,
  } = params

  // Build readable context sections
  const bankSection = bankTransactions
    .map((t) => `${new Date(t.date).toLocaleDateString('en-ZA')} | ${t.description} | R${Math.abs(t.amount).toFixed(2)}${t.amount < 0 ? ' (debit)' : ' (credit)'}`)
    .join('\n')

  const groupMap = new Map(groups.map((g) => [g.id, g.name]))
  const catMap = new Map(categories.map((c) => [c.id, c.name]))

  const budgetSection = budgetItems
    .map((item) => {
      const group = groupMap.get(item.groupId) ?? 'Unknown'
      const cat = catMap.get(item.categoryId) ?? 'Unknown'
      const eff = formatCurrency(effectivePlanned(item))
      const bill = item.isBill ? ` [BILL due ${item.dueDate ? new Date(item.dueDate).getDate() : '?'}]` : ''
      return `[${group}] ${item.name} (${cat}) — ${eff}${bill}`
    })
    .join('\n')

  const txSection = transactions
    .map((tx) => {
      const cat = catMap.get(tx.categoryId) ?? 'Unknown'
      const linked = tx.budgetItemId ? budgetItems.find((i) => i.id === tx.budgetItemId)?.name ?? 'linked' : 'unbudgeted'
      return `${new Date(tx.date).toLocaleDateString('en-ZA')} | ${formatCurrency(tx.amount)} | ${cat} | ${linked} | ${tx.note || '-'}`
    })
    .join('\n')

  const billItems = budgetItems.filter((i) => i.isBill)
  const billSection = billItems
    .map((item) => {
      const tick = billTicks.find((t) => t.budgetItemId === item.id)
      const status = tick?.isPaid ? 'PAID' : 'UNPAID'
      const due = item.dueDate ? new Date(item.dueDate).getDate() : '?'
      return `${item.name} — ${formatCurrency(effectivePlanned(item))} — due ${due}th — ${status}`
    })
    .join('\n')

  const scenarioSection = scenarios
    .map((s) => {
      const total = s.expenses.reduce((sum, e) => sum + e.monthlyAmount, 0)
      return `"${s.scenario.name}": ${formatCurrency(total)}/month — currently ${s.currentVerdict}`
    })
    .join('\n')

  const groupList = groups.map((g) => `${g.id}: ${g.name}`).join(', ')
  const catList = categories.map((c) => `${c.id}: ${c.name} (group: ${c.groupId})`).join(', ')

  const systemPrompt = `You are Julius, a brutally honest South African financial advisor.
You review someone's mid-month spending and tell them straight — no sugar coating.
Use casual SA slang. Be funny but helpful. Keep it real.`

  const userPrompt = `Here's my financial picture for ${monthLabel}:

BANK STATEMENT (what actually happened):
${bankSection || '(no transactions)'}

BUDGET (what I planned):
${budgetSection || '(no budget items)'}

RECORDED TRANSACTIONS (what I logged in Julius):
${txSection || '(no transactions logged)'}

BILLS STATUS:
${billSection || '(no bills)'}

PLANNER SCENARIOS:
${scenarioSection || '(no scenarios)'}

AVAILABLE GROUPS: ${groupList}
AVAILABLE CATEGORIES: ${catList}

Respond in this exact JSON structure:
{
  "verdict": "doing_well" or "fucking_up",
  "verdictSummary": "2-3 sentences, blunt and direct about my overall mid-month financial health",
  "outsideBudget": [
    { "description": "bank statement description", "amount": number (positive), "date": "YYYY-MM-DD", "aiComment": "your roast/comment about this spend" }
  ],
  "suggestedBudgetItems": [
    { "name": "suggested item name", "suggestedAmount": number, "groupId": "matching group id or null", "categoryId": "matching category id or null", "aiReason": "why they should budget for this" }
  ]
}

Rules:
- outsideBudget: only include bank debits that don't match any budget item or recorded transaction
- suggestedBudgetItems: recurring patterns you see in the bank statement that aren't budgeted for
- Use the provided group/category IDs where they match. Use null if no match.
- Amounts are always positive numbers`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.8,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 401) throw new Error('Invalid OpenAI API key. Check your key in Settings.')
    if (res.status === 429) throw new Error('OpenAI rate limit hit. Wait a minute and try again.')
    throw new Error(`OpenAI error (${res.status}): ${body.slice(0, 200)}`)
  }

  const json = await res.json()
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from OpenAI')

  const parsed: AnalyzeResponse = JSON.parse(content)

  // Validate required fields
  if (!parsed.verdict || !parsed.verdictSummary) {
    throw new Error('AI response missing required fields')
  }
  if (parsed.verdict !== 'doing_well' && parsed.verdict !== 'fucking_up') {
    throw new Error(`Unexpected verdict: ${parsed.verdict}`)
  }

  return {
    verdict: parsed.verdict,
    verdictSummary: parsed.verdictSummary,
    outsideBudget: parsed.outsideBudget ?? [],
    suggestedBudgetItems: parsed.suggestedBudgetItems ?? [],
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/ai/openai.ts
git commit -m "feat(check-in): add OpenAI integration module with API key storage"
```

---

## Task 5: SwipeableRow Component

**Files:**
- Create: `src/pages/check-in/SwipeableRow.tsx`

- [ ] **Step 1: Create the swipeable row component**

Create `src/pages/check-in/SwipeableRow.tsx`:

```typescript
import { useRef, useState } from 'react'

interface SwipeableRowProps {
  children: React.ReactNode
  onSwipeRight?: () => void
  onSwipeLeft?: () => void
  rightLabel?: string
  leftLabel?: string
  rightColor?: string
  leftColor?: string
  disabled?: boolean
}

const SWIPE_THRESHOLD = 80

export function SwipeableRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = 'Action',
  leftLabel = 'Dismiss',
  rightColor = 'bg-[#A89060]',
  leftColor = 'bg-gray-400',
  disabled = false,
}: SwipeableRowProps) {
  const startX = useRef(0)
  const currentX = useRef(0)
  const [offset, setOffset] = useState(0)
  const [swiping, setSwiping] = useState(false)

  function handleTouchStart(e: React.TouchEvent) {
    if (disabled) return
    startX.current = e.touches[0].clientX
    setSwiping(true)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!swiping || disabled) return
    currentX.current = e.touches[0].clientX
    const diff = currentX.current - startX.current
    // Clamp between -150 and 150
    setOffset(Math.max(-150, Math.min(150, diff)))
  }

  function handleTouchEnd() {
    if (!swiping || disabled) return
    setSwiping(false)
    if (offset > SWIPE_THRESHOLD && onSwipeRight) {
      onSwipeRight()
    } else if (offset < -SWIPE_THRESHOLD && onSwipeLeft) {
      onSwipeLeft()
    }
    setOffset(0)
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background actions */}
      {offset > 0 && onSwipeRight && (
        <div className={`absolute inset-y-0 left-0 ${rightColor} flex items-center px-4 text-white text-sm font-medium`}>
          {rightLabel}
        </div>
      )}
      {offset < 0 && onSwipeLeft && (
        <div className={`absolute inset-y-0 right-0 ${leftColor} flex items-center px-4 text-white text-sm font-medium`}>
          {leftLabel}
        </div>
      )}

      {/* Content */}
      <div
        className="relative bg-white dark:bg-[#252D3D] transition-transform"
        style={{ transform: swiping ? `translateX(${offset}px)` : undefined }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/check-in/SwipeableRow.tsx
git commit -m "feat(check-in): add SwipeableRow touch component"
```

---

## Task 6: VerdictCard Component

**Files:**
- Create: `src/pages/check-in/VerdictCard.tsx`

- [ ] **Step 1: Create the verdict card with progress ring**

Create `src/pages/check-in/VerdictCard.tsx`:

```typescript
import { useEffect, useState } from 'react'

interface VerdictCardProps {
  verdict: 'doing_well' | 'fucking_up'
  verdictSummary: string
  spendingProgressPercent: number
  monthLabel: string
  compact?: boolean
}

function ProgressRing({ percent, verdict }: { percent: number; verdict: string }) {
  const radius = 40
  const stroke = 6
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const capped = Math.min(percent, 100)
  const strokeDashoffset = circumference - (capped / 100) * circumference

  const color = verdict === 'doing_well'
    ? percent <= 55 ? '#A89060' : '#D97706'
    : '#EF4444'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>
      <span className="absolute text-sm font-bold text-gray-800 dark:text-[#F0EDE4]">
        {Math.round(capped)}%
      </span>
    </div>
  )
}

export function VerdictCard({ verdict, verdictSummary, spendingProgressPercent, monthLabel, compact = false }: VerdictCardProps) {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    setAnimate(true)
    const timer = setTimeout(() => setAnimate(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  const isGood = verdict === 'doing_well'
  const verdictText = isGood ? "You're doing well" : "You're fucking up"
  const verdictColor = isGood ? 'text-[#A89060]' : 'text-red-500'
  const bgColor = isGood ? 'bg-[#F5EFE2] dark:bg-[#2A2520]' : 'bg-red-50 dark:bg-[#2D2025]'
  const animClass = animate ? (isGood ? 'checkin-confetti' : 'checkin-shake') : ''

  if (compact) {
    return (
      <div className={`${bgColor} rounded-xl p-3 flex items-center gap-3 shadow`}>
        <ProgressRing percent={spendingProgressPercent} verdict={verdict} />
        <span className={`font-bold ${verdictColor}`}>{verdictText}</span>
      </div>
    )
  }

  return (
    <div className={`${bgColor} rounded-xl p-5 shadow ${animClass}`}>
      <div className="flex items-center gap-4 mb-3">
        <ProgressRing percent={spendingProgressPercent} verdict={verdict} />
        <div>
          <h2 className={`text-xl font-bold ${verdictColor}`}>{verdictText}</h2>
          <p className="text-xs text-gray-500 dark:text-[#8A9BAA]">{monthLabel} — Mid-Month Check-In</p>
        </div>
      </div>
      <p className="text-sm text-gray-700 dark:text-[#C0C8D0] leading-relaxed">{verdictSummary}</p>
    </div>
  )
}
```

- [ ] **Step 2: Add CSS animations to `src/index.css`**

Add at the bottom of `src/index.css`:

```css
/* Check-in animations */
@keyframes checkin-shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}
.checkin-shake { animation: checkin-shake 0.6s ease-in-out; }

@keyframes checkin-confetti-pop {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 1; }
}
.checkin-confetti { animation: checkin-confetti-pop 0.8s ease-out; }
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/check-in/VerdictCard.tsx src/index.css
git commit -m "feat(check-in): add VerdictCard with progress ring and animations"
```

---

## Task 7: KPISummaryStrip Component

**Files:**
- Create: `src/pages/check-in/KPISummaryStrip.tsx`

- [ ] **Step 1: Create the KPI strip**

Create `src/pages/check-in/KPISummaryStrip.tsx`:

```typescript
import { formatCurrency } from '../../domain/constants'

interface KPISummaryStripProps {
  spentSoFar: number
  budgetRemaining: number
  billsLeftCount: number
  billsLeftAmount: number
  daysToPayday: number
}

export function KPISummaryStrip({
  spentSoFar,
  budgetRemaining,
  billsLeftCount,
  billsLeftAmount,
  daysToPayday,
}: KPISummaryStripProps) {
  const cards = [
    { label: 'Spent so far', value: formatCurrency(spentSoFar), color: 'text-gray-800 dark:text-[#F0EDE4]' },
    {
      label: 'Budget remaining',
      value: formatCurrency(budgetRemaining),
      color: budgetRemaining >= 0 ? 'text-[#A89060]' : 'text-red-500',
    },
    { label: 'Bills left', value: `${billsLeftCount} (${formatCurrency(billsLeftAmount)})`, color: 'text-gray-800 dark:text-[#F0EDE4]' },
    { label: 'Days to payday', value: `${daysToPayday}`, color: 'text-gray-800 dark:text-[#F0EDE4]' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card) => (
        <div key={card.label} className="bg-white dark:bg-[#252D3D] rounded-lg p-3 shadow">
          <div className="text-xs text-gray-500 dark:text-[#8A9BAA]">{card.label}</div>
          <div className={`text-sm font-bold mt-0.5 ${card.color}`}>{card.value}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/check-in/KPISummaryStrip.tsx
git commit -m "feat(check-in): add KPI summary strip component"
```

---

## Task 8: OutsideBudgetSection Component

**Files:**
- Create: `src/pages/check-in/OutsideBudgetSection.tsx`

- [ ] **Step 1: Create the collapsible outside-budget section**

Create `src/pages/check-in/OutsideBudgetSection.tsx`:

```typescript
import { useState } from 'react'
import type { OutsideBudgetItem } from '../../domain/models'
import { formatCurrency } from '../../domain/constants'
import { SwipeableRow } from './SwipeableRow'

interface Props {
  items: OutsideBudgetItem[]
  onLogTransaction: (item: OutsideBudgetItem, index: number) => void
  onDismiss: (index: number) => void
  readOnly?: boolean
}

export function OutsideBudgetSection({ items, onLogTransaction, onDismiss, readOnly = false }: Props) {
  const [open, setOpen] = useState(false)
  const activeCount = items.filter((i) => !i.actionTaken).length

  return (
    <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 dark:text-[#F0EDE4]">Outside Your Budget</span>
          {activeCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <span className="text-gray-400 dark:text-[#8A9BAA]">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-[#8A9BAA] py-2">Nothing outside your budget. Nice.</p>
          )}
          {items.map((item, idx) => (
            <div key={idx} className={item.actionTaken ? 'opacity-40' : ''}>
              <SwipeableRow
                onSwipeRight={!readOnly && !item.actionTaken ? () => onLogTransaction(item, idx) : undefined}
                onSwipeLeft={!readOnly && !item.actionTaken ? () => onDismiss(idx) : undefined}
                rightLabel="Log"
                leftLabel="Dismiss"
                disabled={!!item.actionTaken || readOnly}
              >
                <div className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800 dark:text-[#F0EDE4]">{item.description}</div>
                      <div className="text-xs text-gray-500 dark:text-[#8A9BAA] mt-0.5">{item.date}</div>
                    </div>
                    <div className="text-sm font-bold text-red-500">{formatCurrency(item.amount)}</div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-[#8A9BAA] mt-1 italic">"{item.aiComment}"</div>
                  {item.actionTaken && (
                    <div className="text-xs text-[#A89060] mt-1 font-medium">
                      {item.actionTaken === 'added_transaction' ? '✓ Logged' : '✕ Dismissed'}
                    </div>
                  )}
                  {!readOnly && !item.actionTaken && (
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => onLogTransaction(item, idx)}
                        className="text-xs px-2 py-1 bg-[#A89060] text-white rounded hover:bg-[#8B7550]"
                      >
                        Log Transaction
                      </button>
                      <button
                        type="button"
                        onClick={() => onDismiss(idx)}
                        className="text-xs px-2 py-1 bg-gray-200 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA] rounded"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </SwipeableRow>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/check-in/OutsideBudgetSection.tsx
git commit -m "feat(check-in): add OutsideBudgetSection with swipe actions"
```

---

## Task 9: SuggestedBudgetSection Component

**Files:**
- Create: `src/pages/check-in/SuggestedBudgetSection.tsx`

- [ ] **Step 1: Create the collapsible suggested budget section**

Create `src/pages/check-in/SuggestedBudgetSection.tsx`:

```typescript
import { useState } from 'react'
import type { SuggestedBudgetItem } from '../../domain/models'
import { formatCurrency } from '../../domain/constants'
import { SwipeableRow } from './SwipeableRow'

interface Props {
  items: SuggestedBudgetItem[]
  onAddToBudget: (item: SuggestedBudgetItem, index: number) => void
  onDismiss: (index: number) => void
  readOnly?: boolean
}

export function SuggestedBudgetSection({ items, onAddToBudget, onDismiss, readOnly = false }: Props) {
  const [open, setOpen] = useState(false)
  const activeCount = items.filter((i) => !i.actionTaken).length

  return (
    <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 dark:text-[#F0EDE4]">Should Be On Your Budget</span>
          {activeCount > 0 && (
            <span className="bg-[#A89060] text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <span className="text-gray-400 dark:text-[#8A9BAA]">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-[#8A9BAA] py-2">No suggestions. Your budget looks complete.</p>
          )}
          {items.map((item, idx) => (
            <div key={idx} className={item.actionTaken ? 'opacity-40' : ''}>
              <SwipeableRow
                onSwipeRight={!readOnly && !item.actionTaken ? () => onAddToBudget(item, idx) : undefined}
                onSwipeLeft={!readOnly && !item.actionTaken ? () => onDismiss(idx) : undefined}
                rightLabel="Add"
                leftLabel="Dismiss"
                disabled={!!item.actionTaken || readOnly}
              >
                <div className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800 dark:text-[#F0EDE4]">{item.name}</div>
                    </div>
                    <div className="text-sm font-bold text-[#A89060]">{formatCurrency(item.suggestedAmount)}/mo</div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-[#8A9BAA] mt-1 italic">"{item.aiReason}"</div>
                  {item.actionTaken && (
                    <div className="text-xs text-[#A89060] mt-1 font-medium">
                      {item.actionTaken === 'added_to_budget' ? '✓ Added to Budget' : '✕ Dismissed'}
                    </div>
                  )}
                  {!readOnly && !item.actionTaken && (
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => onAddToBudget(item, idx)}
                        className="text-xs px-2 py-1 bg-[#A89060] text-white rounded hover:bg-[#8B7550]"
                      >
                        Add to Budget
                      </button>
                      <button
                        type="button"
                        onClick={() => onDismiss(idx)}
                        className="text-xs px-2 py-1 bg-gray-200 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA] rounded"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </SwipeableRow>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/check-in/SuggestedBudgetSection.tsx
git commit -m "feat(check-in): add SuggestedBudgetSection with swipe actions"
```

---

## Task 10: PlannerReviewSection Component

**Files:**
- Create: `src/pages/check-in/PlannerReviewSection.tsx`

- [ ] **Step 1: Create the planner review section**

Create `src/pages/check-in/PlannerReviewSection.tsx`:

```typescript
import { useState } from 'react'
import type { PlannerReviewItem } from '../../domain/models'
import { formatCurrency } from '../../domain/constants'

interface Props {
  items: PlannerReviewItem[]
  previousMonthItems?: PlannerReviewItem[]
}

const VERDICT_COLORS: Record<string, string> = {
  affordable: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  tight: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  cannot_afford: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
}

const VERDICT_LABELS: Record<string, string> = {
  affordable: 'Affordable',
  tight: 'Tight',
  cannot_afford: "Can't Afford",
}

function TrendArrow({ previous, current }: { previous: string; current: string }) {
  const order = ['affordable', 'tight', 'cannot_afford']
  const prevIdx = order.indexOf(previous)
  const currIdx = order.indexOf(current)
  if (prevIdx < 0 || currIdx < 0) return null
  if (currIdx > prevIdx) return <span className="text-red-500">↓</span>
  if (currIdx < prevIdx) return <span className="text-green-500">↑</span>
  return <span className="text-gray-400">→</span>
}

export function PlannerReviewSection({ items, previousMonthItems }: Props) {
  const [open, setOpen] = useState(false)

  if (items.length === 0) return null

  const prevMap = new Map(previousMonthItems?.map((i) => [i.scenarioId, i]) ?? [])

  return (
    <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4"
      >
        <span className="font-semibold text-gray-800 dark:text-[#F0EDE4]">Planner Reality Check</span>
        <span className="text-gray-400 dark:text-[#8A9BAA]">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {items.map((item) => {
            const prevMonth = prevMap.get(item.scenarioId)
            const changed = item.previousVerdict !== item.newVerdict

            return (
              <div key={item.scenarioId} className="p-3 bg-gray-50 dark:bg-[#1E2330] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-[#F0EDE4]">{item.scenarioName}</span>
                  {prevMonth && <TrendArrow previous={prevMonth.newVerdict} current={item.newVerdict} />}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full ${VERDICT_COLORS[item.previousVerdict]}`}>
                    {VERDICT_LABELS[item.previousVerdict]}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${VERDICT_COLORS[item.newVerdict]}`}>
                    {VERDICT_LABELS[item.newVerdict]}
                  </span>
                  {changed && <span className="text-xs text-gray-500 dark:text-[#8A9BAA]">changed</span>}
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-[#8A9BAA]">
                  Disposable: {formatCurrency(item.newBaselineDisposable)} · After scenario: {formatCurrency(item.newRemainingAfterScenario)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/check-in/PlannerReviewSection.tsx
git commit -m "feat(check-in): add PlannerReviewSection with trend arrows"
```

---

## Task 11: Main CheckInPage — Upload, Loading, Results

**Files:**
- Create: `src/pages/check-in/CheckInPage.tsx`

- [ ] **Step 1: Create the check-in page**

Create `src/pages/check-in/CheckInPage.tsx`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { format, subMonths, startOfMonth } from 'date-fns'
import { useMonth } from '../../app/MonthContext'
import { getParserForBank } from '../../data/parsers'
import { getOpenAIKey, analyzeCheckIn } from '../../ai/openai'
import {
  budgetMonthRepo,
  budgetItemRepo,
  transactionRepo,
  billTickRepo,
  budgetGroupRepo,
  categoryRepo,
  settingsRepo,
  bankConfigRepo,
  purchaseScenarioRepo,
  scenarioExpenseRepo,
  checkInResultRepo,
} from '../../data/local'
import type {
  BankConfig,
  CheckInResult,
  OutsideBudgetItem,
  SuggestedBudgetItem,
  CreateTransaction,
  CreateBudgetItem,
  Category,
  BudgetItem,
  BudgetGroup,
} from '../../domain/models'
import { totalPlanned, totalActual, calculateAffordability, getPaydayDate, effectivePlanned } from '../../domain/rules'
import { formatCurrency, UNCATEGORISED_CATEGORY } from '../../domain/constants'
import { VerdictCard } from './VerdictCard'
import { KPISummaryStrip } from './KPISummaryStrip'
import { OutsideBudgetSection } from './OutsideBudgetSection'
import { SuggestedBudgetSection } from './SuggestedBudgetSection'
import { PlannerReviewSection } from './PlannerReviewSection'
import { TransactionModal } from '../transactions/TransactionModal'
import { BudgetItemModal } from '../budget/BudgetItemModal'
import type { ParsedTransaction } from '../../data/parsers/types'

const LOADING_MESSAGES = [
  'Checking your damage...',
  'Counting the Uber Eats orders...',
  "Let's see who's been naughty...",
  'Judging your life choices...',
  'Running the numbers...',
  'This might hurt...',
]

type PageState = 'upload' | 'loading' | 'results'

export function CheckInPage() {
  const { year, month } = useMonth()
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const monthLabel = format(new Date(year, month - 1), 'MMMM yyyy')

  const [pageState, setPageState] = useState<PageState>('upload')
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [error, setError] = useState('')

  // Upload state
  const [banks, setBanks] = useState<BankConfig[]>([])
  const [selectedBankId, setSelectedBankId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Loading animation
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])

  // Modal state for actions
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txInitial, setTxInitial] = useState<Partial<CreateTransaction> | undefined>()
  const [biModalOpen, setBiModalOpen] = useState(false)
  const [biInitial, setBiInitial] = useState<Partial<CreateBudgetItem> | undefined>()
  const [pendingActionIdx, setPendingActionIdx] = useState<{ section: 'outside' | 'suggested'; index: number } | null>(null)

  // Data for modals and KPIs
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [allItems, setAllItems] = useState<BudgetItem[]>([])
  const [allGroups, setAllGroups] = useState<BudgetGroup[]>([])
  const [budgetMonthId, setBudgetMonthId] = useState('')
  const [bankDebitTotal, setBankDebitTotal] = useState(0)
  const [billTicks, setBillTicks] = useState<import('../../domain/models').BillTick[]>([])
  const [paydayDay, setPaydayDay] = useState(25)

  // Sticky scroll state
  const [isSticky, setIsSticky] = useState(false)
  const verdictRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadInitial()
  }, [])

  useEffect(() => {
    if (pageState !== 'loading') return
    const interval = setInterval(() => {
      setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)])
    }, 2500)
    return () => clearInterval(interval)
  }, [pageState])

  useEffect(() => {
    if (pageState !== 'results') return
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0 }
    )
    if (verdictRef.current) observer.observe(verdictRef.current)
    return () => observer.disconnect()
  }, [pageState])

  async function loadInitial() {
    const [bankList, existing] = await Promise.all([
      bankConfigRepo.getAll(),
      checkInResultRepo.getByMonthKey(monthKey),
    ])
    const activeBanks = bankList.filter((b) => b.isActive)
    setBanks(activeBanks)
    if (activeBanks.length > 0) setSelectedBankId(activeBanks[0].id)

    if (existing) {
      setResult(existing)
      setPageState('results')
      await loadModalData()
    }
  }

  async function loadModalData() {
    const bm = await budgetMonthRepo.getOrCreate(year, month)
    setBudgetMonthId(bm.id)
    const [cats, items, groups] = await Promise.all([
      categoryRepo.getActive(),
      budgetItemRepo.getByMonth(bm.id),
      budgetGroupRepo.getAll(),
    ])
    setAllCategories(cats)
    setAllItems(items)
    setAllGroups(groups.filter((g) => g.isActive))
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Please select a CSV file.'); return }

    const bank = banks.find((b) => b.id === selectedBankId)
    if (!bank) { setError('Please select a bank.'); return }

    const apiKey = getOpenAIKey()
    if (!apiKey) { setError('Please set your OpenAI API key in Settings first.'); return }

    setError('')
    setPageState('loading')

    try {
      // 1. Parse CSV
      const csvText = await file.text()
      let parsed: ParsedTransaction[]
      try {
        const parser = getParserForBank(bank.bankCode)
        parsed = parser(csvText)
      } catch {
        setError(`Failed to parse CSV. Make sure you selected the correct bank (${bank.bankName}).`)
        setPageState('upload')
        return
      }

      if (parsed.length === 0) {
        setError('No transactions found in this file.')
        setPageState('upload')
        return
      }

      // 2. Gather all local data
      const bm = await budgetMonthRepo.getOrCreate(year, month)
      setBudgetMonthId(bm.id)
      const settings = await settingsRepo.get()

      const [items, transactions, ticks, groups, categories] = await Promise.all([
        budgetItemRepo.getByMonth(bm.id),
        transactionRepo.getByMonth(bm.id),
        billTickRepo.getByMonth(bm.id),
        budgetGroupRepo.getAll(),
        categoryRepo.getActive(),
      ])

      setAllCategories(categories)
      setAllItems(items)
      setAllGroups(groups.filter((g) => g.isActive))

      // 3. Gather planner data
      const allScenarios = await purchaseScenarioRepo.getAll()
      const globalIncome = settings.expectedMonthlyIncome ?? 0

      // Build 3-month baseline for planner
      const now = new Date()
      const baselineMonths: { totalActual: number; expectedIncome: number }[] = []
      for (let i = 2; i >= 0; i--) {
        const md = startOfMonth(subMonths(now, i))
        const y = md.getFullYear()
        const m = md.getMonth() + 1
        const bmPast = await budgetMonthRepo.getOrCreate(y, m)
        const txsPast = await transactionRepo.getByMonth(bmPast.id)
        const income = bmPast.expectedIncome ?? globalIncome
        baselineMonths.push({ totalActual: totalActual(txsPast), expectedIncome: income })
      }

      // Get scenario details for AI and planner review
      const scenarioData = await Promise.all(
        allScenarios.map(async (scenario) => {
          const expenses = await scenarioExpenseRepo.getByScenario(scenario.id)
          const scenarioTotal = expenses.reduce((s, e) => s + e.monthlyAmount, 0)
          const currentResult = calculateAffordability(baselineMonths, scenarioTotal)
          return { scenario, expenses, currentVerdict: currentResult.verdict, scenarioTotal }
        })
      )

      // 4. Call OpenAI
      const aiResponse = await analyzeCheckIn({
        apiKey,
        bankTransactions: parsed,
        budgetItems: items,
        transactions,
        billTicks: ticks,
        groups: groups.filter((g) => g.isActive),
        categories,
        scenarios: scenarioData.map(({ scenario, expenses, currentVerdict }) => ({
          scenario,
          expenses,
          currentVerdict,
        })),
        monthLabel,
      })

      // 5. Planner re-evaluation with bank data
      const bankDebitSum = parsed
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0)

      const updatedBaseline = [...baselineMonths]
      updatedBaseline[updatedBaseline.length - 1] = {
        ...updatedBaseline[updatedBaseline.length - 1],
        totalActual: bankDebitSum,
      }

      const plannerReview = scenarioData.map(({ scenario, scenarioTotal, currentVerdict }) => {
        const newResult = calculateAffordability(updatedBaseline, scenarioTotal)
        return {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          previousVerdict: currentVerdict as 'affordable' | 'tight' | 'cannot_afford',
          newVerdict: newResult.verdict,
          newBaselineDisposable: newResult.baselineDisposable,
          newRemainingAfterScenario: newResult.remainingAfterScenario,
        }
      })

      // 6. Calculate spending progress %
      const planned = totalPlanned(items)
      const spendingProgressPercent = planned > 0 ? Math.round((bankDebitSum / planned) * 100) : 0

      // 7. Compose and save result
      const checkIn = await checkInResultRepo.create({
        budgetMonthId: bm.id,
        monthKey,
        verdict: aiResponse.verdict,
        verdictSummary: aiResponse.verdictSummary,
        spendingProgressPercent,
        outsideBudget: aiResponse.outsideBudget,
        suggestedBudgetItems: aiResponse.suggestedBudgetItems,
        plannerReview,
        bankStatementDate: new Date().toISOString(),
        rawAIResponse: JSON.stringify(aiResponse),
      })

      setResult(checkIn)
      setBankDebitTotal(bankDebitSum)
      setBillTicks(ticks)
      setPaydayDay(settings.paydayDayOfMonth)
      setPageState('results')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setError(msg)
      setPageState('upload')
    }
  }

  // Action handlers
  function handleLogTransaction(item: OutsideBudgetItem, idx: number) {
    const uncategorised = allCategories.find((c) => c.name === UNCATEGORISED_CATEGORY)
    setTxInitial({
      amount: item.amount,
      date: new Date(item.date),
      categoryId: uncategorised?.id ?? allCategories[0]?.id ?? '',
      budgetItemId: null,
      budgetMonthId,
      note: item.description,
    })
    setPendingActionIdx({ section: 'outside', index: idx })
    setTxModalOpen(true)
  }

  async function handleTxSave(data: CreateTransaction) {
    await transactionRepo.create(data)
    setTxModalOpen(false)
    if (pendingActionIdx?.section === 'outside' && result) {
      const updated = [...result.outsideBudget]
      updated[pendingActionIdx.index] = { ...updated[pendingActionIdx.index], actionTaken: 'added_transaction' }
      await checkInResultRepo.update(result.id, { outsideBudget: updated })
      setResult({ ...result, outsideBudget: updated })
    }
    setPendingActionIdx(null)
  }

  async function handleDismissOutside(idx: number) {
    if (!result) return
    const updated = [...result.outsideBudget]
    updated[idx] = { ...updated[idx], actionTaken: 'dismissed' }
    await checkInResultRepo.update(result.id, { outsideBudget: updated })
    setResult({ ...result, outsideBudget: updated })
  }

  function handleAddToBudget(item: SuggestedBudgetItem, idx: number) {
    // BudgetItemModal reads initial values from the `item` prop.
    // We pass a synthetic BudgetItem to pre-fill the form.
    setBiInitial({
      id: '__draft__',
      userId: '',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      name: item.name,
      plannedAmount: item.suggestedAmount,
      groupId: item.groupId ?? allGroups[0]?.id ?? '',
      categoryId: item.categoryId ?? allCategories[0]?.id ?? '',
      budgetMonthId,
      multiplier: 1,
      splitRatio: 1,
      isBill: false,
      dueDate: null,
      isFromTemplate: false,
      templateId: null,
    } as unknown as Partial<CreateBudgetItem>)
    setPendingActionIdx({ section: 'suggested', index: idx })
    setBiModalOpen(true)
  }

  async function handleBiSave(data: CreateBudgetItem) {
    await budgetItemRepo.create(data)
    setBiModalOpen(false)
    if (pendingActionIdx?.section === 'suggested' && result) {
      const updated = [...result.suggestedBudgetItems]
      updated[pendingActionIdx.index] = { ...updated[pendingActionIdx.index], actionTaken: 'added_to_budget' }
      await checkInResultRepo.update(result.id, { suggestedBudgetItems: updated })
      setResult({ ...result, suggestedBudgetItems: updated })
    }
    setPendingActionIdx(null)
  }

  async function handleDismissSuggested(idx: number) {
    if (!result) return
    const updated = [...result.suggestedBudgetItems]
    updated[idx] = { ...updated[idx], actionTaken: 'dismissed' }
    await checkInResultRepo.update(result.id, { suggestedBudgetItems: updated })
    setResult({ ...result, suggestedBudgetItems: updated })
  }

  // ─── Render ───

  if (pageState === 'upload') {
    const apiKey = getOpenAIKey()
    return (
      <div className="p-4 space-y-6 pb-24">
        <h1 className="text-xl font-bold text-gray-800 dark:text-[#F0EDE4]">Mid-Month Check-In</h1>
        <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">
          Upload your bank statement and let's see how you're doing
        </p>

        {!apiKey && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              You need to set your OpenAI API key in Settings before running a check-in.
            </p>
          </div>
        )}

        {banks.length === 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Add a bank account in Settings first to upload statements.
            </p>
          </div>
        )}

        {banks.length > 0 && apiKey && (
          <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">Bank</label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full px-3 py-2 border dark:border-[#2E3A4E] rounded-lg bg-white dark:bg-[#1E2330] text-gray-800 dark:text-[#F0EDE4]"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.bankName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">Bank Statement (CSV)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="w-full text-sm text-gray-500 dark:text-[#8A9BAA] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#A89060] file:text-white hover:file:bg-[#8B7550]"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleUpload()}
              className="w-full py-3 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550] font-medium"
            >
              Run Check-In
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>
    )
  }

  if (pageState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="w-12 h-12 border-4 border-[#A89060] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-600 dark:text-[#8A9BAA] animate-pulse">{loadingMsg}</p>
      </div>
    )
  }

  // Results state
  if (!result) return null

  // Compute KPI values
  const planned = totalPlanned(allItems)
  const billItems = allItems.filter((i) => i.isBill)
  const unpaidBills = billItems.filter((i) => !billTicks.find((t) => t.budgetItemId === i.id && t.isPaid))
  const unpaidBillsAmount = unpaidBills.reduce((s, i) => s + effectivePlanned(i), 0)

  // Days to payday
  const today = new Date()
  const paydayThisMonth = new Date(today.getFullYear(), today.getMonth(), paydayDay)
  const paydayTarget = paydayThisMonth > today ? paydayThisMonth : new Date(today.getFullYear(), today.getMonth() + 1, paydayDay)
  const daysToPayday = Math.ceil((paydayTarget.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Sticky verdict when scrolled */}
      {isSticky && (
        <div className="fixed top-14 left-0 right-0 z-30 px-4 pt-2">
          <VerdictCard
            verdict={result.verdict}
            verdictSummary={result.verdictSummary}
            spendingProgressPercent={result.spendingProgressPercent}
            monthLabel={monthLabel}
            compact
          />
        </div>
      )}

      {/* Full verdict card */}
      <div ref={verdictRef}>
        <VerdictCard
          verdict={result.verdict}
          verdictSummary={result.verdictSummary}
          spendingProgressPercent={result.spendingProgressPercent}
          monthLabel={monthLabel}
        />
      </div>

      {/* KPI strip */}
      <KPISummaryStrip
        spentSoFar={bankDebitTotal}
        budgetRemaining={planned - bankDebitTotal}
        billsLeftCount={unpaidBills.length}
        billsLeftAmount={unpaidBillsAmount}
        daysToPayday={daysToPayday}
      />

      {/* Collapsible sections */}
      <OutsideBudgetSection
        items={result.outsideBudget}
        onLogTransaction={handleLogTransaction}
        onDismiss={handleDismissOutside}
      />

      <SuggestedBudgetSection
        items={result.suggestedBudgetItems}
        onAddToBudget={handleAddToBudget}
        onDismiss={handleDismissSuggested}
      />

      <PlannerReviewSection items={result.plannerReview} />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => { setTxModalOpen(false); setPendingActionIdx(null) }}
        onSave={(data) => void handleTxSave(data)}
        transaction={null}
        initialValues={txInitial}
        categories={allCategories}
        items={allItems}
        budgetMonthId={budgetMonthId}
      />

      {/* Budget Item Modal — pass synthetic BudgetItem to pre-fill the form */}
      <BudgetItemModal
        isOpen={biModalOpen}
        onClose={() => { setBiModalOpen(false); setPendingActionIdx(null) }}
        onSave={(data) => void handleBiSave(data)}
        item={biInitial ? (biInitial as unknown as BudgetItem) : null}
        groups={allGroups}
        categories={allCategories}
        budgetMonthId={budgetMonthId}
        defaultGroupId={biInitial?.groupId ?? null}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/check-in/CheckInPage.tsx
git commit -m "feat(check-in): add main CheckInPage with upload, loading, and results states"
```

---

## Task 12: Routing and NavDrawer Integration

**Files:**
- Modify: `src/App.tsx:1-58`
- Modify: `src/app/NavDrawer.tsx:1-78`

- [ ] **Step 1: Add route to App.tsx**

Add import after line 15:

```typescript
import { CheckInPage } from './pages/check-in/CheckInPage'
```

Add route after line 51 (after the `configurations` route, before `</Route>`):

```typescript
          <Route path="check-in" element={<CheckInPage />} />
```

- [ ] **Step 2: Add conditional nav item to NavDrawer.tsx**

Add `useState` to the import on line 1:

```typescript
import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { checkInResultRepo } from '../data/local'
```

Inside the `NavDrawer` component (after line 19), add:

```typescript
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [checkInDone, setCheckInDone] = useState(false)

  useEffect(() => {
    const day = new Date().getDate()
    setShowCheckIn(day >= 13 && day <= 17)

    if (day >= 13 && day <= 17) {
      const now = new Date()
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      checkInResultRepo.getByMonthKey(monthKey).then((r) => setCheckInDone(!!r))
    }
  }, [])
```

After the `navItems.map()` closing (after `</NavLink>` and `))}`), add before `</nav>`:

```typescript
          {showCheckIn && (
            <NavLink
              to="/check-in"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-4 px-5 py-3.5 text-base transition-colors ${
                  isActive
                    ? 'text-[#C4A86B] bg-white/10'
                    : 'text-[#C4A86B] hover:bg-white/5'
                }`
              }
            >
              <span className="text-xl w-7 text-center">♡</span>
              <span className="font-medium">Check-In</span>
              {checkInDone && (
                <span className="w-2 h-2 rounded-full bg-green-400 ml-auto" />
              )}
            </NavLink>
          )}
```

- [ ] **Step 3: Verify the app loads and nav item appears**

Run: `npm run dev`
Check: If today is between 13th-17th, Check-In should appear in nav. Route `/check-in` should render the upload screen.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/app/NavDrawer.tsx
git commit -m "feat(check-in): add route and date-gated nav item"
```

---

## Task 13: Settings — OpenAI API Key Section

**Files:**
- Modify: `src/pages/settings/SettingsPage.tsx:249-252`

- [ ] **Step 1: Add imports**

Add to the imports at the top of `SettingsPage.tsx`:

```typescript
import { getOpenAIKey, setOpenAIKey, clearOpenAIKey, testOpenAIKey } from '../../ai/openai'
```

- [ ] **Step 2: Add state for API key**

After line 20 (`const [monthlyIncome, setMonthlyIncome] = useState('')`), add:

```typescript
  const [apiKey, setApiKey] = useState('')
  const [apiKeyMasked, setApiKeyMasked] = useState(true)
  const [apiKeyTesting, setApiKeyTesting] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState<'none' | 'valid' | 'invalid'>('none')
```

In `loadData()`, after line 32 (`setMonthlyIncome(...)`), add:

```typescript
      const existingKey = getOpenAIKey()
      if (existingKey) setApiKey(existingKey)
```

- [ ] **Step 3: Add API key section UI**

After the `<BankAccountsSection />` on line 250 and before the closing `</div>` on line 252, add:

```tsx
      {/* AI Check-In */}
      <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4] mb-4">AI Check-In</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">
              OpenAI API Key
            </label>
            <div className="flex gap-2">
              <input
                type={apiKeyMasked ? 'password' : 'text'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setApiKeyStatus('none') }}
                placeholder="sk-..."
                className="flex-1 px-3 py-2 border dark:border-[#2E3A4E] rounded-lg bg-white dark:bg-[#1E2330] text-gray-800 dark:text-[#F0EDE4] focus:ring-2 focus:ring-[#A89060] text-sm"
              />
              <button
                type="button"
                onClick={() => setApiKeyMasked(!apiKeyMasked)}
                className="px-2 py-2 text-gray-500 dark:text-[#8A9BAA] text-sm"
              >
                {apiKeyMasked ? '👁' : '🔒'}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-[#8A9BAA] mt-1">
              Your key stays on this device. Only used for mid-month check-ins.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (apiKey.trim()) {
                  setOpenAIKey(apiKey.trim())
                  alert('API key saved!')
                } else {
                  clearOpenAIKey()
                  alert('API key removed.')
                }
              }}
              className="px-3 py-2 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550] text-sm"
            >
              Save
            </button>
            <button
              type="button"
              disabled={!apiKey.trim() || apiKeyTesting}
              onClick={async () => {
                setApiKeyTesting(true)
                setApiKeyStatus('none')
                const valid = await testOpenAIKey(apiKey.trim())
                setApiKeyStatus(valid ? 'valid' : 'invalid')
                setApiKeyTesting(false)
              }}
              className="px-3 py-2 border border-[#A89060] text-[#A89060] rounded-lg text-sm disabled:opacity-50"
            >
              {apiKeyTesting ? 'Testing...' : 'Test'}
            </button>
            {apiKeyStatus === 'valid' && <span className="self-center text-green-500 text-sm">✓ Valid</span>}
            {apiKeyStatus === 'invalid' && <span className="self-center text-red-500 text-sm">✕ Invalid</span>}
          </div>
        </div>
      </div>
```

- [ ] **Step 4: Verify it renders**

Run: `npm run dev`, navigate to Settings. The "AI Check-In" section should appear below Bank Accounts.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/SettingsPage.tsx
git commit -m "feat(check-in): add OpenAI API key section to Settings"
```

---

## Task 14: CheckInHistoryView Component

**Files:**
- Create: `src/pages/check-in/CheckInHistoryView.tsx`

- [ ] **Step 1: Create read-only history view**

Create `src/pages/check-in/CheckInHistoryView.tsx`:

```typescript
import type { CheckInResult } from '../../domain/models'
import { VerdictCard } from './VerdictCard'
import { OutsideBudgetSection } from './OutsideBudgetSection'
import { SuggestedBudgetSection } from './SuggestedBudgetSection'
import { PlannerReviewSection } from './PlannerReviewSection'
import { format } from 'date-fns'

interface Props {
  result: CheckInResult
  onClose: () => void
}

export function CheckInHistoryView({ result, onClose }: Props) {
  const [year, monthStr] = result.monthKey.split('-')
  const monthLabel = format(new Date(parseInt(year), parseInt(monthStr) - 1), 'MMMM yyyy')

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-full bg-[#F8FAF5] dark:bg-[#1E2330] p-4 space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800 dark:text-[#F0EDE4]">Check-In Review</h1>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 dark:text-[#8A9BAA] text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        <VerdictCard
          verdict={result.verdict}
          verdictSummary={result.verdictSummary}
          spendingProgressPercent={result.spendingProgressPercent}
          monthLabel={monthLabel}
        />

        <OutsideBudgetSection
          items={result.outsideBudget}
          onLogTransaction={() => {}}
          onDismiss={() => {}}
          readOnly
        />

        <SuggestedBudgetSection
          items={result.suggestedBudgetItems}
          onAddToBudget={() => {}}
          onDismiss={() => {}}
          readOnly
        />

        <PlannerReviewSection items={result.plannerReview} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/check-in/CheckInHistoryView.tsx
git commit -m "feat(check-in): add read-only CheckInHistoryView for Analytics"
```

---

## Task 15: Analytics Integration — Check-In History Section

**Files:**
- Modify: `src/pages/analytics/AnalyticsPage.tsx`

- [ ] **Step 1: Add imports and state**

Add to the imports at the top:

```typescript
import { checkInResultRepo } from '../../data/local'
import type { CheckInResult } from '../../domain/models'
import { CheckInHistoryView } from '../check-in/CheckInHistoryView'
```

Add state inside the component:

```typescript
  const [checkInHistory, setCheckInHistory] = useState<CheckInResult[]>([])
  const [viewingCheckIn, setViewingCheckIn] = useState<CheckInResult | null>(null)
```

- [ ] **Step 2: Load check-in history in loadData()**

Add at the end of the existing `loadData()` function (inside the try block, after `setMonthsData(months)`):

```typescript
      const allCheckIns = await checkInResultRepo.getAll()
      setCheckInHistory(
        allCheckIns.sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      )
```

- [ ] **Step 3: Add Check-In History section to the JSX**

Add after the last existing section in the return JSX (before the closing `</div>` of the page):

```tsx
      {/* Check-In History */}
      {checkInHistory.length > 0 && (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4] mb-3">Check-In History</h2>

          {/* Sparkline (3+ check-ins) */}
          {checkInHistory.length >= 3 && (
            <div className="flex items-end gap-1 h-10 mb-3">
              {checkInHistory.slice().reverse().map((ci) => {
                const h = Math.max(4, Math.min(40, (ci.spendingProgressPercent / 100) * 40))
                const color = ci.verdict === 'doing_well' ? 'bg-[#A89060]' : 'bg-red-400'
                return (
                  <div key={ci.id} className={`${color} rounded-sm flex-1 max-w-8`} style={{ height: `${h}px` }} />
                )
              })}
            </div>
          )}

          <div className="space-y-2">
            {checkInHistory.map((ci) => {
              const [y, m] = ci.monthKey.split('-')
              const label = format(new Date(parseInt(y), parseInt(m) - 1), 'MMM yyyy')
              const isGood = ci.verdict === 'doing_well'

              return (
                <button
                  key={ci.id}
                  type="button"
                  onClick={() => setViewingCheckIn(ci)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1E2330] rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E3A4E] transition-colors"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-800 dark:text-[#F0EDE4]">{label}</div>
                    <div className="text-xs text-gray-500 dark:text-[#8A9BAA] truncate max-w-[200px]">
                      {ci.verdictSummary.split('.')[0]}.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-[#8A9BAA]">{ci.spendingProgressPercent}%</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isGood
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {isGood ? 'Doing Well' : 'Fucking Up'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Check-In Detail Modal */}
      {viewingCheckIn && (
        <CheckInHistoryView result={viewingCheckIn} onClose={() => setViewingCheckIn(null)} />
      )}
```

- [ ] **Step 4: Verify it renders**

Run: `npm run dev`, navigate to Insights/Analytics. If check-in data exists, the history section should appear.

- [ ] **Step 5: Commit**

```bash
git add src/pages/analytics/AnalyticsPage.tsx
git commit -m "feat(check-in): add Check-In History section to Analytics page"
```

---

## Task 16: Final Integration Test

- [ ] **Step 1: Verify full compilation**

Run: `npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 2: Verify app builds**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`

Test flow:
1. Go to Settings → AI Check-In → enter an OpenAI API key → Save → Test → should show valid
2. Ensure you have at least one active bank account in Settings
3. Navigate to `/check-in` (or use nav if between 13th-17th)
4. Select bank, upload CSV, click "Run Check-In"
5. Wait for AI response (~10-20s)
6. Verify: verdict card shows with animation, KPI strip renders, 3 collapsible sections work
7. Test swipe/tap actions on outside-budget items
8. Go to Analytics → verify Check-In History section appears
9. Tap a history row → verify read-only modal opens

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "feat(check-in): complete mid-month check-in feature"
```
