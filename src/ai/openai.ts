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
