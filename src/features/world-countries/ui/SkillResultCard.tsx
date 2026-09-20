export interface SkillResultCardData {
  correct: number
  attempts: number
  accuracy: number
}

/** Compact card showing per-skill recall results used in Drill and Practice results screens. */
export function SkillResultCard({ skillLabel, result }: {
  skillLabel: string
  result: SkillResultCardData
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{skillLabel}</p>
      <p className="mt-1 text-lg font-bold text-zinc-100">{result.correct}/{result.attempts}</p>
      <p className="text-xs text-zinc-500">{result.accuracy}% accuracy</p>
    </div>
  )
}
