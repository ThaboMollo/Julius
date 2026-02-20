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
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-6 shadow text-center">
          <p className="text-gray-500 dark:text-[#8A9BAA]">Loading...</p>
        </div>
      </div>
    )
  }

  const total = totalPlanned(items)

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-[#F0EDE4]">Budget</h1>
          <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">Total: {formatCurrency(total)}</p>
        </div>
        <div className="flex gap-2">
          {templates.length > 0 && (
            <button
              onClick={handleCreateFromTemplates}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-[#1E2330] text-gray-700 dark:text-[#F0EDE4] rounded-lg hover:bg-gray-200 dark:hover:bg-[#2E3A4E]"
            >
              From Templates
            </button>
          )}
          <button
            onClick={() => openAddModal()}
            className="px-4 py-2 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550]"
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Groups */}
      {groups.length === 0 ? (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-6 shadow text-center">
          <p className="text-gray-500 dark:text-[#8A9BAA]">No budget groups. Add some in Settings.</p>
        </div>
      ) : (
        groups.map((group) => {
          const groupItems = items.filter((i) => i.groupId === group.id)
          const groupTotal = totalPlannedByGroup(items, group.id)

          return (
            <div key={group.id} className="bg-white dark:bg-[#252D3D] rounded-xl shadow overflow-hidden">
              <div className="bg-gray-50 dark:bg-[#1E2330] px-4 py-3 flex justify-between items-center border-b dark:border-[#2E3A4E]">
                <div>
                  <h2 className="font-semibold text-gray-800 dark:text-[#F0EDE4]">{group.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">{formatCurrency(groupTotal)}</p>
                </div>
                <button
                  onClick={() => openAddModal(group.id)}
                  className="text-[#A89060] dark:text-[#C4A86B] hover:text-[#8B7550] text-sm font-medium"
                >
                  + Add
                </button>
              </div>

              {groupItems.length === 0 ? (
                <div className="p-4 text-center text-gray-400 dark:text-[#8A9BAA] text-sm">
                  No items in this group
                </div>
              ) : (
                <div className="divide-y dark:divide-[#2E3A4E]">
                  {groupItems.map((item) => {
                    const category = categories.find((c) => c.id === item.categoryId)
                    const effective = effectivePlanned(item)

                    return (
                      <div
                        key={item.id}
                        className="px-4 py-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-[#1E2330] cursor-pointer"
                        onClick={() => openEditModal(item)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 dark:text-[#F0EDE4] truncate">
                              {item.name}
                            </span>
                            {item.isBill && (
                              <span className="text-xs bg-[#F5F0E8] text-[#8B7550] dark:bg-[#2A2215] dark:text-[#C4A86B] px-1.5 py-0.5 rounded">
                                Bill
                              </span>
                            )}
                            {item.isFromTemplate && (
                              <span className="text-xs bg-gray-100 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA] px-1.5 py-0.5 rounded">
                                Template
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-[#8A9BAA] mt-0.5">
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
                          <div className="font-medium text-gray-800 dark:text-[#F0EDE4]">
                            {formatCurrency(effective)}
                          </div>
                          {effective !== item.plannedAmount && (
                            <div className="text-xs text-gray-400 dark:text-[#8A9BAA]">
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
