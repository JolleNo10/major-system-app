import { useState, useCallback, useEffect } from 'react'
import { useWords } from '../../context/WordsContext'
import { MultipleChoice } from '../MultipleChoice'
import { TypingInput } from '../TypingInput'
import { SOUND_KEY } from '../../data/soundKey'
import type { AnswerMode } from '../../types'

const DELAY_KEY = 'major-seq-delay'
const COUNTDOWN_SECONDS = 15

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateSequence(words: Record<string, string>, length = 3): string[] {
  return shuffle(Object.keys(words)).slice(0, length)
}

function getMcOptions(number: string, words: Record<string, string>): string[] {
  const correct = words[number]
  const others = shuffle(Object.keys(words).filter(n => n !== number)).slice(0, 2)
  return shuffle([correct, ...others.map(n => words[n])])
}

type DelayMode = 'none' | 'short' | 'distraction'
type SubMode = 'encoding' | 'decoding'
type DecodePhase = 'study' | 'countdown' | 'distraction' | 'recall' | 'result'

interface DistractorQ {
  digit: number
  display: string
  options: string[]
}

function makeDistractors(count = 3): DistractorQ[] {
  return shuffle(SOUND_KEY).slice(0, count).map(entry => {
    const others = shuffle(SOUND_KEY.filter(e => e.digit !== entry.digit)).slice(0, 2)
    return {
      digit: entry.digit,
      display: entry.display,
      options: shuffle([entry.display, ...others.map(e => e.display)]),
    }
  })
}

interface EncodingState {
  sequence: string[]
  currentIndex: number
  answers: Array<{ word: string; correct: boolean }>
  answered: string | null
  answeredCorrect: boolean | null
  options: string[]
}

interface DecodingState {
  sequence: string[]
  phase: DecodePhase
  answered: string | null
  answeredCorrect: boolean | null
  countdown: number
  distractors: DistractorQ[]
  distractorIdx: number
  distractorAnswered: string | null
  delayUsed: DelayMode
}

interface Props {
  answerMode: AnswerMode
}

