import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useRails } from '@/app/layout/PageLayoutContext'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { useWorldCountriesGeographyRevision } from '@/features/world-countries/geography/geographyRefresh'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { readWorldCountriesGeography } from '@/features/world-countries/geography/worldScope'
import { clearSubregionScope, getCountriesForSubregionScopeInEffectiveOrder, normalizeSubregionScope, selectAllSubregions, toggleContinentInScope, toggleSubregionInScope, type WorldCountriesSubregionScope } from '@/features/world-countries/geography/subregionScope'
import { advanceRecallStep, getCurrentRecallStep, type WorldCountriesRecallSessionState } from '@/features/world-countries/learning/recallSession'
import type { WorldCountriesTypedAnswerResult } from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { GeographySelectionRail } from '@/features/world-countries/ui/GeographySelectionRail'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import { CapitalQuizSession } from './CapitalQuizSession'
import { getDefaultPracticeQuestionCount, getPracticeMissedCountryIds, isPracticeQuestionCountValid, normalizePracticeQuestionCount, PRACTICE_QUESTION_COUNTS, type PracticeRecallAnswer, type PracticeQuestionCount, type PracticeQuizRun, createPracticeQuizRun } from './practiceRun'
import { QuizResults } from './QuizResults'
import { NeighboursQuizResults } from './NeighboursQuizResults'
import { NeighboursQuizSession } from './NeighboursQuizSession'
import { advanceNeighboursTarget, createNeighboursQuizRun, createNeighboursQuizSession, createNeighboursRetryRun, getEligibleNeighboursTargetCountries, summarizeNeighboursRun, type NeighboursQuizRun, type NeighboursQuizSessionState } from './neighboursRun'

type QuizPhase = 'setup' | 'session' | 'results'
type QuizType = 'capitals' | 'neighbours'

interface ActiveCapitalQuizRun {
  type: 'capitals'
  run: PracticeQuizRun
  session: WorldCountriesRecallSessionState
  answers: readonly PracticeRecallAnswer[]
}

interface ActiveNeighboursQuizRun {
  type: 'neighbours'
  run: NeighboursQuizRun
  session: NeighboursQuizSessionState
}

type ActiveQuizRun = ActiveCapitalQuizRun | ActiveNeighboursQuizRun

