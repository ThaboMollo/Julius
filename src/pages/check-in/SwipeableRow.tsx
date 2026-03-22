import { useRef, useState } from 'react'

interface SwipeableRowProps {
  children: React.ReactNode
  onSwipeRight?: () => void
  onSwipeLeft?: () => void
  rightLabel?: string
  leftLabel?: string
  rightColor?: string
  leftColor?: string
  disabled?: boolean
}

const SWIPE_THRESHOLD = 80

export function SwipeableRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = 'Action',
  leftLabel = 'Dismiss',
  rightColor = 'bg-[#A89060]',
  leftColor = 'bg-gray-400',
  disabled = false,
}: SwipeableRowProps) {
  const startX = useRef(0)
  const currentX = useRef(0)
  const [offset, setOffset] = useState(0)
  const [swiping, setSwiping] = useState(false)

  function handleTouchStart(e: React.TouchEvent) {
    if (disabled) return
    startX.current = e.touches[0].clientX
    setSwiping(true)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!swiping || disabled) return
    currentX.current = e.touches[0].clientX
    const diff = currentX.current - startX.current
    setOffset(Math.max(-150, Math.min(150, diff)))
  }

  function handleTouchEnd() {
    if (!swiping || disabled) return
    setSwiping(false)
    if (offset > SWIPE_THRESHOLD && onSwipeRight) {
      onSwipeRight()
    } else if (offset < -SWIPE_THRESHOLD && onSwipeLeft) {
      onSwipeLeft()
    }
    setOffset(0)
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {offset > 0 && onSwipeRight && (
        <div className={`absolute inset-y-0 left-0 ${rightColor} flex items-center px-4 text-white text-sm font-medium`}>
          {rightLabel}
        </div>
      )}
      {offset < 0 && onSwipeLeft && (
        <div className={`absolute inset-y-0 right-0 ${leftColor} flex items-center px-4 text-white text-sm font-medium`}>
          {leftLabel}
        </div>
      )}
      <div
        className="relative bg-white dark:bg-[#252D3D] transition-transform"
        style={{ transform: swiping ? `translateX(${offset}px)` : undefined }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
