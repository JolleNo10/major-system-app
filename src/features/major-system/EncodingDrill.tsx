import { WordNumberDrill, type DrillConfig } from '@/features/major-system/WordNumberDrill'
import { buildEncOptions } from '@/core/scoring/quiz'
import { matchesAnswer } from '@/core/answerMatch'
import type { AnswerMode } from '@/core/types'

// Encoding: shown a number, recall the word.
const ENC_CONFIG: DrillConfig = {
  dir: 'enc',
  build: (number, words) => ({
    prompt: number,
    answer: words[number],
    options: buildEncOptions(number, words),
  }),
  promptLabel: 'What is the word for',
  promptClass: 'text-[7rem] sm:text-[9rem] font-black text-violet-400 tabular-nums leading-none tracking-tight',
  isCorrect: (value, answer) => matchesAnswer(value, answer),
  showHint: true,
  inputPlaceholder: 'Type the word...',
}

interface Props {
  answerMode: AnswerMode
  pool?: string[]
}

export function EncodingDrill({ answerMode, pool }: Props) {
  return <WordNumberDrill config={ENC_CONFIG} answerMode={answerMode} pool={pool} />
}
