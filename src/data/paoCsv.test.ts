import { describe, it, expect } from 'vitest'
import { parsePaoCsv, serializePaoCsv, PAO_CSV_HEADER, type PaoRow } from './paoCsv'

const row = (number: string, person: string, action: string, object: string): PaoRow =>
  ({ number, person, action, object })

describe('parsePaoCsv', () => {
  it('parses rows and skips the header', () => {
    const csv = `${PAO_CSV_HEADER}\n01,Adele,baking,anchor\n02,Beyoncé,boxing,apple`
    const { rows, errors } = parsePaoCsv(csv)
    expect(errors).toEqual([])
    expect(rows).toEqual([row('01', 'Adele', 'baking', 'anchor'), row('02', 'Beyoncé', 'boxing', 'apple')])
  })

  it('parses quoted fields containing commas and doubled quotes', () => {
    const csv = `${PAO_CSV_HEADER}\n01,"Da Vinci, Leonardo",painting,"the ""Mona Lisa"""`
    const { rows, errors } = parsePaoCsv(csv)
    expect(errors).toEqual([])
    expect(rows[0]).toEqual(row('01', 'Da Vinci, Leonardo', 'painting', 'the "Mona Lisa"'))
  })

  it('rejects an out-of-range card number', () => {
    const { errors } = parsePaoCsv(`${PAO_CSV_HEADER}\n53,Zorro,swimming,whistle`)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/invalid card number/)
  })

  it('rejects a duplicate card', () => {
    const csv = `${PAO_CSV_HEADER}\n01,Adele,baking,anchor\n01,Beyoncé,boxing,apple`
    const { errors } = parsePaoCsv(csv)
    expect(errors[0]).toMatch(/duplicate card 01/)
  })

  it('rejects a row missing a field', () => {
    const { errors } = parsePaoCsv(`${PAO_CSV_HEADER}\n01,Adele,,anchor`)
    expect(errors[0]).toMatch(/needs a person, action and object/)
  })

  it('rejects a wrong column count', () => {
    const { errors } = parsePaoCsv(`${PAO_CSV_HEADER}\n01,Adele,baking`)
    expect(errors[0]).toMatch(/expected 4 columns/)
  })

  it('round-trips through serialize → parse', () => {
    const rows = [row('01', 'Da Vinci, Leonardo', 'painting', 'the "Mona Lisa"'), row('52', 'Zorro', 'swimming', 'whistle')]
    const { rows: back, errors } = parsePaoCsv(serializePaoCsv(rows))
    expect(errors).toEqual([])
    expect(back).toEqual(rows)
  })
})
