import { describe, it, expect } from 'vitest'
import { parseWordsCsv, serializeWordsCsv } from './wordsCsv'

describe('parseWordsCsv', () => {
  it('parses valid rows, skips the header, and treats custom as optional', () => {
    const { rows, errors } = parseWordsCsv('number,default,custom\n00,saus,\n13,dame,dame-variant\n42,regn')
    expect(errors).toEqual([])
    expect(rows).toEqual([
      { number: '00', def: 'saus', custom: '' },
      { number: '13', def: 'dame', custom: 'dame-variant' },
      { number: '42', def: 'regn', custom: '' },
    ])
  })

  it('collects errors and applies nothing bad', () => {
    const { rows, errors } = parseWordsCsv('9,x\n13,dame\n13,damen\n50,\n77,a,b,c')
    // Only the one clean row survives
    expect(rows).toEqual([{ number: '13', def: 'dame', custom: '' }])
    expect(errors).toHaveLength(4)
    expect(errors.join('\n')).toMatch(/invalid number "9"/)
    expect(errors.join('\n')).toMatch(/duplicate number 13/)
    expect(errors.join('\n')).toMatch(/missing word for 50/)
    expect(errors.join('\n')).toMatch(/expected "number,default\[,custom\]"/)
  })

  it('ignores blank lines', () => {
    const { rows, errors } = parseWordsCsv('\n00,saus\n\n01,sete\n')
    expect(errors).toEqual([])
    expect(rows.map(r => r.number)).toEqual(['00', '01'])
  })

  it('round-trips through serialize', () => {
    const rows = [
      { number: '00', def: 'saus', custom: '' },
      { number: '13', def: 'dame', custom: 'damen' },
    ]
    const { rows: back, errors } = parseWordsCsv(serializeWordsCsv(rows))
    expect(errors).toEqual([])
    expect(back).toEqual(rows)
  })
})
