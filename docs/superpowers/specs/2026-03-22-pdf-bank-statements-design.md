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
| Deduplication | Same date + amount + description = duplicate | Overlapping statement periods are common |
| Banks supported | All 5 (FNB, Capitec, Standard Bank, Discovery, ABSA) | Parity with existing CSV support |

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

### Dependency

- `pdfjs-dist` — npm package, ~500KB, runs entirely in the browser
- The pdf.js worker file must be configured (set `pdfjsLib.GlobalWorkerOptions.workerSrc`)

---

## 2. Shared Parser Helpers

### New file: `src/data/parsers/helpers.ts`

Extract duplicated logic from the 5 CSV parsers into shared functions:

- `parseDate(value: string): Date` — handles `yyyy/mm/dd`, `yyyy-mm-dd`, `dd/mm/yyyy`, `dd MMM yyyy`, fallback to `new Date()`
- `parseAmount(value: string): number` — strips currency symbols, spaces, handles comma/dot decimals
- `resolveDebitCredit(debit: string, credit: string): number` — returns negative for debits, positive for credits
- `normalizeHeader(header: string): string` — lowercase, strip quotes and non-alphanumeric chars
- `findColumnIndex(headers: string[], candidates: string[]): number` — first matching candidate

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
- Deduplicate: remove entries where `date + amount + description` match (keep first occurrence)
- Return merged, deduplicated array

---

## 5. Upload Site Changes

### Modified: `src/pages/settings/BankAccountsSection.tsx`

- File input: `accept=".csv"` → `accept=".csv,.pdf"`, add `multiple` attribute
- Replace inline CSV parsing with `parseStatement(bank, Array.from(files))`
- Everything downstream (reconciliation, import) unchanged — receives `ParsedTransaction[]`

### Modified: `src/pages/check-in/CheckInPage.tsx`

- File input: `accept=".csv"` → `accept=".csv,.pdf"`, add `multiple` attribute
- Replace inline CSV parsing with `parseStatement(bank, Array.from(files))`
- Everything downstream (AI analysis, planner) unchanged

### Error handling

- If any file fails to parse: show error with filename and bank name, skip that file, continue with others
- If all files fail: show error, don't proceed
- If PDF extraction fails (corrupted PDF): show "Could not read [filename]. Make sure it's a valid PDF."

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
