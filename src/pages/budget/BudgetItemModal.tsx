import { useState, useEffect } from 'react'
import type {
  BudgetItem,
  BudgetGroup,
  Category,
  CreateBudgetItem,
} from '../../domain/models'
import { parseSplitRatio, COMMON_SPLIT_RATIOS } from '../../domain/constants'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateBudgetItem) => void
  onDelete?: () => void
  item: BudgetItem | null
  groups: BudgetGroup[]
  categories: Category[]
  budgetMonthId: string
  defaultGroupId: string | null
}

export function BudgetItemModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  item,
  groups,
  categories,
  budgetMonthId,
  defaultGroupId,
}: Props) {
  const [groupId, setGroupId] = useState(item?.groupId || defaultGroupId || groups[0]?.id || '')
  const [categoryId, setCategoryId] = useState(item?.categoryId || '')
  const [name, setName] = useState(item?.name || '')
  const [plannedAmount, setPlannedAmount] = useState(item?.plannedAmount?.toString() || '')
  const [multiplier, setMultiplier] = useState(item?.multiplier?.toString() || '1')
  const [splitRatioInput, setSplitRatioInput] = useState(
    item?.splitRatio === 1 ? '1' : item?.splitRatio === 0.5 ? '1/2' : item?.splitRatio?.toString() || '1'
  )
  const [isBill, setIsBill] = useState(item?.isBill || false)
  const [dueDay, setDueDay] = useState(
    item?.dueDate ? new Date(item.dueDate).getDate().toString() : ''
  )

  useEffect(() => {
    if (item) {
      setGroupId(item.groupId)
      setCategoryId(item.categoryId)
      setName(item.name)
      setPlannedAmount(item.plannedAmount.toString())
      setMultiplier(item.multiplier.toString())
      setSplitRatioInput(
        item.splitRatio === 1 ? '1' : item.splitRatio === 0.5 ? '1/2' : item.splitRatio.toString()
      )
      setIsBill(item.isBill)
      setDueDay(item.dueDate ? new Date(item.dueDate).getDate().toString() : '')
    }
  }, [item])

  const filteredCategories = categories.filter((c) => c.groupId === groupId)

  useEffect(() => {
    if (!item && filteredCategories.length > 0 && !filteredCategories.find((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0].id)
    }
  }, [groupId, filteredCategories])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const amount = parseFloat(plannedAmount)
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid amount')
      return
    }

    if (!groupId || !categoryId || !name.trim()) {
      alert('Please fill in all required fields')
      return
    }

    const splitRatio = parseSplitRatio(splitRatioInput)
    const mult = parseFloat(multiplier) || 1

    let dueDate: Date | null = null
    if (isBill && dueDay) {
      const day = parseInt(dueDay, 10)
      if (day >= 1 && day <= 31) {
        // We'll set it to current month context - the parent handles this
        dueDate = new Date()
        dueDate.setDate(Math.min(day, 28)) // Safe for all months
      }
    }

    onSave({
      budgetMonthId,
      groupId,
      categoryId,
      name: name.trim(),
      plannedAmount: amount,
      multiplier: mult,
      splitRatio,
      isBill,
      dueDate,
      isFromTemplate: item?.isFromTemplate || false,
      templateId: item?.templateId || null,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {item ? 'Edit Budget Item' : 'Add Budget Item'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Rent, WiFi, Groceries"
              required
            />
          </div>

          {/* Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              {filteredCategories.length === 0 ? (
                <option value="">No categories for this group</option>
              ) : (
                filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Planned Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Planned Amount (ZAR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={plannedAmount}
              onChange={(e) => setPlannedAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              required
            />
          </div>

          {/* Multiplier & Split */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Multiplier
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">e.g., 2 for paying twice</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Split Ratio
              </label>
              <select
                value={splitRatioInput}
                onChange={(e) => setSplitRatioInput(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {COMMON_SPLIT_RATIOS.map((r) => (
                  <option key={r.label} value={r.value === 1 ? '1' : r.value === 0.5 ? '1/2' : r.value.toString()}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bill Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <label className="font-medium text-gray-700">This is a bill</label>
              <p className="text-xs text-gray-500">Track due date and paid status</p>
            </div>
            <button
              type="button"
              onClick={() => setIsBill(!isBill)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isBill ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  isBill ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          {/* Due Day (if bill) */}
          {isBill && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Day of Month
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="1-31"
              />
            </div>
          )}

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
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
