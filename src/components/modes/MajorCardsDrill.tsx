import { useWords } from '../../context/WordsContext'
import { useStats } from '../../hooks/useStats'
import { CardsDrill } from './CardsDrill'
import type { AnswerMode } from '../../types'

// The original Card Deck: cards map to the shared Major System words and
// answers feed the global stats store. All three drill types available.
export function MajorCardsDrill({ answerMode }: { answerMode: AnswerMode }) {
  const { words } = useWords()
  const { recordFull } = useStats()
  return <CardsDrill answerMode={answerMode} words={words} onRecord={recordFull} />
}
