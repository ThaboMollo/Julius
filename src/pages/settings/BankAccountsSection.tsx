import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { bankConfigRepo, statementUploadRepo, transactionRepo, budgetMonthRepo, categoryRepo } from '../../data/local'
import type { BankConfig, CreateTransaction } from '../../domain/models'
import { parseStatement, PdfPasswordRequired, PdfScannedImage } from '../../data/parsers'
import type { ParsedTransaction } from '../../data/parsers'
import { reconcile } from '../../domain/rules/reconciliation'
import { formatCurrency, UNCATEGORISED_CATEGORY } from '../../domain/constants'

const BANK_LABELS: Record<BankConfig['bankCode'], string> = {
  fnb: 'FNB',
  capitec: 'Capitec',
  standard_bank: 'Standard Bank',
  discovery: 'Discovery',
  absa: 'ABSA',
}

const BANK_CODES = Object.keys(BANK_LABELS) as BankConfig['bankCode'][]

const FREQ_LABELS: Record<BankConfig['uploadFrequency'], string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

// ─────────────────────────────────────────────
// Reconciliation result state
// ─────────────────────────────────────────────
interface ReconciliationState {
  bankConfigId: string
  filename: string
  matched: ParsedTransaction[]
  missing: ParsedTransaction[]
  uncategorisedCatId: string
}

