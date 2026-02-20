import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { bankConfigRepo, statementUploadRepo, transactionRepo, budgetMonthRepo, categoryRepo } from '../../data/local'
import type { BankConfig, Category, CreateTransaction } from '../../domain/models'
import { getParserForBank } from '../../data/parsers'
import type { ParsedTransaction } from '../../data/parsers'
import { reconcile } from '../../domain/rules/reconciliation'
import { formatCurrency } from '../../domain/constants'

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
  categories: Category[]
}

// ─────────────────────────────────────────────
// Main section component
// ─────────────────────────────────────────────
export function BankAccountsSection() {
  const [banks, setBanks] = useState<BankConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [reconciliation, setReconciliation] = useState<ReconciliationState | null>(null)

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

  async function handleCSVUpload(bank: BankConfig, file: File) {
    const csvText = await file.text()
    const parser = getParserForBank(bank.bankCode)
    const parsed = parser(csvText)

    if (parsed.length === 0) {
      alert('No transactions found in this file. Please check the CSV format.')
      return
    }

    // Load all Julius transactions for the period covered by the CSV
    const dates = parsed.map((p) => new Date(p.date).getTime())
    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))

    // Collect Julius transactions for overlapping months
    const allJuliusTxs = await loadTransactionsForRange(minDate, maxDate)
    const cats = await categoryRepo.getActive()
    const result = reconcile(parsed, allJuliusTxs)

    // Record the upload
    await statementUploadRepo.create({
      bankConfigId: bank.id,
      filename: file.name,
      uploadedAt: new Date(),
      periodStart: minDate,
      periodEnd: maxDate,
      totalTransactions: parsed.length,
      matchedCount: result.matched.length,
      unmatchedCount: result.missingFromJulius.length,
    })

    // Update lastUploadAt
    await bankConfigRepo.update(bank.id, { lastUploadAt: new Date() })
    await load()

    setReconciliation({
      bankConfigId: bank.id,
      filename: file.name,
      matched: result.matched,
      missing: result.missingFromJulius,
      categories: cats,
    })
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
    <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4]">Bank Accounts</h2>
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
        <div className="space-y-3 mb-4 p-3 bg-gray-50 dark:bg-[#1E2330] rounded-xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">
              Bank
            </label>
            <select
              value={newBankCode}
              onChange={(e) => setNewBankCode(e.target.value as BankConfig['bankCode'])}
              className="w-full px-3 py-2 border dark:border-[#2E3A4E] rounded-lg bg-white dark:bg-[#252D3D] text-gray-800 dark:text-[#F0EDE4] text-sm"
            >
              {BANK_CODES.map((code) => (
                <option key={code} value={code}>{BANK_LABELS[code]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">
              Upload Frequency
            </label>
            <select
              value={newFreq}
              onChange={(e) => setNewFreq(e.target.value as BankConfig['uploadFrequency'])}
              className="w-full px-3 py-2 border dark:border-[#2E3A4E] rounded-lg bg-white dark:bg-[#252D3D] text-gray-800 dark:text-[#F0EDE4] text-sm"
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
              className="flex-1 py-2 bg-[#A89060] hover:bg-[#8B7550] disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              {saving ? 'Adding...' : 'Add Bank'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-[#2E3A4E] text-gray-600 dark:text-[#8A9BAA] rounded-lg text-sm"
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
              onUpload={(file) => handleCSVUpload(bank, file)}
            />
          ))}
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
  onUpload: (file: File) => void
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
        Upload Statement (.csv)
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
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
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({})
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)

  function toggleSelect(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

  function setCategory(idx: number, catId: string) {
    setCategoryMap((prev) => ({ ...prev, [idx]: catId }))
  }

  async function importSelected() {
    setImporting(true)
    try {
      for (const idx of Array.from(selected)) {
        const tx = state.missing[idx]
        const catId = categoryMap[idx]
        if (!catId) continue

        const txDate = new Date(tx.date)
        const bm = await budgetMonthRepo.getOrCreate(
          txDate.getFullYear(),
          txDate.getMonth() + 1
        )

        const newTx: CreateTransaction = {
          budgetMonthId: bm.id,
          categoryId: catId,
          budgetItemId: null,
          amount: Math.abs(tx.amount),
          date: txDate,
          note: tx.description,
        }
        await transactionRepo.create(newTx)
      }
      setDone(true)
    } finally {
      setImporting(false)
    }
  }

  const selectedWithCategory = Array.from(selected).filter((idx) => categoryMap[idx])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1A2030] rounded-t-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start px-5 py-4 border-b dark:border-[#2E3A4E] shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-[#F0EDE4]">Reconciliation</h2>
            <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">{state.filename}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-[#8A9BAA] text-2xl leading-none">✕</button>
        </div>

        {done ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
            <div className="text-5xl">✅</div>
            <p className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4]">
              {selectedWithCategory.length} transaction{selectedWithCategory.length !== 1 ? 's' : ''} imported
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
            <div className="flex gap-4 px-5 py-3 bg-gray-50 dark:bg-[#1E2330] shrink-0">
              <div className="text-center">
                <div className="text-lg font-bold text-green-500">{state.matched.length}</div>
                <div className="text-xs text-gray-500 dark:text-[#8A9BAA]">Matched</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-500">{state.missing.length}</div>
                <div className="text-xs text-gray-500 dark:text-[#8A9BAA]">Missing from Julius</div>
              </div>
            </div>

            {/* Missing transactions list */}
            <div className="overflow-y-auto flex-1 p-4">
              {state.missing.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-gray-600 dark:text-[#8A9BAA]">All bank transactions are in Julius.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-[#8A9BAA]">
                    Select transactions to import:
                  </p>
                  {state.missing.map((tx, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-xl p-3 cursor-pointer transition-colors ${
                        selected.has(idx)
                          ? 'border-[#C4A86B] bg-[#C4A86B]/10'
                          : 'border-gray-200 dark:border-[#2E3A4E]'
                      }`}
                      onClick={() => toggleSelect(idx)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${
                              selected.has(idx)
                                ? 'border-[#C4A86B] bg-[#C4A86B]'
                                : 'border-gray-300 dark:border-[#4A5568]'
                            }`}
                          >
                            {selected.has(idx) && (
                              <span className="text-white text-xs leading-none">✓</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-gray-800 dark:text-[#F0EDE4] truncate">
                              {tx.description}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-[#8A9BAA]">
                              {format(new Date(tx.date), 'd MMM yyyy')}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-800 dark:text-[#F0EDE4] shrink-0 ml-2">
                          {formatCurrency(Math.abs(tx.amount))}
                        </span>
                      </div>

                      {/* Category picker — only show when selected */}
                      {selected.has(idx) && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <select
                            value={categoryMap[idx] || ''}
                            onChange={(e) => setCategory(idx, e.target.value)}
                            className="w-full mt-1 px-2 py-1.5 text-sm border dark:border-[#2E3A4E] rounded-lg bg-white dark:bg-[#252D3D] text-gray-800 dark:text-[#F0EDE4]"
                          >
                            <option value="">— Assign category —</option>
                            {state.categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {state.missing.length > 0 && (
              <div className="px-5 py-4 border-t dark:border-[#2E3A4E] shrink-0">
                <button
                  onClick={importSelected}
                  disabled={importing || selectedWithCategory.length === 0}
                  className="w-full py-3 bg-[#A89060] hover:bg-[#8B7550] disabled:opacity-50 text-white rounded-xl font-semibold"
                >
                  {importing
                    ? 'Importing...'
                    : `Import ${selectedWithCategory.length} Selected`}
                </button>
                {selected.size > 0 && selectedWithCategory.length < selected.size && (
                  <p className="text-xs text-yellow-500 text-center mt-2">
                    {selected.size - selectedWithCategory.length} selected item{selected.size - selectedWithCategory.length !== 1 ? 's' : ''} need a category
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
