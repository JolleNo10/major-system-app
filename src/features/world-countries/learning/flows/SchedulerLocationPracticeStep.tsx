import { useCallback, useEffect, useRef, useState } from 'react'
import { RecallFeedback } from '@/core/ui/RecallFeedback'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SchedulerLearningSession } from '@/features/world-countries/learning/schedulerLearningSession'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { WorldCountriesMapActivitySurface } from '@/features/world-countries/ui/WorldCountriesActivity'
import { getWorldCountriesTaskHighlightFill } from '@/features/world-countries/ui/WorldCountriesAnswerSemantics'
import type { WorldCountriesActivityTask } from '@/features/world-countries/ui/WorldCountriesActivity'
import { useLearningMapPresentation } from './LearningMapSurface'

export function SchedulerLocationPracticeStep({ continent, entries, session, label, onSelect, onBack, onExit, surface = false }: {
  continent: Continent
  entries: readonly Country[]
  session: SchedulerLearningSession
  label: string
  onSelect: (correct: boolean, latencyMs: number) => void
  onBack: () => void
  onExit: () => void
  surface?: boolean
}) {
  const [feedback, setFeedback] = useState<{ correct: boolean; expectedId: string; selectedId: string; latencyMs: number } | null>(null)
  const startedAt = useRef(Date.now())
  const currentId = session.currentKey
  useEffect(() => { startedAt.current = Date.now() }, [currentId])
  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      const answer = feedback
      setFeedback(null)
      onSelect(answer.correct, answer.latencyMs)
    }, feedback.correct ? 500 : 1800)
    return () => window.clearTimeout(timer)
  }, [feedback, onSelect])
  const expected = entries.find(entry => entry.id === currentId)
  const submit = useCallback((selectedId: string) => {
    if (feedback || !expected) return
    const correct = selectedId === expected.id
    setFeedback({ correct, expectedId: expected.id, selectedId, latencyMs: Date.now() - startedAt.current })
  }, [expected, feedback])
  useLearningMapPresentation({
    answerSelectionCountryIds: entries.map(entry => entry.id),
    taskTargetCountryId: feedback ? feedback.expectedId : null,
    highlightedCountryId: feedback ? feedback.expectedId : null,
    namedCountryId: feedback ? feedback.expectedId : null,
    showHighlightedNames: Boolean(feedback),
    onCountryClick: submit,
    ariaLabel: 'Unlabeled map for location practice',
  }, [expected?.id, feedback?.expectedId, feedback?.correct, submit])
  if (!expected) return null

  const dock = (
    <div className="text-center">
      {feedback && <RecallFeedback variant="inline" correct={feedback.correct} message={feedback.correct ? 'Correct location.' : `That was ${entries.find(entry => entry.id === feedback.selectedId)?.country ?? 'not the target'} - ${expected.country} is highlighted.`} />}
      {!feedback && <p className="sr-only">Select the target Country on the map to answer.</p>}
      {!surface && <div className="mt-3 flex justify-center gap-2"><button type="button" onClick={onBack} className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-500 hover:text-zinc-200">Back to Review</button><button type="button" onClick={onExit} className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-500 hover:text-zinc-200">Exit</button></div>}
    </div>
  )
  if (surface) return dock

  const activityTask: WorldCountriesActivityTask = {
    direction: 'Location → Country',
    cue: `Find ${expected.country}`,
    sessionContext: label,
    answerKind: 'country',
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <WorldCountriesMapActivitySurface
        task={activityTask}
        map={<CountryLearningMap continent={continent} scopeCountries={entries} highlightFill={getWorldCountriesTaskHighlightFill('country')} answerSelectionCountryIds={entries.map(entry => entry.id)} taskTargetCountryId={feedback ? feedback.expectedId : null} highlightedCountryId={feedback ? feedback.expectedId : null} onCountryClick={submit} ariaLabel="Unlabeled map for location practice" />}
        dock={dock}
        dockPlacement="stacked"
      />
    </div>
  )
}
