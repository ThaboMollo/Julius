import type { ParsedTransaction } from './types'
import { parseCSVLine, findColumnIndex, normalizeHeader, parseAmount, resolveDebitCredit, parseDate } from './helpers'

/**
 * ABSA CSV format (typical export):
 * Date,Summary,Debit Amount,Credit Amount,Balance
 * or:
 * "Date","Description","Debit","Credit","Balance"
 */
export function parseABSA(csvText: string): ParsedTransaction[] {
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const header = parseCSVLine(lines[0]).map(normalizeHeader)

  const dateIdx = findColumnIndex(header, ['date', 'transactiondate'])
  const descIdx = findColumnIndex(header, ['summary', 'description', 'desc', 'details', 'narrative'])
  const amountIdx = findColumnIndex(header, ['amount'])
  const debitIdx = findColumnIndex(header, ['debitamount', 'debit'])
  const creditIdx = findColumnIndex(header, ['creditamount', 'credit'])
  const balanceIdx = findColumnIndex(header, ['balance'])
  const refIdx = findColumnIndex(header, ['reference', 'ref'])

  if (dateIdx === -1) return []

  const results: ParsedTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const dateStr = cols[dateIdx]?.trim()
    if (!dateStr) continue

    const date = parseDate(dateStr)
    if (!date) continue

    let amount: number
    if (amountIdx !== -1) {
      amount = parseAmount(cols[amountIdx])
    } else {
      amount = resolveDebitCredit(cols[debitIdx], cols[creditIdx])
    }

    const description = cols[descIdx]?.trim() || 'Unknown'
    const reference = refIdx !== -1 ? cols[refIdx]?.trim() : undefined
    const balance = balanceIdx !== -1
      ? parseFloat(cols[balanceIdx]?.replace(/[,\sR]/g, '') ?? '')
      : undefined

    results.push({
      date,
      amount,
      description,
      reference: reference || undefined,
      balance: isNaN(balance!) ? undefined : balance,
    })
  }

  return results
}
