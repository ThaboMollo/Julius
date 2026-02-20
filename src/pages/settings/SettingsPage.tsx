import { useEffect, useState } from 'react'
import {
  budgetGroupRepo,
  categoryRepo,
  templateRepo,
  settingsRepo,
} from '../../data/local'
import type {
  BudgetGroup,
  Category,
  RecurringTemplate,
  AppSettings,
  CreateBudgetGroup,
  CreateCategory,
  CreateRecurringTemplate,
} from '../../domain/models'
import { formatCurrency } from '../../domain/constants'

export function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [groups, setGroups] = useState<BudgetGroup[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [templates, setTemplates] = useState<RecurringTemplate[]>([])

  // Form states
  const [paydayDay, setPaydayDay] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')

  // Modal states
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<BudgetGroup | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [sets, grps, cats, tmpls] = await Promise.all([
        settingsRepo.get(),
        budgetGroupRepo.getAll(),
        categoryRepo.getAll(),
        templateRepo.getAll(),
      ])

      setSettings(sets)
      setPaydayDay(sets.paydayDayOfMonth.toString())
      setMonthlyIncome(sets.expectedMonthlyIncome?.toString() || '')
      setGroups(grps.sort((a, b) => a.sortOrder - b.sortOrder))
      setCategories(cats)
      setTemplates(tmpls)
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    const day = parseInt(paydayDay, 10)
    if (isNaN(day) || day < 1 || day > 31) {
      alert('Payday must be between 1 and 31')
      return
    }

    const income = monthlyIncome ? parseFloat(monthlyIncome) : null
    if (monthlyIncome && (isNaN(income!) || income! < 0)) {
      alert('Please enter a valid income amount')
      return
    }

    await settingsRepo.update({
      paydayDayOfMonth: day,
      expectedMonthlyIncome: income,
    })

    alert('Settings saved!')
    await loadData()
  }

  async function handleDeleteGroup(id: string) {
    const hasRefs = await budgetGroupRepo.hasReferences(id)
    if (hasRefs) {
      alert('Cannot delete this group - it has categories or budget items. Deactivate it instead.')
      return
    }
    if (confirm('Delete this group?')) {
      await budgetGroupRepo.delete(id)
      await loadData()
    }
  }

  async function handleToggleGroupActive(group: BudgetGroup) {
    await budgetGroupRepo.update(group.id, { isActive: !group.isActive })
    await loadData()
  }

  async function handleDeleteCategory(id: string) {
    const hasRefs = await categoryRepo.hasReferences(id)
    if (hasRefs) {
      alert('Cannot delete this category - it has budget items or transactions. Deactivate it instead.')
      return
    }
    if (confirm('Delete this category?')) {
      await categoryRepo.delete(id)
      await loadData()
    }
  }

  async function handleToggleCategoryActive(cat: Category) {
    await categoryRepo.update(cat.id, { isActive: !cat.isActive })
    await loadData()
  }

  async function handleDeleteTemplate(id: string) {
    if (confirm('Delete this template?')) {
      await templateRepo.delete(id)
      await loadData()
    }
  }

  async function handleToggleTemplateActive(tmpl: RecurringTemplate) {
    await templateRepo.update(tmpl.id, { isActive: !tmpl.isActive })
    await loadData()
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800">Settings</h1>

      {/* App Settings */}
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Budget Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payday Day of Month
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={paydayDay}
              onChange={(e) => setPaydayDay(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              The day you get paid each month (1-31)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Monthly Income (ZAR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Optional"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used for "Remaining until payday" calculation. Leave empty to use budget total.
            </p>
          </div>

          <button
            onClick={saveSettings}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Budget Groups */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Budget Groups</h2>
          <button
            onClick={() => {
              setEditingGroup(null)
              setShowGroupModal(true)
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            + Add
          </button>
        </div>
        <div className="divide-y">
          {groups.map((group) => (
            <div key={group.id} className={`p-4 flex items-center justify-between ${!group.isActive ? 'bg-gray-50 opacity-60' : ''}`}>
              <div>
                <span className="font-medium text-gray-800">{group.name}</span>
                {group.isDefault && (
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    Default
                  </span>
                )}
                {!group.isActive && (
                  <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleGroupActive(group)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {group.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => {
                    setEditingGroup(group)
                    setShowGroupModal(true)
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                {!group.isDefault && (
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Categories</h2>
          <button
            onClick={() => {
              setEditingCategory(null)
              setShowCategoryModal(true)
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            + Add
          </button>
        </div>
        <div className="divide-y">
          {categories.map((cat) => {
            const group = groups.find((g) => g.id === cat.groupId)
            return (
              <div key={cat.id} className={`p-4 flex items-center justify-between ${!cat.isActive ? 'bg-gray-50 opacity-60' : ''}`}>
                <div>
                  <span className="font-medium text-gray-800">{cat.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{group?.name}</span>
                  {!cat.isActive && (
                    <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleCategoryActive(cat)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    {cat.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingCategory(cat)
                      setShowCategoryModal(true)
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  {!cat.isDefault && (
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recurring Templates */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Recurring Templates</h2>
          <button
            onClick={() => {
              setEditingTemplate(null)
              setShowTemplateModal(true)
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            + Add
          </button>
        </div>
        {templates.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No recurring templates. Add templates to auto-populate each month's budget.
          </div>
        ) : (
          <div className="divide-y">
            {templates.map((tmpl) => {
              const group = groups.find((g) => g.id === tmpl.groupId)
              const category = categories.find((c) => c.id === tmpl.categoryId)
              const effective = tmpl.plannedAmount * tmpl.multiplier * tmpl.splitRatio

              return (
                <div key={tmpl.id} className={`p-4 ${!tmpl.isActive ? 'bg-gray-50 opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{tmpl.name}</span>
                        {tmpl.isBill && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            Bill
                          </span>
                        )}
                        {!tmpl.isActive && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {group?.name} · {category?.name}
                        {tmpl.multiplier !== 1 && ` × ${tmpl.multiplier}`}
                        {tmpl.splitRatio !== 1 && ` × ${tmpl.splitRatio}`}
                        {tmpl.isBill && tmpl.dueDayOfMonth && ` · Due: ${tmpl.dueDayOfMonth}th`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-800">{formatCurrency(effective)}</div>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => handleToggleTemplateActive(tmpl)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          {tmpl.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingTemplate(tmpl)
                            setShowTemplateModal(true)
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showGroupModal && (
        <GroupModal
          isOpen={showGroupModal}
          onClose={() => setShowGroupModal(false)}
          group={editingGroup}
          onSave={async (data) => {
            if (editingGroup) {
              await budgetGroupRepo.update(editingGroup.id, data)
            } else {
              await budgetGroupRepo.create(data)
            }
            setShowGroupModal(false)
            await loadData()
          }}
          existingGroups={groups}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          category={editingCategory}
          groups={groups.filter((g) => g.isActive)}
          onSave={async (data) => {
            if (editingCategory) {
              await categoryRepo.update(editingCategory.id, data)
            } else {
              await categoryRepo.create(data)
            }
            setShowCategoryModal(false)
            await loadData()
          }}
        />
      )}

      {showTemplateModal && (
        <TemplateModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          template={editingTemplate}
          groups={groups.filter((g) => g.isActive)}
          categories={categories.filter((c) => c.isActive)}
          onSave={async (data) => {
            if (editingTemplate) {
              await templateRepo.update(editingTemplate.id, data)
            } else {
              await templateRepo.create(data)
            }
            setShowTemplateModal(false)
            await loadData()
          }}
        />
      )}
    </div>
  )
}

// Group Modal Component
function GroupModal({
  isOpen,
  onClose,
  group,
  onSave,
  existingGroups,
}: {
  isOpen: boolean
  onClose: () => void
  group: BudgetGroup | null
  onSave: (data: CreateBudgetGroup) => void
  existingGroups: BudgetGroup[]
}) {
  const [name, setName] = useState(group?.name || '')
  const [sortOrder, setSortOrder] = useState(
    group?.sortOrder?.toString() || (existingGroups.length + 1).toString()
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">{group ? 'Edit Group' : 'Add Group'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            onSave({
              name: name.trim(),
              sortOrder: parseInt(sortOrder, 10) || 1,
              isDefault: group?.isDefault || false,
              isActive: true,
            })
          }}
          className="p-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
            <input
              type="number"
              min="1"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Category Modal Component
function CategoryModal({
  isOpen,
  onClose,
  category,
  groups,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  category: Category | null
  groups: BudgetGroup[]
  onSave: (data: CreateCategory) => void
}) {
  const [name, setName] = useState(category?.name || '')
  const [groupId, setGroupId] = useState(category?.groupId || groups[0]?.id || '')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">{category ? 'Edit Category' : 'Add Category'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim() || !groupId) return
            onSave({
              name: name.trim(),
              groupId,
              isDefault: category?.isDefault || false,
              isActive: true,
            })
          }}
          className="p-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
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
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Template Modal Component
function TemplateModal({
  isOpen,
  onClose,
  template,
  groups,
  categories,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  template: RecurringTemplate | null
  groups: BudgetGroup[]
  categories: Category[]
  onSave: (data: CreateRecurringTemplate) => void
}) {
  const [groupId, setGroupId] = useState(template?.groupId || groups[0]?.id || '')
  const [categoryId, setCategoryId] = useState(template?.categoryId || '')
  const [name, setName] = useState(template?.name || '')
  const [plannedAmount, setPlannedAmount] = useState(template?.plannedAmount?.toString() || '')
  const [multiplier, setMultiplier] = useState(template?.multiplier?.toString() || '1')
  const [splitRatio, setSplitRatio] = useState(template?.splitRatio?.toString() || '1')
  const [isBill, setIsBill] = useState(template?.isBill || false)
  const [dueDayOfMonth, setDueDayOfMonth] = useState(template?.dueDayOfMonth?.toString() || '')

  const filteredCategories = categories.filter((c) => c.groupId === groupId)

  useEffect(() => {
    if (filteredCategories.length > 0 && !filteredCategories.find((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0].id)
    }
  }, [groupId, filteredCategories])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {template ? 'Edit Template' : 'Add Template'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const amount = parseFloat(plannedAmount)
            if (isNaN(amount) || amount < 0) {
              alert('Please enter a valid amount')
              return
            }
            if (!groupId || !categoryId || !name.trim()) {
              alert('Please fill all required fields')
              return
            }

            onSave({
              groupId,
              categoryId,
              name: name.trim(),
              plannedAmount: amount,
              multiplier: parseFloat(multiplier) || 1,
              splitRatio: parseFloat(splitRatio) || 1,
              isBill,
              dueDayOfMonth: isBill && dueDayOfMonth ? parseInt(dueDayOfMonth, 10) : null,
              isActive: true,
            })
          }}
          className="p-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

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
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Multiplier</label>
              <input
                type="number"
                step="1"
                min="1"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Split Ratio</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                value={splitRatio}
                onChange={(e) => setSplitRatio(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <label className="font-medium text-gray-700">This is a bill</label>
              <p className="text-xs text-gray-500">Set a monthly due day</p>
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

          {isBill && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Day of Month
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDayOfMonth}
                onChange={(e) => setDueDayOfMonth(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
