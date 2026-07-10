import { useMemo } from 'react'
import { useWords } from '../../context/WordsContext'
import { useStats } from '../../hooks/useStats'
import { EncodingDrill } from './EncodingDrill'
import type { AnswerMode } from '../../types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Props {
  answerMode: AnswerMode
}

export function WeakSpots({ answerMode }: Props) {
  const { words } = useWords()
  const { getWeakNumbers } = useStats()

  const pool = useMemo(() => {
    const weak = getWeakNumbers(10)
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
        <h2 className="text-xl font-bold text-zinc-100">Ingen data ennå</h2>
        <p className="text-zinc-400 max-w-xs">
          Øv på enkoding eller dekoding først, så kan vi finne dine svake punkter.
        </p>
      </div>
    )
  }

  const hasWeakData = getWeakNumbers(1).length > 0

  return (
    <div className="flex flex-col gap-4">
      {!hasWeakData && (
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-400 text-center">
          Ikke nok feil-data ennå — viser tilfeldige tall
        </div>
      )}
      {hasWeakData && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-zinc-300 text-center">
          🎯 Fokuserer på dine {pool.length} svakeste tall
        </div>
      )}
      <EncodingDrill answerMode={answerMode} pool={pool} />
    </div>
  )
}
