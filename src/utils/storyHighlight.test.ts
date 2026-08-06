import { describe, it, expect } from 'vitest'
import { highlightStory } from './storyHighlight'

const matchedText = (text: string, words: string[]) =>
  highlightStory(text, words).segments.filter(s => s.matched).map(s => s.text)

describe('highlightStory', () => {
  it('matches exact words', () => {
    expect(matchedText('en bit ost', ['bit'])).toEqual(['bit'])
  })

  it('matches inflected forms (biten for bit)', () => {
    const { segments, missing } = highlightStory('jag åt biten', ['bit'])
    expect(segments.filter(s => s.matched).map(s => s.text)).toEqual(['biten'])
    expect(missing).toEqual([])
  })

  it('is case-insensitive', () => {
    expect(matchedText('Biten var god', ['bit'])).toEqual(['Biten'])
  })

  it('matches any word that starts with the base (prefix match)', () => {
    expect(matchedText('bitar och biten', ['bit'])).toEqual(['bitar', 'biten'])
  })

  it('reports missing expected words (original case)', () => {
    const { missing } = highlightStory('bara katten syns', ['Katt', 'Sko', 'Ros'])
    expect(missing).toEqual(['Sko', 'Ros'])
  })

  it('preserves the full text across segments (roundtrips)', () => {
    const text = 'en bit, och skon!'
    const joined = highlightStory(text, ['bit', 'sko']).segments.map(s => s.text).join('')
    expect(joined).toBe(text)
  })

  it('handles Swedish letters in stems', () => {
    expect(matchedText('ölen var kall', ['öl'])).toEqual(['ölen'])
  })

  it('dedupes duplicate expected words', () => {
    const { missing } = highlightStory('inget här', ['ko', 'ko'])
    expect(missing).toEqual(['ko'])
  })
})
