import { useEffect, useState } from 'react'
import { useMonth } from '../../app/MonthContext'
import {
  budgetMonthRepo,
  budgetItemRepo,
  transactionRepo,
  budgetGroupRepo,
  categoryRepo,
  billTickRepo,
  settingsRepo,
} from '../../data/local'
import type {
  BudgetMonth,
  BudgetItem,
  Transaction,
  BudgetGroup,
  Category,
  BillTick,
  AppSettings,
} from '../../domain/models'
import {
  totalPlanned,
  totalActual,
  remainingUntilPayday,
  daysUntilPayday,
  topOverspentCategories,
  unbudgetedSpending,
  getGroupSummaries,
} from '../../domain/rules'
import { formatCurrency } from '../../domain/constants'

export function DashboardPage() {
  const { selectedMonth, monthKey } = useMonth()
  const [loading, setLoading] = useState(true)
  const [budgetMonth, setBudgetMonth] = useState<BudgetMonth | null>(null)
  const [items, setItems] = useState<BudgetItem[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [groups, setGroups] = useState<BudgetGroup[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [billTicks, setBillTicks] = useState<BillTick[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    loadData()
  }, [monthKey])

  async function loadData() {
    setLoading(true)
    try {
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth() + 1

      const [bm, grps, cats, sets] = await Promise.all([
        budgetMonthRepo.getOrCreate(year, month),
        budgetGroupRepo.getActive(),
        categoryRepo.getActive(),
        settingsRepo.get(),
      ])

      setBudgetMonth(bm)
      setGroups(grps)
      setCategories(cats)
      setSettings(sets)

      const [itms, txs, ticks] = await Promise.all([
        budgetItemRepo.getByMonth(bm.id),
        transactionRepo.getByMonth(bm.id),
        billTickRepo.getByMonth(bm.id),
      ])

      setItems(itms)
      setTransactions(txs)
      setBillTicks(ticks)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const planned = totalPlanned(items)
  const spent = totalActual(transactions)
  const remaining = remainingUntilPayday(
    items,
    transactions,
    budgetMonth?.expectedIncome ?? settings.expectedMonthlyIncome
  )
  const daysToPayday = daysUntilPayday(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() + 1,
    settings.paydayDayOfMonth
  )
  const overspentCategories = topOverspentCategories(items, transactions, categories, 5)
  const unbudgeted = unbudgetedSpending(transactions)
  const groupSummaries = getGroupSummaries(groups, items, transactions)

  const unpaidBills = items.filter((item) => {
    if (!item.isBill) return false
    const tick = billTicks.find((t) => t.budgetItemId === item.id)
    return !tick?.isPaid
  })

  return (
    <div className="p-4 space-y-4">
      {/* Main KPI Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-5 text-white shadow-lg">
        <div className="text-sm opacity-80 mb-1">Remaining until payday</div>
        <div className="text-3xl font-bold mb-3">{formatCurrency(remaining)}</div>
        <div className="flex justify-between text-sm opacity-80">
          <span>{daysToPayday} days to payday</span>
          <span>{unpaidBills.length} bills unpaid</span>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">Budget Overview</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Planned</span>
            <span className="font-medium">{formatCurrency(planned)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Spent</span>
            <span className="font-medium text-red-600">{formatCurrency(spent)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-gray-600">Remaining Budget</span>
            <span className={`font-medium ${planned - spent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(planned - spent)}
            </span>
          </div>
        </div>
      </div>

      {/* Group Summaries */}
      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">By Group</h2>
        {groupSummaries.length === 0 ? (
          <p className="text-gray-500 text-sm">No budget items yet</p>
        ) : (
          <div className="space-y-3">
            {groupSummaries.map(({ group, planned, actual, overspend }) => (
              <div key={group.id} className="border-b last:border-0 pb-2 last:pb-0">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-800">{group.name}</span>
                  <span className={overspend > 0 ? 'text-red-600' : 'text-gray-600'}>
                    {formatCurrency(actual)} / {formatCurrency(planned)}
                  </span>
                </div>
                {overspend > 0 && (
                  <div className="text-xs text-red-500 mt-0.5">
                    Over by {formatCurrency(overspend)}
                  </div>
                )}
                <div className="mt-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      actual > planned ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, (actual / planned) * 100 || 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaks Section */}
      {(overspentCategories.length > 0 || unbudgeted > 0) && (
        <div className="bg-white rounded-xl p-4 shadow">
          <h2 className="text-lg font-semibold mb-3 text-red-600">Money Leaks</h2>

          {unbudgeted > 0 && (
            <div className="mb-3 p-3 bg-red-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-red-700 font-medium">Unbudgeted Spending</span>
                <span className="text-red-700 font-bold">{formatCurrency(unbudgeted)}</span>
              </div>
              <p className="text-xs text-red-600 mt-1">
                Transactions without a budget item
              </p>
            </div>
          )}

          {overspentCategories.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600">Top Overspent Categories</h3>
              {overspentCategories.map(({ category, overspend, planned, actual }) => (
                <div key={category.id} className="flex justify-between items-center py-1 border-b last:border-0">
                  <div>
                    <span className="text-gray-800">{category.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatCurrency(actual)} / {formatCurrency(planned)}
                    </span>
                  </div>
                  <span className="text-red-600 font-medium">+{formatCurrency(overspend)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && transactions.length === 0 && (
        <div className="bg-white rounded-xl p-6 shadow text-center">
          <div className="text-4xl mb-3">🚀</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Get Started!</h3>
          <p className="text-gray-600 text-sm">
            Add budget items on the Budget page to start tracking your spending.
          </p>
        </div>
      )}
    </div>
  )
}
