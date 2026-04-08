interface VerdictCardProps {
  verdict: 'doing_well' | 'fucking_up'
  verdictSummary: string
  spendingProgressPercent: number
  monthLabel: string
  compact?: boolean
}

function ProgressRing({ percent, verdict }: { percent: number; verdict: string }) {
  const radius = 40
  const stroke = 6
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const capped = Math.min(percent, 100)
  const strokeDashoffset = circumference - (capped / 100) * circumference

  const color = verdict === 'doing_well'
    ? percent <= 55 ? '#A89060' : '#D97706'
    : '#EF4444'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>
      <span className="absolute text-sm font-bold text-gray-800 dark:text-[#F0EDE4]">
        {Math.round(capped)}%
      </span>
    </div>
  )
}

export function VerdictCard({ verdict, verdictSummary, spendingProgressPercent, monthLabel, compact = false }: VerdictCardProps) {
  const isGood = verdict === 'doing_well'
  const verdictText = isGood ? "You're doing well" : "You're fucking up"
  const verdictColor = isGood ? 'text-[#A89060]' : 'text-red-500'
  const bgColor = isGood ? 'bg-[#F5EFE2] dark:bg-[#2A2520]' : 'bg-red-50 dark:bg-[#2D2025]'
  const animClass = isGood ? 'checkin-confetti' : 'checkin-shake'

  if (compact) {
    return (
      <div className={`${bgColor} rounded-xl p-3 flex items-center gap-3 shadow`}>
        <ProgressRing percent={spendingProgressPercent} verdict={verdict} />
        <span className={`font-bold ${verdictColor}`}>{verdictText}</span>
      </div>
    )
  }

  return (
    <div className={`${bgColor} rounded-xl p-5 shadow ${animClass}`}>
      <div className="flex items-center gap-4 mb-3">
        <ProgressRing percent={spendingProgressPercent} verdict={verdict} />
        <div>
          <h2 className={`text-xl font-bold ${verdictColor}`}>{verdictText}</h2>
          <p className="text-xs text-gray-500 dark:text-[#8A9BAA]">{monthLabel} — Mid-Month Check-In</p>
        </div>
      </div>
      <p className="text-sm text-gray-700 dark:text-[#C0C8D0] leading-relaxed">{verdictSummary}</p>
    </div>
  )
}
