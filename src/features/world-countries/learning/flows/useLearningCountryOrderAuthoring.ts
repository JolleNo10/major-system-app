import { useCallback, useMemo, useRef, useState } from 'react'
import type { Country, CountryId } from '@/features/world-countries/data/countries'
import type { InlineOrderClickState } from '@/features/world-countries/ui/InlineOrderEditor'

export interface LearningCountryOrderMapPresentation {
  overviewCountries?: readonly Country[]
  countryLabelsById?: ReadonlyMap<CountryId, string>
  answerSelectionCountryIds?: readonly CountryId[]
  onCountryClick?: (countryId: string) => void
}

/** Bridges the shared rail-owned click sequence into map presentation inputs. */
export function useLearningCountryOrderAuthoring({
  entries,
  orderDraft,
  editingOrder,
}: {
  entries: readonly Country[]
  orderDraft: readonly Country[] | null
  editingOrder: boolean
}) {
  const [clickOrderState, setClickOrderState] = useState<InlineOrderClickState>({ active: false, positions: new Map() })
  const clickOrderToggleRef = useRef<(countryId: string) => void>(() => undefined)
  const allPresentationEntries = orderDraft ?? entries

  const handleClickOrderStateChange = useCallback((next: InlineOrderClickState) => {
    setClickOrderState(current => {
      if (current.active === next.active && current.positions.size === next.positions.size && [...current.positions].every(([id, position]) => next.positions.get(id) === position)) return current
      return { active: next.active, positions: next.positions }
    })
  }, [])
  const handleClickOrderToggle = useCallback((toggle: ((countryId: string) => void) | null) => {
    clickOrderToggleRef.current = toggle ?? (() => undefined)
  }, [])
  const clickOrderLabels = useMemo(() => {
    if (!clickOrderState.active) return undefined
    return new Map([...clickOrderState.positions].flatMap(([countryId, position]) => {
      const country = allPresentationEntries.find(entry => entry.id === countryId)
      return country ? [[countryId, `${position}. ${country.country}`] as const] : []
    }))
  }, [allPresentationEntries, clickOrderState])
  const mapPresentation: LearningCountryOrderMapPresentation = {
    overviewCountries: editingOrder ? allPresentationEntries : undefined,
    countryLabelsById: clickOrderLabels,
    answerSelectionCountryIds: clickOrderState.active ? allPresentationEntries.map(entry => entry.id) : undefined,
    onCountryClick: clickOrderState.active ? countryId => clickOrderToggleRef.current(countryId) : undefined,
  }

  return {
    allPresentationEntries,
    mapPresentation,
    onClickOrderStateChange: handleClickOrderStateChange,
    onClickOrderToggle: handleClickOrderToggle,
  }
}
