import { useState, useCallback, useMemo } from 'react'
import { useWords } from '@/features/major-system'
import { useSettings } from '@/app/settings/SettingsContext'
import { DAY_MS } from '@/core/scoring/itemStore'
import { PiNumberQuiz, type PiQuizCompletion } from '@/features/pi/shared/PiNumberQuiz'
import { PI_PAIRS } from '@/features/pi/shared/piDigits'
import { PAIRS_PER_SEGMENT, recordSegmentTries } from '@/features/pi/shared/piStats'
import { segmentDigitRange } from '@/features/pi/shared/piSegments'
import { useSegmentPickerData } from '@/features/pi/shared/PiSegmentRangePicker'
import { PiSegmentGrid, PiLegend } from '@/features/pi/shared/PiSegmentGrid'
import {
  buildMaintenanceBatches, segmentResultsFromRun, type MaintainBatch,
} from '@/features/pi/maintain/piMaintain'
import { loadMaintainStore, rescheduleSegment } from '@/features/pi/maintain/piMaintainStore'
import type { AnswerMode } from '@/core/types'

type Phase = 'setup' | 'quiz'
interface Props { answerMode: AnswerMode; maxPiPairs: number }

// Maintain tab: spaced-repetition upkeep of already-learned segments. Surfaces
// contiguous batches of ever-recited segments when they come due (SM-2 per
// segment), most-overdue first, so learned digits stay alive against the
// forgetting curve. A maintenance run records `piseg:` tries (status dots) and
// reschedules each recited segment, but records NO PiSession (keeps the Recite
// record board clean).
export function PiMaintainTab({ answerMode, maxPiPairs }: Props) {
  const { words } = useWords()
  const { settings } = useSettings()
  const answerSize = settings.piPairsPerAnswer

  const [phase, setPhase] = useState<Phase>('setup')
  const [sequence, setSequence] = useState<string[]>([])
  const [sessionAnchor, setSessionAnchor] = useState(1)
  const [runNonce, setRunNonce] = useState(0)

  const { statuses } = useSegmentPickerData(maxPiPairs, phase)
  const maxSegments = Math.floor(maxPiPairs / PAIRS_PER_SEGMENT)

  // Reload the schedule store each time we (re-)enter setup, so a finished run's
  // reschedules are reflected. Keyed off `runNonce` (bumped on every complete).
  const store = useMemo(() => loadMaintainStore(), [runNonce])

  const { due, upcoming } = useMemo(
    () => buildMaintenanceBatches(statuses, store, settings.piMaintainBatchSegs, maxSegments),
    [statuses, store, settings.piMaintainBatchSegs, maxSegments],
  )

  const dueSegs = useMemo(() => {
    const s = new Set<number>()
    due.forEach(b => b.segs.forEach(seg => s.add(seg)))
    return s
  }, [due])

  const dueSegCount = useMemo(
    () => due.reduce((sum, b) => sum + b.dueCount, 0),
    [due],
  )

  const start = useCallback((batch: MaintainBatch) => {
    const anchor = batch.startSeg * PAIRS_PER_SEGMENT + 1
    setSequence(PI_PAIRS.slice(batch.startSeg * PAIRS_PER_SEGMENT, (batch.endSeg + 1) * PAIRS_PER_SEGMENT))
    setSessionAnchor(anchor)
    setPhase('quiz')
  }, [])

  const handleQuizComplete = useCallback((completion: PiQuizCompletion) => {
    // Status dots (shared per-segment try log) + SM-2 reschedule per segment.
    recordSegmentTries(completion.anchor, completion.correctness)
    for (const { seg, ok } of segmentResultsFromRun(completion.anchor, completion.correctness)) {
      rescheduleSegment(seg, ok)
    }
  }, [])

  const exitToSetup = useCallback(() => {
    setRunNonce(n => n + 1)   // recompute batches from the freshly reloaded store
    setPhase('setup')
  }, [])

  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl'
  const eligibleCount = due.length + upcoming.length

  return (
    <div className="flex flex-col items-center gap-6 w-full">

      {/* SETUP */}
      {phase === 'setup' && (
        <div className={`w-full space-y-6 p-6 ${panelCls}`}>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-zinc-100">
              {dueSegCount > 0
                ? `${dueSegCount} segment${dueSegCount === 1 ? '' : 's'} due`
                : eligibleCount > 0 ? 'All caught up' : 'Nothing to maintain yet'}
            </h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              {eligibleCount === 0
                ? 'Recite some segments in the Recite tab first — once a segment is recited it enters the maintenance schedule.'
                : 'Review learned segments before you forget them. Batches are contiguous runs recited in π order, most-overdue first.'}
            </p>
          </div>

          {due.length > 0 && (
            <div className="space-y-2">
              {due.map(batch => (
                <BatchRow key={batch.startSeg} batch={batch} onStart={start} words={words} />
              ))}
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Caught up</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
              {upcoming.map(batch => (
                <BatchRow key={batch.startSeg} batch={batch} onStart={start} words={words} early />
              ))}
            </div>
          )}

          {eligibleCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-zinc-300">Schedule</span>
                <PiLegend items={[
                  { swatch: 'bg-cyan-400', label: 'due' },
                ]} />
              </div>
              <PiSegmentGrid
                count={maxSegments}
                renderCell={seg => {
                  const [from, to] = segmentDigitRange(seg)
                  const isDue = dueSegs.has(seg)
                  const half = PAIRS_PER_SEGMENT / 2
                  const line1 = PI_PAIRS.slice(seg * PAIRS_PER_SEGMENT, seg * PAIRS_PER_SEGMENT + half).join(' ')
                  const line2 = PI_PAIRS.slice(seg * PAIRS_PER_SEGMENT + half, (seg + 1) * PAIRS_PER_SEGMENT).join(' ')
                  return (
                    <div
                      className={`relative flex flex-col items-start px-2 py-1.5 rounded-lg border ${
                        isDue
                          ? 'bg-cyan-600/25 border-cyan-500/60 text-cyan-300'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                      }`}
                    >
                      <span className="text-[8px] opacity-60 leading-none tabular-nums">π {from}–{to}</span>
                      <span className="font-mono text-[8px] tabular-nums leading-snug mt-0.5">{line1}</span>
                      <span className="font-mono text-[8px] tabular-nums leading-snug">{line2}</span>
                    </div>
                  )
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* NUMBER QUIZ + RESULT */}
      {phase === 'quiz' && (
        <PiNumberQuiz
          key={runNonce}
          answerMode={answerMode}
          answerSize={answerSize}
          sequence={sequence}
          anchor={sessionAnchor}
          words={words}
          onExit={exitToSetup}
          onComplete={handleQuizComplete}
          recordSession={false}
          reviewStoriesOnMistake
        />
      )}
    </div>
  )
}

// One suggested batch: π/segment span, due/overdue detail, and a Start button.
// `early` marks a not-yet-due (caught-up) batch — Start is labelled "Review
// early" and the detail shows when it next comes due.
function BatchRow({ batch, onStart, words, early = false }: {
  batch: MaintainBatch
  onStart: (batch: MaintainBatch) => void
  words: Record<string, string>
  early?: boolean
}) {
  const [from] = segmentDigitRange(batch.startSeg)
  const [, to] = segmentDigitRange(batch.endSeg)
  const overdueDays = Math.max(0, Math.round(batch.meanOverdueDays))
  const nextDueDays = Number.isFinite(batch.nextDueMs)
    ? Math.max(1, Math.ceil(batch.nextDueMs / DAY_MS))
    : null
  // First two pairs of the batch's first segment + their mnemonic words, so the
  // user can recognise which segment this is without decoding the π position.
  const base = batch.startSeg * PAIRS_PER_SEGMENT
  const startPairs = [PI_PAIRS[base], PI_PAIRS[base + 1]]
  const startWords = startPairs.map(p => words[p]).filter(Boolean)

  return (
    <div className={`rounded-lg border px-3 py-2.5 flex items-center gap-3 ${
      early ? 'border-zinc-700 bg-zinc-800/40' : 'border-cyan-500/40 bg-cyan-600/10'
    }`}>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="text-sm font-medium text-zinc-200 tabular-nums flex items-baseline gap-2">
          <span>π #{from}–{to}</span>
          {startWords.length > 0 && (
            <span className="text-xs font-normal text-zinc-400 truncate">
              starts <span className="text-zinc-200 font-medium">{startWords.join(' · ')}</span>
              <span className="text-zinc-600 tabular-nums"> ({startPairs.join(' ')})</span>
            </span>
          )}
        </div>
        <div className="text-[11px] text-zinc-500 tabular-nums">
          segment{batch.startSeg === batch.endSeg ? '' : 's'} {batch.startSeg + 1}
          {batch.startSeg === batch.endSeg ? '' : `–${batch.endSeg + 1}`}
          {early
            ? nextDueDays != null && ` · caught up · next due in ${nextDueDays}d`
            : ` · ${batch.dueCount} due · ${overdueDays}d overdue`}
        </div>
      </div>
      <button
        onClick={() => onStart(batch)}
        className={`shrink-0 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
          early
            ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
            : 'bg-cyan-600 hover:bg-cyan-500 text-white'
        }`}
      >
        {early ? 'Review early' : 'Start →'}
      </button>
    </div>
  )
}
