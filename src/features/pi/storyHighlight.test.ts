import { describe, it, expect } from 'vitest'
import { highlightStory } from '@/features/pi/storyHighlight'

const matchedText = (text: string, words: string[]) =>
  highlightStory(text, words).segments.filter(s => s.matched).map(s => s.text)

// Boolean matched-pattern over just the word tokens (separators ignored).
const wordPattern = (text: string, words: string[]) =>
  highlightStory(text, words).segments
    .filter(s => /[\p{L}\p{N}]/u.test(s.text))
    .map(s => s.matched)

describe('highlightStory', () => {
  it('matches exact words', () => {
    expect(matchedText('en bit ost', ['bit'])).toEqual(['bit'])
  })

  it('matches inflected forms (biten for bit)', () => {
    const { segments, missing } = highlightStory('jag åt biten', ['bit'])
    expect(segments.filter(s => s.matched).map(s => s.text)).toEqual(['biten'])
    expect(missing).toEqual([])
  })

  it('matches compound suffixes (fotballmål for mål)', () => {
    const { segments, missing } = highlightStory('Han scoret et fotballmål', ['mål'])
    expect(segments.filter(s => s.matched).map(s => s.text)).toEqual(['fotballmål'])
    expect(missing).toEqual([])
  })

  it('does not match a word in the middle of a token', () => {
    const { segments, missing } = highlightStory('En formåling', ['mål'])
    expect(segments.some(s => s.matched)).toBe(false)
    expect(missing).toEqual(['mål'])
  })

  it('is case-insensitive', () => {
    expect(matchedText('Biten var god', ['bit'])).toEqual(['Biten'])
  })

  it('consumes the sequence in order — only the next occurrence per word', () => {
    // words: ball, hale, ball
    const text = 'lorum ipusm ball, ball bla bla, hale, bld blad ball, hale.'
    // tokens:  lorum ipusm ball  ball bla bla  hale  bld blad ball  hale
    expect(wordPattern(text, ['ball', 'hale', 'ball'])).toEqual([
      false, false, true,  // 1st ball ✓
      false, false, false, // 2nd ball skipped (next expected is hale)
      true,                // 1st hale ✓
      false, false, true,  // 3rd ball ✓
      false,               // last hale not expected → not highlighted
    ])
  })

  it('a single expected word only highlights its first occurrence', () => {
    expect(matchedText('bitar och biten', ['bit'])).toEqual(['bitar'])
  })

  it('reports missing expected words but keeps matching later ones', () => {
    // "sko" has no match; "ros" (as rosen) still matches afterwards.
    const { missing } = highlightStory('katten och rosen', ['Katt', 'Sko', 'Ros'])
    expect(missing).toEqual(['Sko'])
    expect(matchedText('katten och rosen', ['Katt', 'Sko', 'Ros'])).toEqual(['katten', 'rosen'])
  })

  it('a repeated word with only one occurrence is partly missing', () => {
    const { missing } = highlightStory('en ball här', ['ball', 'ball'])
    expect(matchedText('en ball här', ['ball', 'ball'])).toEqual(['ball'])
    expect(missing).toEqual(['ball'])
  })

  it('preserves the full text across segments (roundtrips)', () => {
    const text = 'en bit, och skon!'
    const joined = highlightStory(text, ['bit', 'sko']).segments.map(s => s.text).join('')
    expect(joined).toBe(text)
  })

  it('handles Swedish letters in stems', () => {
    expect(matchedText('ölen var kall', ['öl'])).toEqual(['ölen'])
  })
})
