import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useMonth } from '../../app/MonthContext'
import {
  budgetMonthRepo,
  budgetItemRepo,
  billTickRepo,
  budgetGroupRepo,
  categoryRepo,
  settingsRepo,
} from '../../data/local'
import type {
  BudgetMonth,
  BudgetItem,
  BillTick,
  BudgetGroup,
  Category,
  AppSettings,
} from '../../domain/models'
import { effectivePlanned, getBillDueStatus, type BillDueStatus } from '../../domain/rules'
import { formatCurrency } from '../../domain/constants'

type FilterType = 'all' | 'overdue' | 'due_today' | 'due_tomorrow' | 'due_before_payday' | 'unpaid' | 'paid'

const STATUS_BADGES: Record<BillDueStatus, { label: string; className: string }> = {
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700' },
  due_today: { label: 'Due Today', className: 'bg-orange-100 text-orange-700' },
  due_tomorrow: { label: 'Tomorrow', className: 'bg-yellow-100 text-yellow-700' },
  due_before_payday: {
    label: 'Before Payday',
    className: 'bg-[#F5F0E8] text-[#8B7550] dark:bg-[#2A2215] dark:text-[#C4A86B]',
  },
  upcoming: { label: 'Upcoming', className: 'bg-gray-100 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA]' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-700' },
}

export function BillsPage() {
  const { selectedMonth, monthKey } = useMonth()
  const [loading, setLoading] = useState(true)
  const [budgetMonth, setBudgetMonth] = useState<BudgetMonth | null>(null)
  const [bills, setBills] = useState<BudgetItem[]>([])
  const [billTicks, setBillTicks] = useState<BillTick[]>([])
  const [groups, setGroups] = useState<BudgetGroup[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    loadData()
  }, [monthKey])

  async function loadData() {
    setLoading(true)
    try {
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth() + 1

      const [bm, grps, cats, sets] = await Promise.all([
        budgetMonthRepo.getOrCreate(year, month),
        budgetGroupRepo.getActive(),
        categoryRepo.getActive(),
        settingsRepo.get(),
      ])

      setBudgetMonth(bm)
      setGroups(grps)
      setCategories(cats)
      setSettings(sets)

      const [billItems, ticks] = await Promise.all([
        budgetItemRepo.getBillsByMonth(bm.id),
        billTickRepo.getByMonth(bm.id),
      ])

      setBills(billItems)
      setBillTicks(ticks)
    } finally {
      setLoading(false)
    }
  }

  async function togglePaid(itemId: string) {
    if (!budgetMonth) return
    await billTickRepo.togglePaid(budgetMonth.id, itemId)
    const ticks = await billTickRepo.getByMonth(budgetMonth.id)
    setBillTicks(ticks)
  }

  function getBillStatus(item: BudgetItem): BillDueStatus {
    if (!settings) return 'upcoming'
    const tick = billTicks.find((t) => t.budgetItemId === item.id)
    return getBillDueStatus(
      item,
      tick,
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + 1,
      settings.paydayDayOfMonth
    )
  }

  function getFilteredBills(): BudgetItem[] {
    return bills
      .map((bill) => ({ bill, status: getBillStatus(bill) }))
      .filter(({ status }) => {
        switch (filter) {
          case 'overdue':
            return status === 'overdue'
          case 'due_today':
            return status === 'due_today'
          case 'due_tomorrow':
            return status === 'due_tomorrow'
          case 'due_before_payday':
            return status === 'due_before_payday'
          case 'unpaid':
            return status !== 'paid'
          case 'paid':
            return status === 'paid'
          default:
            return true
        }
      })
      .sort((a, b) => {
        // Sort by due date, then by status priority
        const dateA = a.bill.dueDate ? new Date(a.bill.dueDate).getTime() : Infinity
        const dateB = b.bill.dueDate ? new Date(b.bill.dueDate).getTime() : Infinity
        return dateA - dateB
      })
      .map(({ bill }) => bill)
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-[#8A9BAA]">Loading...</div>
      </div>
    )
  }

  const filteredBills = getFilteredBills()
  const unpaidTotal = bills
    .filter((b) => !billTicks.find((t) => t.budgetItemId === b.id)?.isPaid)
    .reduce((sum, b) => sum + effectivePlanned(b), 0)
  const paidTotal = bills
    .filter((b) => billTicks.find((t) => t.budgetItemId === b.id)?.isPaid)
    .reduce((sum, b) => sum + effectivePlanned(b), 0)

  return (
    <div className="p-4 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
          <div className="text-sm text-gray-500 dark:text-[#8A9BAA]">Unpaid</div>
          <div className="text-xl font-bold text-red-600">{formatCurrency(unpaidTotal)}</div>
          <div className="text-xs text-gray-400 dark:text-[#8A9BAA]">
            {bills.filter((b) => !billTicks.find((t) => t.budgetItemId === b.id)?.isPaid).length} bills
          </div>
        </div>
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
          <div className="text-sm text-gray-500 dark:text-[#8A9BAA]">Paid</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(paidTotal)}</div>
          <div className="text-xs text-gray-400 dark:text-[#8A9BAA]">
            {bills.filter((b) => billTicks.find((t) => t.budgetItemId === b.id)?.isPaid).length} bills
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'unpaid', 'overdue', 'due_today', 'due_tomorrow', 'due_before_payday', 'paid'] as FilterType[]).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                filter === f
                  ? 'bg-[#A89060] dark:bg-[#C4A86B] text-white'
                  : 'bg-gray-100 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA] hover:bg-gray-200 dark:hover:bg-[#2E3A4E]'
              }`}
            >
              {f === 'all'
                ? 'All'
                : f === 'unpaid'
                ? 'Unpaid'
                : f === 'overdue'
                ? 'Overdue'
                : f === 'due_today'
                ? 'Due Today'
                : f === 'due_tomorrow'
                ? 'Tomorrow'
                : f === 'due_before_payday'
                ? 'Before Payday'
                : 'Paid'}
            </button>
          )
        )}
      </div>

      {/* Bills List */}
      {bills.length === 0 ? (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-6 shadow text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4] mb-2">No Bills</h3>
          <p className="text-gray-600 dark:text-[#8A9BAA] text-sm">
            Mark budget items as bills on the Budget page to see them here.
          </p>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-6 shadow text-center">
          <p className="text-gray-500 dark:text-[#8A9BAA]">No bills match the current filter</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow divide-y dark:divide-[#2E3A4E]">
          {filteredBills.map((bill) => {
            const tick = billTicks.find((t) => t.budgetItemId === bill.id)
            const isPaid = tick?.isPaid || false
            const status = getBillStatus(bill)
            const group = groups.find((g) => g.id === bill.groupId)
            const category = categories.find((c) => c.id === bill.categoryId)
            const badge = STATUS_BADGES[status]

            return (
              <div
                key={bill.id}
                className={`p-4 flex items-center gap-3 ${isPaid ? 'bg-gray-50 dark:bg-[#1E2330]' : ''}`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => togglePaid(bill.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isPaid
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 dark:border-[#2E3A4E] hover:border-[#A89060]'
                  }`}
                >
                  {isPaid && '✓'}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${isPaid ? 'text-gray-400 dark:text-[#8A9BAA] line-through' : 'text-gray-800 dark:text-[#F0EDE4]'}`}
                    >
                      {bill.name}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-[#8A9BAA] mt-0.5">
                    {group?.name} · {category?.name}
                    {bill.dueDate && (
                      <span className="ml-2">
                        Due: {format(new Date(bill.dueDate), 'd MMM')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div
                  className={`text-right font-medium ${isPaid ? 'text-gray-400 dark:text-[#8A9BAA]' : 'text-gray-800 dark:text-[#F0EDE4]'}`}
                >
                  {formatCurrency(effectivePlanned(bill))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
