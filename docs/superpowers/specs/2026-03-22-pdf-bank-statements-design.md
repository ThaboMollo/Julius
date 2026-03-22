# PDF Bank Statement Support — Feature Design Spec

## Overview

Add PDF bank statement parsing alongside existing CSV support. Users can upload `.csv` or `.pdf` files (or a mix of both), from any of the 5 supported SA banks. Multiple files per bank in a single upload, with deduplication. No AI involved — dedicated per-bank parsers using `pdf.js` for text extraction.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PDF text extraction | `pdfjs-dist` (Mozilla pdf.js), client-side | Offline-first PWA, no server needed, well-maintained |
| Parser architecture | Unified per-bank files (CSV + PDF in same file) | Bank knowledge stays together, fewer files |
| Format detection | By file extension at upload site | Simple, reliable, no magic bytes needed |
| Multi-file upload | Multiple files from same bank, mix of CSV/PDF | Users often have multiple statement periods |
| Deduplication | Same date + rounded amount (±R0.01) + trimmed lowercase description | Overlapping statement periods are common |
| Banks supported | All 5 (FNB, Capitec, Standard Bank, Discovery, ABSA) | Parity with existing CSV support |
| Password-protected PDFs | Prompt user for password, pass to pdf.js `getDocument({ password })` | FNB and Standard Bank commonly password-protect statements |
| Scanned/image PDFs | Detect and show clear error — not supported | OCR is out of scope; banks provide digital exports |
| Check-in partial failure | Abort on any file failure (not partial) | AI analysis on incomplete data gives bad results |
| Settings partial failure | Skip failed files, continue with others | Reconciliation can work on partial data |

---

## 1. PDF Text Extraction Utility

### New file: `src/data/parsers/pdf.ts`

Single function:

```typescript
extractTextFromPdf(file: File): Promise<string>
```

- Uses `pdfjs-dist` to load the file as an ArrayBuffer
- Iterates all pages, extracts text items via `page.getTextContent()`
- Joins text items with spaces per line, newlines between lines
- Returns the full document text as a single string
- The per-bank PDF parsers operate on this plain text

### Password-protected PDFs

- `extractTextFromPdf` accepts an optional `password?: string` parameter
- If pdf.js throws a `PasswordException`, the upload UI prompts the user to enter the password and retries
- Common for FNB (uses ID number) and Standard Bank statements

### Scanned/image PDF detection

- After extraction, if the total extracted text is fewer than 50 characters across all pages, treat as a scanned PDF
- Show error: "This PDF appears to be a scanned image. Please download your bank's digital/text-based PDF statement."

### Dependency

- `pdfjs-dist` — npm package (~1.5MB with worker, tree-shakeable). The worker is large but only loaded when a PDF is selected.
- **Vite worker setup:** Use `new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url)` to set `workerSrc` — this lets Vite bundle the worker correctly without copying to `public/`
- **Lazy loading:** Import `pdfjs-dist` dynamically (`const pdfjsLib = await import('pdfjs-dist')`) inside `extractTextFromPdf` so the library is only loaded when a PDF is actually uploaded. This keeps the initial bundle size unchanged.

---

## 2. Shared Parser Helpers

### New file: `src/data/parsers/helpers.ts`

Extract duplicated logic from the 5 CSV parsers into shared functions:

- `parseDate(value: string): Date` — handles `yyyy/mm/dd`, `yyyy-mm-dd`, `dd/mm/yyyy`, `dd MMM yyyy`, fallback to `new Date()`
- `parseAmount(value: string): number` — strips currency symbols, spaces, handles comma/dot decimals
- `resolveDebitCredit(debit: string, credit: string): number` — returns negative for debits, positive for credits
- `normalizeHeader(header: string): string` — lowercase, strip quotes and non-alphanumeric chars (replaces inline `h.toLowerCase().replace(/[^a-z0-9]/g, '')` pattern)
- `findColumnIndex(headers: string[], candidates: string[]): number` — first matching candidate
- `parseCSVLine(line: string): string[]` — handles quoted fields with commas (currently duplicated in all 5 parsers)

Both CSV and PDF parsers import from this file. Existing CSV parsers are refactored to use these helpers (reducing copy-paste).

---

## 3. Per-Bank PDF Parsers

Each existing bank file gets a new exported function:

| File | Existing export | New export |
|------|----------------|------------|
| `src/data/parsers/fnb.ts` | `parseFNB(csv)` | `parseFNBPdf(text)` |
| `src/data/parsers/capitec.ts` | `parseCapitec(csv)` | `parseCapitecPdf(text)` |
| `src/data/parsers/standard-bank.ts` | `parseStandardBank(csv)` | `parseStandardBankPdf(text)` |
| `src/data/parsers/discovery.ts` | `parseDiscovery(csv)` | `parseDiscoveryPdf(text)` |
| `src/data/parsers/absa.ts` | `parseABSA(csv)` | `parseABSAPdf(text)` |

### PDF parsing approach per bank

SA bank PDF statements follow a predictable pattern: header section, then a transaction table. The text from `pdf.js` preserves line order but loses column alignment. Each bank's PDF parser:

1. Splits extracted text into lines
2. Finds the transaction table start by looking for header keywords (e.g. "Date", "Description", "Amount")
3. Parses each subsequent line using bank-specific regex patterns for date format, amount position, and description
4. Applies the same debit/credit sign convention as CSV (`negative = expense`)
5. Skips non-transaction lines (summaries, page headers, footers)
6. Returns `ParsedTransaction[]`

