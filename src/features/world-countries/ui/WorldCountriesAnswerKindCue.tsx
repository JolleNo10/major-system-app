import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import type { WorldCountriesTypedAnswerKind } from './WorldCountriesTypedAnswer'

const ANSWER_KIND_LABELS: Record<WorldCountriesTypedAnswerKind, string> = {
  country: 'COUNTRY',
  capital: 'CAPITAL',
}

const ANSWER_KIND_STYLES: Record<WorldCountriesTypedAnswerKind, string> = {
  country: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
  capital: 'border-violet-400/40 bg-violet-400/10 text-violet-200',
}

export function getWorldCountriesAnswerKind(skill: WorldCountriesRecallSkill): WorldCountriesTypedAnswerKind {
  return skill === 'country-to-capital' ? 'capital' : 'country'
}

export function WorldCountriesAnswerKindCue({ answerKind, className = '' }: {
  answerKind: WorldCountriesTypedAnswerKind
  className?: string
}) {
  const label = ANSWER_KIND_LABELS[answerKind]
  return (
    <div
      role="note"
      aria-label={`Answer type: ${label.charAt(0)}${label.slice(1).toLowerCase()}`}
      data-answer-kind={answerKind}
      className={`inline-flex w-fit items-center justify-center rounded-md border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${ANSWER_KIND_STYLES[answerKind]} ${className}`}
    >
      <span aria-hidden="true">ANSWER · {label}</span>
    </div>
  )
}
