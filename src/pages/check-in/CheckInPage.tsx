import { useState, useEffect, useRef } from 'react'
import { format, subMonths, startOfMonth } from 'date-fns'
import { useMonth } from '../../app/MonthContext'
import { parseStatement, PdfPasswordRequired, PdfScannedImage } from '../../data/parsers'
import { getOpenAIKey, analyzeCheckIn } from '../../ai/openai'
import {
  budgetMonthRepo,
  budgetItemRepo,
  transactionRepo,
  billTickRepo,
  budgetGroupRepo,
  categoryRepo,
  settingsRepo,
  bankConfigRepo,
  purchaseScenarioRepo,
  scenarioExpenseRepo,
  checkInResultRepo,
} from '../../data/local'
import type {
  BankConfig,
  CheckInResult,
  OutsideBudgetItem,
  SuggestedBudgetItem,
  CreateTransaction,
  CreateBudgetItem,
  Category,
  BudgetItem,
  BudgetGroup,
} from '../../domain/models'
import { totalPlanned, totalActual, calculateAffordability, effectivePlanned } from '../../domain/rules'
import { UNCATEGORISED_CATEGORY } from '../../domain/constants'
import { VerdictCard } from './VerdictCard'
import { KPISummaryStrip } from './KPISummaryStrip'
import { OutsideBudgetSection } from './OutsideBudgetSection'
import { SuggestedBudgetSection } from './SuggestedBudgetSection'
import { PlannerReviewSection } from './PlannerReviewSection'
import { TransactionModal } from '../transactions/TransactionModal'
import { BudgetItemModal } from '../budget/BudgetItemModal'

const LOADING_MESSAGES = [
  'Checking your damage...',
  'Counting the Uber Eats orders...',
  "Let's see who's been naughty...",
  'Judging your life choices...',
  'Running the numbers...',
  'This might hurt...',
]

type PageState = 'upload' | 'loading' | 'results'

