// Default Budget Groups
export const DEFAULT_GROUPS = [
  { name: 'Needs', sortOrder: 1 },
  { name: 'Should Die', sortOrder: 2 },
] as const

// Default Categories by Group
export const DEFAULT_CATEGORIES = {
  'Needs': [
    'Rent',
    'Utilities',
    'Groceries',
    'Transport',
    'Medical',
    'Insurance',
    'Phone/Internet',
  ],
  'Should Die': [
    'Eating Out',
    'Entertainment',
    'Subscriptions',
    'Shopping',
    'Personal Care',
  ],
} as const

// App defaults
export const DEFAULT_PAYDAY_DAY = 25

// Currency
export const CURRENCY_CODE = 'ZAR'
export const CURRENCY_SYMBOL = 'R'

// Formatters
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: CURRENCY_CODE,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const formatCurrencyShort = (amount: number): string => {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// Split ratio helpers
export const COMMON_SPLIT_RATIOS = [
  { label: 'Full (1)', value: 1 },
  { label: 'Half (1/2)', value: 0.5 },
  { label: 'Third (1/3)', value: 1/3 },
  { label: 'Quarter (1/4)', value: 0.25 },
] as const

export const parseSplitRatio = (input: string): number => {
  // Handle fraction notation like "1/2", "1/3"
  if (input.includes('/')) {
    const parts = input.split('/')
    if (parts.length === 2) {
      const num = parseFloat(parts[0])
      const den = parseFloat(parts[1])
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return num / den
      }
    }
  }
  // Handle decimal notation
  const decimal = parseFloat(input)
  if (!isNaN(decimal)) {
    return decimal
  }
  return 1 // default
}
