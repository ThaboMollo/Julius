import type { ParsedTransaction } from './types'
import { parseCSVLine, findColumnIndex, normalizeHeader, parseAmount, resolveDebitCredit, parseDate } from './helpers'

/**
 * Discovery Bank CSV format (typical export):
 * Date,Description,Debit,Credit,Balance,Reference
 */
export function parseDiscovery(csvText: string): ParsedTransaction[] {
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const header = parseCSVLine(lines[0]).map(normalizeHeader)

  const dateIdx = findColumnIndex(header, ['date', 'transactiondate'])
  const descIdx = findColumnIndex(header, ['description', 'desc', 'details', 'narrative'])
  const amountIdx = findColumnIndex(header, ['amount'])
  const debitIdx = findColumnIndex(header, ['debit', 'debitamount'])
  const creditIdx = findColumnIndex(header, ['credit', 'creditamount'])
  const balanceIdx = findColumnIndex(header, ['balance', 'availablebalance'])
  const refIdx = findColumnIndex(header, ['reference', 'ref', 'transactionreference'])

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

export function parseDiscoveryPdf(text: string): ParsedTransaction[] {
  const lines = text.split('\n')
  const results: ParsedTransaction[] = []

  for (const line of lines) {
    // Discovery PDF: "dd Mon yyyy Description Amount" or "yyyy-mm-dd Description Amount"
    const match = line.match(/(\d{1,2}\s[A-Za-z]{3}\s\d{4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+([-\d,.]+)\s*$/)
    if (!match) continue
    const date = parseDate(match[1])
    if (!date) continue
    results.push({ date, amount: parseAmount(match[3]), description: match[2].trim() })
  }

  return results
}
