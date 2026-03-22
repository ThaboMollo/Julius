# PDF Bank Statement Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PDF bank statement parsing alongside existing CSV support for all 5 SA banks, with multi-file upload and deduplication.

**Architecture:** Shared parser helpers extracted from duplicated code, `pdfjs-dist` for client-side PDF text extraction (lazy-loaded), per-bank PDF parsers alongside existing CSV parsers, unified `parseStatement()` function for both upload sites.

**Tech Stack:** pdfjs-dist (Mozilla pdf.js), React 19, TypeScript, Vite

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/data/parsers/helpers.ts` | Shared `parseCSVLine`, `parseDate`, `parseAmount`, `findColumnIndex`, `normalizeHeader` |
| `src/data/parsers/pdf.ts` | `extractTextFromPdf()` using lazy-loaded pdfjs-dist |

### Modified Files

| File | Change |
|------|--------|
| `src/data/parsers/fnb.ts` | Add `parseFNBPdf()`, refactor to use shared helpers |
| `src/data/parsers/capitec.ts` | Add `parseCapitecPdf()`, refactor to use shared helpers |
| `src/data/parsers/standard-bank.ts` | Add `parseStandardBankPdf()`, refactor to use shared helpers |
| `src/data/parsers/discovery.ts` | Add `parseDiscoveryPdf()`, refactor to use shared helpers |
| `src/data/parsers/absa.ts` | Add `parseABSAPdf()`, refactor to use shared helpers |
| `src/data/parsers/index.ts` | Add `format` param, `parseStatement()`, deduplication |
| `src/pages/settings/BankAccountsSection.tsx` | Multi-file upload, accept PDF, use `parseStatement()` |
| `src/pages/check-in/CheckInPage.tsx` | Multi-file upload, accept PDF, use `parseStatement()` |
| `package.json` | Add `pdfjs-dist` dependency |

---

## Task 1: Install pdfjs-dist

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

Check if the project uses npm or yarn (look for yarn.lock or package-lock.json), then install accordingly:

```bash
npm install pdfjs-dist
```

- [ ] **Step 2: Verify it installed**

```bash
ls node_modules/pdfjs-dist/package.json
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pdfjs-dist dependency for PDF bank statement parsing"
```

---

## Task 2: Shared Parser Helpers

**Files:**
- Create: `src/data/parsers/helpers.ts`

- [ ] **Step 1: Create the helpers file**

Create `src/data/parsers/helpers.ts`:

```typescript
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
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/data/parsers/helpers.ts
git commit -m "feat(parsers): extract shared helpers from duplicated bank parser code"
```

---

## Task 3: Refactor Existing CSV Parsers to Use Shared Helpers

**Files:**
- Modify: `src/data/parsers/fnb.ts`
- Modify: `src/data/parsers/capitec.ts`
- Modify: `src/data/parsers/standard-bank.ts`
- Modify: `src/data/parsers/discovery.ts`
- Modify: `src/data/parsers/absa.ts`

- [ ] **Step 1: Refactor all 5 bank parsers**

For each of the 5 bank parser files:

1. Add import at top: `import { parseCSVLine, findColumnIndex, normalizeHeader, parseAmount, resolveDebitCredit, parseDate } from './helpers'`
2. Remove the local `parseCSVLine` function (identical in all 5)
3. Remove the local `findIndex` function (identical in all 5) — replace all calls with `findColumnIndex`
4. Remove the local date parsing function and replace calls with shared `parseDate`:
   - **FNB:** remove `parseFNBDate` — the shared `parseDate` handles all 4 of FNB's formats
   - **Capitec, Standard Bank, Discovery, ABSA:** remove their local `parseDate` — identical to the shared version
5. Replace inline `header.toLowerCase().replace(...)` with `normalizeHeader(header)`
6. Replace inline `parseFloat(cols[idx]?.replace(/[,\sR]/g, '') ?? '0') || 0` with `parseAmount(cols[idx])`
7. Replace inline debit/credit resolution blocks with `resolveDebitCredit(cols[debitIdx], cols[creditIdx])`

**Important:** The existing CSV parsing logic (column detection, bank-specific description handling) must remain unchanged. Only the helper function calls change.

**FNB special case:** FNB's `parseFNBDate` has an extra date format (`dd MMM yyyy` with specific regex). The shared `parseDate` already handles all these formats, so the replacement is safe.

- [ ] **Step 2: Verify CSV parsing still works**

Run: `npx tsc --noEmit`
Expected: Zero errors. Existing CSV parsing behavior is unchanged — only the source of helper functions changed.

- [ ] **Step 3: Commit**

```bash
git add src/data/parsers/fnb.ts src/data/parsers/capitec.ts src/data/parsers/standard-bank.ts src/data/parsers/discovery.ts src/data/parsers/absa.ts
git commit -m "refactor(parsers): use shared helpers in all 5 bank CSV parsers"
```

---

## Task 4: PDF Text Extraction Utility

**Files:**
- Create: `src/data/parsers/pdf.ts`

- [ ] **Step 1: Create the PDF extraction module**

Create `src/data/parsers/pdf.ts`:

```typescript
export interface PdfExtractionResult {
  text: string
  pageCount: number
}

