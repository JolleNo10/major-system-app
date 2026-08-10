import { useEffect, useMemo, useState } from 'react'
import type { Country } from '@/features/world-countries/data/countries'
import {
  deriveCountryRecallProgress,
  deriveWorldCountriesCountryProgress,
  loadWorldCountriesRecallProgress,
  type RecallProgress,
} from './recallProgress'
import {
  getCountryProgressColor,
  getCountryProgressState,
  type WorldCountriesProgressPerspective,
} from './progressPresentation'
import type { WorldCountriesRecallSkill } from './recallTargets'

export interface WorldCountriesCountryColorsOptions {
  countries: readonly Country[]
  skills: readonly WorldCountriesRecallSkill[]
  perspective?: WorldCountriesProgressPerspective
  refreshKey?: unknown
}

export interface WorldCountriesCountryColorsResult {
  recallProgress: RecallProgress | null
  countryColorsById: ReadonlyMap<string, string> | undefined
}

/** Load retained evidence and resolve the map color for each Country. */
export function useWorldCountriesCountryColors({
  countries,
  skills,
  perspective = 'core',
  refreshKey,
}: WorldCountriesCountryColorsOptions): WorldCountriesCountryColorsResult {
  const countryIds = useMemo(() => countries.map(country => country.id), [countries])
  const [recallProgress, setRecallProgress] = useState<RecallProgress | null>(null)

  useEffect(() => {
    let active = true
    setRecallProgress(null)
    void loadWorldCountriesRecallProgress({ countryIds, skills }).then(progress => {
      if (active) setRecallProgress(progress)
    })
    return () => { active = false }
  }, [countryIds, refreshKey, skills])

  const countryColorsById = useMemo(() => {
    if (!recallProgress) return undefined
    return new Map(countries.map(country => {
      const progress = perspective === 'core'
        ? deriveWorldCountriesCountryProgress(country.id, recallProgress)
        : deriveCountryRecallProgress(country.id, skills, recallProgress)
      const state = getCountryProgressState(progress, perspective)
      return [country.id, getCountryProgressColor(state)] as const
    }))
  }, [countries, perspective, recallProgress, skills])

  return { recallProgress, countryColorsById }
}
