import { useEffect, useState } from 'react'
import { format, isToday, isTomorrow, isPast } from 'date-fns'
import { useMonth } from '../../app/MonthContext'
import { budgetMonthRepo, commitmentRepo, transactionRepo, settingsRepo } from '../../data/local'
import type { AppSettings } from '../../domain/models'
import { buildTimeline, totalIncome, totalExpenses, type TimelineEvent } from '../../domain/rules'
import { formatCurrency } from '../../domain/constants'

export function TimelinePage() {
  const { selectedMonth, monthKey } = useMonth()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [startingBalance, setStartingBalance] = useState(0)

  useEffect(() => {
    loadData()
  }, [monthKey])

  async function loadData() {
    setLoading(true)
    try {
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth() + 1

      const [bm, sets] = await Promise.all([budgetMonthRepo.getOrCreate(year, month), settingsRepo.get()])
      setSettings(sets)

      const [commitments, txs] = await Promise.all([commitmentRepo.getByMonth(bm.id), transactionRepo.getByMonth(bm.id)])

      const balance = totalIncome(txs) - totalExpenses(txs)
      setStartingBalance(balance)

      const events = buildTimeline(commitments, year, month, balance, sets.paydayDayOfMonth)
      setTimeline(events)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-[#8A9BAA]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4]">Projection</h1>
        <p className="text-sm text-gray-500 dark:text-[#8A9BAA]">
          Upcoming commitments and payday projection ({settings.paydayDayOfMonth}th)
        </p>
        <div className="mt-2">
          <span className="text-sm text-gray-500 dark:text-[#8A9BAA]">Current net cashflow: </span>
          <span className="font-medium dark:text-[#F0EDE4]">{formatCurrency(startingBalance)}</span>
        </div>
      </div>

      {timeline.length === 0 ? (
        <div className="bg-white dark:bg-[#252D3D] rounded-xl p-6 shadow text-center">
          <div className="text-4xl mb-3">📅</div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4] mb-2">No Upcoming Events</h3>
          <p className="text-gray-600 dark:text-[#8A9BAA] text-sm">
            No unpaid commitments are due before the end of the month.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {timeline.map((event, index) => {
            const isPayday = event.type === 'payday'
            const isPastDate = isPast(event.date) && !isToday(event.date)

            return (
              <div
                key={index}
                className={`bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow flex items-center gap-4 ${isPastDate ? 'opacity-60' : ''}`}
              >
                <div className="w-20 text-center flex-shrink-0">
                  <div className={`text-2xl font-bold ${isPayday ? 'text-[#C4A86B]' : 'text-gray-800 dark:text-[#F0EDE4]'}`}>
                    {format(event.date, 'd')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-[#8A9BAA]">{format(event.date, 'EEE')}</div>
                </div>

                <div className={`w-1 h-12 rounded ${isPayday ? 'bg-[#C4A86B]' : 'bg-red-400'}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-[#F0EDE4]">
                      {isPayday ? 'Payday' : event.commitment?.name}
                    </span>
                    {isToday(event.date) && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Today</span>}
                    {isTomorrow(event.date) && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Tomorrow</span>}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-[#8A9BAA] mt-0.5">
                    {isPayday ? 'Income checkpoint' : event.commitment?.type ?? format(event.date, 'EEE, d MMM')}
                  </div>
                </div>

                <div className="text-right">
                  {!isPayday && <div className="text-red-600 font-medium">{formatCurrency(Math.abs(event.amount))}</div>}
                  <div className={`text-xs ${(event.runningBalance || 0) < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    Balance: {formatCurrency(event.runningBalance || 0)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {timeline.some((event) => (event.runningBalance || 0) < 0) && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="font-medium text-red-800">Cashflow Warning</h3>
              <p className="text-sm text-red-600 mt-1">
                Your projected balance goes negative before payday. Prioritise upcoming commitments or reduce discretionary spending.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