export function WorldCountriesQuiz({ answerMode: _answerMode }: { answerMode: AnswerMode }) {
  const { settings } = useSettings()
  const activeCountries = useWorldCountriesPopulation()
  const geographyRevision = useWorldCountriesGeographyRevision()
  const geography = useMemo(() => {
    void geographyRevision
    return readWorldCountriesGeography(activeCountries)
  }, [activeCountries, geographyRevision])
  const { metadata: selectionMetadata, worldOrder } = geography
  const [phase, setPhase] = useState<QuizPhase>('setup')
  const [quizType, setQuizType] = useState<QuizType>('capitals')
  const [setupContinent, setSetupContinent] = useState<Continent | null>(null)
  const [selectedSubregionIds, setSelectedSubregionIds] = useState<readonly SubregionId[]>(() => selectAllSubregions(activeCountries, selectionMetadata).subregionIds)
  const [questionCount, setQuestionCount] = useState<PracticeQuestionCount>(() => getDefaultPracticeQuestionCount(activeCountries.length))
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [activeRun, setActiveRun] = useState<ActiveQuizRun | null>(null)

  const selection = useMemo<WorldCountriesSubregionScope>(() => ({ subregionIds: selectedSubregionIds }), [selectedSubregionIds])
  const normalizedSelection = useMemo(() => normalizeSubregionScope(selection, activeCountries, selectionMetadata), [activeCountries, selection, selectionMetadata])
  const setupScopeCountries = useMemo(() => getCountriesForSubregionScopeInEffectiveOrder(normalizedSelection, activeCountries, selectionMetadata), [activeCountries, normalizedSelection, selectionMetadata])
  const eligibleNeighboursTargetCountries = useMemo(() => getEligibleNeighboursTargetCountries(setupScopeCountries, activeCountries), [activeCountries, setupScopeCountries])
  const setupQuestionTargetCount = quizType === 'capitals' ? setupScopeCountries.length : eligibleNeighboursTargetCountries.length
  const normalizedQuestionCount = useMemo(() => normalizePracticeQuestionCount(questionCount, setupQuestionTargetCount), [questionCount, setupQuestionTargetCount])
  const subregionOrder = useMemo(() => {
    void geographyRevision
    return setupContinent ? getSubregionsForContinentInEffectiveOrder(setupContinent, activeCountries, getContinentMetadata(setupContinent)) : []
  }, [activeCountries, geographyRevision, setupContinent])

  useEffect(() => {
    if (sameIds(selectedSubregionIds, normalizedSelection.subregionIds)) return
    setSelectedSubregionIds(normalizedSelection.subregionIds)
  }, [normalizedSelection.subregionIds, selectedSubregionIds])

  useEffect(() => {
    if (questionCount === normalizedQuestionCount) return
    setQuestionCount(normalizedQuestionCount)
  }, [normalizedQuestionCount, questionCount])

  useEffect(() => {
    if (setupContinent && !worldOrder.includes(setupContinent)) setSetupContinent(null)
  }, [setupContinent, worldOrder])

  const selectContinent = useCallback((continent: Continent) => {
    setSetupContinent(continent)
    setHoveredGroupId(null)
  }, [])
  const goToWorld = useCallback(() => {
    setSetupContinent(null)
    setHoveredGroupId(null)
  }, [])
  const toggleSubregion = useCallback((subregionId: SubregionId) => {
    if (!setupContinent) return
    setSelectedSubregionIds(toggleSubregionInScope(normalizedSelection, subregionId, activeCountries, selectionMetadata).subregionIds)
  }, [activeCountries, normalizedSelection, selectionMetadata, setupContinent])
  const toggleContinent = useCallback((continent: Continent) => {
    setSelectedSubregionIds(toggleContinentInScope(normalizedSelection, continent, activeCountries, selectionMetadata).subregionIds)
  }, [activeCountries, normalizedSelection, selectionMetadata])
  const selectAllWorld = useCallback(() => setSelectedSubregionIds(selectAllSubregions(activeCountries, selectionMetadata).subregionIds), [activeCountries, selectionMetadata])
  const clearWorld = useCallback(() => setSelectedSubregionIds(clearSubregionScope().subregionIds), [])

  const startQuiz = useCallback(() => {
    if (setupQuestionTargetCount === 0 || !isPracticeQuestionCountValid(normalizedQuestionCount, setupQuestionTargetCount)) return
    if (quizType === 'capitals') {
      const run = createPracticeQuizRun({ scopeCountries: setupScopeCountries, questionCount: normalizedQuestionCount })
      if (!run) return
      setActiveRun({ type: 'capitals', run, session: run.session, answers: [] })
    } else {
      const run = createNeighboursQuizRun({ scopeCountries: setupScopeCountries, activeCountries, questionCount: normalizedQuestionCount, fuzzyMatching: settings.worldCountriesFuzzyAnswerMatching })
      if (!run) return
      setActiveRun({ type: 'neighbours', run, session: createNeighboursQuizSession(run) })
    }
    setPhase('session')
    setSetupContinent(null)
    setHoveredGroupId(null)
  }, [activeCountries, normalizedQuestionCount, quizType, settings.worldCountriesFuzzyAnswerMatching, setupQuestionTargetCount, setupScopeCountries])

  const submitAnswer = useCallback((answer: PracticeRecallAnswer) => {
    setActiveRun(current => {
      if (!current || current.type !== 'capitals' || current.session.phase === 'complete') return current
      const step = getCurrentRecallStep(current.session)
      if (!step || step.countryId !== answer.countryId || step.skill !== answer.skill || current.answers.some(candidate => candidate.countryId === answer.countryId)) return current
      return { ...current, answers: [...current.answers, answer] }
    })
  }, [])

  const advanceQuiz = useCallback((_result: WorldCountriesTypedAnswerResult) => {
    setActiveRun(current => {
      if (!current || current.type !== 'capitals' || current.session.phase === 'complete') return current
      return { ...current, session: advanceRecallStep(current.session).state }
    })
  }, [])

  const updateNeighboursSession = useCallback((session: NeighboursQuizSessionState) => {
    setActiveRun(current => current?.type === 'neighbours' ? { ...current, session } : current)
  }, [])

  const advanceNeighbours = useCallback(() => {
    setActiveRun(current => current?.type === 'neighbours'
      ? { ...current, session: advanceNeighboursTarget(current.session) }
      : current)
  }, [])

  useEffect(() => {
    if (phase !== 'session' || activeRun?.session.phase !== 'complete') return
    setPhase('results')
  }, [activeRun?.session.phase, phase])

  const retryMissed = useCallback(() => {
    if (!activeRun) return
    if (activeRun.type === 'capitals') {
      const missedCountryIds = getPracticeMissedCountryIds(activeRun.run, activeRun.answers)
      if (missedCountryIds.length === 0) return
      const run = createPracticeQuizRun({ scopeCountries: activeRun.run.countries, countryIds: missedCountryIds, questionCount: 'all' })
      if (!run) return
      setActiveRun({ type: 'capitals', run, session: run.session, answers: [] })
    } else {
      const missedTargetIds = summarizeNeighboursRun(activeRun.run, activeRun.session).imperfectTargetIds
      const run = createNeighboursRetryRun(activeRun.run, missedTargetIds)
      if (!run) return
      setActiveRun({ type: 'neighbours', run, session: createNeighboursQuizSession(run) })
    }
    setPhase('session')
  }, [activeRun])

  const changeSetup = useCallback(() => {
    setActiveRun(null)
    setPhase('setup')
    setSetupContinent(null)
    setHoveredGroupId(null)
  }, [])

  if (phase === 'setup') return <QuizSetupPhase
    activeCountries={activeCountries}
    normalizedSelection={normalizedSelection}
    selectionMetadata={selectionMetadata}
    worldOrder={worldOrder}
    subregionOrder={subregionOrder}
    setupContinent={setupContinent}
    quizType={quizType}
    hoveredGroupId={hoveredGroupId}
    normalizedQuestionCount={normalizedQuestionCount}
    setupQuestionTargetCount={setupQuestionTargetCount}
    onQuizTypeChange={setQuizType}
    onQuestionCountChange={setQuestionCount}
    onStart={startQuiz}
    onHoverGroup={setHoveredGroupId}
    onWorld={goToWorld}
    onSelectContinent={selectContinent}
    onToggleContinent={toggleContinent}
    onSelectAllWorld={selectAllWorld}
    onClearWorld={clearWorld}
    onToggleSubregion={toggleSubregion}
    onSelectEntireContinent={() => { if (setupContinent) setSelectedSubregionIds(toggleContinentInScope(normalizedSelection, setupContinent, activeCountries, selectionMetadata).subregionIds) }}
  />

  if (phase === 'session' && activeRun?.type === 'capitals') return <CapitalQuizSession run={activeRun.run} session={activeRun.session} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} correctCount={activeRun.answers.filter(answer => answer.outcome === 'exact' || answer.outcome === 'fuzzy').length} onAnswer={submitAnswer} onAdvance={advanceQuiz} />
  if (phase === 'session' && activeRun?.type === 'neighbours') return <NeighboursQuizSession run={activeRun.run} session={activeRun.session} onSessionChange={updateNeighboursSession} onAdvance={advanceNeighbours} />
  if (phase === 'results' && activeRun?.type === 'capitals') return <QuizResults run={activeRun.run} answers={activeRun.answers} onRetryMissed={retryMissed} onNewQuiz={startQuiz} onChangeSetup={changeSetup} />
  if (phase === 'results' && activeRun?.type === 'neighbours') return <NeighboursQuizResults run={activeRun.run} session={activeRun.session} onRetryMissed={retryMissed} onNewQuiz={startQuiz} onChangeSetup={changeSetup} />
  return null
}

