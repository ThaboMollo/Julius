import { useEffect, useState } from 'react'
import { useMonth } from '../../app/MonthContext'
import {
  budgetMonthRepo,
  budgetItemRepo,
  budgetGroupRepo,
  categoryRepo,
  templateRepo,
} from '../../data/local'
import type {
  BudgetMonth,
  BudgetItem,
  BudgetGroup,
  Category,
  CreateBudgetItem,
  RecurringTemplate,
} from '../../domain/models'
import { effectivePlanned, totalPlannedByGroup, totalPlanned } from '../../domain/rules'
import { formatCurrency } from '../../domain/constants'
import { BudgetItemModal } from './BudgetItemModal'

export function BudgetPage() {
  const { selectedMonth, monthKey } = useMonth()
  const [loading, setLoading] = useState(true)
  const [budgetMonth, setBudgetMonth] = useState<BudgetMonth | null>(null)
  const [items, setItems] = useState<BudgetItem[]>([])
  const [groups, setGroups] = useState<BudgetGroup[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [templates, setTemplates] = useState<RecurringTemplate[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [monthKey])

  async function loadData() {
    setLoading(true)
    try {
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth() + 1

      const [bm, grps, cats, tmpls] = await Promise.all([
        budgetMonthRepo.getOrCreate(year, month),
        budgetGroupRepo.getActive(),
        categoryRepo.getActive(),
        templateRepo.getActive(),
      ])

      setBudgetMonth(bm)
      setGroups(grps)
      setCategories(cats)
      setTemplates(tmpls)

      const itms = await budgetItemRepo.getByMonth(bm.id)
      setItems(itms)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateFromTemplates() {
    if (!budgetMonth || templates.length === 0) return

    const existingTemplateIds = new Set(
      items.filter((i) => i.templateId).map((i) => i.templateId)
    )

    const newTemplates = templates.filter((t) => !existingTemplateIds.has(t.id))
    if (newTemplates.length === 0) {
      alert('All templates already added for this month')
      return
    }

    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1

    const newItems: CreateBudgetItem[] = newTemplates.map((t) => ({
      budgetMonthId: budgetMonth.id,
      groupId: t.groupId,
      categoryId: t.categoryId,
      name: t.name,
      plannedAmount: t.plannedAmount,
      multiplier: t.multiplier,
      splitRatio: t.splitRatio,
      isBill: t.isBill,
      dueDate: t.dueDayOfMonth
        ? new Date(year, month - 1, Math.min(t.dueDayOfMonth, 28))
        : null,
      isFromTemplate: true,
      templateId: t.id,
    }))

    await budgetItemRepo.createMany(newItems)
    await loadData()
  }

  async function handleSaveItem(data: CreateBudgetItem) {
    if (editingItem) {
      await budgetItemRepo.update(editingItem.id, data)
    } else {
      await budgetItemRepo.create(data)
    }
    setModalOpen(false)
    setEditingItem(null)
    await loadData()
  }

  async function handleDeleteItem(id: string) {
    if (confirm('Delete this budget item?')) {
      await budgetItemRepo.delete(id)
      await loadData()
    }
  }

  function openAddModal(groupId?: string) {
    setEditingItem(null)
    setSelectedGroupId(groupId || null)
    setModalOpen(true)
  }

  function openEditModal(item: BudgetItem) {
    setEditingItem(item)
    setSelectedGroupId(item.groupId)
    setModalOpen(true)
  }

  if (loading || !budgetMonth) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const total = totalPlanned(items)

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Budget</h1>
          <p className="text-sm text-gray-500">Total: {formatCurrency(total)}</p>
        </div>
        <div className="flex gap-2">
          {templates.length > 0 && (
            <button
              onClick={handleCreateFromTemplates}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              From Templates
            </button>
          )}
          <button
            onClick={() => openAddModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Groups */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-xl p-6 shadow text-center">
          <p className="text-gray-500">No budget groups. Add some in Settings.</p>
        </div>
      ) : (
        groups.map((group) => {
          const groupItems = items.filter((i) => i.groupId === group.id)
          const groupTotal = totalPlannedByGroup(items, group.id)

          return (
            <div key={group.id} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b">
                <div>
                  <h2 className="font-semibold text-gray-800">{group.name}</h2>
                  <p className="text-sm text-gray-500">{formatCurrency(groupTotal)}</p>
                </div>
                <button
                  onClick={() => openAddModal(group.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Add
                </button>
              </div>

              {groupItems.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  No items in this group
                </div>
              ) : (
                <div className="divide-y">
                  {groupItems.map((item) => {
                    const category = categories.find((c) => c.id === item.categoryId)
                    const effective = effectivePlanned(item)

                    return (
                      <div
                        key={item.id}
                        className="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
                        onClick={() => openEditModal(item)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 truncate">
                              {item.name}
                            </span>
                            {item.isBill && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                Bill
                              </span>
                            )}
                            {item.isFromTemplate && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                Template
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {category?.name}
                            {item.multiplier !== 1 && ` × ${item.multiplier}`}
                            {item.splitRatio !== 1 && ` × ${item.splitRatio}`}
                            {item.isBill && item.dueDate && (
                              <span className="ml-2">
                                Due: {new Date(item.dueDate).getDate()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-800">
                            {formatCurrency(effective)}
                          </div>
                          {effective !== item.plannedAmount && (
                            <div className="text-xs text-gray-400">
                              ({formatCurrency(item.plannedAmount)})
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Modal */}
      {modalOpen && budgetMonth && (
        <BudgetItemModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditingItem(null)
          }}
          onSave={handleSaveItem}
          onDelete={editingItem ? () => handleDeleteItem(editingItem.id) : undefined}
          item={editingItem}
          groups={groups}
          categories={categories}
          budgetMonthId={budgetMonth.id}
          defaultGroupId={selectedGroupId}
        />
      )}
    </div>
  )
}
