import type { BankConfig } from '../../domain/models'
import type { ParsedTransaction } from './types'
import { parseFNB, parseFNBPdf } from './fnb'
import { parseCapitec, parseCapitecPdf } from './capitec'
import { parseStandardBank, parseStandardBankPdf } from './standard-bank'
import { parseDiscovery, parseDiscoveryPdf } from './discovery'
import { parseABSA, parseABSAPdf } from './absa'
import { extractTextFromPdf, PdfPasswordRequired, PdfScannedImage } from './pdf'

export type { ParsedTransaction }
export { PdfPasswordRequired, PdfScannedImage }

type ParserFn = (text: string) => ParsedTransaction[]

export function getParserForBank(
  bankCode: BankConfig['bankCode'],
  format: 'csv' | 'pdf' = 'csv'
): ParserFn {
  const parsers: Record<BankConfig['bankCode'], { csv: ParserFn; pdf: ParserFn }> = {
    fnb: { csv: parseFNB, pdf: parseFNBPdf },
    capitec: { csv: parseCapitec, pdf: parseCapitecPdf },
    standard_bank: { csv: parseStandardBank, pdf: parseStandardBankPdf },
    discovery: { csv: parseDiscovery, pdf: parseDiscoveryPdf },
    absa: { csv: parseABSA, pdf: parseABSAPdf },
  }

  const bank = parsers[bankCode]
  if (!bank) throw new Error(`No parser for bank code: ${bankCode}`)
  return bank[format]
}

function detectFormat(filename: string): 'csv' | 'pdf' {
  return filename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'csv'
}

function deduplicateTransactions(transactions: ParsedTransaction[]): ParsedTransaction[] {
  const seen = new Set<string>()
  return transactions.filter((tx) => {
    const dateKey = tx.date.toISOString().slice(0, 10)
    const amountKey = Math.round(tx.amount * 100)
    const descKey = tx.description.trim().toLowerCase()
    const key = `${dateKey}|${amountKey}|${descKey}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export interface ParseStatementResult {
  transactions: ParsedTransaction[]
  errors: { filename: string; message: string }[]
}

/**
 * Parse one or more bank statement files (CSV or PDF, any mix).
 * Returns merged, deduplicated transactions and any per-file errors.
 */
export async function parseStatement(
  bank: BankConfig,
  files: File[],
  pdfPassword?: string
): Promise<ParseStatementResult> {
  const allTransactions: ParsedTransaction[] = []
  const errors: { filename: string; message: string }[] = []

  if (!files || !Array.isArray(files) || files.length === 0) {
    return { transactions: [], errors: [{ filename: '(none)', message: 'No files provided.' }] }
  }

  for (const file of files) {
    try {
      const format = detectFormat(file.name)
      let text: string

      if (format === 'pdf') {
        text = await extractTextFromPdf(file, pdfPassword)
      } else {
        text = await file.text()
      }

      const parser = getParserForBank(bank.bankCode, format)
      const parsed = parser(text)

      if (parsed.length === 0) {
        errors.push({ filename: file.name, message: `No transactions found in ${file.name}.` })
        continue
      }

      allTransactions.push(...parsed)
    } catch (err) {
      if (err instanceof PdfPasswordRequired) throw err // Bubble up for UI to handle
      if (err instanceof PdfScannedImage) throw err     // Bubble up for UI to handle
      const msg = err instanceof Error ? err.message : `Failed to parse ${file.name}.`
      errors.push({ filename: file.name, message: msg })
    }
  }

  return {
    transactions: deduplicateTransactions(allTransactions),
    errors,
  }
}
