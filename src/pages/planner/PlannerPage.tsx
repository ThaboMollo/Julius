import { useEffect, useState } from 'react'
import { subMonths, startOfMonth } from 'date-fns'
import {
  purchaseScenarioRepo,
  scenarioExpenseRepo,
  budgetMonthRepo,
  transactionRepo,
  settingsRepo,
} from '../../data/local'
import type {
  PurchaseScenario,
  ScenarioExpense,
  CreatePurchaseScenario,
} from '../../domain/models'
import { totalActual, calculateAffordability } from '../../domain/rules'
import { formatCurrency } from '../../domain/constants'

// ─────────────────────────────────────────────
// PlannerPage — top-level list view
// ─────────────────────────────────────────────
export function PlannerPage() {
  const [loading, setLoading] = useState(true)
  const [scenarios, setScenarios] = useState<PurchaseScenario[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)

  // Baseline data (shared across scenario detail views)
  const [baseline, setBaseline] = useState<{
    months: { totalActual: number; expectedIncome: number }[]
    incomeKnown: boolean
  }>({ months: [], incomeKnown: false })

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [all, settings] = await Promise.all([
        purchaseScenarioRepo.getAll(),
        settingsRepo.get(),
      ])
      setScenarios(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))

      // Load last 3 months of actual spending
      const now = new Date()
      const monthsData: { totalActual: number; expectedIncome: number }[] = []
      const globalIncome = settings.expectedMonthlyIncome ?? 0

      for (let i = 2; i >= 0; i--) {
        const monthDate = startOfMonth(subMonths(now, i))
        const year = monthDate.getFullYear()
        const month = monthDate.getMonth() + 1
        const bm = await budgetMonthRepo.getOrCreate(year, month)
        const txs = await transactionRepo.getByMonth(bm.id)
        const income = bm.expectedIncome ?? globalIncome
        monthsData.push({ totalActual: totalActual(txs), expectedIncome: income })
      }

      setBaseline({ months: monthsData, incomeKnown: globalIncome > 0 })
    } finally {
      setLoading(false)
    }
  }

  async function createScenario() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const data: CreatePurchaseScenario = {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      }
      const created = await purchaseScenarioRepo.create(data)
      setScenarios((prev) => [created, ...prev])
      setNewName('')
      setNewDesc('')
      setShowNewForm(false)
      setActiveScenarioId(created.id)
    } finally {
      setSaving(false)
    }
  }

  async function deleteScenario(id: string) {
    if (!confirm('Delete this scenario?')) return
    await scenarioExpenseRepo.deleteByScenario(id)
    await purchaseScenarioRepo.delete(id)
    setScenarios((prev) => prev.filter((s) => s.id !== id))
    if (activeScenarioId === id) setActiveScenarioId(null)
  }

  if (loading) {
    return (
      <div className="page-shell page-shell-bottom-nav">
        <div className="vnext-card flex items-center justify-center p-8">
          <div className="vnext-muted">Loading planner...</div>
        </div>
      </div>
    )
  }

  // Show detail view when a scenario is active
  if (activeScenarioId) {
    const scenario = scenarios.find((s) => s.id === activeScenarioId)
    if (scenario) {
      return (
        <ScenarioDetailView
          scenario={scenario}
          baseline={baseline}
          onBack={() => setActiveScenarioId(null)}
          onDeleted={() => {
            deleteScenario(scenario.id)
            setActiveScenarioId(null)
          }}
        />
      )
    }
  }

  return (
    <div className="page-shell page-shell-bottom-nav space-y-4">
      <div className="vnext-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="vnext-section-title text-[1.35rem]">Planner</h1>
            <p className="vnext-muted mt-1 text-sm">Model major purchases</p>
          </div>
          {!showNewForm && (
            <button
              onClick={() => setShowNewForm(true)}
              className="vnext-button-primary rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              + New Scenario
            </button>
          )}
        </div>
      </div>

      {showNewForm && (
        <div className="vnext-card p-5 space-y-4">
          <h2 className="vnext-section-title">New Scenario</h2>
          <input
            type="text"
            placeholder="Name (e.g. New Car)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="vnext-input text-sm"
            autoFocus
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="vnext-input text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={createScenario}
              disabled={saving || !newName.trim()}
              className="vnext-button-primary flex-1 rounded-2xl py-3 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => { setShowNewForm(false); setNewName(''); setNewDesc('') }}
              className="vnext-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {scenarios.length === 0 ? (
        <div className="vnext-card p-8 text-center">
          <div className="mb-3 text-3xl">◇</div>
          <h3 className="vnext-section-title">No Scenarios Yet</h3>
          <p className="vnext-muted mt-2 text-sm">
            Create a scenario to model a major purchase and see if you can afford it.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              baseline={baseline}
              onOpen={() => setActiveScenarioId(scenario.id)}
              onDelete={() => deleteScenario(scenario.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Scenario card (list view)
// ─────────────────────────────────────────────
interface ScenarioCardProps {
  scenario: PurchaseScenario
  baseline: { months: { totalActual: number; expectedIncome: number }[]; incomeKnown: boolean }
  onOpen: () => void
  onDelete: () => void
}

function ScenarioCard({ scenario, baseline, onOpen, onDelete }: ScenarioCardProps) {
  const [expenses, setExpenses] = useState<ScenarioExpense[]>([])

  useEffect(() => {
    scenarioExpenseRepo.getByScenario(scenario.id).then(setExpenses)
  }, [scenario.id])

  const total = expenses.reduce((s, e) => s + e.monthlyAmount, 0)
  const result = calculateAffordability(baseline.months, total)

  const verdictConfig = {
    affordable: { label: 'Affordable', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    tight: { label: 'Tight', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    cannot_afford: { label: "Can't Afford", color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  }
  const vc = verdictConfig[result.verdict]

  return (
    <div
      className="vnext-card cursor-pointer p-4 transition-transform hover:-translate-y-0.5"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-[var(--text-primary)]">{scenario.name}</h3>
            {expenses.length > 0 && (
              <span className={`vnext-badge ${vc.color}`}>
                {vc.label}
              </span>
            )}
          </div>
          {scenario.description && (
            <p className="vnext-muted mt-1 text-xs">{scenario.description}</p>
          )}
          <p className="vnext-muted mt-2 text-sm">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · {formatCurrency(total)}/mo
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="rounded-full p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
          aria-label={`Delete ${scenario.name}`}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Scenario detail view
// ─────────────────────────────────────────────
interface ScenarioDetailProps {
  scenario: PurchaseScenario
  baseline: { months: { totalActual: number; expectedIncome: number }[]; incomeKnown: boolean }
  onBack: () => void
  onDeleted: () => void
}

function ScenarioDetailView({ scenario, baseline, onBack, onDeleted }: ScenarioDetailProps) {
  const [expenses, setExpenses] = useState<ScenarioExpense[]>([])
  const [loading, setLoading] = useState(true)

  // Editing the scenario name/description
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(scenario.name)

  useEffect(() => {
    scenarioExpenseRepo.getByScenario(scenario.id).then((exps) => {
      setExpenses(exps)
      setLoading(false)
    })
  }, [scenario.id])

  async function addExpense() {
    const newExp = await scenarioExpenseRepo.create({
      scenarioId: scenario.id,
      name: '',
      monthlyAmount: 0,
      sortOrder: expenses.length,
    })
    setExpenses((prev) => [...prev, newExp])
  }

  async function updateExpense(id: string, field: 'name' | 'monthlyAmount', value: string) {
    const update =
      field === 'monthlyAmount'
        ? { monthlyAmount: parseFloat(value) || 0 }
        : { name: value }
    await scenarioExpenseRepo.update(id, update)
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...update } : e))
    )
  }

  async function removeExpense(id: string) {
    await scenarioExpenseRepo.delete(id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  async function saveScenarioName() {
    if (nameValue.trim()) {
      await purchaseScenarioRepo.update(scenario.id, { name: nameValue.trim() })
    }
    setEditingName(false)
  }

  const monthlyTotal = expenses.reduce((s, e) => s + e.monthlyAmount, 0)
  const result = calculateAffordability(baseline.months, monthlyTotal)

  const verdictConfig = {
    affordable: {
      label: 'Affordable',
      bg: 'bg-green-500',
      text: 'text-white',
      border: 'border-green-400',
    },
    tight: {
      label: 'Tight',
      bg: 'bg-yellow-400',
      text: 'text-yellow-900',
      border: 'border-yellow-300',
    },
    cannot_afford: {
      label: "Can't Afford",
      bg: 'bg-red-500',
      text: 'text-white',
      border: 'border-red-400',
    },
  }
  const vc = verdictConfig[result.verdict]

  const trendIcon =
    result.spendingTrend === 'increasing' ? '↑' : result.spendingTrend === 'decreasing' ? '↓' : '→'
  const trendColor =
    result.spendingTrend === 'increasing'
      ? 'text-red-500'
      : result.spendingTrend === 'decreasing'
      ? 'text-green-500'
      : 'text-gray-500 dark:text-[#8A9BAA]'

  return (
    <div className="page-shell page-shell-bottom-nav space-y-4">
      <div className="vnext-card p-5">
        <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-lg leading-none text-[#C4A86B]"
          aria-label="Back"
        >
          ←
        </button>
        {editingName ? (
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveScenarioName}
            onKeyDown={(e) => e.key === 'Enter' && saveScenarioName()}
            className="flex-1 border-b border-[#C4A86B] bg-transparent text-xl font-bold text-[var(--text-primary)] outline-none"
            autoFocus
          />
        ) : (
          <h1
            className="flex-1 cursor-pointer text-xl font-bold text-[var(--text-primary)]"
            onClick={() => setEditingName(true)}
          >
            {nameValue}
            <span className="ml-2 text-sm text-gray-400 dark:text-[#8A9BAA]">✎</span>
          </h1>
        )}
        <button
          onClick={onDeleted}
          className="rounded-full px-3 py-2 text-sm text-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
        >
          Delete
        </button>
      </div>
      </div>

      <div className="vnext-card">
        <div className="px-4 pt-4 pb-2 flex justify-between items-center">
          <h2 className="font-semibold text-[var(--text-primary)]">Monthly Expenses</h2>
          <button
            onClick={addExpense}
            className="text-sm font-medium text-[#C4A86B] hover:text-[#A89060]"
          >
            + Add
          </button>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-gray-400 dark:text-[#8A9BAA]">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="px-4 pb-4 text-sm italic text-gray-400 dark:text-[#8A9BAA]">
            No expenses yet. Tap "+ Add" to add one.
          </div>
        ) : (
          <div className="divide-y dark:divide-[#2E3A4E]">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center gap-2 px-4 py-2.5">
                <input
                  type="text"
                  placeholder="Name (e.g. Petrol)"
                  value={exp.name}
                  onChange={(e) => updateExpense(exp.id, 'name', e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder-gray-300 dark:placeholder-[#4A5568]"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-gray-400 dark:text-[#8A9BAA]">R</span>
                  <input
                    type="number"
                    value={exp.monthlyAmount || ''}
                    onChange={(e) => updateExpense(exp.id, 'monthlyAmount', e.target.value)}
                    placeholder="0"
                    className="w-24 bg-transparent text-right text-sm text-[var(--text-primary)] outline-none placeholder-gray-300 dark:placeholder-[#4A5568]"
                  />
                  <span className="text-xs text-gray-400 dark:text-[#8A9BAA]">/mo</span>
                </div>
                <button
                  onClick={() => removeExpense(exp.id)}
                  className="text-gray-300 dark:text-[#4A5568] hover:text-red-400 text-sm leading-none ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Total row */}
        {expenses.length > 0 && (
          <div className="flex items-center justify-between rounded-b-xl border-t border-[var(--border-soft)] bg-[var(--surface-secondary)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--text-secondary)]">Total</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {formatCurrency(monthlyTotal)}/mo
            </span>
          </div>
        )}
      </div>

      <div className="vnext-card p-4 space-y-3">
        <h2 className="font-semibold text-[var(--text-primary)]">Forecast</h2>

        {!baseline.incomeKnown && (
          <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-3 py-2">
            Set your expected monthly income in Settings for a more accurate forecast.
          </div>
        )}

        <div className="space-y-2">
          <ForecastRow
            label="Baseline disposable"
            value={formatCurrency(result.baselineDisposable) + '/mo'}
            sub="Avg income minus spending (last 3 months)"
          />
          <ForecastRow
            label="Spending trend"
            value={
              <span className={trendColor}>
                {trendIcon}{' '}
                {result.spendingTrend.charAt(0).toUpperCase() + result.spendingTrend.slice(1)}
              </span>
            }
            sub="Based on last 3 months"
          />
          <ForecastRow
            label="New monthly obligations"
            value={formatCurrency(result.newMonthlyObligations) + '/mo'}
            sub="Sum of scenario expenses"
          />
          <div className="border-t dark:border-[#2E3A4E] pt-2">
            <ForecastRow
              label="Remaining after scenario"
              value={
                <span className={result.remainingAfterScenario >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {formatCurrency(result.remainingAfterScenario)}/mo
                </span>
              }
              sub="Disposable income minus obligations"
              bold
            />
          </div>
        </div>

        {/* Verdict chip */}
        <div className={`rounded-xl px-4 py-3 text-center ${vc.bg} ${vc.text}`}>
          <span className="font-bold text-base">{vc.label}</span>
          {result.verdict === 'tight' && (
            <p className="text-xs mt-0.5 opacity-80">Less than 20% buffer remaining</p>
          )}
          {result.verdict === 'cannot_afford' && (
            <p className="text-xs mt-0.5 opacity-80">Obligations exceed disposable income</p>
          )}
          {result.verdict === 'affordable' && result.remainingAfterScenario > 0 && (
            <p className="text-xs mt-0.5 opacity-80">
              {formatCurrency(result.remainingAfterScenario)}/mo to spare
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Forecast row helper
// ─────────────────────────────────────────────
function ForecastRow({
  label,
  value,
  sub,
  bold = false,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  bold?: boolean
}) {
  return (
    <div className="flex justify-between items-start gap-2">
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${bold ? 'font-semibold text-gray-800 dark:text-[#F0EDE4]' : 'text-gray-600 dark:text-[#8A9BAA]'}`}>
          {label}
        </div>
        {sub && <div className="text-xs text-gray-400 dark:text-[#8A9BAA]">{sub}</div>}
      </div>
      <div className={`text-sm shrink-0 ${bold ? 'font-semibold text-gray-800 dark:text-[#F0EDE4]' : 'text-gray-800 dark:text-[#F0EDE4]'}`}>
        {value}
      </div>
    </div>
  )
}
