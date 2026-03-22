import { formatCurrency } from '../../domain/constants'

interface KPISummaryStripProps {
  spentSoFar: number
  budgetRemaining: number
  billsLeftCount: number
  billsLeftAmount: number
  daysToPayday: number
}

export function KPISummaryStrip({
  spentSoFar,
  budgetRemaining,
  billsLeftCount,
  billsLeftAmount,
  daysToPayday,
}: KPISummaryStripProps) {
  const cards = [
    { label: 'Spent so far', value: formatCurrency(spentSoFar), color: 'text-gray-800 dark:text-[#F0EDE4]' },
    {
      label: 'Budget remaining',
      value: formatCurrency(budgetRemaining),
      color: budgetRemaining >= 0 ? 'text-[#A89060]' : 'text-red-500',
    },
    { label: 'Bills left', value: `${billsLeftCount} (${formatCurrency(billsLeftAmount)})`, color: 'text-gray-800 dark:text-[#F0EDE4]' },
    { label: 'Days to payday', value: `${daysToPayday}`, color: 'text-gray-800 dark:text-[#F0EDE4]' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card) => (
        <div key={card.label} className="bg-white dark:bg-[#252D3D] rounded-lg p-3 shadow">
          <div className="text-xs text-gray-500 dark:text-[#8A9BAA]">{card.label}</div>
          <div className={`text-sm font-bold mt-0.5 ${card.color}`}>{card.value}</div>
        </div>
      ))}
    </div>
  )
}
