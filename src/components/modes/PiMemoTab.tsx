import { useState, useCallback, useRef, useEffect } from 'react'
import { useWords } from '../../context/WordsContext'
import { MultipleChoice } from '../MultipleChoice'
import { TypingInput } from '../TypingInput'
import { readString, safeSet } from '../../utils/storage'
import { buildEncOptions } from '../../utils/quiz'
import { PI_PAIRS } from '../../data/piDigits'
import { PiSegmentGrid, PiSegmentDot, PiSegmentRangePreview } from './PiSegmentGrid'
import { usePiSegmentStatuses } from '../../hooks/usePiSegmentStatuses'
import { usePiStory, usePiStorySegs, useBlobUrl } from '../../hooks/usePiStory'
import { putStory, deleteStory, exportStories, importStories, type PiStory } from '../../data/piStories'
import { processImage } from '../../utils/imageResize'
import { highlightStory } from '../../utils/storyHighlight'
import { segmentDigitRange } from '../../utils/piSegments'
import { ToolLayout } from '../ToolLayout'
import { loadMemoedPiSegments, saveMemoedPiSegments } from '../../data/piProgress'
import type { AnswerMode } from '../../types'

const MEMO_SEG_KEY = 'major-pi-memo-seg'
// Segments the user has memorised in Memo mode (recalled with all pairs
// correct ≥1×). Recite records to the pi: log; Memo records nothing, so this
// is the only signal that a Memo-only segment is no longer "new".
const PAIRS_PER_SEG = 10

