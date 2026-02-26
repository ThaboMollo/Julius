import { budgetMonthRepo, budgetItemRepo, billTickRepo, transactionRepo } from '.'
import { effectivePlanned } from '../../domain/rules'

const MIGRATION_KEY = 'julius_bills_to_transactions_v1'

export async function migratePaidBillsToTransactions(): Promise<void> {
  if (localStorage.getItem(MIGRATION_KEY)) return

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

  localStorage.setItem(MIGRATION_KEY, '1')
}