Each bank has its own PDF format quirks (FNB concatenates description across lines, Capitec uses split debit/credit columns, etc.), which is why per-bank parsers are needed.

---

## 4. Router Changes

### Modified file: `src/data/parsers/index.ts`

**New function signature:**

```typescript
getParserForBank(
  bankCode: BankConfig['bankCode'],
  format: 'csv' | 'pdf'
): (text: string) => ParsedTransaction[]
```

- `format === 'csv'` → returns existing CSV parser
- `format === 'pdf'` → returns bank's PDF parser

**New shared helper:**

```typescript
async function parseStatement(
  bank: BankConfig,
  files: File[]
): Promise<ParsedTransaction[]>
```

- For each file:
  - Detect format from file extension (`.pdf` or `.csv`)
  - If PDF: extract text via `extractTextFromPdf(file)`, then call `getParserForBank(bank.bankCode, 'pdf')`
  - If CSV: read via `file.text()`, then call `getParserForBank(bank.bankCode, 'csv')`
- Concatenate all `ParsedTransaction[]` results
- Deduplicate: remove entries where all three match (keep first occurrence):
  - `date` — same calendar day (`toISOString().slice(0, 10)`)
  - `amount` — rounded to 2 decimal places (`Math.round(amount * 100)`)
  - `description` — trimmed and lowercased
  - **Known limitation:** Two genuinely different transactions with identical date + amount + description (e.g. two Uber trips on the same day for the same amount) will be incorrectly deduplicated. This is acceptable — it's rare and the user can add the missing one manually.
- Return merged, deduplicated array

---

## 5. Upload Site Changes

### Modified: `src/pages/settings/BankAccountsSection.tsx`

- File input: `accept=".csv"` → `accept=".csv,.pdf"`, add `multiple` attribute
- The `onChange` handler (currently reads `e.target.files?.[0]`) must change to pass `Array.from(e.target.files)`
- The `BankCard` component's `onUpload` prop type changes from `(bank, file: File)` to `(bank, files: File[])`
- `handleCSVUpload` renamed to `handleUpload`, calls `parseStatement(bank, files)` instead of inline parsing
- Everything downstream (reconciliation, import) unchanged — receives `ParsedTransaction[]`
- **Partial failure:** Skip files that fail to parse, show warning, continue with successful ones

### Modified: `src/pages/check-in/CheckInPage.tsx`

- File input: `accept=".csv"` → `accept=".csv,.pdf"`, add `multiple` attribute
- Update `fileRef` reading from `files?.[0]` to `Array.from(files)`
- Replace inline parse logic (lines ~170-179) with `parseStatement(bank, files)`
- Update UI labels: "Bank Statement (CSV)" → "Bank Statement (CSV or PDF)"
- Update error message: "Please select a CSV file" → "Please select a bank statement file"
- **Abort on failure:** Unlike Settings, check-in aborts if any file fails — AI analysis on incomplete data gives bad results

### Error handling

- **Corrupted PDF:** "Could not read [filename]. Make sure it's a valid PDF."
- **Scanned PDF:** "This PDF appears to be a scanned image. Please download your bank's digital/text-based PDF statement."
- **Password-protected PDF:** Prompt user for password, retry extraction
- **Parse failure (bad format):** "Failed to parse [filename]. Make sure you selected the correct bank ([bankName])."
- **No transactions found:** "No transactions found in [filename]."

---

## 6. No Data Model Changes

- `ParsedTransaction` interface: unchanged
- `BankConfig` model: unchanged (no new `bankCode` values)
- Dexie schema: no migration needed
- All downstream consumers (reconciliation, AI check-in, import) work on `ParsedTransaction[]` regardless of source format

---

## 7. New and Modified Files Summary

### New Files

| File | Purpose |
|------|---------|
| `src/data/parsers/pdf.ts` | `extractTextFromPdf()` using pdfjs-dist |
| `src/data/parsers/helpers.ts` | Shared date/amount/header parsing helpers |

### Modified Files

| File | Change |
|------|--------|
| `src/data/parsers/index.ts` | Add `format` param to router, add `parseStatement()` helper |
| `src/data/parsers/fnb.ts` | Add `parseFNBPdf()`, refactor to use shared helpers |
| `src/data/parsers/capitec.ts` | Add `parseCapitecPdf()`, refactor to use shared helpers |
| `src/data/parsers/standard-bank.ts` | Add `parseStandardBankPdf()`, refactor to use shared helpers |
| `src/data/parsers/discovery.ts` | Add `parseDiscoveryPdf()`, refactor to use shared helpers |
| `src/data/parsers/absa.ts` | Add `parseABSAPdf()`, refactor to use shared helpers |
| `src/pages/settings/BankAccountsSection.tsx` | Multi-file upload, accept PDF, use `parseStatement()` |
| `src/pages/check-in/CheckInPage.tsx` | Multi-file upload, accept PDF, use `parseStatement()` |
| `package.json` | Add `pdfjs-dist` dependency |

---

## 8. Testing

The project currently has no test infrastructure. Manual testing approach:

- **Per-bank PDF parsers:** Test with real PDF statements from each bank (user to provide sample files)
- **Helpers refactor:** Verify existing CSV parsing still works after refactoring to shared helpers (upload a known CSV, confirm same results)
- **Deduplication:** Upload overlapping CSV + PDF from the same period, confirm duplicates are removed
- **Password PDF:** Test with a password-protected FNB statement
- **Scanned PDF:** Test with an image-based PDF to confirm the error message appears
- **Multi-file:** Upload 2-3 files at once, confirm all transactions are merged