type Phase = 'setup' | 'study' | 'recall' | 'result'
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

  // Per-segment story (text + picture). `storyRefresh` re-runs both story hooks
  // after any write/import; `storyEditing` flips the panel view↔edit.
  const [storyRefresh, setStoryRefresh] = useState(0)
  const [storyEditing, setStoryEditing] = useState(false)
  const [storyFlash, setStoryFlash] = useState<string | null>(null)
  const storyFileRef = useRef<HTMLInputElement>(null)
  const { story } = usePiStory(selectedSeg, storyRefresh)
  const storySegs = usePiStorySegs(storyRefresh)

  const flashStory = useCallback((msg: string) => {
    setStoryFlash(msg)
    setTimeout(() => setStoryFlash(null), 3000)
  }, [])

  // Reset the view↔edit toggle whenever the segment or phase changes.
  useEffect(() => { setStoryEditing(false) }, [selectedSeg, phase])

  const saveStory = useCallback(async (text: string, image: Blob | null) => {
    if (selectedSeg === null) return
    try {
      // Empty text + no image → delete, keeping the grid indicator + export clean.
      if (!text.trim() && !image) await deleteStory(selectedSeg)
      else await putStory(selectedSeg, { text, image })
      setStoryRefresh(k => k + 1)
      setStoryEditing(false)
    } catch {
      flashStory('Could not save — storage may be full')
    }
  }, [selectedSeg, flashStory])

  const handleExportStories = useCallback(async () => {
    const blob = await exportStories()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'pi-stories.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }, [])

  const handleImportStories = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const n = await importStories(ev.target?.result as string)
        setStoryRefresh(k => k + 1)
        flashStory(`Imported ${n} stor${n === 1 ? 'y' : 'ies'}`)
      } catch {
        flashStory('Import failed — invalid file')
      }
    }
    reader.readAsText(file)
  }, [flashStory])

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
    <div className="flex flex-col items-center gap-6 py-4 w-full">

      {/* SETUP */}
      {phase === 'setup' && (
        <ToolLayout
          rightLabel="Next to memo"
          right={<NextToMemoTool nextSeg={nextSeg} loading={statuses.length === 0} onStudy={studySegment} />}
        >
        <div className={`w-full max-w-lg space-y-6 p-6 ${panelCls}`}>
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
                    } ${segIdx === nextSeg ? 'ring-2 ring-violet-500' : ''}`}
                  >
                    <PiSegmentDot
                      status={statuses[segIdx] ?? 'new'}
                      memoed={memoedSegs.has(segIdx)}
                    />
                    {storySegs.has(segIdx) && (
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
            <input ref={storyFileRef} type="file" accept="application/json" className="hidden" onChange={handleImportStories} />
            <button
              onClick={() => storyFileRef.current?.click()}
              className="flex-1 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-violet-500 transition-colors"
            >↑ Import stories</button>
            <button
              onClick={handleExportStories}
              className="flex-1 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-violet-500 transition-colors"
            >↓ Export stories</button>
          </div>
          {storyFlash && <p className="text-xs text-center text-violet-400">{storyFlash}</p>}
        </div>
        </ToolLayout>
      )}

      {/* STUDY */}
      {phase === 'study' && (
        <ToolLayout
          rightLabel="Story & picture"
          right={(
            <StoryPanel
              story={story}
              expectedWords={sequence.map(num => words[num])}
              editing={storyEditing}
              onEdit={() => setStoryEditing(true)}
              onCancel={() => setStoryEditing(false)}
              onSave={saveStory}
              flash={storyFlash}
            />
          )}
        >
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Memorise the sequence</p>
            <p className="text-sm text-zinc-500">
              π digits {(sessionAnchor - 1) * 2 + 1}–{(sessionAnchor + sequence.length - 2) * 2 + 2} · {sequence.length} pairs
            </p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={copyWords}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-violet-500 transition-colors"
            >
              <span aria-hidden="true">📋</span> {copied ? 'Copied!' : 'Copy words'}
            </button>
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
        </ToolLayout>
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
        <ToolLayout
          rightLabel="Story & picture"
          right={(
            <StoryPanel
              story={story}
              expectedWords={sequence.map(num => words[num])}
              editing={storyEditing}
              onEdit={() => setStoryEditing(true)}
              onCancel={() => setStoryEditing(false)}
              onSave={saveStory}
              flash={storyFlash}
            />
          )}
        >
        <div className="w-full max-w-md space-y-4">
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
        </ToolLayout>
      )}
    </div>
  )
}

// Right-rail quick tool: jump straight into studying the next untested segment.
function NextToMemoTool({ nextSeg, loading, onStudy }: {
  nextSeg: number
  loading: boolean
  onStudy: (seg: number) => void
}) {
  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3'

  if (loading) return null

  if (nextSeg < 0) {
    return (
      <div className={panelCls}>
        <p className="text-sm font-medium text-zinc-300">Next to memo</p>
        <p className="text-xs text-zinc-500 leading-relaxed">
          You've started every segment 🎉 Pick any one on the left to study it again.
        </p>
      </div>
    )
  }

  return (
    <div className={panelCls}>
      <p className="text-sm font-medium text-zinc-300">Next to memo</p>
      <div className="rounded-lg border border-violet-500/40 bg-violet-600/10 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-violet-400">Untrained</div>
        <PiSegmentRangePreview startSeg={nextSeg} />
      </div>
      <button
        onClick={() => onStudy(nextSeg)}
        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
      >Study →</button>
    </div>
  )
}

// The per-segment story: a freeform mnemonic + one picture, authored inline in
// the study/result phases (view↔edit toggle). Image via upload or clipboard
// paste, downscaled by processImage before it reaches the save callback.
function StoryPanel({ story, expectedWords, editing, onEdit, onCancel, onSave, flash }: {
  story: PiStory | null
  expectedWords: string[]   // the segment's 10 Major-System words, for highlight + warning
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (text: string, image: Blob | null) => void
  flash: string | null
}) {
  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3'
  const btn = 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors'

  const [draftText, setDraftText] = useState('')
  const [draftImage, setDraftImage] = useState<Blob | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Seed the draft from the current story each time we enter edit mode.
  useEffect(() => {
    if (editing) {
      setDraftText(story?.text ?? '')
      setDraftImage(story?.image ?? null)
    }
  }, [editing, story])

  const viewUrl = useBlobUrl(story?.image ?? null)
  const draftUrl = useBlobUrl(draftImage)

  const handleBlob = useCallback(async (blob: Blob) => {
    try {
      setDraftImage(await processImage(blob))
    } catch {
      /* unsupported / decode error — leave the draft image unchanged */
    }
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void handleBlob(file)
  }

  // Capture pasted images; preventDefault only when an image is found so plain
  // text paste into the textarea still works.
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) { e.preventDefault(); void handleBlob(file); return }
      }
    }
  }

  if (!editing) {
    const hasContent = story && (story.text.trim() || story.image)
    return (
      <div className={panelCls}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-300">Story &amp; picture</p>
          <button onClick={onEdit} className={`${btn} bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-violet-500`}>
            {hasContent ? 'Edit' : '+ Add'}
          </button>
        </div>
        {hasContent ? (
          <>
            {story!.text.trim() && (() => {
              const { segments, missing } = highlightStory(story!.text, expectedWords)
              return (
                <>
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {segments.map((s, i) =>
                      s.matched
                        ? <mark key={i} className="bg-violet-500/25 text-violet-200 rounded px-0.5">{s.text}</mark>
                        : <span key={i}>{s.text}</span>,
                    )}
                  </p>
                  {missing.length > 0 && (
                    <p className="text-xs text-amber-400">
                      ⚠ {missing.length} word{missing.length !== 1 ? 's' : ''} not in your story: {missing.join(', ')}
                    </p>
                  )}
                </>
              )
            })()}
            {viewUrl && <img src={viewUrl} alt="Story picture" className="max-h-64 rounded-lg" />}
          </>
        ) : (
          <button onClick={onEdit} className="w-full text-left text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            Add a story or picture to anchor this segment.
          </button>
        )}
        {flash && <p className="text-xs text-violet-400">{flash}</p>}
      </div>
    )
  }

  return (
    <div className={panelCls}>
      <p className="text-sm font-medium text-zinc-300">Story &amp; picture</p>
      <div onPaste={handlePaste}>
        <textarea
          value={draftText}
          onChange={e => setDraftText(e.target.value)}
          rows={4}
          placeholder="Describe the vivid story linking these pairs… (paste an image here too)"
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-violet-500 focus:outline-none resize-y"
        />
        {draftText.trim() && (() => {
          const { missing } = highlightStory(draftText, expectedWords)
          return missing.length > 0 ? (
            <p className="mt-1.5 text-xs text-amber-400">
              ⚠ {missing.length} word{missing.length !== 1 ? 's' : ''} not yet in your story: {missing.join(', ')}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-emerald-400">✓ All {expectedWords.length} words are in your story</p>
          )
        })()}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => fileRef.current?.click()} className={`${btn} bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-violet-500`}>
            Upload image
          </button>
          {draftImage && (
            <button onClick={() => setDraftImage(null)} className={`${btn} bg-zinc-800 border border-zinc-700 text-red-300 hover:border-red-500`}>
              Remove image
            </button>
          )}
          {draftText.trim() && (
            <button onClick={() => setDraftText('')} className={`${btn} bg-zinc-800 border border-zinc-700 text-red-300 hover:border-red-500`}>
              Clear story
            </button>
          )}
        </div>
        {draftUrl && <img src={draftUrl} alt="Story picture preview" className="max-h-64 rounded-lg mt-2" />}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => onSave(draftText, draftImage)} className={`${btn} flex-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold`}>
          Save
        </button>
        <button onClick={onCancel} className={`${btn} flex-1 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-zinc-100`}>
          Cancel
        </button>
      </div>
      {flash && <p className="text-xs text-red-400">{flash}</p>}
    </div>
  )
}
