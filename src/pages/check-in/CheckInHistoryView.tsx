import type { CheckInResult } from '../../domain/models'
import { VerdictCard } from './VerdictCard'
import { OutsideBudgetSection } from './OutsideBudgetSection'
import { SuggestedBudgetSection } from './SuggestedBudgetSection'
import { PlannerReviewSection } from './PlannerReviewSection'
import { format } from 'date-fns'

interface Props {
  result: CheckInResult
  onClose: () => void
}

export function CheckInHistoryView({ result, onClose }: Props) {
  const [year, monthStr] = result.monthKey.split('-')
  const monthLabel = format(new Date(parseInt(year), parseInt(monthStr) - 1), 'MMMM yyyy')

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-full bg-[#F8FAF5] dark:bg-[#1E2330] p-4 space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800 dark:text-[#F0EDE4]">Check-In Review</h1>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 dark:text-[#8A9BAA] text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        <VerdictCard
          verdict={result.verdict}
          verdictSummary={result.verdictSummary}
          spendingProgressPercent={result.spendingProgressPercent}
          monthLabel={monthLabel}
        />

        <OutsideBudgetSection
          items={result.outsideBudget}
          onLogTransaction={() => {}}
          onDismiss={() => {}}
          readOnly
        />

        <SuggestedBudgetSection
          items={result.suggestedBudgetItems}
          onAddToBudget={() => {}}
          onDismiss={() => {}}
          readOnly
        />

        <PlannerReviewSection items={result.plannerReview} />
      </div>
    </div>
  )
}
