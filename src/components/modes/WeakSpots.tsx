import { useMemo } from 'react'
import { useWords } from '../../context/WordsContext'
import { EncodingDrill } from './EncodingDrill'
import { shuffle } from '../../utils/quiz'
import { rankByWeakness } from '../../utils/numberStats'
import type { AnswerMode } from '../../types'

interface Props {
  answerMode: AnswerMode
}

// Weakest tested encode numbers (shared itemWeakness ranking), top 10.
function weakNumbers(allNums: string[]): string[] {
  return rankByWeakness('enc', allNums)
    .filter(s => s.tested && s.weakness > 0)
    .slice(0, 10)
    .map(s => s.num)
}

export function WeakSpots({ answerMode }: Props) {
  const { words } = useWords()

  const pool = useMemo(() => {
    const weak = weakNumbers(Object.keys(words))
    if (weak.length >= 5) return weak
    // Not enough data: supplement with random numbers
    const all = Object.keys(words)
    const extra = shuffle(all.filter(n => !weak.includes(n))).slice(0, 10 - weak.length)
    return shuffle([...weak, ...extra])
  }, []) // compute once on mount

  if (pool.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="text-5xl">🎯</div>
        <h2 className="text-xl font-bold text-zinc-100">No data yet</h2>
        <p className="text-zinc-400 max-w-xs">
          Practice encoding or decoding first, then we can find your weak spots.
        </p>
      </div>
    )
  }

  const hasWeakData = weakNumbers(Object.keys(words)).length > 0

  return (
    <div className="flex flex-col gap-4">
      {!hasWeakData && (
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-400 text-center">
          Not enough error data yet — showing random numbers
        </div>
      )}
      {hasWeakData && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-zinc-300 text-center">
          🎯 Focusing on your {pool.length} weakest numbers
        </div>
      )}
      <EncodingDrill answerMode={answerMode} pool={pool} />
    </div>
  )
}
