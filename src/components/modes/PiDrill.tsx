import { useState, useCallback } from 'react'
import { useWords } from '../../context/WordsContext'
import { MultipleChoice } from '../MultipleChoice'
import { TypingInput } from '../TypingInput'
import { safeSet } from '../../utils/storage'
import { shuffle, pickDistractors } from '../../utils/quiz'
import { PI_PAIRS } from '../../data/piDigits'
import type { AnswerMode } from '../../types'

// Two drill modes:
//   word-chain  — study→recall→result  (memorise words for each pair, then recall the chain)
//   number-quiz — sequential quiz      (enter the 2-digit number for each position in order)

const LEN_KEY = 'major-pi-length'
const STUDYMODE_KEY = 'major-pi-studymode'
const DRILLTYPE_KEY = 'major-pi-drilltype'

const PRESETS = [5, 10, 20, 50] as const
type StudyMode = 'number-only' | 'word-quiz'
type DrillType = 'word-chain' | 'number-quiz'
type Phase = 'setup' | 'study' | 'recall' | 'number-quiz' | 'result'

function readLS(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function wordMcOptions(number: string, words: Record<string, string>): string[] {
  const others = pickDistractors(number, Object.keys(words))
  return shuffle([words[number], ...others.map(n => words[n])])
}

function numberMcOptions(number: string, pool: string[]): string[] {
  const others = pickDistractors(number, pool)
  return shuffle([number, ...others])
}

interface Props {
  answerMode: AnswerMode
}

export function PiDrill({ answerMode }: Props) {
  const { words } = useWords()

  const [length, setLength] = useState<number>(() => {
    const v = parseInt(readLS(LEN_KEY) ?? '', 10)
    return (PRESETS as readonly number[]).includes(v) ? v : 10
  })
  const [studyMode, setStudyMode] = useState<StudyMode>(() =>
    readLS(STUDYMODE_KEY) === 'word-quiz' ? 'word-quiz' : 'number-only')
  const [drillType, setDrillType] = useState<DrillType>(() =>
    readLS(DRILLTYPE_KEY) === 'number-quiz' ? 'number-quiz' : 'word-chain')

  const [phase, setPhase] = useState<Phase>('setup')
  const [sequence, setSequence] = useState<string[]>([])

  // ── word-chain state ──────────────────────────────────────────────────────
  const [studyIdx, setStudyIdx] = useState(0)
  const [revealWord, setRevealWord] = useState(false)
  const [wqAnswered, setWqAnswered] = useState<string | null>(null)
  const [wqCorrect, setWqCorrect] = useState<boolean | null>(null)
  const [wqOptions, setWqOptions] = useState<string[]>([])
  const [recallText, setRecallText] = useState('')
  const [submitted, setSubmitted] = useState<string[]>([])

  // ── number-quiz state ─────────────────────────────────────────────────────
  const [nqIdx, setNqIdx] = useState(0)
  const [nqAnswered, setNqAnswered] = useState<string | null>(null)
  const [nqAnsweredCorrect, setNqAnsweredCorrect] = useState<boolean | null>(null)
  const [nqOptions, setNqOptions] = useState<string[]>([])
  const [nqResults, setNqResults] = useState<{ typed: string; ok: boolean }[]>([])

  // ── start ─────────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    safeSet(LEN_KEY, String(length))
    safeSet(STUDYMODE_KEY, studyMode)
    safeSet(DRILLTYPE_KEY, drillType)
    const seq = PI_PAIRS.slice(0, length)
    setSequence(seq)

    if (drillType === 'word-chain') {
      setStudyIdx(0)
      setRevealWord(false)
      setWqAnswered(null)
      setWqCorrect(null)
      setWqOptions(wordMcOptions(seq[0], words))
      setRecallText('')
      setSubmitted([])
      setPhase('study')
    } else {
      setNqIdx(0)
      setNqAnswered(null)
      setNqAnsweredCorrect(null)
      setNqOptions(numberMcOptions(seq[0], seq))
      setNqResults([])
      setPhase('number-quiz')
    }
  }, [length, studyMode, drillType, words])

  // ── word-chain handlers ───────────────────────────────────────────────────
  const advanceStudy = useCallback(() => {
    setStudyIdx(prev => {
      const next = prev + 1
      if (next >= sequence.length) {
        setPhase('recall')
        return prev
      }
      setRevealWord(false)
      setWqAnswered(null)
      setWqCorrect(null)
      setWqOptions(wordMcOptions(sequence[next], words))
      return next
    })
  }, [sequence, words])

  const handleWordQuizAnswer = useCallback((value: string) => {
    if (wqAnswered !== null) return
    const correct = value.toLowerCase().trim() === words[sequence[studyIdx]]?.toLowerCase()
    setWqAnswered(value)
    setWqCorrect(correct)
    setTimeout(advanceStudy, 1200)
  }, [wqAnswered, words, sequence, studyIdx, advanceStudy])

  const submitRecall = useCallback(() => {
    const tokens = recallText.trim().split(/\s+/).filter(Boolean)
    setSubmitted(tokens)
    setPhase('result')
  }, [recallText])

  // ── number-quiz handlers ──────────────────────────────────────────────────
  const advanceNumberQuiz = useCallback((typed: string, ok: boolean) => {
    setNqResults(prev => [...prev, { typed, ok }])
    const nextIdx = nqIdx + 1
    if (nextIdx >= sequence.length) {
      setTimeout(() => setPhase('result'), 1200)
    } else {
      setTimeout(() => {
        setNqAnswered(null)
        setNqAnsweredCorrect(null)
        setNqOptions(numberMcOptions(sequence[nextIdx], sequence))
        setNqIdx(nextIdx)
      }, 1200)
    }
  }, [nqIdx, sequence])

  const handleNumberAnswer = useCallback((value: string) => {
    if (nqAnswered !== null) return
    const ok = value.trim() === sequence[nqIdx]
    setNqAnswered(value)
    setNqAnsweredCorrect(ok)
    advanceNumberQuiz(value, ok)
  }, [nqAnswered, sequence, nqIdx, advanceNumberQuiz])

  // ── result counts ─────────────────────────────────────────────────────────
  const wordCorrectCount = sequence.reduce((acc, num, i) => {
    const typed = submitted[i] ?? ''
    return acc + (typed.toLowerCase() === words[num]?.toLowerCase() ? 1 : 0)
  }, 0)
  const nqCorrectCount = nqResults.filter(r => r.ok).length

  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl'
  const progressDots = (idx: number) => (
    <div className="flex gap-1.5 items-center flex-wrap justify-center">
      {sequence.map((_, i) => (
        <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${
          i < idx ? 'bg-green-500' : i === idx ? 'bg-cyan-500' : 'bg-zinc-700'
        }`} />
      ))}
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-6 py-4">

      {/* ── SETUP ── */}
      {phase === 'setup' && (
        <div className={`w-full max-w-md space-y-6 p-6 ${panelCls}`}>

          {/* Drill type */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-zinc-300">Drill type</span>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['word-chain', 'Word chain', 'Study pairs, then recall the words'],
                ['number-quiz', 'Number quiz', 'Enter the digits at each position'],
              ] as [DrillType, string, string][]).map(([t, label, sub]) => (
                <button
                  key={t}
                  onClick={() => setDrillType(t)}
                  className={`flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-colors ${
                    drillType === t
                      ? 'bg-cyan-600/20 border-cyan-500 text-zinc-100'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <span className="font-semibold text-sm">{label}</span>
                  <span className="text-xs text-zinc-500">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Length */}
          <div className="space-y-3">
            <span className="text-sm font-medium text-zinc-300">How many pairs?</span>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => setLength(p)}
                  className={`py-3 rounded-lg border text-center font-bold transition-colors ${
                    length === p
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-600">{length} pairs = {length * 2} decimal digits of π</p>
          </div>

          {/* Study mode (word-chain only) */}
          {drillType === 'word-chain' && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-zinc-300">Study mode</span>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['number-only', 'Number only', 'Encode in your head'],
                  ['word-quiz', 'Word quiz', 'Answer each word'],
                ] as [StudyMode, string, string][]).map(([m, label, sub]) => (
                  <button
                    key={m}
                    onClick={() => setStudyMode(m)}
                    className={`flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-colors ${
                      studyMode === m
                        ? 'bg-cyan-600/20 border-cyan-500 text-zinc-100'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    <span className="font-semibold text-sm">{label}</span>
                    <span className="text-xs text-zinc-500">{sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={start}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
          >Start →</button>
        </div>
      )}

      {/* ── STUDY (word-chain) ── */}
      {phase === 'study' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          {progressDots(studyIdx)}
          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Pair {studyIdx + 1} of π</p>
            <p className="text-xs text-zinc-700">decimal digits {studyIdx * 2 + 1}–{studyIdx * 2 + 2}</p>
          </div>
          <div className="text-[6rem] font-black text-cyan-400 tabular-nums leading-none">
            {sequence[studyIdx]}
          </div>
          {studyMode === 'number-only' ? (
            <>
              <div className="min-h-[3rem] flex items-center">
                {revealWord ? (
                  <span className="text-3xl font-bold text-zinc-100">{words[sequence[studyIdx]]}</span>
                ) : (
                  <button
                    onClick={() => setRevealWord(true)}
                    className="px-4 min-h-[40px] rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 text-sm font-medium transition-colors"
                  >💡 reveal word</button>
                )}
              </div>
              <button
                onClick={advanceStudy}
                className="w-full max-w-xs py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
              >{studyIdx + 1 >= sequence.length ? 'Done — recall →' : 'Next →'}</button>
            </>
          ) : (
            <div className="w-full">
              {answerMode === 'multiple-choice' ? (
                <MultipleChoice
                  key={studyIdx}
                  options={wqOptions}
                  correctAnswer={words[sequence[studyIdx]]}
                  onAnswer={handleWordQuizAnswer}
                  answered={wqAnswered}
                />
              ) : (
                <TypingInput
                  key={studyIdx}
                  onAnswer={handleWordQuizAnswer}
                  answeredCorrect={wqCorrect}
                  correctAnswer={words[sequence[studyIdx]]}
                  placeholder="Type the word..."
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── RECALL (word-chain) ── */}
      {phase === 'recall' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Recall the chain</p>
            <p className="text-sm text-zinc-400">Type all {sequence.length} words in order</p>
          </div>
          <textarea
            autoFocus
            value={recallText}
            onChange={e => setRecallText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitRecall() }}
            rows={Math.min(6, Math.ceil(sequence.length / 3))}
            placeholder="tyre, towel, pin …  (space-separated)"
            className="w-full px-5 py-4 rounded-xl border border-zinc-700 focus:border-cyan-500 bg-zinc-800 outline-none text-lg text-zinc-100 placeholder-zinc-600 resize-none"
          />
          <button
            onClick={submitRecall}
            disabled={!recallText.trim()}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >Check →</button>
          <p className="text-xs text-zinc-500">Tip: ⌘/Ctrl + Enter to submit</p>
        </div>
      )}

      {/* ── NUMBER QUIZ ── */}
      {phase === 'number-quiz' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          {progressDots(nqIdx)}
          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">What are the digits?</p>
            <p className="text-xs text-zinc-700">decimal digits {nqIdx * 2 + 1}–{nqIdx * 2 + 2} of π</p>
          </div>
          <div className="text-[4rem] font-black text-zinc-400 tabular-nums leading-none">
            Pair {nqIdx + 1}
          </div>
          <div className="w-full">
            {answerMode === 'multiple-choice' ? (
              <MultipleChoice
                key={nqIdx}
                options={nqOptions}
                correctAnswer={sequence[nqIdx]}
                onAnswer={handleNumberAnswer}
                answered={nqAnswered}
              />
            ) : (
              <TypingInput
                key={nqIdx}
                onAnswer={handleNumberAnswer}
                answeredCorrect={nqAnsweredCorrect}
                correctAnswer={sequence[nqIdx]}
                placeholder="e.g. 14"
              />
            )}
          </div>
        </div>
      )}

      {/* ── RESULT ── */}
      {phase === 'result' && drillType === 'word-chain' && (
        <div className="w-full max-w-md space-y-4">
          <h3 className="text-xl font-bold text-center text-zinc-100">
            {wordCorrectCount === sequence.length ? '🎉 Perfect!' : `${wordCorrectCount}/${sequence.length} correct`}
          </h3>
          <div className="space-y-1.5">
            {sequence.map((num, i) => {
              const expected = words[num]
              const typed = submitted[i] ?? ''
              const ok = typed.toLowerCase() === expected?.toLowerCase()
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                  ok ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <span className="text-xs text-zinc-600 tabular-nums w-5 shrink-0">#{i + 1}</span>
                  <span className="font-mono text-sm text-cyan-400 tabular-nums w-6 shrink-0">{num}</span>
                  <span className="font-semibold text-zinc-100 shrink-0">{expected}</span>
                  {!ok && <span className="text-sm text-red-300 ml-auto truncate">you: {typed || '—'}</span>}
                  <span className={`${ok ? 'text-green-400 ml-auto' : 'text-red-400'} shrink-0`}>{ok ? '✓' : '✗'}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={start} className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors">Try again</button>
            <button onClick={() => setPhase('setup')} className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors">Settings</button>
          </div>
        </div>
      )}

      {phase === 'result' && drillType === 'number-quiz' && (
        <div className="w-full max-w-md space-y-4">
          <h3 className="text-xl font-bold text-center text-zinc-100">
            {nqCorrectCount === sequence.length ? '🎉 Perfect!' : `${nqCorrectCount}/${sequence.length} correct`}
          </h3>
          <div className="space-y-1.5">
            {sequence.map((num, i) => {
              const r = nqResults[i]
              const ok = r?.ok ?? false
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                  ok ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <span className="text-xs text-zinc-600 tabular-nums w-5 shrink-0">#{i + 1}</span>
                  <span className="font-mono text-sm text-cyan-400 tabular-nums w-6 shrink-0">{num}</span>
                  <span className="text-zinc-400 text-sm shrink-0">{words[num]}</span>
                  {!ok && <span className="text-sm text-red-300 ml-auto tabular-nums">you: {r?.typed || '—'}</span>}
                  <span className={`${ok ? 'text-green-400 ml-auto' : 'text-red-400'} shrink-0`}>{ok ? '✓' : '✗'}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={start} className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors">Try again</button>
            <button onClick={() => setPhase('setup')} className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors">Settings</button>
          </div>
        </div>
      )}
    </div>
  )
}
