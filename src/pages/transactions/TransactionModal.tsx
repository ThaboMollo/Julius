import { useMemo, useState } from 'react'
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

function getDefaultCategoryId(categories: Category[], kind: TransactionKind, currentId = '') {
  if (currentId) return currentId
  const availableCategories = categories.filter((category) => {
    if (kind === 'income') return isIncomeCategory(category)
    return !isIncomeCategory(category)
  })
  return availableCategories[0]?.id ?? ''
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
  const initialKind = seed?.kind ?? transaction?.kind ?? 'expense'
  const initialCategoryId = getDefaultCategoryId(categories, initialKind, seed?.categoryId ?? transaction?.categoryId ?? '')
  const [kind, setKind] = useState<TransactionKind>(initialKind)
  const [amount, setAmount] = useState(seed?.amount?.toString() ?? '')
  const [date, setDate] = useState(
    seed?.date ? format(new Date(seed.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
  )
  const [categoryId, setCategoryId] = useState(initialCategoryId)
  const [budgetItemId, setBudgetItemId] = useState(
    initialKind === 'income' ? '' : (seed?.budgetItemId ?? transaction?.budgetItemId ?? ''),
  )
  const [merchant, setMerchant] = useState(seed?.merchant ?? transaction?.merchant ?? '')
  const [note, setNote] = useState(seed?.note ?? '')

  const availableCategories = useMemo(
    () =>
      categories.filter((category) => {
        if (kind === 'income') return isIncomeCategory(category)
        return !isIncomeCategory(category)
      }),
    [categories, kind],
  )

  const categoryItems = useMemo(
    () => (kind === 'expense' ? items.filter((i) => i.categoryId === categoryId) : []),
    [categoryId, items, kind],
  )

  function handleKindChange(nextKind: TransactionKind) {
    const nextCategoryId = getDefaultCategoryId(categories, nextKind)
    const nextItems = nextKind === 'expense' ? items.filter((item) => item.categoryId === nextCategoryId) : []

    setKind(nextKind)
    setCategoryId(nextCategoryId)
    setBudgetItemId(nextKind === 'income' ? '' : nextItems.length === 1 ? nextItems[0].id : '')
  }

  function handleCategoryChange(nextCategoryId: string) {
    const nextItems = kind === 'expense' ? items.filter((item) => item.categoryId === nextCategoryId) : []
    setCategoryId(nextCategoryId)
    setBudgetItemId(nextItems.length === 1 ? nextItems[0].id : '')
  }

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
      <div className="vnext-card w-full max-h-[90vh] overflow-y-auto rounded-t-[1.75rem] sm:max-w-md sm:rounded-[1.75rem]">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] p-5">
          <h2 className="text-lg font-semibold dark:text-[#F0EDE4]">
            {transaction ? 'Edit Transaction' : kind === 'income' ? 'Add Income' : 'Add Expense'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-[var(--surface-secondary)] hover:text-gray-700 dark:text-[#8A9BAA] dark:hover:text-[#F0EDE4]"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleKindChange('expense')}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                kind === 'expense'
                  ? 'vnext-button-primary'
                  : 'vnext-button-secondary'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleKindChange('income')}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                kind === 'income'
                  ? 'vnext-button-success'
                  : 'vnext-button-secondary'
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
              className="vnext-input text-lg"
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
              className="vnext-input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">
              {kind === 'income' ? 'Destination *' : 'Category *'}
            </label>
            <select
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="vnext-select"
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
                className="vnext-select"
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
              className="vnext-input"
              placeholder={kind === 'income' ? 'e.g. Salary' : 'e.g. Woolworths'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="vnext-input"
              placeholder={kind === 'income' ? 'e.g. March salary' : 'e.g. Family dinner'}
            />
          </div>

          <div className="flex gap-3 pt-4">
            {onDelete && (
              <button type="button" onClick={onDelete} className="rounded-2xl px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="vnext-button-secondary rounded-2xl px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`rounded-2xl px-6 py-2 text-white ${kind === 'income' ? 'vnext-button-success' : 'vnext-button-primary'}`}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
