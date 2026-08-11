import { useCallback, useMemo, useState } from 'react'
import { Overlay } from '@/app/layout/Overlay'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getCountriesForSubregionInEffectiveOrder, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { getAllSubregionLearningStates, getSubregionLearningState } from '@/features/world-countries/learning/subregionLearningStore'
import { isSubregionCapitalsLearned, isSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningState'
import type { CountryLearningEntryPoint, CountryLearningPhase } from '@/features/world-countries/learning/countryLearningFlow'
import type { CapitalLearningPhase } from '@/features/world-countries/learning/capitalLearningFlow'
import { getNextSubregionToMemo } from '../memoProgress'
import { SubregionOverviewRails } from '../WorldCountriesMemoRails'
import { CapitalLearningFlow } from './CapitalLearningFlow'
import { CountryLearningFlow } from './CountryLearningFlow'
import { SubregionOverview } from './SubregionOverview'
import { SubregionOrderEditor } from './SubregionOrderEditor'

export function SubregionMemoScreen({
  continent,
  subregion,
  activeCountries,
  learningVersion,
  locationCleanTargetMinimum,
  fuzzyMatching,
  onLearningChanged,
  onSelectSubregion,
  onExit,
  onWorld,
}: {
  continent: Continent
  subregion: SubregionId
  activeCountries: readonly Country[]
  learningVersion: number
  locationCleanTargetMinimum: number
  fuzzyMatching: boolean
  onLearningChanged: () => void
  onSelectSubregion: (subregion: SubregionId) => void
  onExit: () => void
  onWorld: () => void
}) {
  const entries = useMemo(() => getCountriesForSubregionInEffectiveOrder(subregion, activeCountries, getSubregionMetadata(subregion)), [activeCountries, learningVersion, subregion])
  const nextSubregion = useMemo(() => {
    const learnedSubregionIds = new Set(
      getAllSubregionLearningStates(activeCountries)
        .filter(state => isSubregionCountriesLearned(state))
        .map(state => state.subregionId),
    )
    return getNextSubregionToMemo(
      getSubregionsForContinentInEffectiveOrder(continent, activeCountries, getContinentMetadata(continent)),
      candidateId => learnedSubregionIds.has(candidateId),
    )
  }, [activeCountries, continent, learningVersion])
  const learningState = getSubregionLearningState(subregion, activeCountries)
  const learned = isSubregionCountriesLearned(learningState)
  const capitalsLearned = isSubregionCapitalsLearned(learningState)
  return (
    <div className="w-full">
      {/** This key discards all temporary session state when the effective order changes. */}
      <div key={`${subregion}-${learningVersion}`}>
        <SubregionScreenBody
          continent={continent}
          subregion={subregion}
          activeCountries={activeCountries}
          entries={entries}
          learned={learned}
          capitalsLearned={capitalsLearned}
          locationCleanTargetMinimum={locationCleanTargetMinimum}
          fuzzyMatching={fuzzyMatching}
          nextSubregion={nextSubregion}
          onLearningChanged={onLearningChanged}
          onSelectSubregion={onSelectSubregion}
          onExit={onExit}
          onWorld={onWorld}
        />
      </div>
    </div>
  )
}

function SubregionScreenBody({
  continent,
  subregion,
  activeCountries,
  entries,
  learned,
  capitalsLearned,
  locationCleanTargetMinimum,
  fuzzyMatching,
  nextSubregion,
  onLearningChanged,
  onSelectSubregion,
  onExit,
  onWorld,
}: {
  continent: Continent
  subregion: SubregionId
  activeCountries: readonly Country[]
  entries: ReturnType<typeof getCountriesForSubregionInEffectiveOrder>
  learned: boolean
  capitalsLearned: boolean
  locationCleanTargetMinimum: number
  fuzzyMatching: boolean
  nextSubregion: ReturnType<typeof getSubregionsForContinentInEffectiveOrder>[number] | null
  onLearningChanged: () => void
  onSelectSubregion: (subregion: SubregionId) => void
  onExit: () => void
  onWorld: () => void
}) {
  const [mode, setMode] = useState<'overview' | 'country-learning' | 'capital-learning'>('overview')
  const [entryPoint, setEntryPoint] = useState<CountryLearningEntryPoint>('beginning')
  const [learningPhase, setLearningPhase] = useState<CountryLearningPhase | CapitalLearningPhase>('memory-preview')
  const [editingOrder, setEditingOrder] = useState(false)
  const [draftEntries, setDraftEntries] = useState<readonly Country[] | null>(null)
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null)
  const [mnemonicVersion, setMnemonicVersion] = useState(0)
  const [capitalWalkthroughCountryId, setCapitalWalkthroughCountryId] = useState<string | null>(null)
  const [capitalRecallCorrectionCountryId, setCapitalRecallCorrectionCountryId] = useState<string | null>(null)
  const [capitalStartInRecall, setCapitalStartInRecall] = useState(false)
  const definition = getSubregionDefinition(subregion)
  const mapEntries = draftEntries ?? entries

  const openOrderEditor = useCallback(() => {
    setDraftEntries(entries)
    setEditingOrder(true)
  }, [entries])
  const closeOrderEditor = useCallback(() => {
    setDraftEntries(null)
    setEditingOrder(false)
    setHoveredCountryId(null)
  }, [])
  const handleOrderChanged = useCallback(() => {
    setDraftEntries(null)
    setHoveredCountryId(null)
    onLearningChanged()
  }, [onLearningChanged])
  const refreshMnemonic = useCallback(() => setMnemonicVersion(version => version + 1), [])
  const reportLearningPhase = useCallback((phase: CountryLearningPhase | CapitalLearningPhase) => setLearningPhase(phase), [])
  const exitLearning = useCallback(() => {
    setMode('overview')
    setLearningPhase('memory-preview')
    setCapitalWalkthroughCountryId(null)
    setCapitalRecallCorrectionCountryId(null)
    setCapitalStartInRecall(false)
    onLearningChanged()
  }, [onLearningChanged])

  const content = mode === 'country-learning' ? (
    <CountryLearningFlow
      key={`${definition.id}-${entries.map(country => country.id).join(',')}`}
      continent={continent}
      subregion={subregion}
      entries={entries}
      activeCountries={activeCountries}
      entryPoint={entryPoint}
      locationCleanTargetMinimum={locationCleanTargetMinimum}
      fuzzyMatching={fuzzyMatching}
      onPhaseChange={reportLearningPhase}
      onExit={exitLearning}
    />
  ) : mode === 'capital-learning' ? (
    <CapitalLearningFlow
      key={`${definition.id}-${entries.map(country => country.id).join(',')}`}
      continent={continent}
      subregion={subregion}
      entries={entries}
      activeCountries={activeCountries}
      countriesLearned={learned}
      fuzzyMatching={fuzzyMatching}
      onPhaseChange={reportLearningPhase}
      onExit={exitLearning}
      startInRecall={capitalStartInRecall}
      onWalkthroughCountryChange={setCapitalWalkthroughCountryId}
      onRecallCorrectionCountryChange={setCapitalRecallCorrectionCountryId}
    />
  ) : (
    <SubregionOverview
      continent={continent}
      subregion={subregion}
      entries={entries}
      mapEntries={mapEntries}
      highlightedCountryId={hoveredCountryId}
      learned={learned}
      capitalsLearned={capitalsLearned}
      onStart={() => {
        setEntryPoint('beginning')
        setCapitalWalkthroughCountryId(null)
        setCapitalRecallCorrectionCountryId(null)
        setCapitalStartInRecall(false)
        setLearningPhase('memory-preview')
        setMode('country-learning')
      }}
      onPracticeStageB={() => {
        setEntryPoint('ordered-recall')
        setLearningPhase('ordered-recall')
        setMode('country-learning')
      }}
      onStartCapitals={() => {
        if (!learned) return
        setCapitalStartInRecall(false)
        setCapitalWalkthroughCountryId(entries[0]?.id ?? null)
        setCapitalRecallCorrectionCountryId(null)
        setLearningPhase('walkthrough')
        setMode('capital-learning')
      }}
      onPracticeCapitals={() => {
        if (!learned) return
        setCapitalStartInRecall(true)
        setCapitalWalkthroughCountryId(null)
        setCapitalRecallCorrectionCountryId(null)
        setLearningPhase('recall')
        setMode('capital-learning')
      }}
    />
  )

  return (
    <>
      <SubregionOverviewRails
        phase={mode === 'overview' ? 'overview' : learningPhase}
        navigation={{
          continent,
          subregion,
          onWorld,
          onContinent: onExit,
          nextSubregion,
          onSelectSubregion,
        }}
        content={{
          entries: mapEntries,
          learned,
          capitalsLearned,
          track: mode === 'capital-learning' ? 'capitals' : 'countries',
          capitalWalkthroughCountryId,
          capitalRecallCorrectionCountryId,
          mnemonicVersion,
          onMnemonicChanged: refreshMnemonic,
        }}
        onEditOrder={openOrderEditor}
      />

      {editingOrder && mode === 'overview' && (
        <Overlay
          onClose={closeOrderEditor}
          ariaLabel="Edit learning order"
          header={<h2 className="text-lg font-bold text-zinc-100">Edit learning order</h2>}
          maxWidth="max-w-lg"
          presentation="side-panel"
        >
          <SubregionOrderEditor
            subregion={subregion}
            entries={entries}
            onHoverCountry={setHoveredCountryId}
            onDraftChanged={setDraftEntries}
            onChanged={handleOrderChanged}
            onClose={closeOrderEditor}
          />
        </Overlay>
      )}
      {content}
    </>
  )
}
