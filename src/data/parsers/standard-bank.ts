import type { ParsedTransaction } from './types'

/**
 * Standard Bank CSV format (typical export):
 * Date,Description,Amount,Balance
 * or:
 * Transaction Date,Transaction Type,Description,Debit Amount,Credit Amount,Running Balance
 */
export function parseStandardBank(csvText: string): ParsedTransaction[] {
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''))

  const dateIdx = findIndex(header, ['transactiondate', 'date'])
  const descIdx = findIndex(header, ['description', 'transactiondescription', 'desc', 'transactiontype'])
  const amountIdx = findIndex(header, ['amount', 'transactionamount'])
  const debitIdx = findIndex(header, ['debitamount', 'debit'])
  const creditIdx = findIndex(header, ['creditamount', 'credit'])
  const balanceIdx = findIndex(header, ['runningbalance', 'balance'])
  const refIdx = findIndex(header, ['reference', 'ref'])

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
      amount = parseFloat(cols[amountIdx]?.replace(/[,\sR]/g, '') ?? '0') || 0
    } else {
      const debit = parseFloat(cols[debitIdx]?.replace(/[,\sR]/g, '') ?? '0') || 0
      const credit = parseFloat(cols[creditIdx]?.replace(/[,\sR]/g, '') ?? '0') || 0
      amount = credit > 0 ? credit : -debit
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

function parseDate(s: string): Date | null {
  const clean = s.replace(/['"]/g, '').trim()
  const m1 = clean.match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/)
  if (m1) return new Date(parseInt(m1[1]), parseInt(m1[2]) - 1, parseInt(m1[3]))
  const m2 = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m2) return new Date(parseInt(m2[3]), parseInt(m2[2]) - 1, parseInt(m2[1]))
  const m3 = clean.match(/^(\d{1,2})\s([A-Za-z]{3})\s(\d{4})$/)
  if (m3) return new Date(`${m3[2]} ${m3[1]}, ${m3[3]}`)
  const fallback = new Date(clean)
  return isNaN(fallback.getTime()) ? null : fallback
}

function findIndex(header: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = header.indexOf(c)
    if (idx !== -1) return idx
  }
  return -1
}

function parseCSVLine(line: string): string[] {
  const cols: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      cols.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cols.push(current)
  return cols
}
