import { useState, useCallback, useRef, useEffect } from 'react'
import { useWords } from '@/features/major-system/WordsContext'
import { MultipleChoice } from '@/core/ui/MultipleChoice'
import { TypingInput } from '@/core/ui/TypingInput'
import { readString, safeSet } from '@/core/storage'
import { buildEncOptions } from '@/core/scoring/quiz'
import { PI_PAIRS } from '@/features/pi/piDigits'
import { PiSegmentGrid, PiSegmentDot } from '@/features/pi/PiSegmentGrid'
import { usePiMemoRail } from '@/features/pi/PiMemoRail'
import { usePiSegmentStatuses } from '@/features/pi/usePiSegmentStatuses'
import { usePiStoryEditor } from '@/features/pi/usePiStoryEditor'
import { loadMemoedPiSegments, saveMemoedPiSegments } from '@/features/pi/piProgress'
import type { AnswerMode } from '@/core/types'

const MEMO_SEG_KEY = 'major-pi-memo-seg'
// Segments the user has memorised in Memo mode (recalled with all pairs
// correct ≥1×). Recite records to the pi: log; Memo records nothing, so this
// is the only signal that a Memo-only segment is no longer "new".
const PAIRS_PER_SEG = 10

export type Phase = 'setup' | 'study' | 'recall' | 'result'
interface WqResult { typed: string; ok: boolean }
interface Props { answerMode: AnswerMode; maxPiPairs: number }

