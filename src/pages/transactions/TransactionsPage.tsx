import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useMonth } from '../../app/MonthContext'
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
  const [loading, setLoading] = useState(true)
  const [budgetMonth, setBudgetMonth] = useState<BudgetMonth | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [items, setItems] = useState<BudgetItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [modalKind, setModalKind] = useState<TransactionKind>('expense')
  const [filterKind, setFilterKind] = useState<'all' | TransactionKind>('all')

  useEffect(() => {
    loadData()
  }, [monthKey])

  async function loadData() {
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
  }

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
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-[#8A9BAA]">Loading...</div>
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
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-[#F0EDE4]">Transactions</h1>
          <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">
            Net: <span className={net >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(net)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openAddModal('income')}
            className="px-4 py-2 bg-[#3B7A57] hover:bg-[#2F6548] text-white rounded-lg"
          >
            + Income
          </button>
          <button
            onClick={() => openAddModal('expense')}
            className="px-4 py-2 bg-[#A89060] hover:bg-[#8B7550] text-white rounded-lg"
          >
            + Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
          <div className="text-sm text-gray-500 dark:text-[#8A9BAA]">Income</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(incomeTotal)}</div>
        </div>
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
          <div className="text-sm text-gray-500 dark:text-[#8A9BAA]">Expenses</div>
          <div className="text-xl font-bold text-red-600">{formatCurrency(expenseTotal)}</div>
        </div>
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
          <div className="text-sm text-gray-500 dark:text-[#8A9BAA]">Net</div>
          <div className={`text-xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(net)}</div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'expense', 'income'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilterKind(value)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              filterKind === value
                ? 'bg-[#A89060] dark:bg-[#C4A86B] text-white'
                : 'bg-gray-100 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA] hover:bg-gray-200 dark:hover:bg-[#2E3A4E]'
            }`}
          >
            {value === 'all' ? 'All' : value === 'expense' ? 'Expenses' : 'Income'}
          </button>
        ))}
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-6 shadow text-center">
          <div className="text-4xl mb-3">💳</div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4] mb-2">No Transactions Yet</h3>
          <p className="text-gray-600 dark:text-[#8A9BAA] text-sm">
            Start by adding income or recording your first expense.
          </p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-6 shadow text-center">
          <p className="text-gray-500 dark:text-[#8A9BAA]">No transactions match the current filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateKey) => {
            const dayTransactions = groupedByDate[dateKey]
            const dayNet = dayTransactions.reduce((sum, tx) => sum + (tx.kind === 'income' ? tx.amount : -tx.amount), 0)

            return (
              <div key={dateKey}>
                <div className="flex justify-between items-center px-2 py-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-[#8A9BAA]">
                    {format(new Date(dateKey), 'EEEE, d MMMM')}
                  </span>
                  <span className={`text-sm ${dayNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(dayNet)}</span>
                </div>

                <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow divide-y dark:divide-[#2E3A4E]">
                  {dayTransactions.map((tx) => {
                    const category = categories.find((c) => c.id === tx.categoryId)
                    const item = items.find((i) => i.id === tx.budgetItemId)
                    const label = tx.merchant || tx.note || item?.name || category?.name || 'Unknown'

                    return (
                      <div
                        key={tx.id}
                        className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-[#1E2330] cursor-pointer"
                        onClick={() => openEditModal(tx)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 dark:text-[#F0EDE4]">{label}</span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                tx.kind === 'income'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-[#F5F0E8] text-[#8B7550] dark:bg-[#2A2215] dark:text-[#C4A86B]'
                              }`}
                            >
                              {tx.kind === 'income' ? 'Income' : 'Expense'}
                            </span>
                            {tx.kind === 'expense' && !tx.budgetItemId && (
                              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Unbudgeted</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-[#8A9BAA] mt-0.5">
                            {category?.name || 'No category'}
                            {tx.note && tx.note !== label ? ` · ${tx.note}` : ''}
                          </div>
                        </div>
                        <div className={`font-medium ${tx.kind === 'income' ? 'text-green-600' : 'text-gray-800 dark:text-[#F0EDE4]'}`}>
                          {tx.kind === 'income' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && budgetMonth && (
        <TransactionModal
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
