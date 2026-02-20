import type { BankConfig } from '../../domain/models'
import type { ParsedTransaction } from './types'
import { parseFNB } from './fnb'
import { parseCapitec } from './capitec'
import { parseStandardBank } from './standard-bank'
import { parseDiscovery } from './discovery'
import { parseABSA } from './absa'

export type { ParsedTransaction }

export function getParserForBank(
  bankCode: BankConfig['bankCode']
): (csvText: string) => ParsedTransaction[] {
  switch (bankCode) {
    case 'fnb':
      return parseFNB
    case 'capitec':
      return parseCapitec
    case 'standard_bank':
      return parseStandardBank
    case 'discovery':
      return parseDiscovery
    case 'absa':
      return parseABSA
    default:
      throw new Error(`No parser for bank code: ${bankCode}`)
  }
}
