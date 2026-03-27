import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import type {
  Transaction,
  Category,
  BudgetItem,
  CreateTransaction,
  TransactionKind,
} from '../../domain/models'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateTransaction) => void
  onDelete?: () => void
  transaction: Transaction | null
  initialValues?: Partial<CreateTransaction>
  categories: Category[]
  items: BudgetItem[]
  budgetMonthId: string
}

function isIncomeCategory(category: Category | undefined): boolean {
  return category?.name === 'Income'
}

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  transaction,
  initialValues,
  categories,
  items,
  budgetMonthId,
}: Props) {
  const seed = transaction ?? initialValues
  const [kind, setKind] = useState<TransactionKind>(seed?.kind ?? transaction?.kind ?? 'expense')
  const [amount, setAmount] = useState(seed?.amount?.toString() ?? '')
  const [date, setDate] = useState(
    seed?.date ? format(new Date(seed.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
  )
  const [categoryId, setCategoryId] = useState(seed?.categoryId ?? '')
  const [budgetItemId, setBudgetItemId] = useState(seed?.budgetItemId ?? '')
  const [merchant, setMerchant] = useState(seed?.merchant ?? transaction?.merchant ?? '')
  const [note, setNote] = useState(seed?.note ?? '')

  useEffect(() => {
    if (transaction) {
      setKind(transaction.kind)
      setAmount(transaction.amount.toString())
      setDate(format(new Date(transaction.date), 'yyyy-MM-dd'))
      setCategoryId(transaction.categoryId)
      setBudgetItemId(transaction.budgetItemId || '')
      setMerchant(transaction.merchant)
      setNote(transaction.note)
      return
    }

    if (initialValues) {
      setKind(initialValues.kind ?? 'expense')
      setAmount(initialValues.amount?.toString() ?? '')
      setDate(initialValues.date ? format(new Date(initialValues.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
      setCategoryId(initialValues.categoryId ?? '')
      setBudgetItemId(initialValues.budgetItemId ?? '')
      setMerchant(initialValues.merchant ?? '')
      setNote(initialValues.note ?? '')
    }
  }, [initialValues, transaction])

  const availableCategories = categories.filter((category) => {
    if (kind === 'income') return isIncomeCategory(category)
    return !isIncomeCategory(category)
  })

  useEffect(() => {
    if (!categoryId) {
      const defaultCategory =
        availableCategories.find((category) => isIncomeCategory(category) === (kind === 'income')) ??
        availableCategories[0]
      if (defaultCategory) {
        setCategoryId(defaultCategory.id)
      }
    }
  }, [availableCategories, categoryId, kind])

  const categoryItems = kind === 'expense' ? items.filter((i) => i.categoryId === categoryId) : []

  useEffect(() => {
    if (kind === 'income') {
      setBudgetItemId('')
      return
    }

    if (categoryItems.length === 1 && !budgetItemId) {
      setBudgetItemId(categoryItems[0].id)
    }
    if (budgetItemId && !categoryItems.find((i) => i.id === budgetItemId)) {
      setBudgetItemId('')
    }
  }, [budgetItemId, categoryItems, kind])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (!categoryId) {
      alert(`Please select a ${kind === 'income' ? 'destination' : 'category'}`)
      return
    }

    if (!date) {
      alert('Please select a date')
      return
    }

    if (kind === 'expense' && categoryItems.length > 0 && !budgetItemId) {
      const proceed = confirm(
        'This category has budget items, but you have not selected one. This will be marked as unbudgeted spending. Continue?',
      )
      if (!proceed) return
    }

    onSave({
      budgetMonthId,
      categoryId,
      budgetItemId: kind === 'income' ? null : budgetItemId || null,
      amount: parsedAmount,
      date: new Date(date),
      merchant: merchant.trim(),
      note: note.trim(),
      kind,
      source: transaction?.source ?? initialValues?.source ?? 'manual',
      commitmentId: transaction?.commitmentId ?? initialValues?.commitmentId ?? null,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-[#252D3D] w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b dark:border-[#2E3A4E] flex justify-between items-center">
          <h2 className="text-lg font-semibold dark:text-[#F0EDE4]">
            {transaction ? 'Edit Transaction' : kind === 'income' ? 'Add Income' : 'Add Expense'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-[#8A9BAA] hover:text-gray-700 dark:hover:text-[#F0EDE4] text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind('expense')}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                kind === 'expense'
                  ? 'bg-[#A89060] text-white'
                  : 'bg-gray-100 dark:bg-[#1E2330] text-gray-700 dark:text-[#F0EDE4]'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setKind('income')}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                kind === 'income'
                  ? 'bg-[#3B7A57] text-white'
                  : 'bg-gray-100 dark:bg-[#1E2330] text-gray-700 dark:text-[#F0EDE4]'
              }`}
            >
              Income
            </button>
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">
              {kind === 'income' ? 'Destination *' : 'Category *'}
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border dark:border-[#2E3A4E] dark:bg-[#1E2330] dark:text-[#F0EDE4] rounded-lg focus:ring-2 focus:ring-[#A89060]"
              required
            >
              <option value="">{kind === 'income' ? 'Select destination' : 'Select a category'}</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {kind === 'expense' && categoryItems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">Budget Item</label>
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
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">
              {kind === 'income' ? 'From (optional)' : 'Merchant / Payee'}
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full px-3 py-2 border dark:border-[#2E3A4E] dark:bg-[#1E2330] dark:text-[#F0EDE4] rounded-lg focus:ring-2 focus:ring-[#A89060]"
              placeholder={kind === 'income' ? 'e.g. Salary' : 'e.g. Woolworths'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border dark:border-[#2E3A4E] dark:bg-[#1E2330] dark:text-[#F0EDE4] rounded-lg focus:ring-2 focus:ring-[#A89060]"
              placeholder={kind === 'income' ? 'e.g. March salary' : 'e.g. Family dinner'}
            />
          </div>

          <div className="flex gap-3 pt-4">
            {onDelete && (
              <button type="button" onClick={onDelete} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">
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
              className={`px-6 py-2 text-white rounded-lg ${kind === 'income' ? 'bg-[#3B7A57] hover:bg-[#2F6548]' : 'bg-[#A89060] hover:bg-[#8B7550]'}`}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
