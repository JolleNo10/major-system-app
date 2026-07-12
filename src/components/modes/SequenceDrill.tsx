import { useState, useCallback } from 'react'
import { useWords } from '../../context/WordsContext'
import { MultipleChoice } from '../MultipleChoice'
import { TypingInput } from '../TypingInput'
import type { AnswerMode } from '../../types'

// Sequence memory drill:
//   setup  → pick length (2–20) + study mode
//   study  → encode/memorise each number (number-only self-paced, or word-quiz)
//   recall → type the whole word sequence back from memory (one field)
//   result → per-position scoring

const LEN_KEY = 'major-seq-length'
const MODE_KEY = 'major-seq-studymode'
const MIN_LEN = 2
const MAX_LEN = 20

type Phase = 'setup' | 'study' | 'recall' | 'result'
type StudyMode = 'number-only' | 'word-quiz'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateSequence(words: Record<string, string>, length: number): string[] {
  return shuffle(Object.keys(words)).slice(0, length)
}

function getMcOptions(number: string, words: Record<string, string>): string[] {
  const correct = words[number]
  const others = shuffle(Object.keys(words).filter(n => n !== number)).slice(0, 2)
  return shuffle([correct, ...others.map(n => words[n])])
}

interface Props {
  answerMode: AnswerMode
}

