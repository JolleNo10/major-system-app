import { useId, useMemo, useState } from 'react'
import { countriesToSvgIds } from '@/features/world-countries/maps/countryMapIds'
import { SvgMapView, type SvgMapCountry } from '@/features/world-countries/maps/SvgMapView'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { createCountryColorsById, createCountryOrderLabels, getCountryForSvgId, resolveCountriesToSvgIds } from '@/features/world-countries/maps/geographyMapAdapter'
import { getMemoMapDefinition } from '@/features/world-countries/maps/mapDefinitions'

export interface CountryLearningMapProps {
  continent: Continent
  scopeCountries: readonly Country[]
  /** Optional wider Country collection used only to determine the map viewport. */
  zoomCountries?: readonly Country[]
  showNames?: boolean
  showHoverNames?: boolean
  showOrderNumbers?: boolean
  namedCountryId?: string | null
  highlightedCountryId?: string | null
  hoveredCountryId?: string | null
  showHighlightedNames?: boolean
  mapClassName?: string
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
  zoomCountries,
  showNames = false,
  showHoverNames = false,
  showOrderNumbers = false,
  namedCountryId = null,
  highlightedCountryId = null,
  hoveredCountryId = null,
  showHighlightedNames = true,
  mapClassName,
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
  const zoomScopeSvgIds = useMemo(
    () => resolveCountriesToSvgIds(zoomCountries ?? scopeCountries, discoveredIds),
    [discoveredIds, scopeCountries, zoomCountries],
  )
  const highlightedSvgIds = useMemo(() => {
    if (!highlightedCountryId) return []
    const country = scopeCountries.find(entry => entry.id === highlightedCountryId)
    return country ? countriesToSvgIds([country]).filter(id => discoveredIds.includes(id)) : []
  }, [discoveredIds, highlightedCountryId, scopeCountries])
  const hoveredSvgId = useMemo(() => {
    if (!hoveredCountryId) return null
    const country = scopeCountries.find(entry => entry.id === hoveredCountryId)
    return country ? resolveCountriesToSvgIds([country], discoveredIds)[0] ?? null : null
  }, [discoveredIds, hoveredCountryId, scopeCountries])
  const namedSvgIds = useMemo(() => {
    if (showNames || showOrderNumbers) return scopeSvgIds
    if (!namedCountryId) return []
    const country = scopeCountries.find(entry => entry.id === namedCountryId)
    return country ? countriesToSvgIds([country]).filter(id => discoveredIds.includes(id)) : []
  }, [discoveredIds, namedCountryId, scopeCountries, scopeSvgIds, showNames])
  const countryLabels = useMemo(
    () => showOrderNumbers ? createCountryOrderLabels(scopeCountries, discoveredIds) : {},
    [discoveredIds, scopeCountries, showOrderNumbers],
  )
  const zoomIds = getCountryLearningMapZoomIds(continent, zoomScopeSvgIds)
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
        hoveredId={hoveredSvgId}
        mutedIds={discoveredIds.filter(id => !scopeSvgIds.includes(id))}
        namedIds={namedSvgIds}
        countryLabels={countryLabels}
        countryColors={countryColors}
        zoomIds={zoomIds}
        className={mapClassName}
        settings={{ showHighlightedNames, hoverHighlight: hoveredCountryId !== null, hoverShowName: showHoverNames, hoverFill: '#0f766e', hoverStroke: '#d4d4d8', hoverStrokeWidth: '2px' }}
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
