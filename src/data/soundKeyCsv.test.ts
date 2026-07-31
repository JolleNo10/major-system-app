import { describe, it, expect } from 'vitest'
import { parseSoundKeyCsv, serializeSoundKeyCsv, type SoundKeyRow } from './soundKeyCsv'

const row = (
  digit: string,
  sounds: [string, string],
  display: [string, string],
  hint: [string, string],
): SoundKeyRow => ({
  digit,
  sounds: { def: sounds[0], custom: sounds[1] },
  display: { def: display[0], custom: display[1] },
  hint: { def: hint[0], custom: hint[1] },
})

describe('parseSoundKeyCsv', () => {
  it('parses quoted fields containing commas and doubled quotes', () => {
    const csv =
      'digit,sounds_default,sounds_custom,display_default,display_custom,hint_default,hint_custom\n' +
      '0,"s, z",,"s, z",,"""0"" ligner en S",\n' +
      '4,r,,r,,"siste bokstav i ""fouR""",'
    const { rows, errors } = parseSoundKeyCsv(csv)
    expect(errors).toEqual([])
    expect(rows[0].display.def).toBe('s, z')
    expect(rows[0].hint.def).toBe('"0" ligner en S')
    expect(rows[1].hint.def).toBe('siste bokstav i "fouR"')
  })

  it('uses custom over default and allows empty hint', () => {
    const { rows, errors } = parseSoundKeyCsv('7,"k, g","k, g!","k, g (hard)",,,')
    expect(errors).toEqual([])
    expect(rows[0].sounds.custom).toBe('k, g!')
    expect(rows[0].hint.def).toBe('')
  })

  it('collects errors: bad digit, duplicate, missing sounds/display, wrong column count', () => {
    const { rows, errors } = parseSoundKeyCsv(
      'x,a,,a,,h,\n' +      // invalid digit
      '3,m,,m,,h,\n' +      // ok
      '3,m,,m,,h,\n' +      // duplicate
      '5,,,l,,h,\n' +       // missing sounds (both empty)
      '6,sj,,,,h,\n' +      // missing display
      '8,f,,f',            // too few columns
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].digit).toBe('3')
    const joined = errors.join('\n')
    expect(joined).toMatch(/invalid digit "x"/)
    expect(joined).toMatch(/duplicate digit 3/)
    expect(joined).toMatch(/missing sounds for digit 5/)
    expect(joined).toMatch(/missing display for digit 6/)
    expect(joined).toMatch(/expected 7 columns/)
  })

  it('round-trips through serialize (including comma/quote fields)', () => {
    const rows = [
      row('0', ['s, z', ''], ['s, z', ''], ['"0" ligner en S', '']),
      row('7', ['k, g', 'k, g, x'], ['k, g (hard)', ''], ['K ser ut som 2 × 7', 'custom, tip']),
    ]
    const { rows: back, errors } = parseSoundKeyCsv(serializeSoundKeyCsv(rows))
    expect(errors).toEqual([])
    expect(back).toEqual(rows)
  })
})
