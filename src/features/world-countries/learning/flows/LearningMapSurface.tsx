import { createContext, useContext, useLayoutEffect, useMemo, useState, type DependencyList, type ReactNode } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { CountryLearningMap, type CountryLearningMapProps } from '@/features/world-countries/learning/CountryLearningMap'
import { MapSurface, type MapSurfaceDockPlacement } from '@/features/world-countries/ui/MapSurface'

export type LearningMapOverride = Partial<Pick<CountryLearningMapProps,
  'showNames' | 'showHoverNames' | 'showOrderNumbers' | 'namedCountryId' |
  'highlightedCountryId' | 'hoveredCountryId' | 'showHighlightedNames' |
  'onCountryClick' | 'ariaLabel'
>>

interface LearningMapSurfaceContextValue {
  setOverride: (override: LearningMapOverride) => void
}

const LearningMapSurfaceContext = createContext<LearningMapSurfaceContextValue | null>(null)

export function LearningMapSurface({
  continent,
  scopeCountries,
  presentation,
  presentationKey,
  context,
  dockPlacement = 'overlay',
  children,
}: {
  continent: Continent
  scopeCountries: readonly Country[]
  presentation: LearningMapOverride
  presentationKey: string
  context: ReactNode
  dockPlacement?: MapSurfaceDockPlacement
  children: ReactNode
}) {
  const [override, setOverride] = useState<LearningMapOverride>({})
  useLayoutEffect(() => setOverride({}), [presentationKey])
  const effectivePresentation = useMemo(() => ({ ...presentation, ...override }), [override, presentation])
  const contextValue = useMemo(() => ({ setOverride }), [])
  const map = <CountryLearningMap continent={continent} scopeCountries={scopeCountries} ariaLabel={effectivePresentation.ariaLabel ?? 'World Countries Learning map'} {...effectivePresentation} />

  return (
    <LearningMapSurfaceContext.Provider value={contextValue}>
      <MapSurface context={context} map={map} dock={children} dockPlacement={dockPlacement} />
    </LearningMapSurfaceContext.Provider>
  )
}

export function useLearningMapPresentation(override: LearningMapOverride, deps: DependencyList): void {
  const context = useContext(LearningMapSurfaceContext)
  useLayoutEffect(() => {
    context?.setOverride(override)
    return () => context?.setOverride({})
    // The caller owns the semantic dependency list for dynamic map state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, ...deps])
}
