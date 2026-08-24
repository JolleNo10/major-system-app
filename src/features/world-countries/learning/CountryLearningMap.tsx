import { useId, useMemo, useState } from 'react'
import { countriesToSvgIds } from '@/features/world-countries/maps/countryMapIds'
import { SvgMapView, type SvgMapCountry } from '@/features/world-countries/maps/SvgMapView'
import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import { createCountryColorsById, createCountryOrderLabels, getCountryForSvgId, resolveCountriesToSvgIds } from '@/features/world-countries/maps/geographyMapAdapter'
import { getMemoMapDefinition } from '@/features/world-countries/maps/mapDefinitions'
import { getMapLearningAnchors } from '@/features/world-countries/maps/learningAnchors'
import { getMapSyntheticDots } from '@/features/world-countries/maps/syntheticDots'
import type { SvgMapLearningAnchor, SvgMapSyntheticDot } from '@/features/world-countries/maps/SvgMapController'

export type CountryLearningTaskHighlightTone = 'country-answer' | 'capital-answer'

const TASK_HIGHLIGHT_FILLS: Record<CountryLearningTaskHighlightTone, string> = {
  'country-answer': '#0891b2',
  'capital-answer': '#8b5cf6',
}

export interface CountryLearningMapProps {
  continent: Continent
  scopeCountries: readonly Country[]
  /** Optional wider Country collection used for the temporary order-edit overview. */
  overviewCountries?: readonly Country[]
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
  /** Optional semantic labels for the currently presented Country collection. */
  countryLabelsById?: ReadonlyMap<CountryId, string>
  /** Optional non-color descriptions for mapped Countries. */
  countryAccessibleDescriptionsById?: ReadonlyMap<string, string>
  /** Explicit map-answer candidates; generic clickability does not imply assistance. */
  answerSelectionCountryIds?: readonly CountryId[]
  /** Country location intentionally presented as the current task target. */
  taskTargetCountryId?: CountryId | null
  /** Semantic answer-domain tone for an active task highlight. */
  taskHighlightTone?: CountryLearningTaskHighlightTone
  /** Restrict rendered geometry to these canonical Countries when provided. */
  visibleCountryIds?: readonly CountryId[]
  /** Explicit Country geometry to fit; overrides generic learning-map zoom rules. */
  zoomCountryIds?: readonly CountryId[]
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
  overviewCountries,
  showNames = false,
  showHoverNames = false,
  showOrderNumbers = false,
  namedCountryId = null,
  highlightedCountryId = null,
  hoveredCountryId = null,
  showHighlightedNames = true,
  mapClassName,
  countryColorsById,
  countryLabelsById,
  countryAccessibleDescriptionsById,
  answerSelectionCountryIds,
  taskTargetCountryId = null,
  taskHighlightTone,
  visibleCountryIds,
  zoomCountryIds,
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
    () => resolveCountriesToSvgIds(overviewCountries ?? scopeCountries, discoveredIds),
    [discoveredIds, overviewCountries, scopeCountries],
  )
  const interactionCountries = overviewCountries ?? scopeCountries
  const interactionSvgIds = useMemo(
    () => resolveCountriesToSvgIds(interactionCountries, discoveredIds),
    [discoveredIds, interactionCountries],
  )
  const highlightedSvgIds = useMemo(() => {
    if (overviewCountries) return []
    if (!highlightedCountryId) return []
    const country = scopeCountries.find(entry => entry.id === highlightedCountryId)
    return country ? countriesToSvgIds([country]).filter(id => discoveredIds.includes(id)) : []
  }, [discoveredIds, highlightedCountryId, overviewCountries, scopeCountries])
  const hoveredSvgId = useMemo(() => {
    if (!hoveredCountryId) return null
    const country = (overviewCountries ?? scopeCountries).find(entry => entry.id === hoveredCountryId)
    return country ? resolveCountriesToSvgIds([country], discoveredIds)[0] ?? null : null
  }, [discoveredIds, hoveredCountryId, overviewCountries, scopeCountries])
  const namedSvgIds = useMemo(() => {
    if (overviewCountries) return zoomScopeSvgIds
    if (showNames || showOrderNumbers) return scopeSvgIds
    if (!namedCountryId) return []
    const country = scopeCountries.find(entry => entry.id === namedCountryId)
    return country ? countriesToSvgIds([country]).filter(id => discoveredIds.includes(id)) : []
  }, [discoveredIds, namedCountryId, overviewCountries, scopeCountries, scopeSvgIds, showNames, showOrderNumbers, zoomScopeSvgIds])
  const countryLabels = useMemo(
    () => {
      if (countryLabelsById) {
        return Object.fromEntries([...countryLabelsById].flatMap(([countryId, label]) => {
          const country = interactionCountries.find(entry => entry.id === countryId)
          return country ? resolveCountriesToSvgIds([country], discoveredIds).map(svgId => [svgId, label] as const) : []
        }))
      }
      return showOrderNumbers ? createCountryOrderLabels(overviewCountries ?? scopeCountries, discoveredIds) : {}
    },
    [countryLabelsById, discoveredIds, interactionCountries, overviewCountries, scopeCountries, showOrderNumbers],
  )
  const explicitZoomSvgIds = useMemo(
    () => zoomCountryIds === undefined
      ? undefined
      : resolveCountriesToSvgIds(
        (overviewCountries ?? scopeCountries).filter(country => zoomCountryIds.includes(country.id)),
        discoveredIds,
      ),
    [discoveredIds, overviewCountries, scopeCountries, zoomCountryIds],
  )
  const zoomIds = explicitZoomSvgIds ?? getCountryLearningMapZoomIds(continent, zoomScopeSvgIds)
  const visibleSvgIds = useMemo(
    () => visibleCountryIds === undefined
      ? undefined
      : resolveCountriesToSvgIds(
        (overviewCountries ?? scopeCountries).filter(country => visibleCountryIds.includes(country.id)),
        discoveredIds,
      ),
    [discoveredIds, overviewCountries, scopeCountries, visibleCountryIds],
  )
  const hiddenIds = visibleSvgIds === undefined
    ? []
    : discoveredIds.filter(id => !visibleSvgIds.includes(id))
  const taskAssistance = useMemo(() => {
    if (answerSelectionCountryIds === undefined && taskTargetCountryId === null) return null

    const countryById = new Map(interactionCountries.map(country => [country.id, country]))
    const targetCountry = taskTargetCountryId ? countryById.get(taskTargetCountryId) : undefined
    const answerCountries = answerSelectionCountryIds === undefined
      ? []
      : answerSelectionCountryIds
        .map(id => countryById.get(id))
        .filter((country): country is Country => country !== undefined)
    const anchorDefinitions = getMapLearningAnchors(
      definition.id,
      [...answerCountries.map(country => country.id), ...(targetCountry ? [targetCountry.id] : [])],
    )
    const learningAnchors: SvgMapLearningAnchor[] = anchorDefinitions
      .filter(anchor => discoveredIds.includes(anchor.sourceSvgId))
      .map(anchor => ({
        sourceSvgId: anchor.sourceSvgId,
        kind: anchor.kind,
        sourceFingerprint: anchor.sourceFingerprint,
        ...(anchor.point ? { point: anchor.point } : {}),
      }))
    const syntheticDots: SvgMapSyntheticDot[] = getMapSyntheticDots(
      definition.id,
      [...answerCountries.map(country => country.id), ...(targetCountry ? [targetCountry.id] : [])],
    )
      .filter(dot => discoveredIds.includes(dot.sourceSvgId))
      .map(dot => ({
        sourceSvgId: dot.sourceSvgId,
        sourceFingerprint: dot.sourceFingerprint,
        point: dot.point,
      }))
    const targetSvgIds = targetCountry
      ? resolveCountriesToSvgIds([targetCountry], discoveredIds)
      : []
    const targetAnchor = anchorDefinitions.find(anchor => anchor.countryId === taskTargetCountryId)
    const taskTargetId = taskTargetCountryId === null
      ? null
      : targetAnchor?.sourceSvgId ?? targetSvgIds[0] ?? null

    return {
      answerSelectionIds: answerSelectionCountryIds === undefined
        ? undefined
        : countriesToSvgIds(answerCountries).filter(id => discoveredIds.includes(id)),
      taskTargetId,
      learningAnchors,
      ...(syntheticDots.length ? { syntheticDots } : {}),
    }
  }, [answerSelectionCountryIds, definition.id, discoveredIds, interactionCountries, scopeCountries, taskTargetCountryId])
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
  const unmutedSvgIds = overviewCountries ? zoomScopeSvgIds : scopeSvgIds
  const taskHighlightFill = taskHighlightTone ? TASK_HIGHLIGHT_FILLS[taskHighlightTone] : undefined

  return (
    <div className="space-y-2">
      <SvgMapView
        svgUrl={definition.svgUrl}
        ariaLabel={ariaLabel}
        ariaDescribedBy={countryDescriptions.length ? descriptionId : undefined}
        highlightedIds={highlightedSvgIds}
        hoveredId={hoveredSvgId}
        hoverableIds={onCountryClick ? interactionSvgIds : undefined}
        mutedIds={discoveredIds.filter(id => !unmutedSvgIds.includes(id))}
        hiddenIds={hiddenIds}
        namedIds={namedSvgIds}
        selectableIds={onCountryClick ? interactionSvgIds : []}
        countryLabels={countryLabels}
        countryColors={countryColors}
        taskAssistance={taskAssistance}
        zoomIds={zoomIds}
        className={mapClassName}
        settings={{ showHighlightedNames, hoverHighlight: hoveredCountryId !== null, hoverShowName: showHoverNames, hoverFill: '#0f766e', hoverStroke: '#d4d4d8', hoverStrokeWidth: '2px', ...(taskHighlightFill ? { highlightFill: taskHighlightFill } : {}) }}
        onCountriesLoaded={setDiscovered}
        onCountryClick={svgId => {
          const country = getCountryForSvgId(svgId, interactionCountries)
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
