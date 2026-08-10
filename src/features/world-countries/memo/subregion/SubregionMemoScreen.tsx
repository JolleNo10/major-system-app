import { useCallback, useMemo, useState } from 'react'
import { Overlay } from '@/app/layout/Overlay'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { getCountriesForSubregionInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { getSubregionLearningState } from '@/features/world-countries/learning/subregionLearningStore'
import { isSubregionCapitalsLearned, isSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningState'
import type { CountryLearningEntryPoint, CountryLearningPhase } from '@/features/world-countries/learning/countryLearningFlow'
import type { CapitalLearningPhase } from '@/features/world-countries/learning/capitalLearningFlow'
import { SubregionOverviewRails } from '../WorldCountriesMemoRails'
import { CapitalLearningFlow } from './CapitalLearningFlow'
import { CountryLearningFlow } from './CountryLearningFlow'
import { SubregionOverview } from './SubregionOverview'
import { SubregionOrderEditor } from './SubregionOrderEditor'

export function SubregionMemoScreen({
  continent,
  subregion,
  learningVersion,
  locationCleanTargetMinimum,
  fuzzyMatching,
  onLearningChanged,
  onExit,
  onWorld,
}: {
  continent: Continent
  subregion: SubregionId
  learningVersion: number
  locationCleanTargetMinimum: number
  fuzzyMatching: boolean
  onLearningChanged: () => void
  onExit: () => void
  onWorld: () => void
}) {
  const entries = useMemo(() => getCountriesForSubregionInEffectiveOrder(subregion, undefined, getSubregionMetadata(subregion)), [learningVersion, subregion])
  const learningState = getSubregionLearningState(subregion)
  const learned = isSubregionCountriesLearned(learningState)
  const capitalsLearned = isSubregionCapitalsLearned(learningState)
  return (
    <div className="w-full">
      {/** This key discards all temporary session state when the effective order changes. */}
      <div key={`${subregion}-${learningVersion}`}>
        <SubregionScreenBody
          continent={continent}
          subregion={subregion}
          entries={entries}
          learned={learned}
          capitalsLearned={capitalsLearned}
          locationCleanTargetMinimum={locationCleanTargetMinimum}
          fuzzyMatching={fuzzyMatching}
          onLearningChanged={onLearningChanged}
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
  entries,
  learned,
  capitalsLearned,
  locationCleanTargetMinimum,
  fuzzyMatching,
  onLearningChanged,
  onExit,
  onWorld,
}: {
  continent: Continent
  subregion: SubregionId
  entries: ReturnType<typeof getCountriesForSubregionInEffectiveOrder>
  learned: boolean
  capitalsLearned: boolean
  locationCleanTargetMinimum: number
  fuzzyMatching: boolean
  onLearningChanged: () => void
  onExit: () => void
  onWorld: () => void
}) {
  const [mode, setMode] = useState<'overview' | 'country-learning' | 'capital-learning'>('overview')
  const [entryPoint, setEntryPoint] = useState<CountryLearningEntryPoint>('beginning')
  const [learningPhase, setLearningPhase] = useState<CountryLearningPhase | CapitalLearningPhase>('memory-preview')
  const [editingOrder, setEditingOrder] = useState(false)
  const [draftEntries, setDraftEntries] = useState<readonly Country[] | null>(null)
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
  }, [])
  const handleOrderChanged = useCallback(() => {
    setDraftEntries(null)
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
        setCapitalStartInRecall(false)
        setCapitalWalkthroughCountryId(entries[0]?.id ?? null)
        setCapitalRecallCorrectionCountryId(null)
        setLearningPhase('walkthrough')
        setMode('capital-learning')
      }}
      onPracticeCapitals={() => {
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
