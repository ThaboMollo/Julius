export interface ParsedTransaction {
  date: Date
  amount: number       // negative = debit (expense)
  description: string
  reference?: string
  balance?: number
}
