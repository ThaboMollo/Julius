import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMonth } from '../../app/useMonth'
import { budgetMonthRepo, budgetItemRepo, transactionRepo, categoryRepo } from '../../data/local'
import type {
  BudgetMonth,
  BudgetItem,
  Transaction,
  Category,
  CreateTransaction,
  TransactionKind,
} from '../../domain/models'
import { totalExpenses, totalIncome } from '../../domain/rules'
import { formatCurrency } from '../../domain/constants'
import { TransactionModal } from './TransactionModal'

export function TransactionsPage() {
  const { selectedMonth, monthKey } = useMonth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [budgetMonth, setBudgetMonth] = useState<BudgetMonth | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [items, setItems] = useState<BudgetItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [modalKind, setModalKind] = useState<TransactionKind>('expense')
  const [filterKind, setFilterKind] = useState<'all' | TransactionKind>('all')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth() + 1

      const [bm, cats] = await Promise.all([budgetMonthRepo.getOrCreate(year, month), categoryRepo.getActive()])

      setBudgetMonth(bm)
      setCategories(cats)

      const [txs, itms] = await Promise.all([transactionRepo.getByMonth(bm.id), budgetItemRepo.getByMonth(bm.id)])

      setTransactions(txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      setItems(itms)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    void loadData()
  }, [loadData, monthKey])

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'income' || action === 'expense') {
      setEditingTx(null)
      setModalKind(action)
      setModalOpen(true)
      navigate('/transactions', { replace: true })
    }
  }, [navigate, searchParams])

  async function handleSave(data: CreateTransaction) {
    if (editingTx) {
      await transactionRepo.update(editingTx.id, data)
    } else {
      await transactionRepo.create(data)
    }
    setModalOpen(false)
    setEditingTx(null)
    await loadData()
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this transaction?')) {
      await transactionRepo.delete(id)
      await loadData()
    }
  }

  function openAddModal(kind: TransactionKind) {
    setEditingTx(null)
    setModalKind(kind)
    setModalOpen(true)
  }

  function openEditModal(tx: Transaction) {
    setEditingTx(tx)
    setModalKind(tx.kind)
    setModalOpen(true)
  }

  if (loading || !budgetMonth) {
    return (
      <div className="page-shell page-shell-bottom-nav">
        <div className="vnext-card flex items-center justify-center p-8">
          <div className="vnext-muted">Loading...</div>
        </div>
      </div>
    )
  }

  const filteredTransactions = filterKind === 'all' ? transactions : transactions.filter((tx) => tx.kind === filterKind)
  const incomeTotal = totalIncome(transactions)
  const expenseTotal = totalExpenses(transactions)
  const net = incomeTotal - expenseTotal

  const groupedByDate = filteredTransactions.reduce((acc, tx) => {
    const dateKey = format(new Date(tx.date), 'yyyy-MM-dd')
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(tx)
    return acc
  }, {} as Record<string, Transaction[]>)

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="page-shell page-shell-bottom-nav space-y-4">
      <section className="vnext-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="vnext-section-title text-[1.35rem]">Transactions</h1>
            <p className="vnext-muted mt-1 text-sm">
              Net: <span className={net >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(net)}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-auto">
            <button
              onClick={() => openAddModal('income')}
              className="vnext-button-success rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              + Income
            </button>
            <button
              onClick={() => openAddModal('expense')}
              className="vnext-button-primary rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              + Expense
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Income" value={formatCurrency(incomeTotal)} tone="success" />
        <SummaryCard label="Expenses" value={formatCurrency(expenseTotal)} tone="danger" />
        <SummaryCard label="Net" value={formatCurrency(net)} tone={net >= 0 ? 'success' : 'danger'} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'expense', 'income'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilterKind(value)}
            className={`vnext-chip px-4 py-2 text-sm font-semibold whitespace-nowrap ${filterKind === value ? 'vnext-chip-active' : ''}`}
          >
            {value === 'all' ? 'All' : value === 'expense' ? 'Expenses' : 'Income'}
          </button>
        ))}
      </div>

      {transactions.length === 0 ? (
        <EmptyTransactionsState />
      ) : filteredTransactions.length === 0 ? (
        <div className="vnext-card p-6 text-center">
          <p className="vnext-muted text-sm">No transactions match the current filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateKey) => {
            const dayTransactions = groupedByDate[dateKey]
            const dayNet = dayTransactions.reduce((sum, tx) => sum + (tx.kind === 'income' ? tx.amount : -tx.amount), 0)

            return (
              <section key={dateKey} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">
                    {format(new Date(dateKey), 'EEEE, d MMMM')}
                  </span>
                  <span className={`text-sm font-semibold ${dayNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(dayNet)}
                  </span>
                </div>

                <div className="vnext-card overflow-hidden p-2">
                  <div className="space-y-2">
                    {dayTransactions.map((tx) => {
                      const category = categories.find((c) => c.id === tx.categoryId)
                      const item = items.find((i) => i.id === tx.budgetItemId)
                      const label = tx.merchant || tx.note || item?.name || category?.name || 'Unknown'

                      return (
                        <button
                          key={tx.id}
                          type="button"
                          className="w-full rounded-[1.2rem] border border-[var(--border-soft)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-secondary)]"
                          onClick={() => openEditModal(tx)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-[var(--text-primary)]">{label}</span>
                                <span className={`vnext-badge ${tx.kind === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-[#F5F0E8] text-[#8B7550] dark:bg-[#2A2215] dark:text-[#C4A86B]'}`}>
                                  {tx.kind === 'income' ? 'Income' : 'Expense'}
                                </span>
                                {tx.kind === 'expense' && !tx.budgetItemId && (
                                  <span className="vnext-badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Unbudgeted</span>
                                )}
                              </div>
                              <div className="vnext-muted mt-1 text-xs">
                                {category?.name || 'No category'}
                                {tx.note && tx.note !== label ? ` · ${tx.note}` : ''}
                              </div>
                            </div>
                            <div className={`shrink-0 text-base font-semibold ${tx.kind === 'income' ? 'text-green-600' : 'text-[var(--text-primary)]'}`}>
                              {tx.kind === 'income' ? '+' : '-'}
                              {formatCurrency(tx.amount)}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}

      {modalOpen && budgetMonth && (
        <TransactionModal
          key={editingTx?.id ?? `new-${modalKind}`}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditingTx(null)
          }}
          onSave={handleSave}
          onDelete={editingTx ? () => handleDelete(editingTx.id) : undefined}
          transaction={editingTx}
          initialValues={editingTx ? undefined : { kind: modalKind }}
          categories={categories}
          items={items}
          budgetMonthId={budgetMonth.id}
        />
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'success' | 'danger'
}) {
  return (
    <div className="vnext-card p-4">
      <div className="vnext-muted text-sm">{label}</div>
      <div className={`mt-2 text-lg font-bold ${tone === 'success' ? 'text-green-600' : 'text-red-600'}`}>{value}</div>
    </div>
  )
}

function EmptyTransactionsState() {
  return (
    <div className="vnext-card p-8 text-center">
      <div className="mb-3 text-3xl">◆</div>
      <h3 className="vnext-section-title">No Transactions Yet</h3>
      <p className="vnext-muted mt-2 text-sm">
        Start by adding income or recording your first expense.
      </p>
    </div>
  )
}