export class PdfPasswordRequired extends Error {
  constructor() {
    super('This PDF is password-protected. Please enter the password.')
    this.name = 'PdfPasswordRequired'
  }
}

export class PdfScannedImage extends Error {
  constructor() {
    super('This PDF appears to be a scanned image. Please download your bank\'s digital/text-based PDF statement.')
    this.name = 'PdfScannedImage'
  }
}

const MIN_TEXT_LENGTH = 50

export async function extractTextFromPdf(file: File, password?: string): Promise<string> {
  // Lazy-load pdfjs-dist to keep initial bundle small (~1.5MB only loaded when needed)
  const pdfjsLib = await import('pdfjs-dist')

  // Configure worker for Vite
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString()

  const arrayBuffer = await file.arrayBuffer()

  let pdf
  try {
    pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password ?? undefined,
    }).promise
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'PasswordException') {
      throw new PdfPasswordRequired()
    }
    throw new Error(`Could not read ${file.name}. Make sure it's a valid PDF.`)
  }

  const lines: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .filter((item): item is { str: string } => 'str' in item)
      .map((item) => item.str)
      .join(' ')
    if (pageText.trim()) {
      lines.push(pageText)
    }
  }

  const fullText = lines.join('\n')

  // Detect scanned/image PDFs
  if (fullText.length < MIN_TEXT_LENGTH) {
    throw new PdfScannedImage()
  }

  return fullText
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/data/parsers/pdf.ts
git commit -m "feat(parsers): add PDF text extraction utility with password and scanned PDF support"
```

---

## Task 5: Per-Bank PDF Parsers

**Files:**
- Modify: `src/data/parsers/fnb.ts`
- Modify: `src/data/parsers/capitec.ts`
- Modify: `src/data/parsers/standard-bank.ts`
- Modify: `src/data/parsers/discovery.ts`
- Modify: `src/data/parsers/absa.ts`

- [ ] **Step 1: Add PDF parsers to all 5 bank files**

Each bank file gets a new exported function. The PDF parser:
1. Splits the extracted text into lines
2. Finds the transaction table by looking for date-like patterns at the start of lines
3. Parses each transaction line using bank-specific regex
4. Returns `ParsedTransaction[]`

**Add to `src/data/parsers/fnb.ts`:**

```typescript
export function parseFNBPdf(text: string): ParsedTransaction[] {
  const lines = text.split('\n')
  const results: ParsedTransaction[] = []

  for (const line of lines) {
    // FNB PDF lines typically: "dd Mon yyyy Description Amount Balance"
    // Match lines starting with a date pattern
    const match = line.match(/^(\d{1,2}\s[A-Za-z]{3}\s\d{4})\s+(.+?)\s+([-\d,.]+)\s*$/)
    if (!match) {
      // Try: "dd Mon yyyy Description Debit Credit Balance"
      const match2 = line.match(/^(\d{1,2}\s[A-Za-z]{3}\s\d{4})\s+(.+?)\s+([-\d,.]+)\s+([-\d,.]*)\s+([-\d,.]+)\s*$/)
      if (match2) {
        const date = parseDate(match2[1])
        if (!date) continue
        const description = match2[2].trim()
        const debit = parseAmount(match2[3])
        const credit = parseAmount(match2[4])
        const amount = credit > 0 ? credit : -debit
        const balance = parseAmount(match2[5])
        results.push({ date, amount, description, balance: balance || undefined })
        continue
      }
      continue
    }
    const date = parseDate(match[1])
    if (!date) continue
    const description = match[2].trim()
    const amount = parseAmount(match[3])
    results.push({ date, amount, description })
  }

  return results
}
```

**Add to `src/data/parsers/capitec.ts`:**

```typescript
export function parseCapitecPdf(text: string): ParsedTransaction[] {
  const lines = text.split('\n')
  const results: ParsedTransaction[] = []

  for (const line of lines) {
    // Capitec PDF: "yyyy/mm/dd Description Amount"
    const match = line.match(/^(\d{4}\/\d{2}\/\d{2})\s+(.+?)\s+([-\d,.]+)\s*$/)
    if (!match) {
      // Also try: "dd/mm/yyyy Description Amount"
      const match2 = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-\d,.]+)\s*$/)
      if (match2) {
        const date = parseDate(match2[1])
        if (!date) continue
        const amount = parseAmount(match2[3])
        results.push({ date, amount, description: match2[2].trim() })
        continue
      }
      continue
    }
    const date = parseDate(match[1])
    if (!date) continue
    const amount = parseAmount(match[3])
    results.push({ date, amount, description: match[2].trim() })
  }

  return results
}
```

**Add to `src/data/parsers/standard-bank.ts`:**

```typescript
export function parseStandardBankPdf(text: string): ParsedTransaction[] {
  const lines = text.split('\n')
  const results: ParsedTransaction[] = []

  for (const line of lines) {
    // Standard Bank PDF: "dd/mm/yyyy Description Amount Balance"
    const match = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-\d,.]+)\s+([-\d,.]+)\s*$/)
    if (!match) {
      // Without balance
      const match2 = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-\d,.]+)\s*$/)
      if (match2) {
        const date = parseDate(match2[1])
        if (!date) continue
        results.push({ date, amount: parseAmount(match2[3]), description: match2[2].trim() })
        continue
      }
      continue
    }
    const date = parseDate(match[1])
    if (!date) continue
    results.push({ date, amount: parseAmount(match[3]), description: match[2].trim(), balance: parseAmount(match[4]) || undefined })
  }

  return results
}
```

**Add to `src/data/parsers/discovery.ts`:**

```typescript
export function parseDiscoveryPdf(text: string): ParsedTransaction[] {
  const lines = text.split('\n')
  const results: ParsedTransaction[] = []

  for (const line of lines) {
    // Discovery PDF: "dd Mon yyyy Description Amount"
    const match = line.match(/^(\d{1,2}\s[A-Za-z]{3}\s\d{4})\s+(.+?)\s+([-\d,.]+)\s*$/)
    if (!match) {
      // Also try yyyy-mm-dd format
      const match2 = line.match(/^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([-\d,.]+)\s*$/)
      if (match2) {
        const date = parseDate(match2[1])
        if (!date) continue
        results.push({ date, amount: parseAmount(match2[3]), description: match2[2].trim() })
        continue
      }
      continue
    }
    const date = parseDate(match[1])
    if (!date) continue
    results.push({ date, amount: parseAmount(match[3]), description: match[2].trim() })
  }

  return results
}
```

**Add to `src/data/parsers/absa.ts`:**

```typescript
export function parseABSAPdf(text: string): ParsedTransaction[] {
  const lines = text.split('\n')
  const results: ParsedTransaction[] = []

  for (const line of lines) {
    // ABSA PDF: "dd/mm/yyyy Description Amount Balance"
    const match = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-\d,.]+)\s+([-\d,.]+)\s*$/)
    if (!match) {
      // Without balance
      const match2 = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-\d,.]+)\s*$/)
      if (match2) {
        const date = parseDate(match2[1])
        if (!date) continue
        results.push({ date, amount: parseAmount(match2[3]), description: match2[2].trim() })
        continue
      }
      continue
    }
    const date = parseDate(match[1])
    if (!date) continue
    results.push({ date, amount: parseAmount(match[3]), description: match[2].trim(), balance: parseAmount(match[4]) || undefined })
  }

  return results
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/data/parsers/fnb.ts src/data/parsers/capitec.ts src/data/parsers/standard-bank.ts src/data/parsers/discovery.ts src/data/parsers/absa.ts
git commit -m "feat(parsers): add PDF parser functions to all 5 bank parsers"
```

---

## Task 6: Router — Format Detection, parseStatement, Deduplication

**Files:**
- Modify: `src/data/parsers/index.ts`

- [ ] **Step 1: Rewrite the router**

Replace the entire content of `src/data/parsers/index.ts`:

```typescript
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
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/data/parsers/index.ts
git commit -m "feat(parsers): add format detection, parseStatement, and deduplication to router"
```

---

## Task 7: Update BankAccountsSection for Multi-File PDF Upload

**Files:**
- Modify: `src/pages/settings/BankAccountsSection.tsx`

- [ ] **Step 1: Update the upload handler and file input**

Changes to make:

1. Update import from parsers:
   - Remove: `import { getParserForBank } from '../../data/parsers'`
   - Add: `import { parseStatement, PdfPasswordRequired, PdfScannedImage } from '../../data/parsers'`

2. Rename `handleCSVUpload` to `handleUpload` and change signature from `(bank: BankConfig, file: File)` to `(bank: BankConfig, files: File[])`:

```typescript
  async function handleUpload(bank: BankConfig, files: File[]) {
    try {
      const result = await parseStatement(bank, files)

      if (result.errors.length > 0) {
        // Show warnings for individual file failures but continue
        alert(`Warning: ${result.errors.map((e) => e.message).join('\n')}`)
      }

      const parsed = result.transactions
      if (parsed.length === 0) {
        alert('No transactions found in the uploaded files. Please check the file format.')
        return
      }

      // Rest of the handler stays the same — from computing dates through to reconciliation
      const dates = parsed.map((p) => new Date(p.date).getTime())
      // ... (existing code continues unchanged)
```

3. Update the `BankCard` file input:
   - Change `accept=".csv"` to `accept=".csv,.pdf"`
   - Add `multiple` attribute
   - Change `onChange` from passing single file to passing file array:
     ```typescript
     onChange={(e) => {
       const files = e.target.files
       if (files && files.length > 0) onUpload(bank, Array.from(files))
     }}
     ```

4. Update the `onUpload` prop type to accept `File[]` instead of `File`

5. Update the `statementUploadRepo.create` call — `filename` should join multiple filenames: `files.map(f => f.name).join(', ')`

- [ ] **Step 2: Handle password-protected PDFs**

Add state for PDF password prompt:

```typescript
const [pdfPasswordPrompt, setPdfPasswordPrompt] = useState<{ bank: BankConfig; files: File[] } | null>(null)
const [pdfPassword, setPdfPassword] = useState('')
```

In `handleUpload`, catch `PdfPasswordRequired`:

```typescript
    } catch (err) {
      if (err instanceof PdfPasswordRequired) {
        setPdfPasswordPrompt({ bank, files })
        return
      }
      if (err instanceof PdfScannedImage) {
        alert(err.message)
        return
      }
      const msg = err instanceof Error ? err.message : 'Failed to process files.'
      alert(`Upload error: ${msg}`)
    }
```

Add a simple password prompt UI (modal or inline) that retries with `parseStatement(bank, files, pdfPassword)`.

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/pages/settings/BankAccountsSection.tsx
git commit -m "feat(parsers): update BankAccountsSection for multi-file PDF upload"
```

---

## Task 8: Update CheckInPage for Multi-File PDF Upload

**Files:**
- Modify: `src/pages/check-in/CheckInPage.tsx`

- [ ] **Step 1: Update imports and file handling**

1. Update imports:
   - Remove: `import { getParserForBank } from '../../data/parsers'`
   - Remove: `import type { ParsedTransaction } from '../../data/parsers/types'`
   - Add: `import { parseStatement, PdfPasswordRequired, PdfScannedImage } from '../../data/parsers'`
   - (Note: `ParsedTransaction` is already re-exported from `'../../data/parsers'` via `index.ts` — import from there if needed elsewhere in the file)

2. Update file input (in the upload JSX):
   - Change `accept=".csv"` to `accept=".csv,.pdf"`
   - Add `multiple` attribute
   - Change label from "Bank Statement (CSV)" to "Bank Statement (CSV or PDF)"

3. Update error message on line ~157: "Please select a CSV file" → "Please select a bank statement file"

4. Replace the inline parse logic in `handleUpload`:

**Before (lines ~168-185):**
```typescript
      const csvText = await file.text()
      let parsed: ParsedTransaction[]
      try {
        const parser = getParserForBank(bank.bankCode)
        parsed = parser(csvText)
      } catch {
        setError(`Failed to parse CSV. Make sure you selected the correct bank (${bank.bankName}).`)
        setPageState('upload')
        return
      }
```

**After:**
```typescript
      const files = Array.from(fileRef.current.files)
      let result
      try {
        result = await parseStatement(bank, files, pdfPassword)
      } catch (err) {
        if (err instanceof PdfPasswordRequired) {
          setPdfPasswordPrompt({ bank, files })
          setPageState('upload')
          return
        }
        if (err instanceof PdfScannedImage) {
          setError(err.message)
          setPageState('upload')
          return
        }
        setError(`Failed to parse files. Make sure you selected the correct bank (${bank.bankName}).`)
        setPageState('upload')
        return
      }

      // Check-in aborts on any failure (unlike Settings which continues)
      if (result.errors.length > 0) {
        setError(result.errors.map((e) => e.message).join('\n'))
        setPageState('upload')
        return
      }

      const parsed = result.transactions
```

5. Update the file selection validation:
```typescript
      const files = fileRef.current?.files
      if (!files || files.length === 0) { setError('Please select a bank statement file.'); return }
```

6. Add state for PDF password:
```typescript
  const [pdfPassword, setPdfPassword] = useState('')
  const [pdfPasswordPrompt, setPdfPasswordPrompt] = useState<{ bank: BankConfig; files: File[] } | null>(null)
```

7. Add a simple password prompt UI in the upload state, similar to BankAccountsSection.

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/pages/check-in/CheckInPage.tsx
git commit -m "feat(parsers): update CheckInPage for multi-file PDF upload"
```

---

## Task 9: Final Verification

- [ ] **Step 1: TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: Build succeeds (chunk size warning for pdfjs-dist is expected and acceptable)

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "feat(parsers): complete PDF bank statement support"
```