export function SequenceDrill({ answerMode }: Props) {
  const { words } = useWords()

  const [length, setLength] = useState<number>(() => {
    const v = parseInt(localStorage.getItem(LEN_KEY) ?? '', 10)
    return Number.isFinite(v) && v >= MIN_LEN && v <= MAX_LEN ? v : 5
  })
  const [studyMode, setStudyMode] = useState<StudyMode>(() =>
    localStorage.getItem(MODE_KEY) === 'word-quiz' ? 'word-quiz' : 'number-only')

  const [phase, setPhase] = useState<Phase>('setup')
  const [sequence, setSequence] = useState<string[]>([])
  const [studyIdx, setStudyIdx] = useState(0)
  const [revealWord, setRevealWord] = useState(false)

  // word-quiz per-step feedback
  const [quizAnswered, setQuizAnswered] = useState<string | null>(null)
  const [quizCorrect, setQuizCorrect] = useState<boolean | null>(null)
  const [quizOptions, setQuizOptions] = useState<string[]>([])

  // recall
  const [recallText, setRecallText] = useState('')
  const [submitted, setSubmitted] = useState<string[]>([])

  const start = useCallback(() => {
    localStorage.setItem(LEN_KEY, String(length))
    localStorage.setItem(MODE_KEY, studyMode)
    const seq = generateSequence(words, length)
    setSequence(seq)
    setStudyIdx(0)
    setRevealWord(false)
    setQuizAnswered(null)
    setQuizCorrect(null)
    setQuizOptions(getMcOptions(seq[0], words))
    setRecallText('')
    setSubmitted([])
    setPhase('study')
  }, [length, studyMode, words])

  const advanceStudy = useCallback(() => {
    setStudyIdx(prev => {
      const next = prev + 1
      if (next >= sequence.length) {
        setPhase('recall')
        return prev
      }
      setRevealWord(false)
      setQuizAnswered(null)
      setQuizCorrect(null)
      setQuizOptions(getMcOptions(sequence[next], words))
      return next
    })
  }, [sequence, words])

  const handleQuizAnswer = useCallback((value: string) => {
    if (quizAnswered !== null) return
    const correct = value.toLowerCase().trim() === words[sequence[studyIdx]].toLowerCase()
    setQuizAnswered(value)
    setQuizCorrect(correct)
    setTimeout(advanceStudy, 1200)
  }, [quizAnswered, words, sequence, studyIdx, advanceStudy])

  const submitRecall = useCallback(() => {
    const tokens = recallText.trim().split(/\s+/).filter(Boolean)
    setSubmitted(tokens)
    setPhase('result')
  }, [recallText])

  const correctCount = sequence.reduce((acc, num, i) => {
    const typed = submitted[i] ?? ''
    return acc + (typed.toLowerCase() === words[num].toLowerCase() ? 1 : 0)
  }, 0)

  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl'

  return (
    <div className="flex flex-col items-center gap-6 py-4">

      {/* ── SETUP ── */}
      {phase === 'setup' && (
        <div className={`w-full max-w-md space-y-6 p-6 ${panelCls}`}>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium text-zinc-300">Sequence length</span>
              <span className="text-2xl font-black text-violet-400 tabular-nums">{length}</span>
            </div>
            <input
              type="range"
              min={MIN_LEN}
              max={MAX_LEN}
              step={1}
              value={length}
              onChange={e => setLength(parseInt(e.target.value, 10))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-xs text-zinc-600 tabular-nums">
              <span>{MIN_LEN}</span><span>{MAX_LEN}</span>
            </div>
          </div>

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
                      ? 'bg-violet-600/20 border-violet-500 text-zinc-100'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <span className="font-semibold text-sm">{label}</span>
                  <span className="text-xs text-zinc-500">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={start}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
          >Start →</button>
        </div>
      )}

      {/* ── STUDY ── */}
      {phase === 'study' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          {/* Progress */}
          <div className="flex gap-1.5 items-center flex-wrap justify-center">
            {sequence.map((_, i) => (
              <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${
                i < studyIdx ? 'bg-green-500' : i === studyIdx ? 'bg-violet-500' : 'bg-zinc-700'
              }`} />
            ))}
          </div>

          <p className="text-xs text-zinc-600 uppercase tracking-widest">
            Number {studyIdx + 1} of {sequence.length}
          </p>
          <div className="text-[6rem] font-black text-violet-400 tabular-nums leading-none">
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
                className="w-full max-w-xs py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
              >{studyIdx + 1 >= sequence.length ? 'Done — recall →' : 'Next →'}</button>
            </>
          ) : (
            <div className="w-full">
              {answerMode === 'multiple-choice' ? (
                <MultipleChoice
                  key={studyIdx}
                  options={quizOptions}
                  correctAnswer={words[sequence[studyIdx]]}
                  onAnswer={handleQuizAnswer}
                  answered={quizAnswered}
                />
              ) : (
                <TypingInput
                  key={studyIdx}
                  onAnswer={handleQuizAnswer}
                  answeredCorrect={quizCorrect}
                  correctAnswer={words[sequence[studyIdx]]}
                  placeholder="Type the word..."
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── RECALL ── */}
      {phase === 'recall' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Recall the sequence</p>
            <p className="text-sm text-zinc-400">Type all {sequence.length} words in order</p>
          </div>
          <textarea
            autoFocus
            value={recallText}
            onChange={e => setRecallText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitRecall() }}
            rows={Math.min(6, Math.ceil(sequence.length / 3))}
            placeholder="rein tak sofa …  (space-separated)"
            className="w-full px-5 py-4 rounded-xl border border-zinc-700 focus:border-violet-500 bg-zinc-800 outline-none text-lg text-zinc-100 placeholder-zinc-600 resize-none"
          />
          <button
            onClick={submitRecall}
            disabled={!recallText.trim()}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >Check →</button>
          <p className="text-xs text-zinc-600">Tip: ⌘/Ctrl + Enter to submit</p>
        </div>
      )}

      {/* ── RESULT ── */}
      {phase === 'result' && (
        <div className="w-full max-w-md space-y-4">
          <h3 className="text-xl font-bold text-center text-zinc-100">
            {correctCount === sequence.length ? '🎉 Perfect!' : `${correctCount}/${sequence.length} correct`}
          </h3>
          <div className="space-y-1.5">
            {sequence.map((num, i) => {
              const expected = words[num]
              const typed = submitted[i] ?? ''
              const ok = typed.toLowerCase() === expected.toLowerCase()
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                  ok ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <span className="font-mono text-sm text-violet-400 tabular-nums w-6 shrink-0">{num}</span>
                  <span className="font-semibold text-zinc-100 shrink-0">{expected}</span>
                  {!ok && (
                    <span className="text-sm text-red-300 ml-auto truncate">
                      you: {typed || '—'}
                    </span>
                  )}
                  <span className={`${ok ? 'text-green-400' : 'text-red-400'} ${ok ? 'ml-auto' : ''} shrink-0`}>
                    {ok ? '✓' : '✗'}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-center text-zinc-500 font-mono text-sm">{sequence.join(' ')}</p>
          <div className="flex gap-2">
            <button
              onClick={start}
              className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
            >Try again</button>
            <button
              onClick={() => setPhase('setup')}
              className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors"
            >Change settings</button>
          </div>
        </div>
      )}
    </div>
  )
}
