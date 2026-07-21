import { useState } from 'react'
import { useCardWords } from '../../context/CardWordsContext'
import { CardsDrill } from './CardsDrill'
import { CardWordsOverlay } from '../CardWordsOverlay'
import type { AnswerMode } from '../../types'

// Themed Deck: cards map to a separate per-suit word list (its own storage),
// only Card → Word and Deck Memo, and answers do NOT touch the global stats store.
export function ThemedCardsDrill({ answerMode }: { answerMode: AnswerMode }) {
  const { words } = useCardWords()
  const [showWords, setShowWords] = useState(false)

  return (
    <>
      <CardsDrill
        answerMode={answerMode}
        words={words}
        drillTypes={['card-to-word', 'deck-memo']}
        storagePrefix="major-themed-cards"
        onEditWords={() => setShowWords(true)}
      />
      {showWords && <CardWordsOverlay onClose={() => setShowWords(false)} />}
    </>
  )
}
