import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useMonth } from '../../app/useMonth'
import { budgetMonthRepo, commitmentRepo, categoryRepo, transactionRepo } from '../../data/local'
import type { BudgetMonth, Commitment, Category, CreateTransaction } from '../../domain/models'
import { getCommitmentStatus, type BillDueStatus, getUpcomingCommitments } from '../../domain/rules'
import { formatCurrency } from '../../domain/constants'
import { TransactionModal } from '../transactions/TransactionModal'

type FilterType = 'all' | 'overdue' | 'due_today' | 'due_tomorrow' | 'upcoming' | 'unpaid' | 'paid'

const STATUS_BADGES: Record<BillDueStatus, { label: string; className: string }> = {
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700' },
  due_today: { label: 'Due Today', className: 'bg-orange-100 text-orange-700' },
  due_tomorrow: { label: 'Tomorrow', className: 'bg-yellow-100 text-yellow-700' },
  due_before_payday: { label: 'Soon', className: 'bg-[#F5F0E8] text-[#8B7550] dark:bg-[#2A2215] dark:text-[#C4A86B]' },
  upcoming: { label: 'Upcoming', className: 'bg-gray-100 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA]' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-700' },
}

export function CommitmentsPage() {
  const { selectedMonth, monthKey } = useMonth()
  const [loading, setLoading] = useState(true)
  const [budgetMonth, setBudgetMonth] = useState<BudgetMonth | null>(null)
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingCommitment, setPendingCommitment] = useState<Commitment | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth() + 1

      const [bm, cats] = await Promise.all([budgetMonthRepo.getOrCreate(year, month), categoryRepo.getActive()])
      setBudgetMonth(bm)
      setCategories(cats)
      setCommitments(await commitmentRepo.getByMonth(bm.id))
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    void loadData()
  }, [loadData, monthKey])

  async function togglePaid(commitment: Commitment) {
    if (!budgetMonth) return

    if (commitment.status === 'paid') {
      if (commitment.paidTransactionId) {
        const linkedTx = await transactionRepo.getById(commitment.paidTransactionId)
        if (linkedTx) {
          const deleteIt = window.confirm(`Also delete the transaction for "${commitment.name}"?`)
          if (deleteIt) {
            await transactionRepo.delete(linkedTx.id)
          }
        }
      }

      await commitmentRepo.update(commitment.id, {
        status: 'upcoming',
        paidTransactionId: null,
      })
      await loadData()
      return
    }

    setPendingCommitment(commitment)
    setModalOpen(true)
  }

  async function handleCommitmentTransactionSave(data: CreateTransaction) {
    if (!pendingCommitment) return

    const existingLinked = pendingCommitment.paidTransactionId
      ? await transactionRepo.getById(pendingCommitment.paidTransactionId)
      : null

    const savedTx = existingLinked
      ? (await transactionRepo.update(existingLinked.id, data), existingLinked)
      : await transactionRepo.create({
          ...data,
          kind: 'expense',
          source: 'commitment',
          commitmentId: pendingCommitment.id,
        })

    await commitmentRepo.update(pendingCommitment.id, {
      status: 'paid',
      paidTransactionId: savedTx.id,
    })

    setModalOpen(false)
    setPendingCommitment(null)
    await loadData()
  }

  function getStatus(commitment: Commitment): BillDueStatus {
    return getCommitmentStatus(commitment)
  }

  function getFilteredCommitments(): Commitment[] {
    return commitments
      .map((commitment) => ({ commitment, status: getStatus(commitment) }))
      .filter(({ status }) => {
        switch (filter) {
          case 'overdue':
            return status === 'overdue'
          case 'due_today':
            return status === 'due_today'
          case 'due_tomorrow':
            return status === 'due_tomorrow'
          case 'upcoming':
            return status === 'upcoming' || status === 'due_before_payday'
          case 'unpaid':
            return status !== 'paid'
          case 'paid':
            return status === 'paid'
          default:
            return true
        }
      })
      .sort((a, b) => {
        const dateA = a.commitment.dueDate ? new Date(a.commitment.dueDate).getTime() : Infinity
        const dateB = b.commitment.dueDate ? new Date(b.commitment.dueDate).getTime() : Infinity
        return dateA - dateB
      })
      .map(({ commitment }) => commitment)
  }

  if (loading || !budgetMonth) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-[#8A9BAA]">Loading...</div>
      </div>
    )
  }

  const filteredCommitments = getFilteredCommitments()
  const unpaidCommitments = commitments.filter((commitment) => commitment.status !== 'paid')
  const paidCommitments = commitments.filter((commitment) => commitment.status === 'paid')
  const unpaidTotal = unpaidCommitments.reduce((sum, commitment) => sum + commitment.amount, 0)
  const paidTotal = paidCommitments.reduce((sum, commitment) => sum + commitment.amount, 0)
  const upcoming = getUpcomingCommitments(commitments, commitments.length)
  const modalInitialValues: Partial<CreateTransaction> | undefined = pendingCommitment
    ? {
        budgetMonthId: budgetMonth.id,
        categoryId: pendingCommitment.categoryId,
        amount: pendingCommitment.amount,
        date: pendingCommitment.dueDate ?? new Date(),
        note: pendingCommitment.name,
        merchant: pendingCommitment.name,
        kind: 'expense',
        source: 'commitment',
        commitmentId: pendingCommitment.id,
      }
    : undefined

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
          <div className="text-sm text-gray-500 dark:text-[#8A9BAA]">Outstanding</div>
          <div className="text-xl font-bold text-red-600">{formatCurrency(unpaidTotal)}</div>
          <div className="text-xs text-gray-400 dark:text-[#8A9BAA]">{unpaidCommitments.length} commitments</div>
        </div>
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
          <div className="text-sm text-gray-500 dark:text-[#8A9BAA]">Paid</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(paidTotal)}</div>
          <div className="text-xs text-gray-400 dark:text-[#8A9BAA]">{paidCommitments.length} commitments</div>
        </div>
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
          <div className="text-sm text-gray-500 dark:text-[#8A9BAA]">Upcoming</div>
          <div className="text-xl font-bold text-gray-800 dark:text-[#F0EDE4]">{upcoming.length}</div>
          <div className="text-xs text-gray-400 dark:text-[#8A9BAA]">Need attention</div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'unpaid', 'overdue', 'due_today', 'due_tomorrow', 'upcoming', 'paid'] as FilterType[]).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              filter === value
                ? 'bg-[#A89060] dark:bg-[#C4A86B] text-white'
                : 'bg-gray-100 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA] hover:bg-gray-200 dark:hover:bg-[#2E3A4E]'
            }`}
          >
            {value === 'all'
              ? 'All'
              : value === 'unpaid'
                ? 'Outstanding'
                : value === 'due_today'
                  ? 'Due Today'
                  : value === 'due_tomorrow'
                    ? 'Tomorrow'
                    : value === 'upcoming'
                      ? 'Upcoming'
                      : value === 'paid'
                        ? 'Paid'
                        : 'Overdue'}
          </button>
        ))}
      </div>

      {commitments.length === 0 ? (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-6 shadow text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4] mb-2">No Commitments</h3>
          <p className="text-gray-600 dark:text-[#8A9BAA] text-sm">
            Bills, debts, and subscriptions will appear here once they are created.
          </p>
        </div>
      ) : filteredCommitments.length === 0 ? (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-6 shadow text-center">
          <p className="text-gray-500 dark:text-[#8A9BAA]">No commitments match the current filter</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow divide-y dark:divide-[#2E3A4E]">
          {filteredCommitments.map((commitment) => {
            const isPaid = commitment.status === 'paid'
            const status = getStatus(commitment)
            const category = categories.find((entry) => entry.id === commitment.categoryId)
            const badge = STATUS_BADGES[status]

            return (
              <div key={commitment.id} className={`p-4 flex items-center gap-3 ${isPaid ? 'bg-gray-50 dark:bg-[#1E2330]' : ''}`}>
                <button
                  onClick={() => void togglePaid(commitment)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isPaid
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 dark:border-[#2E3A4E] hover:border-[#A89060]'
                  }`}
                >
                  {isPaid && '✓'}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isPaid ? 'text-gray-400 dark:text-[#8A9BAA] line-through' : 'text-gray-800 dark:text-[#F0EDE4]'}`}>
                      {commitment.name}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${badge.className}`}>{badge.label}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-[#8A9BAA] mt-0.5">
                    {category?.name || commitment.type}
                    {commitment.dueDate && <span className="ml-2">Due: {format(new Date(commitment.dueDate), 'd MMM')}</span>}
                  </div>
                </div>

                <div className={`text-right font-medium ${isPaid ? 'text-gray-400 dark:text-[#8A9BAA]' : 'text-gray-800 dark:text-[#F0EDE4]'}`}>
                  {formatCurrency(commitment.amount)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <TransactionModal
        key={pendingCommitment?.id}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setPendingCommitment(null)
        }}
        onSave={handleCommitmentTransactionSave}
        transaction={null}
        initialValues={modalInitialValues}
        categories={categories}
        items={[]}
        budgetMonthId={budgetMonth.id}
      />
    </div>
  )
}