export function PiMemoTab({ answerMode, maxPiPairs }: Props) {
  const { words } = useWords()

  const maxSegs = Math.floor(maxPiPairs / PAIRS_PER_SEG)

  const [selectedSeg, setSelectedSeg] = useState<number | null>(() => {
    const v = parseInt(readString(MEMO_SEG_KEY) ?? '', 10)
    const maxAvail = Math.floor(PI_PAIRS.length / PAIRS_PER_SEG)
    return v >= 0 && v < maxAvail ? v : null
  })

  const [phase, setPhase] = useState<Phase>('setup')
  const [sequence, setSequence] = useState<string[]>([])
  const [sessionAnchor, setSessionAnchor] = useState(1)

  const [memoedSegs, setMemoedSegs] = useState<Set<number>>(
    loadMemoedPiSegments,
  )

  const statuses = usePiSegmentStatuses(maxPiPairs, phase)
  // "Next to memo" = the first segment that's neither been recited (pi: log,
  // even weakly) nor successfully memorised in Memo mode. −1 once every
  // segment has been touched one way or the other.
  const nextSeg = (() => {
    for (let i = 0; i < statuses.length; i++) {
      if (statuses[i] === 'new' && !memoedSegs.has(i)) return i
    }
    return -1
  })()

  const [studyIdx, setStudyIdx] = useState(0)
  const [wqAnswered, setWqAnswered] = useState<string | null>(null)
  const [wqCorrect, setWqCorrect] = useState<boolean | null>(null)
  const [wqOptions, setWqOptions] = useState<string[]>([])
  const [wqNumberRevealed, setWqNumberRevealed] = useState(false)
  const [wqResults, setWqResults] = useState<WqResult[]>([])
  const [copied, setCopied] = useState(false)
  const historyEndRef = useRef<HTMLDivElement>(null)

  // Per-segment story (text + picture) edit/persist lifecycle. Shared with the
  // rail (StoryPanel) — `storyFileRef` is the setup panel's hidden Import input.
  const storyEditor = usePiStoryEditor(selectedSeg, phase)
  const storyFileRef = useRef<HTMLInputElement>(null)

  const copyWords = useCallback(() => {
    const text = sequence.map(num => words[num]).join('\n')
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }, [sequence, words])

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [wqResults.length])

  // Mark the segment memorised once the recall test is completed with every
  // pair correct — this is what lets "Next to memo" advance past segments
  // learned in Memo mode (which otherwise record nothing).
  useEffect(() => {
    if (phase !== 'result' || selectedSeg === null) return
    const allCorrect = wqResults.length === sequence.length && wqResults.every(r => r.ok)
    if (!allCorrect || memoedSegs.has(selectedSeg)) return
    setMemoedSegs(prev => {
      const next = new Set(prev).add(selectedSeg)
      saveMemoedPiSegments(next)
      return next
    })
  }, [phase, selectedSeg, wqResults, sequence.length, memoedSegs])

  const studySegment = useCallback((seg: number) => {
    const anchor = seg * PAIRS_PER_SEG + 1
    setSequence(PI_PAIRS.slice(anchor - 1, anchor - 1 + PAIRS_PER_SEG))
    setSessionAnchor(anchor)
    setSelectedSeg(seg)
    safeSet(MEMO_SEG_KEY, String(seg))
    setPhase('study')
  }, [])

  const start = useCallback(() => {
    if (selectedSeg === null) return
    studySegment(selectedSeg)
  }, [selectedSeg, studySegment])

  const studyPreviousSegment = useCallback(() => {
    if (selectedSeg === null || selectedSeg <= 0) return
    studySegment(selectedSeg - 1)
  }, [selectedSeg, studySegment])

  const studyNextSegment = useCallback(() => {
    if (selectedSeg === null || selectedSeg + 1 >= maxSegs) return
    studySegment(selectedSeg + 1)
  }, [selectedSeg, maxSegs, studySegment])

  const advanceRecall = useCallback(() => {
    setStudyIdx(prev => {
      const next = prev + 1
      if (next >= sequence.length) {
        setPhase('result')
        return prev
      }
      setWqAnswered(null)
      setWqCorrect(null)
      setWqNumberRevealed(false)
      setWqOptions(buildEncOptions(sequence[next], words))
      return next
    })
  }, [sequence, words])

  const handleAnswer = useCallback((value: string) => {
    if (wqAnswered !== null) return
    const correct = value.toLowerCase().trim() === words[sequence[studyIdx]]?.toLowerCase()
    setWqAnswered(value)
    setWqCorrect(correct)
    setWqResults(prev => [...prev, { typed: value, ok: correct }])
    setTimeout(advanceRecall, correct ? 100 : 1200)
  }, [wqAnswered, words, sequence, studyIdx, advanceRecall])

  const goToSetup = useCallback(() => {
    setStudyIdx(0)
    setWqAnswered(null)
    setWqCorrect(null)
    setWqNumberRevealed(false)
    setWqOptions([])
    setWqResults([])
    setPhase('setup')
  }, [])

  const goToRecall = useCallback(() => {
    setStudyIdx(0)
    setWqAnswered(null)
    setWqCorrect(null)
    setWqNumberRevealed(false)
    setWqOptions(buildEncOptions(sequence[0], words))
    setWqResults([])
    setPhase('recall')
  }, [sequence, words])

  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl'

  // The right rail (side panel) owns its own phase→view/label mapping.
  usePiMemoRail({
    phase,
    nextSeg,
    statusesLoading: statuses.length === 0,
    onStudySeg: studySegment,
    storyEditor,
    sequence,
    words,
    onCopyWords: copyWords,
    copied,
  })

  const progressDots = (idx: number, results?: WqResult[]) => (
    <div className="flex gap-1 items-center flex-wrap justify-center">
      {sequence.map((_, i) => {
        let color = 'bg-zinc-700'
        if (i === idx) color = 'bg-cyan-500'
        else if (i < idx) {
          color = results
            ? (results[i]?.ok ? 'bg-green-500' : 'bg-red-500')
            : 'bg-green-500'
        }
        return <div key={i} className={`h-1.5 w-6 rounded-full transition-all ${color}`} />
      })}
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-6 w-full">

      {/* SETUP */}
      {phase === 'setup' && (
        <div className={`w-full space-y-6 p-6 ${panelCls}`}>
          <div className="space-y-2">
            <span className="text-sm font-medium text-zinc-300">Select a segment to memorise</span>
            <PiSegmentGrid
              count={maxSegs}
              renderCell={segIdx => {
                const startDigit = segIdx * PAIRS_PER_SEG * 2 + 1
                const endDigit = (segIdx + 1) * PAIRS_PER_SEG * 2
                const half = PAIRS_PER_SEG / 2
                const line1 = PI_PAIRS.slice(segIdx * PAIRS_PER_SEG, segIdx * PAIRS_PER_SEG + half).join(' ')
                const line2 = PI_PAIRS.slice(segIdx * PAIRS_PER_SEG + half, (segIdx + 1) * PAIRS_PER_SEG).join(' ')
                const isSelected = selectedSeg === segIdx
                return (
                  <button
                    onClick={() => {
                      const next = isSelected ? null : segIdx
                      setSelectedSeg(next)
                      if (next !== null) safeSet(MEMO_SEG_KEY, String(next))
                    }}
                    className={`relative flex flex-col items-start px-2 py-1.5 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-cyan-600/25 border-cyan-500/60 text-cyan-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 hover:border-zinc-500'
                    } ${segIdx === nextSeg ? 'ring-1 ring-violet-400/50' : ''}`}
                  >
                    <PiSegmentDot
                      status={statuses[segIdx] ?? 'new'}
                      memoed={memoedSegs.has(segIdx)}
                    />
                    {storyEditor.storySegs.has(segIdx) && (
                      <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-violet-400" aria-label="has story" />
                    )}
                    <span className="text-[8px] opacity-60 leading-none tabular-nums">π {startDigit}–{endDigit}</span>
                    <span className="font-mono text-[8px] tabular-nums leading-snug mt-0.5">{line1}</span>
                    <span className="font-mono text-[8px] tabular-nums leading-snug">{line2}</span>
                  </button>
                )
              }}
            />
            <p className="text-xs text-center pt-1 min-h-[1.25rem]">
              {selectedSeg === null ? (
                <span className="text-zinc-700">Tap a segment to select it</span>
              ) : (
                <span className="text-cyan-400/80">
                  Pairs {selectedSeg * PAIRS_PER_SEG + 1}–{(selectedSeg + 1) * PAIRS_PER_SEG} · digits {selectedSeg * PAIRS_PER_SEG * 2 + 1}–{(selectedSeg + 1) * PAIRS_PER_SEG * 2}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={start}
            disabled={selectedSeg === null}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >Study →</button>
          <div className="flex items-center gap-2 pt-1">
            <input ref={storyFileRef} type="file" accept="application/json" className="hidden" onChange={storyEditor.onImport} />
            <button
              onClick={() => storyFileRef.current?.click()}
              className="flex-1 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-violet-500 transition-colors"
            >↑ Import stories</button>
            <button
              onClick={storyEditor.onExport}
              className="flex-1 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-violet-500 transition-colors"
            >↓ Export stories</button>
          </div>
          {storyEditor.flash && <p className="text-xs text-center text-violet-400">{storyEditor.flash}</p>}
        </div>
      )}

      {/* STUDY */}
      {phase === 'study' && (
        <div className="w-full space-y-4">
          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Memorise the sequence</p>
            <p className="text-sm text-zinc-500">
              π digits {(sessionAnchor - 1) * 2 + 1}–{(sessionAnchor + sequence.length - 2) * 2 + 2} · {sequence.length} pairs
            </p>
          </div>
          <div className="space-y-1.5">
            {sequence.map((num, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900">
                <span className="text-xs text-zinc-600 tabular-nums w-8 shrink-0">#{sessionAnchor + i}</span>
                <span className="font-mono text-cyan-400 tabular-nums font-bold w-6 shrink-0">{num}</span>
                <span className="font-semibold text-zinc-100">{words[num]}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={studyPreviousSegment}
              disabled={selectedSeg === null || selectedSeg <= 0}
              className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 font-semibold transition-colors"
            >← Previous segment</button>
            <button
              onClick={goToRecall}
              className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
            >Test recall →</button>
            <button
              onClick={studyNextSegment}
              disabled={selectedSeg === null || selectedSeg + 1 >= maxSegs}
              className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 font-semibold transition-colors"
            >Next segment →</button>
          </div>
        </div>
      )}

      {/* RECALL — StoryPanel is intentionally omitted here: the story/picture is
          a spoiler for the pairs being recalled. */}
      {phase === 'recall' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          {progressDots(studyIdx, wqResults)}
          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Recall the sequence</p>
            <p className="text-xs text-zinc-700">
              Pair {sessionAnchor + studyIdx} · digits {(sessionAnchor + studyIdx - 1) * 2 + 1}–{(sessionAnchor + studyIdx - 1) * 2 + 2}
            </p>
          </div>
          {wqNumberRevealed ? (
            <div className="text-[6rem] font-black text-cyan-400 tabular-nums leading-none">
              {sequence[studyIdx]}
            </div>
          ) : (
            <button
              onClick={() => setWqNumberRevealed(true)}
              className="w-full py-10 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 hover:border-cyan-500 hover:bg-zinc-800 transition-all text-zinc-400 hover:text-zinc-100 text-sm font-medium"
            >
              Show number
            </button>
          )}
          <div className="w-full space-y-3">
            {answerMode === 'multiple-choice' ? (
              <MultipleChoice
                key={studyIdx}
                options={wqOptions}
                correctAnswer={words[sequence[studyIdx]]}
                onAnswer={handleAnswer}
                answered={wqAnswered}
              />
            ) : (
              <TypingInput
                key={studyIdx}
                onAnswer={handleAnswer}
                answeredCorrect={wqCorrect}
                correctAnswer={words[sequence[studyIdx]]}
                placeholder="Type the word..."
              />
            )}
            {wqResults.length > 0 && (
              <div className="w-full max-h-48 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
                <div className="p-2 space-y-0.5">
                  {wqResults.map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${r.ok ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <span className="text-zinc-600 tabular-nums text-xs w-8 shrink-0">#{sessionAnchor + i}</span>
                      <span className={`font-mono tabular-nums font-bold w-6 shrink-0 ${r.ok ? 'text-green-400' : 'text-red-400'}`}>{sequence[i]}</span>
                      <span className="text-zinc-200 text-sm font-semibold shrink-0">{words[sequence[i]]}</span>
                      {!r.ok && <span className="ml-auto text-xs text-red-400 shrink-0">→ {r.typed}</span>}
                      <span className={`${r.ok ? 'ml-auto' : ''} text-xs shrink-0 ${r.ok ? 'text-green-500' : 'text-red-500'}`}>{r.ok ? '✓' : '✗'}</span>
                    </div>
                  ))}
                  <div ref={historyEndRef} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'result' && (
        <div className="w-full space-y-4">
          <h3 className="text-xl font-bold text-center text-zinc-100">Review the sequence</h3>
          <div className="space-y-1.5">
            {sequence.map((num, i) => {
              const expected = words[num]
              const r = wqResults[i]
              const ok = r?.ok ?? false
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                  ok ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <span className="text-xs text-zinc-600 tabular-nums w-8 shrink-0">#{sessionAnchor + i}</span>
                  <span className="font-mono text-sm text-cyan-400 tabular-nums w-6 shrink-0">{num}</span>
                  <span className="font-semibold text-zinc-100 shrink-0">{expected}</span>
                  {!ok && <span className="text-sm text-red-300 ml-auto truncate">you: {r?.typed || '—'}</span>}
                  <span className={`${ok ? 'text-green-400 ml-auto' : 'text-red-400'} shrink-0`}>{ok ? '✓' : '✗'}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={goToRecall} className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors">Recall again</button>
            <button onClick={goToSetup} className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors">Change segment</button>
          </div>
        </div>
      )}
    </div>
  )
}
