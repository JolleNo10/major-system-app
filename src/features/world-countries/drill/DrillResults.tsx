import type { Country } from '@/features/world-countries/data/countries'
import { getDrillModeDefinition, getDrillSkillLabel, type WorldCountriesDrillMode } from './drillModes'
import type { DrillAnswerRecord } from './drillSessionState'

export function DrillResults({
  mode,
  entries,
  answers,
  onAgain,
  onChangeSetup,
}: {
  mode: WorldCountriesDrillMode
  entries: readonly Country[]
  answers: readonly DrillAnswerRecord[]
  onAgain: () => void
  onChangeSetup: () => void
}) {
  const correct = answers.filter(answer => answer.correct).length
  const accuracy = answers.length ? Math.round((correct / answers.length) * 100) : 0
  const countryById = new Map(entries.map(entry => [entry.id, entry]))
  const definition = getDrillModeDefinition(mode)

  return (
    <div className="space-y-4 animate-fade-in">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Drill complete</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">{definition.label}</h1>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ['Correct', `${correct}/${answers.length}`],
            ['Accuracy', `${accuracy}%`],
            ['Countries', String(new Set(answers.map(answer => answer.countryId)).size)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p>
              <p className="mt-1 font-mono text-lg font-bold text-zinc-100">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        {answers.map((answer, index) => {
          const country = countryById.get(answer.countryId)
          return (
            <div key={`${answer.countryId}-${answer.skill}-${index}`} className={`rounded-lg border px-4 py-3 ${answer.correct ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
              <div className="flex items-center gap-3">
                <span className="w-6 shrink-0 text-xs tabular-nums text-zinc-600">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-zinc-200">{country?.country ?? answer.countryId}</span>
                  <span className="block text-xs text-zinc-500">{getDrillSkillLabel(answer.skill)}</span>
                </span>
                <span className={answer.correct ? 'text-green-400' : 'text-red-400'}>{answer.correct ? '✓' : '✗'}</span>
              </div>
              {!answer.correct && <p className="mt-2 pl-9 text-xs text-red-300">You answered: {answer.answer || '—'}</p>}
            </div>
          )
        })}
      </section>

      <div className="flex gap-2">
        <button type="button" onClick={onAgain} className="flex-1 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Run again</button>
        <button type="button" onClick={onChangeSetup} className="flex-1 rounded-xl bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-700">Change setup</button>
      </div>
    </div>
  )
}
