import { useState, useCallback } from 'react'
import { useSoundKey } from '@/features/major-system/SoundKeyContext'
import type { SoundKeyEntry, SoundEntry } from '@/features/major-system/soundKey'
import { MultipleChoice } from '@/core/ui/MultipleChoice'
import { TypingInput } from '@/core/ui/TypingInput'
import { ScoreBar } from '@/core/ui/ScoreBar'
import { shuffle } from '@/core/scoring/quiz'
import type { AnswerMode } from '@/core/types'

function makeQuestion(entries: SoundKeyEntry[], allSounds: SoundEntry[], excludeSound?: string) {
  const available = excludeSound
    ? allSounds.filter(e => e.sound !== excludeSound)
    : allSounds
  const entry = available[Math.floor(Math.random() * available.length)]
  const otherDigits = shuffle(entries.filter(e => e.digit !== entry.digit)).slice(0, 2)
  const options = shuffle([String(entry.digit), ...otherDigits.map(e => String(e.digit))])
  return { sound: entry.sound, digit: entry.digit, options }
}

interface Props {
  answerMode: AnswerMode
}

export function ReverseSoundKeyDrill({ answerMode }: Props) {
  const { entries, allSounds } = useSoundKey()
  const [question, setQuestion] = useState(() => makeQuestion(entries, allSounds))
  const [answered, setAnswered] = useState<string | null>(null)
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionWrong, setSessionWrong] = useState(0)

  const correctStr = String(question.digit)

  const next = useCallback((excludeSound: string) => {
    setQuestion(makeQuestion(entries, allSounds, excludeSound))
    setAnswered(null)
    setAnsweredCorrect(null)
  }, [entries, allSounds])

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
