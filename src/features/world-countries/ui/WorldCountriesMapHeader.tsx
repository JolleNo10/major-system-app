import type { ReactNode } from 'react'
import { WorldCountriesMapLegend } from './WorldCountriesMapLegend'

/**
 * The title and status legend that sit above a World Countries status map.
 *
 * Home and Drill setup read the same Country status, so they announce it the
 * same way: one scope title, an optional qualifier, and the shared legend. The
 * qualifier is a slot rather than a concept — Home uses it for the current
 * Learning focus, Drill setup for the configured activity.
 */
export function WorldCountriesMapHeader({
  headingId,
  title,
  qualifier,
  learningComplete,
}: {
  headingId?: string
  title: string
  qualifier?: ReactNode
  learningComplete?: boolean
}) {
  return (
    <div className="px-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 id={headingId} className="text-2xl font-black text-zinc-100">{title}</h1>
        {qualifier && <p className="text-sm font-semibold text-cyan-200">{qualifier}</p>}
      </div>
      <div className="mt-1">
        <WorldCountriesMapLegend learningComplete={learningComplete} />
      </div>
    </div>
  )
}
