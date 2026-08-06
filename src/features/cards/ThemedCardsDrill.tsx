import { useState } from 'react'
import { useCardWords } from '@/features/cards/CardWordsContext'
import { CardsDrill } from '@/features/cards/CardsDrill'
import { CardWordsOverlay } from '@/features/cards/CardWordsOverlay'
import type { AnswerMode } from '@/core/types'

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
