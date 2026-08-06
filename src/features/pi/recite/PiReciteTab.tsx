import { useState, useCallback, useEffect, useMemo } from 'react'
import { useWords } from '@/features/major-system'
import { useSettings } from '@/app/settings/SettingsContext'
import { PiNumberQuiz, type PiQuizCompletion } from '@/features/pi/shared/PiNumberQuiz'
import { readString, safeSet } from '@/core/storage'
import { PI_PAIRS } from '@/features/pi/shared/piDigits'
import { loadPiSessions, type PiSession } from '@/features/pi/shared/piStats'
import { PiSegmentRangePicker, useSegmentPickerData } from '@/features/pi/shared/PiSegmentRangePicker'
import { usePiReciteRail } from '@/features/pi/recite/PiReciteRail'
import {
  flawlessSegmentsFromRun,
  flawlessSegmentsFromSessions,
  loadFlawlesslyRecitedPiSegments,
  pendingMemoedSegmentRanges,
  saveFlawlesslyRecitedPiSegments,
  type PiSegmentRange,
} from '@/features/pi/shared/piProgress'
import type { AnswerMode } from '@/core/types'

const SEL_START_KEY = 'major-pi-sel-start'
const SEL_END_KEY = 'major-pi-sel-end'

const PAIRS_PER_ROW = 10

export type Phase = 'setup' | 'quiz'
interface Props { answerMode: AnswerMode; maxPiPairs: number }

