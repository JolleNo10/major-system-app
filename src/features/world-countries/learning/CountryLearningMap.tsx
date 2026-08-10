import { useId, useMemo, useState } from 'react'
import { countriesToSvgIds } from '@/features/world-countries/maps/countryMapIds'
import { SvgMapView, type SvgMapCountry } from '@/features/world-countries/maps/SvgMapView'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { createCountryColorsById, createCountryOrderLabels, getCountryForSvgId, resolveCountriesToSvgIds } from '@/features/world-countries/maps/geographyMapAdapter'
import { getMemoMapDefinition } from '@/features/world-countries/maps/mapDefinitions'

export interface CountryLearningMapProps {
  continent: Continent
  scopeCountries: readonly Country[]
  showNames?: boolean
  showOrderNumbers?: boolean
  namedCountryId?: string | null
  highlightedCountryId?: string | null
  showHighlightedNames?: boolean
  /** Optional caller-owned result/overview progress colors. */
  countryColorsById?: ReadonlyMap<string, string>
  /** Optional non-color descriptions for mapped Countries. */
  countryAccessibleDescriptionsById?: ReadonlyMap<string, string>
  onCountryClick?: (countryId: string) => void
  ariaLabel: string
}

/** Oceania's scattered microstates make subregion bounds too tight to teach from. */
export function getCountryLearningMapZoomIds(
  continent: Continent,
  scopeSvgIds: readonly string[],
): readonly string[] {
  return continent === 'Oceania' ? [] : scopeSvgIds
}

/** Reusable map presentation for World Countries learning workflows. */
export function CountryLearningMap({
  continent,
  scopeCountries,
  showNames = false,
  showOrderNumbers = false,
  namedCountryId = null,
  highlightedCountryId = null,
  showHighlightedNames = true,
  countryColorsById,
  countryAccessibleDescriptionsById,
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
  const zoomIds = getCountryLearningMapZoomIds(continent, scopeSvgIds)
  const countryColors = useMemo(
    () => countryColorsById
      ? createCountryColorsById(scopeCountries, countryColorsById, discoveredIds)
      : [],
    [countryColorsById, discoveredIds, scopeCountries],
  )
  const descriptionId = `country-learning-map-descriptions-${useId().replace(/:/g, '')}`
  const countryDescriptions = useMemo(
    () => countryAccessibleDescriptionsById
      ? scopeCountries.map(country => `${country.country}: ${countryAccessibleDescriptionsById.get(country.id) ?? 'No mapped status description.'}`)
      : [],
    [countryAccessibleDescriptionsById, scopeCountries],
  )

  return (
    <div className="space-y-2">
      <SvgMapView
        svgUrl={definition.svgUrl}
        ariaLabel={ariaLabel}
        ariaDescribedBy={countryDescriptions.length ? descriptionId : undefined}
        highlightedIds={highlightedSvgIds}
        mutedIds={discoveredIds.filter(id => !scopeSvgIds.includes(id))}
        namedIds={namedSvgIds}
        countryLabels={countryLabels}
        countryColors={countryColors}
        zoomIds={zoomIds}
        settings={{ showHighlightedNames }}
        onCountriesLoaded={setDiscovered}
        onCountryClick={svgId => {
          const country = getCountryForSvgId(svgId, scopeCountries)
          if (country) onCountryClick?.(country.id)
        }}
      />
      {countryDescriptions.length > 0 && (
        <ul id={descriptionId} className="sr-only" aria-label="Country map descriptions">
          {countryDescriptions.map(description => <li key={description}>{description}</li>)}
        </ul>
      )}
    </div>
  )
}