// ─────────────────────────────────────────────
// Main section component
// ─────────────────────────────────────────────
export function BankAccountsSection() {
  const [banks, setBanks] = useState<BankConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [reconciliation, setReconciliation] = useState<ReconciliationState | null>(null)
  const [pdfPasswordPrompt, setPdfPasswordPrompt] = useState<{ bank: BankConfig; files: File[] } | null>(null)
  const [pdfPassword, setPdfPassword] = useState('')

  // Add form state
  const [newBankCode, setNewBankCode] = useState<BankConfig['bankCode']>('fnb')
  const [newFreq, setNewFreq] = useState<BankConfig['uploadFrequency']>('monthly')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const all = await bankConfigRepo.getAll()
      setBanks(all.filter((b) => b.isActive))
    } finally {
      setLoading(false)
    }
  }

  async function addBank() {
    setSaving(true)
    try {
      const existing = banks.find((b) => b.bankCode === newBankCode)
      if (existing) {
        alert(`${BANK_LABELS[newBankCode]} is already configured.`)
        return
      }
      await bankConfigRepo.create({
        bankName: BANK_LABELS[newBankCode],
        bankCode: newBankCode,
        uploadFrequency: newFreq,
        isActive: true,
      })
      setShowAddForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function removeBank(id: string) {
    if (!confirm('Remove this bank account?')) return
    await bankConfigRepo.update(id, { isActive: false })
    await load()
  }

  async function handleUpload(bank: BankConfig, files: File[]) {
    try {
      const result = await parseStatement(bank, files, pdfPassword || undefined)

      if (result.errors.length > 0) {
        alert(`Warning:\n${result.errors.map((e) => e.message).join('\n')}`)
      }

      const parsed = result.transactions
      if (parsed.length === 0) {
        alert('No transactions found in the uploaded files. Please check the file format.')
        return
      }

      // Everything below stays the same — compute date range, reconcile, etc.
      const dates = parsed.map((p) => new Date(p.date).getTime())
      const minDate = new Date(Math.min(...dates))
      const maxDate = new Date(Math.max(...dates))

      const allJuliusTxs = await loadTransactionsForRange(minDate, maxDate)
      const reconcileResult = reconcile(parsed, allJuliusTxs)

      const cats = await categoryRepo.getActive()
      const uncategorisedCat = cats.find((c) => c.name === UNCATEGORISED_CATEGORY) ?? cats[0]
      if (!uncategorisedCat) {
        alert('No categories found. Please set up your categories in Settings first.')
        return
      }

      await statementUploadRepo.create({
        bankConfigId: bank.id,
        filename: files.map((f) => f.name).join(', '),
        uploadedAt: new Date(),
        periodStart: minDate,
        periodEnd: maxDate,
        totalTransactions: parsed.length,
        matchedCount: reconcileResult.matched.length,
        unmatchedCount: reconcileResult.missingFromJulius.length,
      })

      await bankConfigRepo.update(bank.id, { lastUploadAt: new Date() })
      await load()

      setPdfPasswordPrompt(null)
      setPdfPassword('')

      setReconciliation({
        bankConfigId: bank.id,
        filename: files.map((f) => f.name).join(', '),
        matched: reconcileResult.matched,
        missing: reconcileResult.missingFromJulius,
        uncategorisedCatId: uncategorisedCat.id,
      })
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
  }

  async function loadTransactionsForRange(start: Date, end: Date) {
    const txs = []
    const startYear = start.getFullYear()
    const startMonth = start.getMonth() + 1
    const endYear = end.getFullYear()
    const endMonth = end.getMonth() + 1

    let year = startYear
    let month = startMonth
    while (year < endYear || (year === endYear && month <= endMonth)) {
      const bm = await budgetMonthRepo.getOrCreate(year, month)
      const monthTxs = await transactionRepo.getByMonth(bm.id)
      txs.push(...monthTxs)
      month++
      if (month > 12) { month = 1; year++ }
    }
    return txs
  }

  if (loading) return null

  return (
    <div className="vnext-card p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="vnext-section-title">Bank Accounts</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-sm text-[#C4A86B] font-medium hover:text-[#A89060]"
          >
            + Add Bank
          </button>
        )}
      </div>

      {/* Add bank form */}
      {showAddForm && (
        <div className="vnext-card-muted mb-4 space-y-3 p-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Bank
            </label>
            <select
              value={newBankCode}
              onChange={(e) => setNewBankCode(e.target.value as BankConfig['bankCode'])}
              className="vnext-select text-sm"
            >
              {BANK_CODES.map((code) => (
                <option key={code} value={code}>{BANK_LABELS[code]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Upload Frequency
            </label>
            <select
              value={newFreq}
              onChange={(e) => setNewFreq(e.target.value as BankConfig['uploadFrequency'])}
              className="vnext-select text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addBank}
              disabled={saving}
              className="vnext-button-primary flex-1 rounded-2xl py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Bank'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="vnext-button-secondary rounded-2xl px-4 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bank cards */}
      {banks.length === 0 && !showAddForm ? (
        <p className="text-sm text-gray-400 dark:text-[#8A9BAA] italic">
          No banks configured. Add one to start reconciling.
        </p>
      ) : (
        <div className="space-y-3">
          {banks.map((bank) => (
            <BankCard
              key={bank.id}
              bank={bank}
              onRemove={() => removeBank(bank.id)}
              onUpload={(files) => void handleUpload(bank, files)}
            />
          ))}
        </div>
      )}

      {/* PDF password prompt */}
      {pdfPasswordPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-[#F0EDE4]">Password Required</h3>
            <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">
              This PDF is password-protected. For FNB, this is usually your ID number.
            </p>
            <input
              type="password"
              value={pdfPassword}
              onChange={(e) => setPdfPassword(e.target.value)}
              placeholder="Enter PDF password"
              className="w-full px-3 py-2 border dark:border-[#2E3A4E] rounded-lg bg-white dark:bg-[#1E2330] text-gray-800 dark:text-[#F0EDE4]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleUpload(pdfPasswordPrompt.bank, pdfPasswordPrompt.files)
                }}
                className="flex-1 py-2 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550]"
              >
                Unlock & Upload
              </button>
              <button
                type="button"
                onClick={() => { setPdfPasswordPrompt(null); setPdfPassword('') }}
                className="flex-1 py-2 bg-gray-200 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA] rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation modal */}
      {reconciliation && (
        <ReconciliationModal
          state={reconciliation}
          onClose={() => setReconciliation(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Bank card
// ─────────────────────────────────────────────
function BankCard({
  bank,
  onRemove,
  onUpload,
}: {
  bank: BankConfig
  onRemove: () => void
  onUpload: (files: File[]) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="border dark:border-[#2E3A4E] rounded-xl p-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-semibold text-gray-800 dark:text-[#F0EDE4]">{bank.bankName}</div>
          <div className="text-xs text-gray-500 dark:text-[#8A9BAA]">
            Upload: {FREQ_LABELS[bank.uploadFrequency]}
            {bank.lastUploadAt && (
              <> · Last: {format(new Date(bank.lastUploadAt), 'd MMM yyyy')}</>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-gray-300 dark:text-[#4A5568] hover:text-red-400 text-sm leading-none"
        >
          ✕
        </button>
      </div>

      <button
        onClick={() => fileRef.current?.click()}
        className="w-full py-2 bg-gray-100 dark:bg-[#1E2330] hover:bg-gray-200 dark:hover:bg-[#2E3A4E] text-gray-700 dark:text-[#8A9BAA] rounded-lg text-sm font-medium transition-colors"
      >
        Upload Statement (.csv / .pdf)
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          if (files && files.length > 0) onUpload(Array.from(files))
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// Reconciliation modal
// ─────────────────────────────────────────────
interface ReconciliationModalProps {
  state: ReconciliationState
  onClose: () => void
}

function ReconciliationModal({ state, onClose }: ReconciliationModalProps) {
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState<number | null>(null)

  async function importAll() {
    setImporting(true)
    try {
      await Promise.all(
        state.missing.map(async (tx) => {
          const txDate = new Date(tx.date)
          const bm = await budgetMonthRepo.getOrCreate(
            txDate.getFullYear(),
            txDate.getMonth() + 1,
          )
          const newTx: CreateTransaction = {
            budgetMonthId: bm.id,
            categoryId: state.uncategorisedCatId,
            budgetItemId: null,
            amount: Math.abs(tx.amount),
            date: txDate,
            note: tx.description,
          }
          await transactionRepo.create(newTx)
        }),
      )
      setImportedCount(state.missing.length)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed.'
      alert(`Import error: ${msg}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1A2030] rounded-t-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start px-5 py-4 border-b dark:border-[#2E3A4E] shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-[#F0EDE4]">Statement Import</h2>
            <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">{state.filename}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-[#8A9BAA] text-2xl leading-none">✕</button>
        </div>

        {importedCount !== null ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
            <div className="text-5xl">✅</div>
            <p className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4]">
              {importedCount} transaction{importedCount !== 1 ? 's' : ''} imported
            </p>
            <p className="text-sm text-gray-500 dark:text-[#8A9BAA] text-center">
              All marked as Uncategorised. Tap each one in the Transactions page to assign a category.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#A89060] text-white rounded-lg font-medium"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex gap-6 px-5 py-3 bg-gray-50 dark:bg-[#1E2330] shrink-0">
              <div className="text-center">
                <div className="text-lg font-bold text-green-500">{state.matched.length}</div>
                <div className="text-xs text-gray-500 dark:text-[#8A9BAA]">Already in Julius</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#C4A86B]">{state.missing.length}</div>
                <div className="text-xs text-gray-500 dark:text-[#8A9BAA]">New transactions</div>
              </div>
            </div>

            {/* Transaction list */}
            <div className="overflow-y-auto flex-1 p-4">
              {state.missing.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-gray-600 dark:text-[#8A9BAA]">All bank transactions are already in Julius.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {state.missing.map((tx, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 dark:border-[#2E3A4E] rounded-xl px-3 py-2.5 flex justify-between items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-800 dark:text-[#F0EDE4] truncate">{tx.description}</div>
                        <div className="text-xs text-gray-400 dark:text-[#8A9BAA]">
                          {format(new Date(tx.date), 'd MMM yyyy')}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-[#F0EDE4] shrink-0 ml-3">
                        {formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {state.missing.length > 0 && (
              <div className="px-5 py-4 border-t dark:border-[#2E3A4E] shrink-0 space-y-2">
                <button
                  onClick={importAll}
                  disabled={importing}
                  className="w-full py-3 bg-[#A89060] hover:bg-[#8B7550] disabled:opacity-50 text-white rounded-xl font-semibold"
                >
                  {importing ? 'Importing...' : `Import ${state.missing.length} Transaction${state.missing.length !== 1 ? 's' : ''}`}
                </button>
                <p className="text-xs text-gray-400 dark:text-[#8A9BAA] text-center">
                  Imported as Uncategorised — categorise later in Transactions
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