function QuizSetupPhase({
  activeCountries,
  normalizedSelection,
  selectionMetadata,
  worldOrder,
  subregionOrder,
  setupContinent,
  quizType,
  hoveredGroupId,
  normalizedQuestionCount,
  setupQuestionTargetCount,
  onQuizTypeChange,
  onQuestionCountChange,
  onStart,
  onHoverGroup,
  onWorld,
  onSelectContinent,
  onToggleContinent,
  onSelectAllWorld,
  onClearWorld,
  onToggleSubregion,
  onSelectEntireContinent,
}: {
  activeCountries: readonly Country[]
  normalizedSelection: WorldCountriesSubregionScope
  selectionMetadata: ReturnType<typeof readWorldCountriesGeography>['metadata']
  worldOrder: readonly Continent[]
  subregionOrder: ReturnType<typeof getSubregionsForContinentInEffectiveOrder>
  setupContinent: Continent | null
  quizType: QuizType
  hoveredGroupId: string | null
  normalizedQuestionCount: PracticeQuestionCount
  setupQuestionTargetCount: number
  onQuizTypeChange: (value: QuizType) => void
  onQuestionCountChange: (value: PracticeQuestionCount) => void
  onStart: () => void
  onHoverGroup: (groupId: string | null) => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
  onToggleContinent: (continent: Continent) => void
  onSelectAllWorld: () => void
  onClearWorld: () => void
  onToggleSubregion: (subregionId: SubregionId) => void
  onSelectEntireContinent: () => void
}) {
  const rails = useMemo(() => ({
    left: <GeographySelectionRail level={setupContinent ? 'continent' : 'world'} setupContinent={setupContinent} selection={normalizedSelection} selectionMetadata={selectionMetadata} worldOrder={worldOrder} subregionOrder={subregionOrder} entries={activeCountries} hoveredGroupId={hoveredGroupId} onHoverGroup={onHoverGroup} onWorld={onWorld} onSelectContinent={onSelectContinent} onToggleContinent={onToggleContinent} onSelectAllWorld={onSelectAllWorld} onClearWorld={onClearWorld} onToggleSubregion={onToggleSubregion} onSelectEntireContinent={onSelectEntireContinent} headingId="world-countries-quiz-geography-heading" />,
    right: <QuizSetupControls quizType={quizType} onQuizTypeChange={onQuizTypeChange} questionCount={normalizedQuestionCount} targetCount={setupQuestionTargetCount} onQuestionCountChange={onQuestionCountChange} canStart={setupQuestionTargetCount > 0} onStart={onStart} />,
    leftLabel: 'Geography',
    rightLabel: 'Quiz',
  }), [activeCountries, hoveredGroupId, normalizedQuestionCount, normalizedSelection, onClearWorld, onHoverGroup, onQuestionCountChange, onQuizTypeChange, onSelectContinent, onSelectEntireContinent, onSelectAllWorld, onStart, onToggleContinent, onToggleSubregion, onWorld, quizType, selectionMetadata, setupContinent, setupQuestionTargetCount, subregionOrder, worldOrder])
  useRails(rails)

  return <section className="space-y-3 animate-fade-in" aria-labelledby="world-countries-quiz-heading">
    <div className="space-y-1 text-center"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries / Quiz</p><h1 id="world-countries-quiz-heading" className="text-2xl font-black text-zinc-100">{quizType === 'capitals' ? 'Capitals quiz' : 'Neighbours quiz'}</h1><p className="text-sm text-zinc-500">{quizType === 'capitals' ? 'Given a Country, type its Capital.' : 'Given a Country, name every Country that shares a land border with it.'}</p></div>
    <GeographyOverviewMap level={setupContinent ? 'continent' : 'world'} continent={setupContinent ?? undefined} selectedSubregionIds={setupContinent ? normalizedSelection.subregionIds : undefined} hoveredGroupId={hoveredGroupId} onHoverGroup={onHoverGroup} onCountryClick={country => setupContinent ? onToggleSubregion(country.subregionId) : onSelectContinent(country.continent)} ariaLabel={setupContinent ? `${setupContinent} map for ${quizType === 'capitals' ? 'Capitals' : 'Neighbours'} Quiz setup` : `World map for ${quizType === 'capitals' ? 'Capitals' : 'Neighbours'} Quiz setup`} />
    <p className="px-1 text-xs text-zinc-500">{quizType === 'neighbours' ? setupQuestionTargetCount > 0 ? `${setupQuestionTargetCount} eligible target Countries` : 'No selected target Country has an active land-border neighbour' : activeCountries.length > 0 ? `${activeCountries.length} Countries in current scope` : 'Select at least one Subregion to begin'}</p>
  </section>
}

