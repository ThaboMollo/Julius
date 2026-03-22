import { useState } from 'react'
import type { OutsideBudgetItem } from '../../domain/models'
import { formatCurrency } from '../../domain/constants'
import { SwipeableRow } from './SwipeableRow'

interface Props {
  items: OutsideBudgetItem[]
  onLogTransaction: (item: OutsideBudgetItem, index: number) => void
  onDismiss: (index: number) => void
  readOnly?: boolean
}

export function OutsideBudgetSection({ items, onLogTransaction, onDismiss, readOnly = false }: Props) {
  const [open, setOpen] = useState(false)
  const activeCount = items.filter((i) => !i.actionTaken).length

  return (
    <div className="bg-white dark:bg-[#252D3D] rounded-xl shadow overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 dark:text-[#F0EDE4]">Outside Your Budget</span>
          {activeCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <span className="text-gray-400 dark:text-[#8A9BAA]">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-[#8A9BAA] py-2">Nothing outside your budget. Nice.</p>
          )}
          {items.map((item, idx) => (
            <div key={idx} className={item.actionTaken ? 'opacity-40' : ''}>
              <SwipeableRow
                onSwipeRight={!readOnly && !item.actionTaken ? () => onLogTransaction(item, idx) : undefined}
                onSwipeLeft={!readOnly && !item.actionTaken ? () => onDismiss(idx) : undefined}
                rightLabel="Log"
                leftLabel="Dismiss"
                disabled={!!item.actionTaken || readOnly}
              >
                <div className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800 dark:text-[#F0EDE4]">{item.description}</div>
                      <div className="text-xs text-gray-500 dark:text-[#8A9BAA] mt-0.5">{item.date}</div>
                    </div>
                    <div className="text-sm font-bold text-red-500">{formatCurrency(item.amount)}</div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-[#8A9BAA] mt-1 italic">"{item.aiComment}"</div>
                  {item.actionTaken && (
                    <div className="text-xs text-[#A89060] mt-1 font-medium">
                      {item.actionTaken === 'added_transaction' ? '✓ Logged' : '✕ Dismissed'}
                    </div>
                  )}
                  {!readOnly && !item.actionTaken && (
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => onLogTransaction(item, idx)}
                        className="text-xs px-2 py-1 bg-[#A89060] text-white rounded hover:bg-[#8B7550]"
                      >
                        Log Transaction
                      </button>
                      <button
                        type="button"
                        onClick={() => onDismiss(idx)}
                        className="text-xs px-2 py-1 bg-gray-200 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA] rounded"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </SwipeableRow>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
