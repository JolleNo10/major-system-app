import { useState, useCallback } from 'react'
import { ALL_SOUNDS, SOUND_KEY } from '../../data/soundKey'
import { MultipleChoice } from '../MultipleChoice'
import { TypingInput } from '../TypingInput'
import { ScoreBar } from '../ScoreBar'
import type { AnswerMode } from '../../types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeQuestion(excludeSound?: string) {
  const available = excludeSound
    ? ALL_SOUNDS.filter(e => e.sound !== excludeSound)
    : ALL_SOUNDS
  const entry = available[Math.floor(Math.random() * available.length)]
  const otherDigits = shuffle(SOUND_KEY.filter(e => e.digit !== entry.digit)).slice(0, 2)
  const options = shuffle([String(entry.digit), ...otherDigits.map(e => String(e.digit))])
  return { sound: entry.sound, digit: entry.digit, options }
}

interface Props {
  answerMode: AnswerMode
}

export function ReverseSoundKeyDrill({ answerMode }: Props) {
  const [question, setQuestion] = useState(() => makeQuestion())
  const [answered, setAnswered] = useState<string | null>(null)
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionWrong, setSessionWrong] = useState(0)

  const correctStr = String(question.digit)

  const next = useCallback((excludeSound: string) => {
    setQuestion(makeQuestion(excludeSound))
    setAnswered(null)
    setAnsweredCorrect(null)
  }, [])

  const handleAnswer = useCallback((value: string) => {
    if (answered !== null) return
    const correct = value.trim() === correctStr
    setAnswered(value)
    setAnsweredCorrect(correct)
    if (correct) setSessionCorrect(c => c + 1)
    else setSessionWrong(w => w + 1)
    setTimeout(() => next(question.sound), 1500)
  }, [answered, correctStr, question.sound, next])

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <ScoreBar correct={sessionCorrect} wrong={sessionWrong} />

      <div className="text-center space-y-2">
        <p className="text-xs text-zinc-600 uppercase tracking-widest">Which digit represents the sound</p>
        <div className="text-7xl sm:text-[8rem] font-black text-zinc-100 leading-none font-mono break-words max-w-full px-2">
          {question.sound}
        </div>
      </div>

      <div className="w-full max-w-md">
        {answerMode === 'multiple-choice' ? (
          <MultipleChoice
            options={question.options}
            correctAnswer={correctStr}
            onAnswer={handleAnswer}
            answered={answered}
          />
        ) : (
          <TypingInput
            onAnswer={handleAnswer}
            answeredCorrect={answeredCorrect}
            correctAnswer={correctStr}
            placeholder="Type the digit (0–9)..."
            numeric
          />
        )}
      </div>
    </div>
  )
}
