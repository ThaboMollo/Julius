import type { ParsedTransaction } from './types'
import { parseCSVLine, findColumnIndex, normalizeHeader, parseAmount, resolveDebitCredit, parseDate } from './helpers'

/**
 * Standard Bank CSV format (typical export):
 * Date,Description,Amount,Balance
 * or:
 * Transaction Date,Transaction Type,Description,Debit Amount,Credit Amount,Running Balance
 */
export function parseStandardBank(csvText: string): ParsedTransaction[] {
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const header = parseCSVLine(lines[0]).map(normalizeHeader)

  const dateIdx = findColumnIndex(header, ['transactiondate', 'date'])
  const descIdx = findColumnIndex(header, ['description', 'transactiondescription', 'desc', 'transactiontype'])
  const amountIdx = findColumnIndex(header, ['amount', 'transactionamount'])
  const debitIdx = findColumnIndex(header, ['debitamount', 'debit'])
  const creditIdx = findColumnIndex(header, ['creditamount', 'credit'])
  const balanceIdx = findColumnIndex(header, ['runningbalance', 'balance'])
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

export function parseStandardBankPdf(text: string): ParsedTransaction[] {
  const lines = text.split('\n')
  const results: ParsedTransaction[] = []

  for (const line of lines) {
    // Standard Bank PDF: "dd/mm/yyyy Description Amount Balance"
    const match = line.match(/(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-\d,.]+)\s+([-\d,.]+)\s*$/)
    if (match) {
      const date = parseDate(match[1])
      if (!date) continue
      results.push({ date, amount: parseAmount(match[3]), description: match[2].trim(), balance: parseAmount(match[4]) || undefined })
      continue
    }
    // Without balance
    const match2 = line.match(/(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-\d,.]+)\s*$/)
    if (match2) {
      const date = parseDate(match2[1])
      if (!date) continue
      results.push({ date, amount: parseAmount(match2[3]), description: match2[2].trim() })
    }
  }

  return results
}
