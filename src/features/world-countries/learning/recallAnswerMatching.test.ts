import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { classifyRecallAnswer } from './recallAnswerMatching'

const norway = countries.find(country => country.id === 'NO')!
const democraticRepublicOfTheCongo = countries.find(country => country.id === 'CD')!
const republicOfTheCongo = countries.find(country => country.id === 'CG')!
const turkiye = countries.find(country => country.id === 'TR')!
const sriLanka = countries.find(country => country.id === 'LK')!
const unitedStates = countries.find(country => country.id === 'US')!

describe('World Countries recall answer matching', () => {
  it('evaluates each recall direction against the canonical relationship', () => {
    expect(classifyRecallAnswer('location-to-country', 'Norway', norway)).toBe('exact')
    expect(classifyRecallAnswer('shape-to-country', 'Norway', norway)).toBe('exact')
    expect(classifyRecallAnswer('country-to-capital', 'Oslo', norway)).toBe('exact')
    expect(classifyRecallAnswer('capital-to-country', 'Norway', norway)).toBe('exact')
    expect(classifyRecallAnswer('country-to-capital', 'Stockholm', norway)).toBe('none')
  })

  it('keeps fuzzy matching opt-in and reports the kind of match', () => {
    expect(classifyRecallAnswer('country-to-capital', 'Oslo', norway)).toBe('exact')
    expect(classifyRecallAnswer('country-to-capital', 'Osl', norway, { fuzzy: true })).toBe('none')
    expect(classifyRecallAnswer('location-to-country', 'Noreway', norway, {
      fuzzy: true,
      countryCandidates: [norway],
    })).toBe('fuzzy')
    expect(classifyRecallAnswer('shape-to-country', 'Noreway', norway, {
      fuzzy: true,
      countryCandidates: [norway],
    })).toBe('fuzzy')
  })

  it('accepts deliberate country aliases and rejects ambiguous Congo answers', () => {
    expect(classifyRecallAnswer('location-to-country', 'DRC', democraticRepublicOfTheCongo)).toBe('exact')
    expect(classifyRecallAnswer('location-to-country', 'DR Congo', democraticRepublicOfTheCongo)).toBe('exact')
    expect(classifyRecallAnswer('location-to-country', 'Congo-Kinshasa', democraticRepublicOfTheCongo)).toBe('exact')
    expect(classifyRecallAnswer('location-to-country', 'Congo', democraticRepublicOfTheCongo)).toBe('none')

    expect(classifyRecallAnswer('location-to-country', 'Congo-Brazzaville', republicOfTheCongo)).toBe('exact')
    expect(classifyRecallAnswer('location-to-country', 'Congo Republic', republicOfTheCongo)).toBe('exact')
    expect(classifyRecallAnswer('location-to-country', 'Congo', republicOfTheCongo)).toBe('none')

    expect(classifyRecallAnswer('location-to-country', 'Turkey', turkiye)).toBe('exact')
  })

  it('accepts deliberate capital aliases while preserving canonical answers', () => {
    expect(classifyRecallAnswer('country-to-capital', 'Kotte', sriLanka)).toBe('exact')
    expect(classifyRecallAnswer('country-to-capital', 'Washington', unitedStates)).toBe('exact')
    expect(classifyRecallAnswer('country-to-capital', 'Sri Jayawardenepura Kotte', sriLanka)).toBe('exact')
    expect(classifyRecallAnswer('country-to-capital', 'Washington, D.C.', unitedStates)).toBe('exact')
  })
})
