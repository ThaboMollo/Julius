import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useMonth } from '../../app/MonthContext'
import {
  budgetMonthRepo,
  budgetItemRepo,
  transactionRepo,
  categoryRepo,
} from '../../data/local'
import type {
  BudgetMonth,
  BudgetItem,
  Transaction,
  Category,
  CreateTransaction,
} from '../../domain/models'
import { totalActual, totalActualByCategory } from '../../domain/rules'
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
  const [filterCategory, setFilterCategory] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [monthKey])

  async function loadData() {
    setLoading(true)
    try {
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth() + 1

      const [bm, cats] = await Promise.all([
        budgetMonthRepo.getOrCreate(year, month),
        categoryRepo.getActive(),
      ])

      setBudgetMonth(bm)
      setCategories(cats)

      const [txs, itms] = await Promise.all([
        transactionRepo.getByMonth(bm.id),
        budgetItemRepo.getByMonth(bm.id),
      ])

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

  function openAddModal() {
    setEditingTx(null)
    setModalOpen(true)
  }

  function openEditModal(tx: Transaction) {
    setEditingTx(tx)
    setModalOpen(true)
  }

  if (loading || !budgetMonth) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-[#8A9BAA]">Loading...</div>
      </div>
    )
  }

  const filteredTransactions = filterCategory
    ? transactions.filter((tx) => tx.categoryId === filterCategory)
    : transactions

  const total = totalActual(filteredTransactions)
  const usedCategories = [...new Set(transactions.map((tx) => tx.categoryId))]

  // Group transactions by date
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-[#F0EDE4]">Transactions</h1>
          <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">
            Total: {formatCurrency(total)} ({filteredTransactions.length} items)
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-[#A89060] hover:bg-[#8B7550] text-white rounded-lg"
        >
          + Add
        </button>
      </div>

      {/* Filter */}
      {usedCategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterCategory('')}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              !filterCategory
                ? 'bg-[#A89060] dark:bg-[#C4A86B] text-white'
                : 'bg-gray-100 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA] hover:bg-gray-200 dark:hover:bg-[#2E3A4E]'
            }`}
          >
            All
          </button>
          {usedCategories.map((catId) => {
            const cat = categories.find((c) => c.id === catId)
            if (!cat) return null
            const catTotal = totalActualByCategory(transactions, catId)
            return (
              <button
                key={catId}
                onClick={() => setFilterCategory(catId)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                  filterCategory === catId
                    ? 'bg-[#A89060] dark:bg-[#C4A86B] text-white'
                    : 'bg-gray-100 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA] hover:bg-gray-200 dark:hover:bg-[#2E3A4E]'
                }`}
              >
                {cat.name} ({formatCurrency(catTotal)})
              </button>
            )
          })}
        </div>
      )}

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-6 shadow text-center">
          <div className="text-4xl mb-3">💳</div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4] mb-2">No Transactions</h3>
          <p className="text-gray-600 dark:text-[#8A9BAA] text-sm">
            Add your first transaction to start tracking spending.
          </p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-6 shadow text-center">
          <p className="text-gray-500 dark:text-[#8A9BAA]">No transactions in this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateKey) => {
            const dayTransactions = groupedByDate[dateKey]
            const dayTotal = dayTransactions.reduce((sum, tx) => sum + tx.amount, 0)

            return (
              <div key={dateKey}>
                {/* Date Header */}
                <div className="flex justify-between items-center px-2 py-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-[#8A9BAA]">
                    {format(new Date(dateKey), 'EEEE, d MMMM')}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-[#8A9BAA]">{formatCurrency(dayTotal)}</span>
                </div>

                {/* Transactions for this date */}
                <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow divide-y dark:divide-[#2E3A4E]">
                  {dayTransactions.map((tx) => {
                    const category = categories.find((c) => c.id === tx.categoryId)
                    const item = items.find((i) => i.id === tx.budgetItemId)

                    return (
                      <div
                        key={tx.id}
                        className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-[#1E2330] cursor-pointer"
                        onClick={() => openEditModal(tx)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 dark:text-[#F0EDE4]">
                              {item?.name || category?.name || 'Unknown'}
                            </span>
                            {!tx.budgetItemId && (
                              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                Unbudgeted
                              </span>
                            )}
                          </div>
                          {tx.note && (
                            <div className="text-xs text-gray-500 dark:text-[#8A9BAA] mt-0.5 truncate">
                              {tx.note}
                            </div>
                          )}
                          {item && category && item.name !== category.name && (
                            <div className="text-xs text-gray-400 dark:text-[#8A9BAA] mt-0.5">{category.name}</div>
                          )}
                        </div>
                        <div className="font-medium text-gray-800 dark:text-[#F0EDE4]">{formatCurrency(tx.amount)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
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
          categories={categories}
          items={items}
          budgetMonthId={budgetMonth.id}
        />
      )}
    </div>
  )
}
