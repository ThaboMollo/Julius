import { useCallback, useEffect, useState, type ReactNode } from 'react'
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
import { useMonth } from '../../app/useMonth'

export function DashboardPage() {
  const { selectedMonth, monthKey } = useMonth()
  const [loading, setLoading] = useState(true)
  const [budgetMonth, setBudgetMonth] = useState<BudgetMonth | null>(null)
  const [items, setItems] = useState<BudgetItem[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [groups, setGroups] = useState<BudgetGroup[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [commitments, setCommitments] = useState<Commitment[]>([])

  const loadData = useCallback(async () => {
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
  }, [selectedMonth])

  useEffect(() => {
    void loadData()
  }, [loadData, monthKey])

  if (loading || !budgetMonth) {
    return (
      <div className="page-shell page-shell-bottom-nav">
        <div className="vnext-card flex items-center justify-center p-8">
          <div className="vnext-muted">Loading...</div>
        </div>
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
    <div className="page-shell page-shell-bottom-nav space-y-4">
      <HomeHeroCard spendable={spendable} income={income} upcomingCount={upcomingCommitments.length} />

      <div className="grid grid-cols-2 gap-3">
        <ActionCard
          to="/transactions?action=expense"
          eyebrow="Primary action"
          title="+ Add Expense"
          accent="primary"
        />
        <ActionCard
          to="/transactions?action=income"
          eyebrow="Need income?"
          title={income > 0 ? 'Add another income' : 'Add income'}
          accent="secondary"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Income" value={formatCurrency(income)} tone="success" />
        <KpiCard label="Expenses" value={formatCurrency(expenses)} tone="danger" />
        <KpiCard label="Savings target" value={formatCurrency(plannedSavings)} />
      </div>

      {!hasAnyTransactions && (
        <EmptyStartCard />
      )}

      <SectionCard title="Potential savings" linkLabel="Review" to="/transactions">
        {potentialSavings.length === 0 ? (
          <p className="vnext-muted text-sm">Not enough activity yet to suggest anything.</p>
        ) : (
          <div className="space-y-3">
            {potentialSavings.map((item) => (
              <div key={`${item.label}-${item.reason}`} className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--border-soft)] p-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--text-primary)]">{item.label}</div>
                  <div className="vnext-muted text-xs">{item.reason}</div>
                </div>
                <div className="shrink-0 font-semibold text-[#8B7550] dark:text-[#C4A86B]">{formatCurrency(item.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Upcoming commitments" linkLabel="Open list" to="/commitments">
        {upcomingCommitments.length === 0 ? (
          <p className="vnext-muted text-sm">No upcoming commitments yet.</p>
        ) : (
          <div className="space-y-3">
            {upcomingCommitments.map((commitment) => (
              <div key={commitment.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-soft)] p-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--text-primary)]">{commitment.name}</div>
                  <div className="vnext-muted text-xs">
                    {commitment.dueDate ? `Due ${format(new Date(commitment.dueDate), 'd MMM')}` : 'No due date'}
                  </div>
                </div>
                <div className="shrink-0 font-semibold text-[var(--text-primary)]">{formatCurrency(commitment.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent transactions" linkLabel="View all" to="/transactions">
        {recentTransactions.length === 0 ? (
          <p className="vnext-muted text-sm">No transactions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((tx) => {
              const category = categories.find((entry) => entry.id === tx.categoryId)
              const item = items.find((entry) => entry.id === tx.budgetItemId)
              const label = tx.merchant || tx.note || item?.name || category?.name || 'Unknown'
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-soft)] p-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--text-primary)]">{label}</div>
                    <div className="vnext-muted text-xs">
                      {format(new Date(tx.date), 'd MMM')} · {category?.name || 'No category'}
                    </div>
                  </div>
                  <div className={`shrink-0 font-semibold ${tx.kind === 'income' ? 'text-green-600' : 'text-[var(--text-primary)]'}`}>
                    {tx.kind === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function HomeHeroCard({
  spendable,
  income,
  upcomingCount,
}: {
  spendable: number
  income: number
  upcomingCount: number
}) {
  return (
    <section
      className="rounded-[1.75rem] px-5 py-6 text-white shadow-[0_24px_60px_rgba(59,74,47,0.28)]"
      style={{ background: 'linear-gradient(145deg, #3B4A2F 0%, #52643A 55%, #6F7F48 100%)' }}
    >
      <div className="text-sm font-medium" style={{ color: '#E8DABC' }}>
        Safe to spend
      </div>
      <div className={`mt-2 text-4xl font-bold tracking-tight ${spendable < 0 ? 'text-red-100' : ''}`}>
        {formatCurrency(spendable)}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-white/80">
        <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
          {income > 0 ? `${formatCurrency(income)} income logged` : 'No income recorded yet'}
        </div>
        <div className="rounded-2xl bg-white/10 p-3 text-right backdrop-blur-sm">
          {upcomingCount} commitments coming up
        </div>
      </div>
    </section>
  )
}

function ActionCard({
  to,
  eyebrow,
  title,
  accent,
}: {
  to: string
  eyebrow: string
  title: string
  accent: 'primary' | 'secondary'
}) {
  const className =
    accent === 'primary'
      ? 'rounded-[1.5rem] bg-[#A89060] p-4 text-white shadow-[0_18px_40px_rgba(168,144,96,0.28)]'
      : 'vnext-card p-4'

  return (
    <Link to={to} className={className}>
      <div className={`text-sm ${accent === 'primary' ? 'text-white/80' : 'vnext-muted'}`}>{eyebrow}</div>
      <div className={`mt-2 text-lg font-semibold ${accent === 'primary' ? 'text-white' : 'text-[var(--text-primary)]'}`}>{title}</div>
    </Link>
  )
}

function KpiCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'danger'
}) {
  const toneClass =
    tone === 'success' ? 'text-green-600' : tone === 'danger' ? 'text-red-600' : 'text-[var(--text-primary)]'

  return (
    <div className="vnext-card p-4">
      <div className="vnext-muted text-sm">{label}</div>
      <div className={`mt-2 text-lg font-bold ${toneClass}`}>{value}</div>
    </div>
  )
}

function EmptyStartCard() {
  return (
    <div className="vnext-card p-6">
      <h2 className="vnext-section-title">Start here</h2>
      <p className="vnext-muted mt-2 text-sm">
        Your month is ready. Record income first, then add expenses as they happen. You do not need to set up a budget before using the app.
      </p>
      <div className="mt-4 flex gap-2">
        <Link to="/transactions?action=income" className="vnext-button-success rounded-2xl px-4 py-2.5 text-sm font-semibold">
          Add income
        </Link>
        <Link to="/transactions?action=expense" className="vnext-button-primary rounded-2xl px-4 py-2.5 text-sm font-semibold">
          Add expense
        </Link>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  linkLabel,
  to,
  children,
}: {
  title: string
  linkLabel: string
  to: string
  children: ReactNode
}) {
  return (
    <section className="vnext-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="vnext-section-title">{title}</h2>
        <Link to={to} className="vnext-link">
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  )
}
