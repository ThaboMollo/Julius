import { parseFNB, parseFNBPdf } from './fnb'

describe('parseFNB (CSV)', () => {
  it('parses a typical FNB CSV with simple headers', () => {
    const csv = [
      'Date,Description,Amount,Balance',
      '01/04/2026,Pick n Pay Groceries,-450.50,12500.00',
      '02/04/2026,Salary Deposit,15000.00,27500.00',
      '03/04/2026,Vodacom Airtime,-100.00,27400.00',
    ].join('\n')

    const result = parseFNB(csv)
    expect(result).toHaveLength(3)
    expect(result[0].amount).toBe(-450.5)
    expect(result[0].description).toContain('Pick n Pay')
    expect(result[1].amount).toBe(15000)
  })

  it('handles the FNB-with-Description1 column variant', () => {
    const csv = [
      '"Account Number","Description 1","Description 2","Description 3","Amount","Balance","Date"',
      '"123","Checkers","Reference X","",-200.00,5000.00,15/04/2026',
    ].join('\n')

    const result = parseFNB(csv)
    expect(result).toHaveLength(1)
    expect(result[0].description).toContain('Checkers')
    expect(result[0].amount).toBe(-200)
  })

  it('returns empty array on a single header line (no data rows)', () => {
    const csv = 'Date,Description,Amount,Balance'
    expect(parseFNB(csv)).toEqual([])
  })

  it('skips rows with malformed amounts but keeps valid rows', () => {
    const csv = [
      'Date,Description,Amount,Balance',
      '01/04/2026,Valid,-100.00,1000.00',
      '02/04/2026,Bad Amount,not-a-number,1000.00',
      '03/04/2026,Also Valid,-50.00,950.00',
    ].join('\n')

    const result = parseFNB(csv)
    expect(result).toHaveLength(2)
    expect(result.every((tx) => !isNaN(tx.amount))).toBe(true)
  })

  it('returns empty when required columns (Date or Amount) are missing', () => {
    const csv = ['Description,Reference', 'Pick n Pay,Reference'].join('\n')
    expect(parseFNB(csv)).toEqual([])
  })
})

describe('parseFNBPdf', () => {
  it('parses lines with date, description, amount, balance', () => {
    const text = [
      '01 Apr 2026 Pick n Pay Groceries -450.50 12500.00',
      '02 Apr 2026 Salary Deposit 15000.00 27500.00',
    ].join('\n')

    const result = parseFNBPdf(text)
    expect(result).toHaveLength(2)
    expect(result[0].description).toContain('Pick n Pay')
    expect(result[0].amount).toBe(-450.5)
    expect(result[0].balance).toBe(12500)
    expect(result[1].amount).toBe(15000)
  })

  it('parses lines without balance column', () => {
    const text = '15 Apr 2026 Vodacom Airtime -100.00'
    const result = parseFNBPdf(text)
    expect(result).toHaveLength(1)
    expect(result[0].description).toContain('Vodacom')
  })

  it('skips lines that do not match the expected pattern', () => {
    const text = [
      'STATEMENT FOR PERIOD',
      'Page 1 of 3',
      '01 Apr 2026 Real Transaction -100.00 5000.00',
      '',
    ].join('\n')

    const result = parseFNBPdf(text)
    expect(result).toHaveLength(1)
    expect(result[0].description).toBe('Real Transaction')
  })
})
