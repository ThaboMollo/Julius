import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  budgetMonthRepo,
  budgetItemRepo,
  transactionRepo,
  budgetGroupRepo,
  categoryRepo,
  commitmentRepo,
} from '../../data/local'
import type { BudgetMonth, BudgetItem, Transaction, BudgetGroup, Category, Commitment } from '../../domain/models'
import {
  totalPlanned,
  totalExpenses,
  totalIncome,
  safeToSpend,
  getPotentialSavings,
  getUpcomingCommitments,
  getRecentTransactions,
} from '../../domain/rules'
import { formatCurrency } from '../../domain/constants'
import { useMonth } from '../../app/MonthContext'

export function DashboardPage() {
  const { selectedMonth, monthKey } = useMonth()
  const [loading, setLoading] = useState(true)
  const [budgetMonth, setBudgetMonth] = useState<BudgetMonth | null>(null)
  const [items, setItems] = useState<BudgetItem[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [groups, setGroups] = useState<BudgetGroup[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [commitments, setCommitments] = useState<Commitment[]>([])

  useEffect(() => {
    loadData()
  }, [monthKey])

  async function loadData() {
    setLoading(true)
    try {
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth() + 1

      const [bm, grps, cats] = await Promise.all([
        budgetMonthRepo.getOrCreate(year, month),
        budgetGroupRepo.getActive(),
        categoryRepo.getActive(),
      ])

      setBudgetMonth(bm)
      setGroups(grps)
      setCategories(cats)

      const [itms, txs, cmts] = await Promise.all([
        budgetItemRepo.getByMonth(bm.id),
        transactionRepo.getByMonth(bm.id),
        commitmentRepo.getByMonth(bm.id),
      ])

      setItems(itms)
      setTransactions(txs)
      setCommitments(cmts)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !budgetMonth) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-[#8A9BAA]">Loading...</div>
      </div>
    )
  }

  const spendable = safeToSpend(items, transactions, commitments, categories, groups)
  const income = totalIncome(transactions)
  const expenses = totalExpenses(transactions)
  const plannedSavings = (() => {
    const savingsGroup = groups.find((group) => group.name === 'Savings')
    return savingsGroup ? totalPlanned(items.filter((item) => item.groupId === savingsGroup.id)) : 0
  })()
  const potentialSavings = getPotentialSavings(transactions, categories, items, 3)
  const upcomingCommitments = getUpcomingCommitments(commitments, 4)
  const recentTransactions = getRecentTransactions(transactions, 5)
  const hasAnyTransactions = transactions.length > 0

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-xl p-5 shadow-lg" style={{ background: 'linear-gradient(135deg, #3B4A2F 0%, #5A6B3F 100%)' }}>
        <div className="text-sm mb-1" style={{ color: '#C4A86B', opacity: 0.9 }}>
          Safe to spend
        </div>
        <div className={`text-3xl font-bold mb-3 ${spendable < 0 ? 'text-red-200' : ''}`} style={{ color: spendable < 0 ? undefined : '#C4A86B' }}>
          {formatCurrency(spendable)}
        </div>
        <div className="flex justify-between text-sm text-white opacity-80">
          <span>{income > 0 ? `${formatCurrency(income)} income logged` : 'No income recorded yet'}</span>
          <span>{upcomingCommitments.length} commitments coming up</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/transactions"
          className="bg-[#A89060] hover:bg-[#8B7550] text-white rounded-xl p-4 shadow"
        >
          <div className="text-sm opacity-80">Primary action</div>
          <div className="text-lg font-semibold mt-1">+ Add Expense</div>
        </Link>
        <Link
          to="/transactions"
          className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow hover:bg-gray-50 dark:hover:bg-[#2E3A4E]"
        >
          <div className="text-sm text-gray-500 dark:text-[#8A9BAA]">Need income?</div>
          <div className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4] mt-1">
            {income > 0 ? 'Add another income' : 'Add income'}
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
          <div className="text-sm text-gray-500 dark:text-[#8A9BAA]">Income</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(income)}</div>
        </div>
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
          <div className="text-sm text-gray-500 dark:text-[#8A9BAA]">Expenses</div>
          <div className="text-xl font-bold text-red-600">{formatCurrency(expenses)}</div>
        </div>
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
          <div className="text-sm text-gray-500 dark:text-[#8A9BAA]">Savings target</div>
          <div className="text-xl font-bold text-gray-800 dark:text-[#F0EDE4]">{formatCurrency(plannedSavings)}</div>
        </div>
      </div>

      {!hasAnyTransactions && (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4] mb-2">Start here</h2>
          <p className="text-sm text-gray-600 dark:text-[#8A9BAA] mb-4">
            Your month is ready. Record income first, then add expenses as they happen. You do not need to set up a budget before using the app.
          </p>
          <div className="flex gap-2">
            <Link to="/transactions" className="px-4 py-2 bg-[#3B7A57] text-white rounded-lg hover:bg-[#2F6548]">
              Add income
            </Link>
            <Link to="/transactions" className="px-4 py-2 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550]">
              Add expense
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4]">Potential savings</h2>
          <Link to="/transactions" className="text-sm text-[#A89060] dark:text-[#C4A86B]">
            Review
          </Link>
        </div>
        {potentialSavings.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">Not enough activity yet to suggest anything.</p>
        ) : (
          <div className="space-y-3">
            {potentialSavings.map((item) => (
              <div key={`${item.label}-${item.reason}`} className="flex justify-between items-start border-b dark:border-[#2E3A4E] last:border-0 pb-2 last:pb-0">
                <div>
                  <div className="font-medium text-gray-800 dark:text-[#F0EDE4]">{item.label}</div>
                  <div className="text-xs text-gray-500 dark:text-[#8A9BAA]">{item.reason}</div>
                </div>
                <div className="text-[#8B7550] dark:text-[#C4A86B] font-medium">{formatCurrency(item.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4]">Upcoming commitments</h2>
          <Link to="/commitments" className="text-sm text-[#A89060] dark:text-[#C4A86B]">
            Open list
          </Link>
        </div>
        {upcomingCommitments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">No upcoming commitments yet.</p>
        ) : (
          <div className="space-y-3">
            {upcomingCommitments.map((commitment) => (
              <div key={commitment.id} className="flex justify-between items-center border-b dark:border-[#2E3A4E] last:border-0 pb-2 last:pb-0">
                <div>
                  <div className="font-medium text-gray-800 dark:text-[#F0EDE4]">{commitment.name}</div>
                  <div className="text-xs text-gray-500 dark:text-[#8A9BAA]">
                    {commitment.dueDate ? `Due ${format(new Date(commitment.dueDate), 'd MMM')}` : 'No due date'}
                  </div>
                </div>
                <div className="font-medium text-gray-800 dark:text-[#F0EDE4]">{formatCurrency(commitment.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4]">Recent transactions</h2>
          <Link to="/transactions" className="text-sm text-[#A89060] dark:text-[#C4A86B]">
            View all
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">No transactions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((tx) => {
              const category = categories.find((entry) => entry.id === tx.categoryId)
              const label = tx.merchant || tx.note || category?.name || 'Unknown'
              return (
                <div key={tx.id} className="flex justify-between items-center border-b dark:border-[#2E3A4E] last:border-0 pb-2 last:pb-0">
                  <div>
                    <div className="font-medium text-gray-800 dark:text-[#F0EDE4]">{label}</div>
                    <div className="text-xs text-gray-500 dark:text-[#8A9BAA]">
                      {format(new Date(tx.date), 'd MMM')} · {category?.name || 'No category'}
                    </div>
                  </div>
                  <div className={tx.kind === 'income' ? 'text-green-600 font-medium' : 'text-gray-800 dark:text-[#F0EDE4] font-medium'}>
                    {tx.kind === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
