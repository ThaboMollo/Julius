import { budgetMonthRepo, budgetItemRepo, billTickRepo, commitmentRepo, transactionRepo } from '.'
import { effectivePlanned } from '../../domain/rules'

const PAID_BILLS_TO_TRANSACTIONS_KEY = 'julius_bills_to_transactions_v1'
const LEGACY_BILLS_TO_COMMITMENTS_KEY = 'julius_legacy_bills_to_commitments_v1'

export async function migratePaidBillsToTransactions(): Promise<void> {
  if (localStorage.getItem(PAID_BILLS_TO_TRANSACTIONS_KEY)) return

  const months = await budgetMonthRepo.getAll()

  for (const month of months) {
    const ticks = await billTickRepo.getByMonth(month.id)
    const paidTicks = ticks.filter((t) => t.isPaid)

    for (const tick of paidTicks) {
      const item = await budgetItemRepo.getById(tick.budgetItemId)
      if (!item) continue

      const existing = await transactionRepo.getByItem(item.id)
      const alreadyRecorded = existing.some((tx) => tx.budgetMonthId === month.id)
      if (alreadyRecorded) continue

      await transactionRepo.create({
        budgetMonthId: month.id,
        categoryId: item.categoryId,
        budgetItemId: item.id,
        amount: effectivePlanned(item),
        date: tick.paidAt ?? item.dueDate ?? new Date(month.year, month.month - 1, 1),
        note: item.name,
      })
    }
  }

  localStorage.setItem(PAID_BILLS_TO_TRANSACTIONS_KEY, '1')
}

export async function migrateLegacyBillsToCommitments(): Promise<void> {
  if (localStorage.getItem(LEGACY_BILLS_TO_COMMITMENTS_KEY)) return

  const months = await budgetMonthRepo.getAll()

  for (const month of months) {
    const [items, ticks] = await Promise.all([
      budgetItemRepo.getBillsByMonth(month.id),
      billTickRepo.getByMonth(month.id),
    ])

    for (const item of items) {
      const existingCommitment = await commitmentRepo.getByLegacyBudgetItemId(item.id)
      if (existingCommitment) {
        continue
      }

      const tick = ticks.find((entry) => entry.budgetItemId === item.id)
      const linkedTransactions = await transactionRepo.getByItem(item.id)
      const monthTransaction = linkedTransactions.find((tx) => tx.budgetMonthId === month.id)

      const createdCommitment = await commitmentRepo.create({
        budgetMonthId: month.id,
        categoryId: item.categoryId,
        name: item.name,
        amount: effectivePlanned(item),
        dueDate: item.dueDate,
        type: 'bill',
        status: tick?.isPaid ? 'paid' : 'upcoming',
        isRecurring: item.isFromTemplate,
        templateId: item.templateId,
        paidTransactionId: monthTransaction?.id ?? null,
        legacyBudgetItemId: item.id,
        notes: '',
      })

      if (monthTransaction && !monthTransaction.commitmentId) {
        await transactionRepo.update(monthTransaction.id, {
          commitmentId: createdCommitment.id,
          source: monthTransaction.source ?? 'commitment',
        })
      }
    }
  }

  localStorage.setItem(LEGACY_BILLS_TO_COMMITMENTS_KEY, '1')
}

export async function initializeLocalData(): Promise<void> {
  await migratePaidBillsToTransactions()
  await migrateLegacyBillsToCommitments()
}
