import type { ParsedTransaction } from './types'

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
  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''))

  const dateIdx = findIndex(header, ['date'])
  const amountIdx = findIndex(header, ['amount'])
  const descIdx = findIndex(header, ['description1', 'description', 'desc', 'narration'])
  const desc2Idx = findIndex(header, ['description2', 'reference'])
  const balanceIdx = findIndex(header, ['balance'])

  if (dateIdx === -1 || amountIdx === -1) return []

  const results: ParsedTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const dateStr = cols[dateIdx]?.trim()
    const amountStr = cols[amountIdx]?.trim().replace(/[,\s]/g, '')
    if (!dateStr || !amountStr) continue

    const date = parseFNBDate(dateStr)
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

function parseFNBDate(s: string): Date | null {
  // FNB uses formats: "01 Jan 2025", "2025/01/01", "01/01/2025"
  const clean = s.replace(/['"]/g, '').trim()

  // dd MMM yyyy
  const match1 = clean.match(/^(\d{1,2})\s([A-Za-z]{3})\s(\d{4})$/)
  if (match1) {
    return new Date(`${match1[2]} ${match1[1]}, ${match1[3]}`)
  }

  // yyyy/mm/dd or yyyy-mm-dd
  const match2 = clean.match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/)
  if (match2) {
    return new Date(parseInt(match2[1]), parseInt(match2[2]) - 1, parseInt(match2[3]))
  }

  // dd/mm/yyyy
  const match3 = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (match3) {
    return new Date(parseInt(match3[2]) - 1 === parseInt(match3[1]) ? parseInt(match3[2]) : parseInt(match3[2]) - 1 + 1,
      parseInt(match3[1]) - 1,
      parseInt(match3[0]))
  }

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
