import { differenceInDays } from 'date-fns'
import type { Transaction } from '../models'
import type { ParsedTransaction } from '../../data/parsers/types'

export interface ReconciliationResult {
  matched: ParsedTransaction[]
  missingFromJulius: ParsedTransaction[]
  inJuliusNotInBank: Transaction[]
}

const AMOUNT_TOLERANCE = 5   // ±R5
const DATE_TOLERANCE = 2     // ±2 days

/**
 * Match bank transactions against Julius transactions.
 * Match criteria: same amount (±R5) AND date (±2 days).
 */
export function reconcile(
  bankTransactions: ParsedTransaction[],
  juliusTransactions: Transaction[]
): ReconciliationResult {
  const matchedBankIndices = new Set<number>()
  const matchedJuliusIds = new Set<string>()

  const matched: ParsedTransaction[] = []

  for (let bi = 0; bi < bankTransactions.length; bi++) {
    const bank = bankTransactions[bi]
    const bankAbs = Math.abs(bank.amount)

    for (const julius of juliusTransactions) {
      if (matchedJuliusIds.has(julius.id)) continue

      const juliusDate = new Date(julius.date)
      const bankDate = new Date(bank.date)
      const dayDiff = Math.abs(differenceInDays(juliusDate, bankDate))

      if (dayDiff > DATE_TOLERANCE) continue

      const amountDiff = Math.abs(bankAbs - julius.amount)
      if (amountDiff > AMOUNT_TOLERANCE) continue

      // Match found
      matched.push(bank)
      matchedBankIndices.add(bi)
      matchedJuliusIds.add(julius.id)
      break
    }
  }

  const missingFromJulius = bankTransactions.filter(
    (_, idx) => !matchedBankIndices.has(idx) && bankTransactions[idx].amount < 0
  )

  const inJuliusNotInBank = juliusTransactions.filter(
    (tx) => !matchedJuliusIds.has(tx.id)
  )

  return { matched, missingFromJulius, inJuliusNotInBank }
}
