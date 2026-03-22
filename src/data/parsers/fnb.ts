import type { ParsedTransaction } from './types'
import { parseCSVLine, findColumnIndex, normalizeHeader, parseDate } from './helpers'

/**
 * FNB CSV format (typical export):
 * "Account Number","Description 1","Description 2","Description 3","Amount","Balance","Date"
 * or simplified:
 * Date,Description,Amount,Balance
 */
export function parseFNB(csvText: string): ParsedTransaction[] {
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  // Detect header row to find column indices
  const header = parseCSVLine(lines[0]).map(normalizeHeader)

  const dateIdx = findColumnIndex(header, ['date'])
  const amountIdx = findColumnIndex(header, ['amount'])
  const descIdx = findColumnIndex(header, ['description1', 'description', 'desc', 'narration'])
  const desc2Idx = findColumnIndex(header, ['description2', 'reference'])
  const balanceIdx = findColumnIndex(header, ['balance'])

  if (dateIdx === -1 || amountIdx === -1) return []

  const results: ParsedTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const dateStr = cols[dateIdx]?.trim()
    const amountStr = cols[amountIdx]?.trim().replace(/[,\s]/g, '')
    if (!dateStr || !amountStr) continue

    const date = parseDate(dateStr)
    if (!date) continue

    const amount = parseFloat(amountStr)
    if (isNaN(amount)) continue

    const description = [
      descIdx !== -1 ? cols[descIdx] : '',
      desc2Idx !== -1 ? cols[desc2Idx] : '',
    ]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(' | ')

    const balance = balanceIdx !== -1 ? parseFloat(cols[balanceIdx]?.replace(/[,\s]/g, '') ?? '') : undefined

    results.push({
      date,
      amount,
      description: description || 'Unknown',
      balance: isNaN(balance!) ? undefined : balance,
    })
  }

  return results
}
