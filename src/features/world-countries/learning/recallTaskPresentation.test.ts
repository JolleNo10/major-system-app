import { describe, expect, it } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { deriveRecallTaskPresentation } from './recallTaskPresentation'

const country: Country = {
  id: 'FM',
  country: 'Micronesia',
  capital: 'Palikir',
  continent: 'Oceania',
  subregionId: 'micronesia',
  subregion: 'Micronesia',
}

describe('deriveRecallTaskPresentation', () => {
  it.each([
    ['location-to-country', { direction: 'Location → Country', cue: 'Name the highlighted country', typedPlaceholder: 'Type the country…', typedAnswerLabel: 'Type the country name', answerKind: 'country' }],
    ['country-to-capital', { direction: 'Country → Capital', cue: 'Micronesia', typedPlaceholder: 'Type the capital…', typedAnswerLabel: 'Type the capital', answerKind: 'capital' }],
    ['capital-to-country', { direction: 'Capital → Country', cue: 'Palikir', typedPlaceholder: 'Type the country…', typedAnswerLabel: 'Type the country name', answerKind: 'country' }],
    ['shape-to-country', { direction: 'Shape → Country', cue: 'Name this country', typedPlaceholder: 'Type the country…', typedAnswerLabel: 'Type the country name', answerKind: 'country' }],
  ] as const)('derives the %s task semantics', (skill, expected) => {
    expect(deriveRecallTaskPresentation(skill, country)).toEqual(expected)
  })
})
