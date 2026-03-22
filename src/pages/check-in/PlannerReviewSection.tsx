import { useState } from 'react'
import type { PlannerReviewItem } from '../../domain/models'
import { formatCurrency } from '../../domain/constants'

interface Props {
  items: PlannerReviewItem[]
  previousMonthItems?: PlannerReviewItem[]
}

const VERDICT_COLORS: Record<string, string> = {
  affordable: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  tight: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  cannot_afford: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
}

const VERDICT_LABELS: Record<string, string> = {
  affordable: 'Affordable',
  tight: 'Tight',
  cannot_afford: "Can't Afford",
}

function TrendArrow({ previous, current }: { previous: string; current: string }) {
  const order = ['affordable', 'tight', 'cannot_afford']
  const prevIdx = order.indexOf(previous)
  const currIdx = order.indexOf(current)
  if (prevIdx < 0 || currIdx < 0) return null
  if (currIdx > prevIdx) return <span className="text-red-500">↓</span>
  if (currIdx < prevIdx) return <span className="text-green-500">↑</span>
  return <span className="text-gray-400">→</span>
}

export function PlannerReviewSection({ items, previousMonthItems }: Props) {
  const [open, setOpen] = useState(false)

  if (items.length === 0) return null

  const prevMap = new Map(previousMonthItems?.map((i) => [i.scenarioId, i]) ?? [])

  return (
    <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4"
      >
        <span className="font-semibold text-gray-800 dark:text-[#F0EDE4]">Planner Reality Check</span>
        <span className="text-gray-400 dark:text-[#8A9BAA]">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {items.map((item) => {
            const prevMonth = prevMap.get(item.scenarioId)
            const changed = item.previousVerdict !== item.newVerdict

            return (
              <div key={item.scenarioId} className="p-3 bg-gray-50 dark:bg-[#1E2330] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-[#F0EDE4]">{item.scenarioName}</span>
                  {prevMonth && <TrendArrow previous={prevMonth.newVerdict} current={item.newVerdict} />}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full ${VERDICT_COLORS[item.previousVerdict]}`}>
                    {VERDICT_LABELS[item.previousVerdict]}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${VERDICT_COLORS[item.newVerdict]}`}>
                    {VERDICT_LABELS[item.newVerdict]}
                  </span>
                  {changed && <span className="text-xs text-gray-500 dark:text-[#8A9BAA]">changed</span>}
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-[#8A9BAA]">
                  Disposable: {formatCurrency(item.newBaselineDisposable)} · After scenario: {formatCurrency(item.newRemainingAfterScenario)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
