import { WordNumberDrill, type DrillConfig } from '@/features/major-system/WordNumberDrill'
import { buildDecOptions } from '@/core/scoring/quiz'
import { matchesNumber } from '@/core/answerMatch'
import type { AnswerMode } from '@/core/types'

// Decoding: shown a word, recall the number.
const DEC_CONFIG: DrillConfig = {
  dir: 'dec',
  build: (number, words) => ({
    prompt: words[number],
    answer: number,
    options: buildDecOptions(number, words),
  }),
  promptLabel: 'Which number is',
  promptClass: 'text-5xl sm:text-7xl font-black text-zinc-100 leading-tight tracking-tight break-words max-w-full px-2',
  isCorrect: (value, answer) => matchesNumber(value, answer),
  showHint: false,
  inputPlaceholder: 'Type the number (00–99)...',
  inputNumeric: true,
}

interface Props {
  answerMode: AnswerMode
  pool?: string[]
}

export function DecodingDrill({ answerMode, pool }: Props) {
  return <WordNumberDrill config={DEC_CONFIG} answerMode={answerMode} pool={pool} />
}
