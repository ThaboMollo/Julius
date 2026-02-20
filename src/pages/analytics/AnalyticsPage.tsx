import { useEffect, useState } from 'react'
import { format, subMonths, startOfMonth } from 'date-fns'
import {
  budgetMonthRepo,
  budgetItemRepo,
  transactionRepo,
  categoryRepo,
  budgetGroupRepo,
} from '../../data/local'
import type { BudgetMonth, BudgetItem, Transaction, Category, BudgetGroup } from '../../domain/models'
import {
  totalPlanned,
  totalActual,
  getGroupSummaries,
  totalActualByCategory,
  totalPlannedByCategory,
} from '../../domain/rules'
import { formatCurrency } from '../../domain/constants'

interface MonthData {
  budgetMonth: BudgetMonth
  items: BudgetItem[]
  transactions: Transaction[]
  planned: number
  actual: number
}

interface DrillDownState {
  category: Category
  monthsData: MonthData[]
}

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [monthsData, setMonthsData] = useState<MonthData[]>([])
  const [groups, setGroups] = useState<BudgetGroup[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [allGroups, allCategories] = await Promise.all([
        budgetGroupRepo.getAll(),
        categoryRepo.getActive(),
      ])
      setGroups(allGroups.filter((g) => g.isActive))
      setCategories(allCategories)

      // Build last 6 months
      const now = new Date()
      const months: MonthData[] = []

      for (let i = 5; i >= 0; i--) {
        const monthDate = startOfMonth(subMonths(now, i))
        const year = monthDate.getFullYear()
        const month = monthDate.getMonth() + 1

        const budgetMonth = await budgetMonthRepo.getOrCreate(year, month)
        const [items, transactions] = await Promise.all([
          budgetItemRepo.getByMonth(budgetMonth.id),
          transactionRepo.getByMonth(budgetMonth.id),
        ])

        months.push({
          budgetMonth,
          items,
          transactions,
          planned: totalPlanned(items),
          actual: totalActual(transactions),
        })
      }

      setMonthsData(months)
    } finally {
      setLoading(false)
    }
  }

  function openDrillDown(category: Category) {
    setDrillDown({ category, monthsData })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-[#8A9BAA]">Loading insights...</div>
      </div>
    )
  }

  const maxActual = Math.max(...monthsData.map((m) => m.actual), 1)

  return (
    <div className="p-4 space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-[#F0EDE4]">Insights</h1>
        <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">Last 6 months overview</p>
      </div>

      {/* ── Monthly comparison cards ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-[#8A9BAA] uppercase tracking-wider mb-3">
          Monthly Summary
        </h2>
        <div className="space-y-3">
          {monthsData.map((md) => {
            const surplus = md.planned - md.actual
            const isOver = surplus < 0
            const pct = md.planned > 0 ? Math.min((md.actual / md.planned) * 100, 100) : 0
            const label = format(
              new Date(md.budgetMonth.year, md.budgetMonth.month - 1, 1),
              'MMMM yyyy'
            )
            return (
              <div
                key={md.budgetMonth.id}
                className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-gray-800 dark:text-[#F0EDE4]">{label}</span>
                  <span
                    className={`text-sm font-medium ${
                      isOver ? 'text-red-500' : 'text-green-500'
                    }`}
                  >
                    {isOver ? '−' : '+'}
                    {formatCurrency(Math.abs(surplus))}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-[#8A9BAA] mb-2">
                  <span>Planned: {formatCurrency(md.planned)}</span>
                  <span>Actual: {formatCurrency(md.actual)}</span>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-gray-100 dark:bg-[#1E2330] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOver ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Group trend rows ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-[#8A9BAA] uppercase tracking-wider mb-3">
          Spending by Group
        </h2>
        <div className="space-y-4">
          {groups.map((group) => {
            const groupActuals = monthsData.map((md) => {
              const summaries = getGroupSummaries([group], md.items, md.transactions)
              return summaries[0]?.actual ?? 0
            })
            const maxGroupActual = Math.max(...groupActuals, 1)

            return (
              <div
                key={group.id}
                className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow"
              >
                <h3 className="font-semibold text-gray-800 dark:text-[#F0EDE4] mb-3">
                  {group.name}
                </h3>
                <div className="flex items-end gap-1 h-12">
                  {monthsData.map((md, idx) => {
                    const summaries = getGroupSummaries([group], md.items, md.transactions)
                    const actual = summaries[0]?.actual ?? 0
                    const heightPct = (actual / maxGroupActual) * 100
                    const monthLabel = format(
                      new Date(md.budgetMonth.year, md.budgetMonth.month - 1, 1),
                      'MMM'
                    )
                    const isLast = idx === monthsData.length - 1
                    return (
                      <div key={md.budgetMonth.id} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end" style={{ height: '40px' }}>
                          <div
                            className={`w-full rounded-t transition-all ${
                              isLast ? 'bg-[#C4A86B]' : 'bg-[#A89060]/60 dark:bg-[#C4A86B]/40'
                            }`}
                            style={{ height: `${Math.max(heightPct, 3)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-[#8A9BAA]">
                          {monthLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Category drill-down list ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-[#8A9BAA] uppercase tracking-wider mb-3">
          Categories (tap to drill down)
        </h2>
        <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow divide-y dark:divide-[#2E3A4E]">
          {categories.map((cat) => {
            const latestMonth = monthsData[monthsData.length - 1]
            const latestActual = latestMonth
              ? totalActualByCategory(latestMonth.transactions, cat.id)
              : 0
            const latestPlanned = latestMonth
              ? totalPlannedByCategory(latestMonth.items, cat.id)
              : 0
            const hasActivity = monthsData.some(
              (md) => totalActualByCategory(md.transactions, cat.id) > 0
            )
            if (!hasActivity) return null

            return (
              <button
                key={cat.id}
                className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1E2330] text-left"
                onClick={() => openDrillDown(cat)}
              >
                <span className="font-medium text-gray-800 dark:text-[#F0EDE4]">{cat.name}</span>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-800 dark:text-[#F0EDE4]">
                    {formatCurrency(latestActual)}
                  </div>
                  {latestPlanned > 0 && (
                    <div className="text-xs text-gray-400 dark:text-[#8A9BAA]">
                      of {formatCurrency(latestPlanned)}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Overall trend bar chart ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-[#8A9BAA] uppercase tracking-wider mb-3">
          Overall Spending Trend
        </h2>
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
          <div className="flex items-end gap-2 h-24">
            {monthsData.map((md, idx) => {
              const heightPct = (md.actual / maxActual) * 100
              const isOver = md.actual > md.planned && md.planned > 0
              const monthLabel = format(
                new Date(md.budgetMonth.year, md.budgetMonth.month - 1, 1),
                'MMM'
              )
              const isLast = idx === monthsData.length - 1
              return (
                <div key={md.budgetMonth.id} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end" style={{ height: '72px' }}>
                    <div
                      className={`w-full rounded-t transition-all ${
                        isLast
                          ? isOver
                            ? 'bg-red-400'
                            : 'bg-[#C4A86B]'
                          : isOver
                          ? 'bg-red-300/60'
                          : 'bg-[#A89060]/50 dark:bg-[#C4A86B]/40'
                      }`}
                      style={{ height: `${Math.max(heightPct, 3)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-[#8A9BAA]">{monthLabel}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Drill-down modal ── */}
      {drillDown && (
        <DrillDownModal
          category={drillDown.category}
          monthsData={drillDown.monthsData}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Drill-down modal
// ─────────────────────────────────────────────
interface DrillDownModalProps {
  category: Category
  monthsData: MonthData[]
  onClose: () => void
}

function DrillDownModal({ category, monthsData, onClose }: DrillDownModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1A2030] rounded-t-2xl max-h-[80vh] flex flex-col">
        {/* Modal header */}
        <div
          className="flex justify-between items-center px-5 py-4 border-b dark:border-[#2E3A4E]"
          style={{ borderColor: 'rgba(196,168,107,0.2)' }}
        >
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-[#F0EDE4]">{category.name}</h2>
            <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">Last 6 months</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-[#8A9BAA] text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Modal body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {monthsData.map((md) => {
            const monthActual = totalActualByCategory(md.transactions, category.id)
            const monthPlanned = totalPlannedByCategory(md.items, category.id)
            const catTxs = md.transactions.filter((tx) => tx.categoryId === category.id)

            if (catTxs.length === 0 && monthPlanned === 0) return null

            const label = format(
              new Date(md.budgetMonth.year, md.budgetMonth.month - 1, 1),
              'MMMM yyyy'
            )

            return (
              <div key={md.budgetMonth.id}>
                {/* Month header */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-[#C4A86B]">
                    {label}
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-800 dark:text-[#F0EDE4]">
                      {formatCurrency(monthActual)}
                    </span>
                    {monthPlanned > 0 && (
                      <span className="text-xs text-gray-400 dark:text-[#8A9BAA] ml-1">
                        / {formatCurrency(monthPlanned)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Transactions */}
                {catTxs.length > 0 ? (
                  <div className="bg-gray-50 dark:bg-[#252D3D] rounded-xl divide-y dark:divide-[#2E3A4E]">
                    {catTxs.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center px-3 py-2.5">
                        <div>
                          <div className="text-sm text-gray-800 dark:text-[#F0EDE4]">
                            {tx.note || category.name}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-[#8A9BAA]">
                            {format(new Date(tx.date), 'd MMM')}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-800 dark:text-[#F0EDE4]">
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 dark:text-[#8A9BAA] italic px-1">
                    No transactions
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
