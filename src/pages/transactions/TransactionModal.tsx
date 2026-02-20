import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import type {
  Transaction,
  Category,
  BudgetItem,
  CreateTransaction,
} from '../../domain/models'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateTransaction) => void
  onDelete?: () => void
  transaction: Transaction | null
  categories: Category[]
  items: BudgetItem[]
  budgetMonthId: string
}

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  transaction,
  categories,
  items,
  budgetMonthId,
}: Props) {
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '')
  const [date, setDate] = useState(
    transaction?.date
      ? format(new Date(transaction.date), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
  )
  const [categoryId, setCategoryId] = useState(transaction?.categoryId || '')
  const [budgetItemId, setBudgetItemId] = useState(transaction?.budgetItemId || '')
  const [note, setNote] = useState(transaction?.note || '')

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString())
      setDate(format(new Date(transaction.date), 'yyyy-MM-dd'))
      setCategoryId(transaction.categoryId)
      setBudgetItemId(transaction.budgetItemId || '')
      setNote(transaction.note)
    }
  }, [transaction])

  // Get items for selected category
  const categoryItems = items.filter((i) => i.categoryId === categoryId)

  // Auto-select item if only one exists for category
  useEffect(() => {
    if (categoryItems.length === 1 && !budgetItemId) {
      setBudgetItemId(categoryItems[0].id)
    }
    // Clear item selection if category changes and item isn't in new category
    if (budgetItemId && !categoryItems.find((i) => i.id === budgetItemId)) {
      setBudgetItemId('')
    }
  }, [categoryId, categoryItems])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (!categoryId) {
      alert('Please select a category')
      return
    }

    if (!date) {
      alert('Please select a date')
      return
    }

    // Warn if category has items but none selected
    if (categoryItems.length > 0 && !budgetItemId) {
      const proceed = confirm(
        'This category has budget items, but you haven\'t selected one. This will be marked as unbudgeted spending. Continue?'
      )
      if (!proceed) return
    }

    onSave({
      budgetMonthId,
      categoryId,
      budgetItemId: budgetItemId || null,
      amount: parsedAmount,
      date: new Date(date),
      note: note.trim(),
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-[#252D3D] w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b dark:border-[#2E3A4E] flex justify-between items-center">
          <h2 className="text-lg font-semibold dark:text-[#F0EDE4]">
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-[#8A9BAA] hover:text-gray-700 dark:hover:text-[#F0EDE4] text-xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">
              Amount (ZAR) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border dark:border-[#2E3A4E] dark:bg-[#1E2330] dark:text-[#F0EDE4] rounded-lg focus:ring-2 focus:ring-[#A89060] focus:border-[#A89060] text-lg"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border dark:border-[#2E3A4E] dark:bg-[#1E2330] dark:text-[#F0EDE4] rounded-lg focus:ring-2 focus:ring-[#A89060]"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border dark:border-[#2E3A4E] dark:bg-[#1E2330] dark:text-[#F0EDE4] rounded-lg focus:ring-2 focus:ring-[#A89060]"
              required
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Item (if category has items) */}
          {categoryItems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">
                Budget Item
                {categoryItems.length > 0 && (
                  <span className="text-[#A89060] dark:text-[#C4A86B] ml-1">*</span>
                )}
              </label>
              <select
                value={budgetItemId}
                onChange={(e) => setBudgetItemId(e.target.value)}
                className="w-full px-3 py-2 border dark:border-[#2E3A4E] dark:bg-[#1E2330] dark:text-[#F0EDE4] rounded-lg focus:ring-2 focus:ring-[#A89060]"
              >
                <option value="">None (Unbudgeted)</option>
                {categoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-[#8A9BAA] mt-1">
                Link this transaction to a budget item for better tracking.
              </p>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border dark:border-[#2E3A4E] dark:bg-[#1E2330] dark:text-[#F0EDE4] rounded-lg focus:ring-2 focus:ring-[#A89060]"
              placeholder="e.g., Woolworths groceries"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-[#8A9BAA] hover:bg-gray-100 dark:hover:bg-[#1E2330] rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#A89060] hover:bg-[#8B7550] text-white rounded-lg"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
