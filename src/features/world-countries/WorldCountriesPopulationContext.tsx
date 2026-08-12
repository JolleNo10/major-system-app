import { createContext, useContext, type ReactNode } from 'react'
import { countries, type Country } from './data/countries'

const WorldCountriesPopulationContext = createContext<readonly Country[]>(countries)

export function WorldCountriesPopulationProvider({
  countries: activeCountries,
  children,
}: {
  countries: readonly Country[]
  children: ReactNode
}) {
  return (
    <WorldCountriesPopulationContext.Provider value={activeCountries}>
      {children}
    </WorldCountriesPopulationContext.Provider>
  )
}

/** Read the shell-resolved active population; direct consumers fall back to canonical data. */
export function useWorldCountriesPopulation(): readonly Country[] {
  return useContext(WorldCountriesPopulationContext)
}