export function SequenceDrill({ answerMode }: Props) {
  const { words } = useWords()
  const [subMode, setSubMode] = useState<SubMode>('encoding')
  const sequenceLen = 3

  const [delayMode, setDelayMode] = useState<DelayMode>(() => {
    const saved = localStorage.getItem(DELAY_KEY)
    return saved === 'short' || saved === 'distraction' ? saved : 'none'
  })

  const persistDelay = (d: DelayMode) => {
    setDelayMode(d)
    localStorage.setItem(DELAY_KEY, d)
  }

  // ── Encoding ────────────────────────────────────────────────────────────────

  const newEncoding = useCallback((): EncodingState => {
    const sequence = generateSequence(words, sequenceLen)
    return {
      sequence, currentIndex: 0, answers: [],
      answered: null, answeredCorrect: null,
      options: getMcOptions(sequence[0], words),
    }
  }, [words])

  const [encoding, setEncoding] = useState<EncodingState>(newEncoding)

  const handleEncodingAnswer = useCallback((value: string) => {
    setEncoding(prev => {
      if (prev.answered !== null) return prev
      const correct = value.toLowerCase().trim() === words[prev.sequence[prev.currentIndex]].toLowerCase()
      const newAnswers = [...prev.answers, { word: value, correct }]
      setTimeout(() => {
        setEncoding(cur => {
          const nextIndex = cur.currentIndex + 1
          if (nextIndex >= cur.sequence.length) {
            return { ...cur, currentIndex: nextIndex, answered: null, answeredCorrect: null }
          }
          return {
            ...cur, currentIndex: nextIndex, answered: null, answeredCorrect: null,
            options: getMcOptions(cur.sequence[nextIndex], words),
          }
        })
      }, 1200)
      return { ...prev, answered: value, answeredCorrect: correct, answers: newAnswers }
    })
  }, [words])

  // ── Decoding ─────────────────────────────────────────────────────────────────

  const newDecoding = useCallback((): DecodingState => ({
    sequence: generateSequence(words, sequenceLen),
    phase: 'study',
    answered: null, answeredCorrect: null,
    countdown: COUNTDOWN_SECONDS,
    distractors: makeDistractors(3),
    distractorIdx: 0, distractorAnswered: null,
    delayUsed: 'none',
  }), [words])

  const [decoding, setDecoding] = useState<DecodingState>(newDecoding)

  // Countdown ticker
  useEffect(() => {
    if (decoding.phase !== 'countdown') return
    if (decoding.countdown <= 0) {
      setDecoding(d => ({ ...d, phase: 'recall' }))
      return
    }
    const t = setTimeout(() => setDecoding(d => ({ ...d, countdown: d.countdown - 1 })), 1000)
    return () => clearTimeout(t)
  }, [decoding.phase, decoding.countdown])

  const handleReady = useCallback(() => {
    setDecoding(prev => {
      if (delayMode === 'none') return { ...prev, phase: 'recall', delayUsed: 'none' }
      if (delayMode === 'short') return { ...prev, phase: 'countdown', countdown: COUNTDOWN_SECONDS, delayUsed: 'short' }
      return { ...prev, phase: 'distraction', distractors: makeDistractors(3), distractorIdx: 0, distractorAnswered: null, delayUsed: 'distraction' }
    })
  }, [delayMode])

  const handleDistractorAnswer = useCallback((value: string) => {
    setDecoding(prev => {
      if (prev.distractorAnswered !== null) return prev
      const correct = value === prev.distractors[prev.distractorIdx].display
      setTimeout(() => {
        setDecoding(cur => {
          const next = cur.distractorIdx + 1
          if (next >= cur.distractors.length) return { ...cur, phase: 'recall', distractorAnswered: null }
          return { ...cur, distractorIdx: next, distractorAnswered: null }
        })
      }, correct ? 600 : 1200)
      return { ...prev, distractorAnswered: value }
    })
  }, [])

  const handleDecodingAnswer = useCallback((value: string) => {
    setDecoding(prev => {
      if (prev.answered !== null) return prev
      const correct = value.trim() === prev.sequence.join('')
      return { ...prev, answered: value, answeredCorrect: correct, phase: 'result' }
    })
  }, [])

  const encodingDone = encoding.currentIndex >= encoding.sequence.length
  const correctCount = encoding.answers.filter(a => a.correct).length

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Sub-mode tabs */}
      <div className="flex gap-2 bg-zinc-800/60 p-1 rounded-xl self-start">
        {(['encoding', 'decoding'] as SubMode[]).map(m => (
          <button
            key={m}
            onClick={() => {
              setSubMode(m)
              if (m === 'encoding') setEncoding(newEncoding())
              else setDecoding(newDecoding())
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              subMode === m ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {m === 'encoding' ? '→ Enkod' : '← Dekod'}
          </button>
        ))}
      </div>

      {/* ── Encoding sub-mode ── */}
      {subMode === 'encoding' && (
        <div className="flex flex-col items-center gap-6">
          {!encodingDone ? (
            <>
              <div className="flex gap-2 items-center">
                {encoding.sequence.map((_, i) => (
                  <div key={i} className={`h-1.5 w-10 rounded-full transition-all ${
                    i < encoding.currentIndex
                      ? encoding.answers[i]?.correct ? 'bg-green-500' : 'bg-red-500'
                      : i === encoding.currentIndex ? 'bg-violet-500' : 'bg-zinc-700'
                  }`} />
                ))}
              </div>
              <div className="flex gap-2 items-center">
                {encoding.sequence.map((num, i) => (
                  <span key={i} className={`text-3xl font-black tabular-nums transition-all ${
                    i === encoding.currentIndex ? 'text-violet-400 scale-125 mx-1'
                    : i < encoding.currentIndex ? 'text-zinc-600' : 'text-zinc-700'
                  }`}>{num}</span>
                ))}
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs text-zinc-600 uppercase tracking-widest">
                  Par {encoding.currentIndex + 1} av {encoding.sequence.length}
                </p>
                <div className="text-[6rem] font-black text-violet-400 tabular-nums leading-none">
                  {encoding.sequence[encoding.currentIndex]}
                </div>
              </div>
              <div className="w-full max-w-md">
                {answerMode === 'multiple-choice' ? (
                  <MultipleChoice
                    options={encoding.options}
                    correctAnswer={words[encoding.sequence[encoding.currentIndex]]}
                    onAnswer={handleEncodingAnswer}
                    answered={encoding.answered}
                  />
                ) : (
                  <TypingInput
                    onAnswer={handleEncodingAnswer}
                    answeredCorrect={encoding.answeredCorrect}
                    correctAnswer={words[encoding.sequence[encoding.currentIndex]]}
                    placeholder="Skriv ordet..."
                  />
                )}
              </div>
            </>
          ) : (
            <div className="w-full max-w-md space-y-4">
              <h3 className="text-xl font-bold text-zinc-100 text-center">
                {correctCount === encoding.sequence.length ? '🎉 Perfekt!' : `${correctCount}/${encoding.sequence.length} riktige`}
              </h3>
              <div className="space-y-2">
                {encoding.sequence.map((num, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                    encoding.answers[i]?.correct ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <span className="font-mono text-zinc-400">{num}</span>
                    <span className="text-zinc-100 font-semibold">{words[num]}</span>
                    <span>{encoding.answers[i]?.correct ? '✓' : '✗'}</span>
                  </div>
                ))}
              </div>
              <div className="text-center text-zinc-500 font-mono text-sm">
                Tallrekke: {encoding.sequence.join('')}
              </div>
              <button
                onClick={() => setEncoding(newEncoding())}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
              >Ny sekvens</button>
            </div>
          )}
        </div>
      )}

      {/* ── Decoding sub-mode ── */}
      {subMode === 'decoding' && (
        <div className="flex flex-col items-center gap-6">

          {/* Delay selector — only during study */}
          {decoding.phase === 'study' && (
            <div className="flex flex-wrap items-center gap-2 self-start">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Forsinkelse</span>
              {(['none', 'short', 'distraction'] as DelayMode[]).map(d => (
                <button
                  key={d}
                  onClick={() => persistDelay(d)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    delayMode === d ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {d === 'none' ? 'Ingen' : d === 'short' ? `Kort (${COUNTDOWN_SECONDS}s)` : 'Distraksjon'}
                </button>
              ))}
            </div>
          )}

          {/* STUDY — show words to memorise */}
          {decoding.phase === 'study' && (
            <>
              <div className="text-center space-y-2">
                <p className="text-xs text-zinc-600 uppercase tracking-widest">Husk denne sekvensen</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {decoding.sequence.map((num, i) => (
                    <span key={i} className="text-2xl font-bold text-zinc-100 bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-xl">
                      {words[num]}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-zinc-600 font-mono">{decoding.sequence.join('')}</p>
              </div>
              <button
                onClick={handleReady}
                className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
              >
                {delayMode === 'none' ? 'Klar til å svare →' : 'Skjul og start forsinkelse →'}
              </button>
            </>
          )}

          {/* COUNTDOWN */}
          {decoding.phase === 'countdown' && (
            <div className="flex flex-col items-center gap-6 py-8">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Sekvensen er skjult</p>
              <div className="text-[6rem] font-black text-violet-400 tabular-nums leading-none">
                {decoding.countdown}
              </div>
              <p className="text-zinc-500 text-sm">sekunder igjen</p>
              <button
                onClick={() => setDecoding(d => ({ ...d, phase: 'recall' }))}
                className="px-5 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
              >Hopp over</button>
            </div>
          )}

          {/* DISTRACTION — 3 Lydnøkkel mini-questions */}
          {decoding.phase === 'distraction' && (
            <div className="flex flex-col items-center gap-6 w-full max-w-md">
              <div className="w-full space-y-1">
                <div className="flex justify-between text-xs text-zinc-600">
                  <span>Distraksjonsoppgave</span>
                  <span>{decoding.distractorIdx + 1}/3</span>
                </div>
                <div className="flex gap-1">
                  {decoding.distractors.map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${
                      i < decoding.distractorIdx ? 'bg-green-500' : i === decoding.distractorIdx ? 'bg-violet-500' : 'bg-zinc-700'
                    }`} />
                  ))}
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs text-zinc-600 uppercase tracking-widest">Hva er lydene for</p>
                <div className="text-[6rem] font-black text-violet-400 tabular-nums leading-none">
                  {decoding.distractors[decoding.distractorIdx]?.digit}
                </div>
              </div>
              <div className="w-full">
                <MultipleChoice
                  key={decoding.distractorIdx}
                  options={decoding.distractors[decoding.distractorIdx]?.options ?? []}
                  correctAnswer={decoding.distractors[decoding.distractorIdx]?.display ?? ''}
                  onAnswer={handleDistractorAnswer}
                  answered={decoding.distractorAnswered}
                />
              </div>
            </div>
          )}

          {/* RECALL */}
          {decoding.phase === 'recall' && (
            <div className="flex flex-col items-center gap-4 w-full max-w-md">
              <div className="text-center space-y-1">
                <p className="text-xs text-zinc-600 uppercase tracking-widest">Dekod sekvensen</p>
                {decoding.delayUsed !== 'none' && (
                  <p className="text-xs text-zinc-600 italic">
                    {decoding.delayUsed === 'distraction' ? '(etter distraksjon)' : `(etter ${COUNTDOWN_SECONDS}s forsinkelse)`}
                  </p>
                )}
              </div>
              <TypingInput
                onAnswer={handleDecodingAnswer}
                answeredCorrect={decoding.answeredCorrect}
                correctAnswer={decoding.sequence.join('')}
                placeholder={`Skriv ${decoding.sequence.length * 2}-sifret tall...`}
              />
            </div>
          )}

          {/* RESULT */}
          {decoding.phase === 'result' && (
            <div className="w-full max-w-md space-y-4 text-center">
              <div className="text-5xl">{decoding.answeredCorrect ? '🎉' : '❌'}</div>
              <div className="space-y-2">
                {decoding.sequence.map((num, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 rounded-lg border border-zinc-700 bg-zinc-800/40">
                    <span className="font-bold text-zinc-100">{words[num]}</span>
                    <span className="font-mono text-violet-400">{num}</span>
                  </div>
                ))}
              </div>
              <div className="text-zinc-500 font-mono text-sm">
                Riktig svar: {decoding.sequence.join('')}
              </div>
              {decoding.delayUsed !== 'none' && (
                <p className="text-xs text-zinc-600 italic">
                  Forsinkelse brukt: {decoding.delayUsed === 'distraction' ? 'distraksjon' : `${COUNTDOWN_SECONDS}s nedtelling`}
                </p>
              )}
              <button
                onClick={() => setDecoding(newDecoding())}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
              >Ny sekvens</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