function QuizSetupControls({ quizType, onQuizTypeChange, questionCount, targetCount, onQuestionCountChange, canStart, onStart }: { quizType: QuizType; onQuizTypeChange: (value: QuizType) => void; questionCount: PracticeQuestionCount; targetCount: number; onQuestionCountChange: (value: PracticeQuestionCount) => void; canStart: boolean; onStart: () => void }) {
  return <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-quiz-controls-heading"><div><p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Quiz</p><h2 id="world-countries-quiz-controls-heading" className="mt-1 text-lg font-bold text-zinc-100">Quiz type</h2></div><fieldset className="grid grid-cols-2 gap-2"><legend className="sr-only">Quiz type</legend>{(['capitals', 'neighbours'] as const).map(candidate => <label key={candidate} className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-3 text-sm font-semibold ${quizType === candidate ? 'border-cyan-500 bg-cyan-500/15 text-cyan-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-600'}`}><input type="radio" name="world-countries-quiz-type" value={candidate} checked={quizType === candidate} onChange={() => onQuizTypeChange(candidate)} className="sr-only" />{candidate === 'capitals' ? 'Capitals' : 'Neighbours'}</label>)}</fieldset><div><h3 className="text-sm font-semibold text-zinc-200">Question count</h3><fieldset className="mt-2 grid grid-cols-2 gap-2"><legend className="sr-only">Question count</legend>{PRACTICE_QUESTION_COUNTS.map(candidate => { const disabled = candidate !== 'all' && candidate > targetCount; return <label key={candidate} className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-3 text-sm font-semibold ${questionCount === candidate ? 'border-cyan-500 bg-cyan-500/15 text-cyan-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300'} ${disabled ? 'cursor-not-allowed opacity-40' : 'hover:border-cyan-600'}`}><input type="radio" name="world-countries-quiz-question-count" value={candidate} checked={questionCount === candidate} disabled={disabled} onChange={() => onQuestionCountChange(candidate)} className="sr-only" />{candidate === 'all' ? 'All' : candidate}</label> })}</fieldset></div><p className="text-xs leading-relaxed text-zinc-500">Quiz is Practice: it is randomized, finite, and does not record learner progress.</p><button type="button" disabled={!canStart} onClick={onStart} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">{canStart ? 'Start Quiz' : quizType === 'neighbours' ? 'No eligible target Countries' : 'Choose at least one Subregion'}</button></WorldCountriesPanel>
}

function sameIds(left: readonly SubregionId[], right: readonly SubregionId[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index])
}
