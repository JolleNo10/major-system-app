import { useState, useCallback } from 'react'
import { SOUND_KEY } from '../../data/soundKey'
import { MultipleChoice } from '../MultipleChoice'
import { TypingInput } from '../TypingInput'
import { ScoreBar } from '../ScoreBar'
import { shuffle } from '../../utils/quiz'
import type { AnswerMode } from '../../types'

function makeQuestion(exclude?: number) {
  const available = SOUND_KEY.filter(e => e.digit !== exclude)
  const entry = available[Math.floor(Math.random() * available.length)]
  const others = shuffle(SOUND_KEY.filter(e => e.digit !== entry.digit)).slice(0, 2)
  const options = shuffle([entry.display, ...others.map(o => o.display)])
  return { digit: entry.digit, correctDisplay: entry.display, options }
}

function checkTypingAnswer(value: string, entry: typeof SOUND_KEY[0]): boolean {
  const v = value.trim().toLowerCase().replace(/\s/g, '')
  return entry.sounds.some(s => s === v) || v === entry.display.toLowerCase().replace(/\s/g, '')
}

interface Props {
  answerMode: AnswerMode
}

export function SoundKeyDrill({ answerMode }: Props) {
  const [question, setQuestion] = useState(() => makeQuestion())
  const [answered, setAnswered] = useState<string | null>(null)
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionWrong, setSessionWrong] = useState(0)

  const entry = SOUND_KEY.find(e => e.digit === question.digit)!

  const next = useCallback((exclude: number) => {
    setQuestion(makeQuestion(exclude))
    setAnswered(null)
    setAnsweredCorrect(null)
  }, [])

  const handleAnswer = useCallback((value: string) => {
    if (answered !== null) return
    const correct =
      answerMode === 'multiple-choice'
        ? value === question.correctDisplay
        : checkTypingAnswer(value, entry)
    setAnswered(value)
    setAnsweredCorrect(correct)
    if (correct) setSessionCorrect(c => c + 1)
    else setSessionWrong(w => w + 1)
    setTimeout(() => next(question.digit), 1500)
  }, [answered, question, entry, answerMode, next])

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <ScoreBar correct={sessionCorrect} wrong={sessionWrong} />

      <div className="text-center space-y-2">
        <p className="text-xs text-zinc-600 uppercase tracking-widest">Which sounds does</p>
        <div className="text-[8rem] sm:text-[10rem] font-black text-violet-400 tabular-nums leading-none">
          {question.digit}
        </div>
      </div>

      <div className="w-full max-w-md">
        {answerMode === 'multiple-choice' ? (
          <MultipleChoice
            options={question.options}
            correctAnswer={question.correctDisplay}
            onAnswer={handleAnswer}
            answered={answered}
          />
        ) : (
          <TypingInput
            onAnswer={handleAnswer}
            answeredCorrect={answeredCorrect}
            correctAnswer={entry.display}
            placeholder="Type the sounds (e.g. s, z)..."
          />
        )}
      </div>
    </div>
  )
}
