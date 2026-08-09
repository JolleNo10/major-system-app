import { useMemo, useState } from 'react'
import { countriesToSvgIds } from '@/features/world-countries/maps/countryMapIds'
import { SvgMapView, type SvgMapCountry } from '@/features/world-countries/maps/SvgMapView'
import type { Country } from '@/features/world-countries/data/countries'
import type { Continent } from '@/features/world-countries/data/countries'
import { createCountryOrderLabels, getCountryForSvgId, resolveCountriesToSvgIds } from '@/features/world-countries/maps/geographyMapAdapter'
import { getMemoMapDefinition } from '@/features/world-countries/maps/mapDefinitions'

export interface CountryLearningMapProps {
  continent: Continent
  scopeCountries: readonly Country[]
  showNames?: boolean
  showOrderNumbers?: boolean
  namedCountryId?: string | null
  highlightedCountryId?: string | null
  onCountryClick?: (countryId: string) => void
  ariaLabel: string
}

export function CountryLearningMap({
  continent,
  scopeCountries,
  showNames = false,
  showOrderNumbers = false,
  namedCountryId = null,
  highlightedCountryId = null,
  onCountryClick,
  ariaLabel,
}: CountryLearningMapProps) {
  const definition = useMemo(() => getMemoMapDefinition(continent), [continent])
  const [discovered, setDiscovered] = useState<readonly SvgMapCountry[]>([])
  const discoveredIds = useMemo(() => discovered.map(country => country.id), [discovered])
  const scopeSvgIds = useMemo(
    () => resolveCountriesToSvgIds(scopeCountries, discoveredIds),
    [discoveredIds, scopeCountries],
  )
  const highlightedSvgIds = useMemo(() => {
    if (!highlightedCountryId) return []
    const country = scopeCountries.find(entry => entry.id === highlightedCountryId)
    return country ? countriesToSvgIds([country]).filter(id => discoveredIds.includes(id)) : []
  }, [discoveredIds, highlightedCountryId, scopeCountries])
  const namedSvgIds = useMemo(() => {
    if (showNames) return scopeSvgIds
    if (!namedCountryId) return []
    const country = scopeCountries.find(entry => entry.id === namedCountryId)
    return country ? countriesToSvgIds([country]).filter(id => discoveredIds.includes(id)) : []
  }, [discoveredIds, namedCountryId, scopeCountries, scopeSvgIds, showNames])
  const countryLabels = useMemo(
    () => showOrderNumbers ? createCountryOrderLabels(scopeCountries, discoveredIds) : {},
    [discoveredIds, scopeCountries, showOrderNumbers],
  )

  return (
    <SvgMapView
      svgUrl={definition.svgUrl}
      ariaLabel={ariaLabel}
      highlightedIds={highlightedSvgIds}
      mutedIds={discoveredIds.filter(id => !scopeSvgIds.includes(id))}
      namedIds={namedSvgIds}
      countryLabels={countryLabels}
      zoomIds={scopeSvgIds}
      onCountriesLoaded={setDiscovered}
      onCountryClick={svgId => {
        const country = getCountryForSvgId(svgId, scopeCountries)
        if (country) onCountryClick?.(country.id)
      }}
    />
  )
}
