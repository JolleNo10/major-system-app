import type { Country } from '@/features/world-countries/data/countries'
import { CapitalAuthoringGoogleMap } from './CapitalAuthoringGoogleMap'
import type { CapitalAuthoringGeoReference } from './capitalAuthoringReferenceData'

interface CapitalAuthoringReferencePanelProps {
  country: Country
  reference?: CapitalAuthoringGeoReference
  onClose: () => void
}

export function CapitalAuthoringReferencePanel({
  country,
  reference,
  onClose,
}: CapitalAuthoringReferencePanelProps) {
  return (
    <aside
      id="capital-authoring-reference-panel"
      data-capital-authoring-reference-panel
      className="pointer-events-auto absolute right-3 top-14 z-20 max-h-[calc(100%-4.5rem)] w-[min(30rem,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-violet-400/40 bg-zinc-950/90 p-4 text-zinc-100 shadow-2xl backdrop-blur-xl"
      aria-label="Capital geographic reference"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-violet-300">Google reference</p>
          <h2 className="mt-1 text-lg font-bold">{country.country} → {country.capital}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-9 rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-300 hover:border-violet-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          Close
        </button>
      </div>

      {reference ? (
        <div className="mt-3">
          <CapitalAuthoringGoogleMap country={country} reference={reference} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-400">Google reference map unavailable.</p>
      )}
    </aside>
  )
}
