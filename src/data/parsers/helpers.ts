/**
 * Shared parsing helpers used by all bank CSV and PDF parsers.
 * Extracted from duplicated code across fnb.ts, capitec.ts, standard-bank.ts, discovery.ts, absa.ts.
 */

/** Parse a quoted CSV line into columns, handling commas inside quotes. */
export function parseCSVLine(line: string): string[] {
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

/** Find the first matching column index from a list of candidate header names. */
export function findColumnIndex(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.indexOf(c)
    if (idx !== -1) return idx
  }
  return -1
}

/** Normalize a header string: lowercase, strip quotes, remove non-alphanumeric. */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Strip currency symbols, spaces, and parse as float. Returns 0 if unparseable. */
export function parseAmount(value: string): number {
  return parseFloat(value?.replace(/[,\sR]/g, '') ?? '0') || 0
}

/** Resolve split debit/credit columns into a single signed amount. */
export function resolveDebitCredit(debitStr: string, creditStr: string): number {
  const debit = parseAmount(debitStr)
  const credit = parseAmount(creditStr)
  return credit > 0 ? credit : -debit
}

/**
 * Parse a date string. Handles:
 * - yyyy/mm/dd or yyyy-mm-dd
 * - dd/mm/yyyy
 * - dd MMM yyyy (e.g. "15 Jan 2026")
 * Returns null if unparseable.
 */
export function parseDate(s: string): Date | null {
  const clean = s.replace(/['"]/g, '').trim()

  // yyyy/mm/dd or yyyy-mm-dd
  const m1 = clean.match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/)
  if (m1) return new Date(parseInt(m1[1]), parseInt(m1[2]) - 1, parseInt(m1[3]))

  // dd/mm/yyyy
  const m2 = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m2) return new Date(parseInt(m2[3]), parseInt(m2[2]) - 1, parseInt(m2[1]))

  // dd MMM yyyy
  const m3 = clean.match(/^(\d{1,2})\s([A-Za-z]{3})\s(\d{4})$/)
  if (m3) return new Date(`${m3[2]} ${m3[1]}, ${m3[3]}`)

  const fallback = new Date(clean)
  return isNaN(fallback.getTime()) ? null : fallback
}