export function CheckInPage() {
  const { selectedMonth } = useMonth()
  const year = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth() + 1
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const monthLabel = format(new Date(year, month - 1), 'MMMM yyyy')

  const [pageState, setPageState] = useState<PageState>('upload')
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [error, setError] = useState('')

  // Upload state
  const [banks, setBanks] = useState<BankConfig[]>([])
  const [selectedBankId, setSelectedBankId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [pdfPassword, setPdfPassword] = useState('')
  const [pdfPasswordPrompt, setPdfPasswordPrompt] = useState<{ bank: BankConfig; files: File[] } | null>(null)

  // Loading animation
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])

  // Modal state for actions
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txInitial, setTxInitial] = useState<Partial<CreateTransaction> | undefined>()
  const [biModalOpen, setBiModalOpen] = useState(false)
  const [biInitial, setBiInitial] = useState<Partial<CreateBudgetItem> | undefined>()
  const [pendingActionIdx, setPendingActionIdx] = useState<{ section: 'outside' | 'suggested'; index: number } | null>(null)

  // Data for modals and KPIs
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [allItems, setAllItems] = useState<BudgetItem[]>([])
  const [allGroups, setAllGroups] = useState<BudgetGroup[]>([])
  const [budgetMonthId, setBudgetMonthId] = useState('')
  const [bankDebitTotal, setBankDebitTotal] = useState(0)
  const [billTicks, setBillTicks] = useState<import('../../domain/models').BillTick[]>([])
  const [paydayDay, setPaydayDay] = useState(25)

  // Sticky scroll state
  const [isSticky, setIsSticky] = useState(false)
  const verdictRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void loadInitial()
  }, [])

  useEffect(() => {
    if (pageState !== 'loading') return
    const interval = setInterval(() => {
      setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)])
    }, 2500)
    return () => clearInterval(interval)
  }, [pageState])

  useEffect(() => {
    if (pageState !== 'results') return
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0 }
    )
    if (verdictRef.current) observer.observe(verdictRef.current)
    return () => observer.disconnect()
  }, [pageState])

  async function loadInitial() {
    const [bankList, existing] = await Promise.all([
      bankConfigRepo.getAll(),
      checkInResultRepo.getByMonthKey(monthKey),
    ])
    const activeBanks = bankList.filter((b) => b.isActive)
    setBanks(activeBanks)
    if (activeBanks.length > 0) setSelectedBankId(activeBanks[0].id)

    if (existing) {
      setResult(existing)
      setPageState('results')
      await loadModalData()

      // Restore KPI data for revisiting a completed check-in
      const settings = await settingsRepo.get()
      setPaydayDay(settings.paydayDayOfMonth)
      const bm = await budgetMonthRepo.getOrCreate(year, month)
      const [ticks, items] = await Promise.all([
        billTickRepo.getByMonth(bm.id),
        budgetItemRepo.getByMonth(bm.id),
      ])
      setBillTicks(ticks)
      // Reconstruct bank debit total from stored spending progress %
      const planned = totalPlanned(items)
      setBankDebitTotal(planned > 0 ? (existing.spendingProgressPercent / 100) * planned : 0)
    }
  }

  async function loadModalData() {
    const bm = await budgetMonthRepo.getOrCreate(year, month)
    setBudgetMonthId(bm.id)
    const [cats, items, groups] = await Promise.all([
      categoryRepo.getActive(),
      budgetItemRepo.getByMonth(bm.id),
      budgetGroupRepo.getAll(),
    ])
    setAllCategories(cats)
    setAllItems(items)
    setAllGroups(groups.filter((g) => g.isActive))
  }

  async function handleUpload() {
    const files = fileRef.current?.files
    if (!files || files.length === 0) { setError('Please select a bank statement file.'); return }

    const bank = banks.find((b) => b.id === selectedBankId)
    if (!bank) { setError('Please select a bank.'); return }

    const apiKey = getOpenAIKey()
    if (!apiKey) { setError('Please set your OpenAI API key in Settings first.'); return }

    setError('')
    setPageState('loading')

    try {
      // 1. Parse files
      let result
      try {
        result = await parseStatement(bank, Array.from(files), pdfPassword || undefined)
      } catch (err) {
        if (err instanceof PdfPasswordRequired) {
          setPdfPasswordPrompt({ bank, files: Array.from(files) })
          setPageState('upload')
          return
        }
        if (err instanceof PdfScannedImage) {
          setError((err as Error).message)
          setPageState('upload')
          return
        }
        setError(`Failed to parse files. Make sure you selected the correct bank (${bank.bankName}).`)
        setPageState('upload')
        return
      }

      // Check-in aborts on any failure (AI needs complete data)
      if (result.errors.length > 0) {
        setError(result.errors.map((e) => e.message).join('\n'))
        setPageState('upload')
        return
      }

      const parsed = result.transactions

      if (parsed.length === 0) {
        setError('No transactions found in this file.')
        setPageState('upload')
        return
      }

      // 2. Gather all local data
      const bm = await budgetMonthRepo.getOrCreate(year, month)
      setBudgetMonthId(bm.id)
      const settings = await settingsRepo.get()

      const [items, transactions, ticks, groups, categories] = await Promise.all([
        budgetItemRepo.getByMonth(bm.id),
        transactionRepo.getByMonth(bm.id),
        billTickRepo.getByMonth(bm.id),
        budgetGroupRepo.getAll(),
        categoryRepo.getActive(),
      ])

      setAllCategories(categories)
      setAllItems(items)
      setAllGroups(groups.filter((g) => g.isActive))

      // 3. Gather planner data
      const allScenarios = await purchaseScenarioRepo.getAll()
      const globalIncome = settings.expectedMonthlyIncome ?? 0

      // Build 3-month baseline for planner
      const now = new Date()
      const baselineMonths: { totalActual: number; expectedIncome: number }[] = []
      for (let i = 2; i >= 0; i--) {
        const md = startOfMonth(subMonths(now, i))
        const y = md.getFullYear()
        const m = md.getMonth() + 1
        const bmPast = await budgetMonthRepo.getOrCreate(y, m)
        const txsPast = await transactionRepo.getByMonth(bmPast.id)
        const income = bmPast.expectedIncome ?? globalIncome
        baselineMonths.push({ totalActual: totalActual(txsPast), expectedIncome: income })
      }

      // Get scenario details for AI and planner review
      const scenarioData = await Promise.all(
        allScenarios.map(async (scenario) => {
          const expenses = await scenarioExpenseRepo.getByScenario(scenario.id)
          const scenarioTotal = expenses.reduce((s, e) => s + e.monthlyAmount, 0)
          const currentResult = calculateAffordability(baselineMonths, scenarioTotal)
          return { scenario, expenses, currentVerdict: currentResult.verdict, scenarioTotal }
        })
      )

      // 4. Call OpenAI
      const aiResponse = await analyzeCheckIn({
        apiKey,
        bankTransactions: parsed,
        budgetItems: items,
        transactions,
        billTicks: ticks,
        groups: groups.filter((g) => g.isActive),
        categories,
        scenarios: scenarioData.map(({ scenario, expenses, currentVerdict }) => ({
          scenario,
          expenses,
          currentVerdict,
        })),
        monthLabel,
      })

      // 5. Planner re-evaluation with bank data
      const bankDebitSum = parsed
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0)

      const updatedBaseline = [...baselineMonths]
      updatedBaseline[updatedBaseline.length - 1] = {
        ...updatedBaseline[updatedBaseline.length - 1],
        totalActual: bankDebitSum,
      }

      const plannerReview = scenarioData.map(({ scenario, scenarioTotal, currentVerdict }) => {
        const newResult = calculateAffordability(updatedBaseline, scenarioTotal)
        return {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          previousVerdict: currentVerdict as 'affordable' | 'tight' | 'cannot_afford',
          newVerdict: newResult.verdict,
          newBaselineDisposable: newResult.baselineDisposable,
          newRemainingAfterScenario: newResult.remainingAfterScenario,
        }
      })

      // 6. Calculate spending progress %
      const planned = totalPlanned(items)
      const spendingProgressPercent = planned > 0 ? Math.round((bankDebitSum / planned) * 100) : 0

      // 7. Compose and save result
      const checkIn = await checkInResultRepo.create({
        budgetMonthId: bm.id,
        monthKey,
        verdict: aiResponse.verdict,
        verdictSummary: aiResponse.verdictSummary,
        spendingProgressPercent,
        outsideBudget: aiResponse.outsideBudget,
        suggestedBudgetItems: aiResponse.suggestedBudgetItems,
        plannerReview,
        bankStatementDate: new Date().toISOString(),
        rawAIResponse: JSON.stringify(aiResponse),
      })

      setResult(checkIn)
      setBankDebitTotal(bankDebitSum)
      setBillTicks(ticks)
      setPaydayDay(settings.paydayDayOfMonth)
      setPageState('results')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setError(msg)
      setPageState('upload')
    }
  }

  // Action handlers
  function handleLogTransaction(item: OutsideBudgetItem, idx: number) {
    const uncategorised = allCategories.find((c) => c.name === UNCATEGORISED_CATEGORY)
    setTxInitial({
      amount: item.amount,
      date: new Date(item.date),
      categoryId: uncategorised?.id ?? allCategories[0]?.id ?? '',
      budgetItemId: null,
      budgetMonthId,
      note: item.description,
    })
    setPendingActionIdx({ section: 'outside', index: idx })
    setTxModalOpen(true)
  }

  async function handleTxSave(data: CreateTransaction) {
    await transactionRepo.create(data)
    setTxModalOpen(false)
    if (pendingActionIdx?.section === 'outside' && result) {
      const updated = [...result.outsideBudget]
      updated[pendingActionIdx.index] = { ...updated[pendingActionIdx.index], actionTaken: 'added_transaction' }
      await checkInResultRepo.update(result.id, { outsideBudget: updated })
      setResult({ ...result, outsideBudget: updated })
    }
    setPendingActionIdx(null)
  }

  async function handleDismissOutside(idx: number) {
    if (!result) return
    const updated = [...result.outsideBudget]
    updated[idx] = { ...updated[idx], actionTaken: 'dismissed' }
    await checkInResultRepo.update(result.id, { outsideBudget: updated })
    setResult({ ...result, outsideBudget: updated })
  }

  function handleAddToBudget(item: SuggestedBudgetItem, idx: number) {
    // BudgetItemModal reads initial values from the `item` prop.
    // We pass a synthetic BudgetItem to pre-fill the form.
    setBiInitial({
      id: '__draft__',
      userId: '',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      name: item.name,
      plannedAmount: item.suggestedAmount,
      groupId: item.groupId ?? allGroups[0]?.id ?? '',
      categoryId: item.categoryId ?? allCategories[0]?.id ?? '',
      budgetMonthId,
      multiplier: 1,
      splitRatio: 1,
      isBill: false,
      dueDate: null,
      isFromTemplate: false,
      templateId: null,
    } as unknown as Partial<CreateBudgetItem>)
    setPendingActionIdx({ section: 'suggested', index: idx })
    setBiModalOpen(true)
  }

  async function handleBiSave(data: CreateBudgetItem) {
    await budgetItemRepo.create(data)
    setBiModalOpen(false)
    if (pendingActionIdx?.section === 'suggested' && result) {
      const updated = [...result.suggestedBudgetItems]
      updated[pendingActionIdx.index] = { ...updated[pendingActionIdx.index], actionTaken: 'added_to_budget' }
      await checkInResultRepo.update(result.id, { suggestedBudgetItems: updated })
      setResult({ ...result, suggestedBudgetItems: updated })
    }
    setPendingActionIdx(null)
  }

  async function handleDismissSuggested(idx: number) {
    if (!result) return
    const updated = [...result.suggestedBudgetItems]
    updated[idx] = { ...updated[idx], actionTaken: 'dismissed' }
    await checkInResultRepo.update(result.id, { suggestedBudgetItems: updated })
    setResult({ ...result, suggestedBudgetItems: updated })
  }

  // ─── Render ───

  if (pageState === 'upload') {
    const apiKey = getOpenAIKey()
    return (
      <div className="p-4 space-y-6 pb-24">
        <h1 className="text-xl font-bold text-gray-800 dark:text-[#F0EDE4]">Mid-Month Check-In</h1>
        <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">
          Upload your bank statement and let&apos;s see how you&apos;re doing
        </p>

        {!apiKey && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              You need to set your OpenAI API key in Settings before running a check-in.
            </p>
          </div>
        )}

        {banks.length === 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Add a bank account in Settings first to upload statements.
            </p>
          </div>
        )}

        {banks.length > 0 && apiKey && (
          <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">Bank</label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full px-3 py-2 border dark:border-[#2E3A4E] rounded-lg bg-white dark:bg-[#1E2330] text-gray-800 dark:text-[#F0EDE4]"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.bankName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#F0EDE4] mb-1">Bank Statement (CSV or PDF)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.pdf"
                multiple
                className="w-full text-sm text-gray-500 dark:text-[#8A9BAA] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#A89060] file:text-white hover:file:bg-[#8B7550]"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleUpload()}
              className="w-full py-3 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550] font-medium"
            >
              Run Check-In
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {pdfPasswordPrompt && (
          <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow p-4 space-y-3">
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
                  setPdfPasswordPrompt(null)
                  void handleUpload()
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
        )}
      </div>
    )
  }

  if (pageState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="w-12 h-12 border-4 border-[#A89060] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-600 dark:text-[#8A9BAA] animate-pulse">{loadingMsg}</p>
      </div>
    )
  }

  // Results state
  if (!result) return null

  // Compute KPI values
  const planned = totalPlanned(allItems)
  const billItems = allItems.filter((i) => i.isBill)
  const unpaidBills = billItems.filter((i) => !billTicks.find((t) => t.budgetItemId === i.id && t.isPaid))
  const unpaidBillsAmount = unpaidBills.reduce((s, i) => s + effectivePlanned(i), 0)

  // Days to payday
  const today = new Date()
  const paydayThisMonth = new Date(today.getFullYear(), today.getMonth(), paydayDay)
  const paydayTarget = paydayThisMonth > today ? paydayThisMonth : new Date(today.getFullYear(), today.getMonth() + 1, paydayDay)
  const daysToPayday = Math.ceil((paydayTarget.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Sticky verdict when scrolled */}
      {isSticky && (
        <div className="fixed top-14 left-0 right-0 z-30 px-4 pt-2">
          <VerdictCard
            verdict={result.verdict}
            verdictSummary={result.verdictSummary}
            spendingProgressPercent={result.spendingProgressPercent}
            monthLabel={monthLabel}
            compact
          />
        </div>
      )}

      {/* Full verdict card */}
      <div ref={verdictRef}>
        <VerdictCard
          verdict={result.verdict}
          verdictSummary={result.verdictSummary}
          spendingProgressPercent={result.spendingProgressPercent}
          monthLabel={monthLabel}
        />
      </div>

      {/* KPI strip */}
      <KPISummaryStrip
        spentSoFar={bankDebitTotal}
        budgetRemaining={planned - bankDebitTotal}
        billsLeftCount={unpaidBills.length}
        billsLeftAmount={unpaidBillsAmount}
        daysToPayday={daysToPayday}
      />

      {/* Collapsible sections */}
      <OutsideBudgetSection
        items={result.outsideBudget}
        onLogTransaction={handleLogTransaction}
        onDismiss={handleDismissOutside}
      />

      <SuggestedBudgetSection
        items={result.suggestedBudgetItems}
        onAddToBudget={handleAddToBudget}
        onDismiss={handleDismissSuggested}
      />

      <PlannerReviewSection items={result.plannerReview} />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => { setTxModalOpen(false); setPendingActionIdx(null) }}
        onSave={(data) => void handleTxSave(data)}
        transaction={null}
        initialValues={txInitial}
        categories={allCategories}
        items={allItems}
        budgetMonthId={budgetMonthId}
      />

      {/* Budget Item Modal — pass synthetic BudgetItem to pre-fill the form */}
      <BudgetItemModal
        isOpen={biModalOpen}
        onClose={() => { setBiModalOpen(false); setPendingActionIdx(null) }}
        onSave={(data) => void handleBiSave(data)}
        item={biInitial ? (biInitial as unknown as BudgetItem) : null}
        groups={allGroups}
        categories={allCategories}
        budgetMonthId={budgetMonthId}
        defaultGroupId={biInitial?.groupId ?? null}
      />
    </div>
  )
}