export function PiReciteTab({ answerMode, maxPiPairs }: Props) {
  const { words } = useWords()
  const { settings } = useSettings()
  const answerSize = settings.piPairsPerAnswer

  const [selAnchor, setSelAnchor] = useState<number | null>(() => {
    const v = parseInt(readString(SEL_START_KEY) ?? '', 10)
    return v >= 1 && v <= PI_PAIRS.length ? v : 1
  })
  const [selEnd, setSelEnd] = useState<number | null>(() => {
    const v = parseInt(readString(SEL_END_KEY) ?? '', 10)
    return v >= 1 && v <= PI_PAIRS.length ? v : 10
  })

  const [sessionAnchor, setSessionAnchor] = useState(1)
  const [phase, setPhase] = useState<Phase>('setup')
  const [sequence, setSequence] = useState<string[]>([])
  const [runNonce, setRunNonce] = useState(0)

  const [piSessions, setPiSessions] = useState<PiSession[]>(() => loadPiSessions())
  const { statuses, memoedSegs, statusesLoading } = useSegmentPickerData(maxPiPairs, phase)
  const maxSegments = Math.floor(maxPiPairs / PAIRS_PER_ROW)
  const [recitedSegs, setRecitedSegs] = useState(loadFlawlesslyRecitedPiSegments)

  // Migrate progress that predates explicit flawless-segment tracking. Perfect
  // historical sessions and the existing strict "learned" status both prove a
  // segment has already been recited correctly.
  useEffect(() => {
    const historical = flawlessSegmentsFromSessions(piSessions, maxSegments)
    setRecitedSegs(previous => {
      const next = new Set(previous)
      historical.forEach(seg => next.add(seg))
      statuses.forEach((status, seg) => { if (status === 'learned') next.add(seg) })
      return next.size === previous.size ? previous : next
    })
  }, [piSessions, statuses, maxSegments])

  useEffect(() => {
    saveFlawlesslyRecitedPiSegments(recitedSegs)
  }, [recitedSegs])

  const pendingRanges = useMemo(
    () => pendingMemoedSegmentRanges(memoedSegs, recitedSegs, statuses, maxSegments),
    [memoedSegs, recitedSegs, statuses, maxSegments],
  )
  const availableMemoedCount = useMemo(
    () => [...memoedSegs].filter(seg => seg >= 0 && seg < maxSegments).length,
    [memoedSegs, maxSegments],
  )

  const startRange = useCallback((anchor: number, end: number) => {
    if (anchor < 1 || end < anchor || end > maxPiPairs || end > PI_PAIRS.length) return
    setSelAnchor(anchor)
    setSelEnd(end)
    safeSet(SEL_START_KEY, String(anchor))
    safeSet(SEL_END_KEY, String(end))
    setSequence(PI_PAIRS.slice(anchor - 1, end))
    setSessionAnchor(anchor)
    setRunNonce(n => n + 1)
    setPhase('quiz')
  }, [maxPiPairs])

  const start = useCallback(() => {
    if (selAnchor === null || selEnd === null) return
    startRange(selAnchor, selEnd)
  }, [selAnchor, selEnd, startRange])

  const startQuickRange = useCallback((range: PiSegmentRange) => {
    startRange(range.startSeg * PAIRS_PER_ROW + 1, (range.endSeg + 1) * PAIRS_PER_ROW)
  }, [startRange])

  const handleQuizComplete = useCallback((completion: PiQuizCompletion) => {
    const flawless = flawlessSegmentsFromRun(completion.anchor, completion.correctness)
    if (flawless.length === 0) return
    setRecitedSegs(previous => {
      const next = new Set(previous)
      flawless.forEach(seg => next.add(seg))
      return next.size === previous.size ? previous : next
    })
  }, [])

  const exitToSetup = useCallback(() => {
    setPiSessions(loadPiSessions())
    setPhase('setup')
  }, [])

  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl'

  const formatRate = (rate: number) => rate.toFixed(rate < 10 ? 2 : 1)

  const numButtons = Math.ceil(maxPiPairs / PAIRS_PER_ROW)

  // Rails — only during setup (the quiz phase has no rail): run history on the
  // left, "ready to recite" suggestions on the right.
  usePiReciteRail({
    phase,
    piSessions,
    formatRate,
    pendingRanges,
    statusesLoading,
    availableMemoedCount,
    onRecite: startQuickRange,
  })

  return (
    <div className="flex flex-col items-center gap-6 w-full">

      {/* SETUP */}
      {phase === 'setup' && (
        <div className={`w-full space-y-6 p-6 ${panelCls}`}>

          <div className="space-y-2">
            <span className="text-sm font-medium text-zinc-300">Select segment</span>
            <PiSegmentRangePicker
              count={numButtons}
              statuses={statuses}
              memoedSegs={memoedSegs}
              value={{
                start: selAnchor === null ? null : (selAnchor - 1) / PAIRS_PER_ROW,
                end: selEnd === null ? null : selEnd / PAIRS_PER_ROW - 1,
              }}
              onChange={next => {
                setSelAnchor(next.start === null ? null : next.start * PAIRS_PER_ROW + 1)
                setSelEnd(next.end === null ? null : (next.end + 1) * PAIRS_PER_ROW)
              }}
              renderCellBody={seg => {
                const half = PAIRS_PER_ROW / 2
                const line1 = PI_PAIRS.slice(seg * PAIRS_PER_ROW, seg * PAIRS_PER_ROW + half).join(' ')
                const line2 = PI_PAIRS.slice(seg * PAIRS_PER_ROW + half, (seg + 1) * PAIRS_PER_ROW).join(' ')
                return (
                  <>
                    <span className="font-mono text-[8px] tabular-nums leading-snug mt-0.5">{line1}</span>
                    <span className="font-mono text-[8px] tabular-nums leading-snug">{line2}</span>
                  </>
                )
              }}
            />
            <p className="text-xs text-center pt-1 min-h-[1.25rem]">
              {selAnchor === null ? (
                <span className="text-zinc-700">Click a segment to start selecting</span>
              ) : selEnd === null ? (
                <span className="text-amber-400/80">Pair {selAnchor} — click another to set end</span>
              ) : (
                <span className="text-cyan-400/80">
                  Pairs {selAnchor}–{selEnd} · {selEnd - selAnchor + 1} pairs · digits {2 * selAnchor - 1}–{2 * selEnd}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={start}
            disabled={selAnchor === null || selEnd === null}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >Start →</button>
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
          recordSession
          reviewStoriesOnMistake
        />
      )}
    </div>
  )
}
