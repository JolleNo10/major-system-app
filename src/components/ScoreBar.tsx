interface Props {
  correct: number
  wrong: number
  streak?: number
  bestStreak?: number
}

export function ScoreBar({ correct, wrong, streak, bestStreak }: Props) {
  const total = correct + wrong
  const pct = total > 0 ? Math.round((correct / total) * 100) : null

  return (
    <div className="flex items-center gap-4 text-sm font-medium">
      <span className="flex items-center gap-1.5 text-green-400">
        <span className="text-base">✓</span>
        {correct}
      </span>
      <span className="flex items-center gap-1.5 text-red-400">
        <span className="text-base">✗</span>
        {wrong}
      </span>
      {pct !== null && (
        <span className="text-zinc-500 text-xs">{pct}%</span>
      )}
      {streak !== undefined && streak >= 2 && (
        <span className="flex items-center gap-1 text-orange-400 font-semibold">
          🔥{streak}
        </span>
      )}
      {bestStreak !== undefined && bestStreak >= 2 && bestStreak > (streak ?? 0) && (
        <span className="text-zinc-600 text-xs">best {bestStreak}</span>
      )}
    </div>
  )
}
