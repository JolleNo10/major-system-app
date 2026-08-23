import { useEffect, useState } from 'react'
import type { Country } from '@/features/world-countries/data/countries'
import type { CapitalAuthoringGeoReference } from './capitalAuthoringReferenceData'
import {
  buildCapitalAuthoringGoogleMapsUrl,
  buildCapitalAuthoringImageSearchUrl,
  buildCapitalAuthoringOpenStreetMapPreviewUrl,
  buildCapitalAuthoringOpenStreetMapUrl,
} from './capitalAuthoringReferenceUrls'
import type { CapitalAuthoringReferencePrediction } from './capitalAuthoringReferenceProjection'

interface CapitalAuthoringReferencePanelProps {
  country: Country
  reference?: CapitalAuthoringGeoReference
  prediction: CapitalAuthoringReferencePrediction | null
  onClose: () => void
}

export function CapitalAuthoringReferencePanel({
  country,
  reference,
  prediction,
  onClose,
}: CapitalAuthoringReferencePanelProps) {
  const [previewFailed, setPreviewFailed] = useState(false)

  useEffect(() => {
    setPreviewFailed(false)
  }, [country.id, reference?.countryId])

  return (
    <aside
      id="capital-authoring-reference-panel"
      data-capital-authoring-reference-panel
      className="pointer-events-auto absolute right-3 top-14 z-20 max-h-[calc(100%-4.5rem)] w-[min(22rem,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-violet-400/40 bg-zinc-950/90 p-4 text-zinc-100 shadow-2xl backdrop-blur-xl"
      aria-label="Capital geographic reference"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-violet-300">Reference only</p>
          <h2 className="mt-1 text-lg font-bold">{country.capital}</h2>
          <p className="text-sm text-zinc-400">{country.country}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-9 rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-300 hover:border-violet-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          Close
        </button>
      </div>

      {!reference ? (
        <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          No checked-in geographic reference is available for this Country. Authoring remains fully available.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs text-violet-200/80">Approximate geographic reference · advisory to the human author</p>
          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            {previewFailed ? (
              <div className="flex min-h-32 items-center justify-center px-4 text-center text-xs text-zinc-400">
                OpenStreetMap preview is unavailable. The text reference and external links remain available.
              </div>
            ) : (
              <iframe
                title={'OpenStreetMap reference for ' + country.capital + ', ' + country.country}
                src={buildCapitalAuthoringOpenStreetMapPreviewUrl(reference)}
                loading="lazy"
                onError={() => setPreviewFailed(true)}
                className="h-40 w-full border-0"
              />
            )}
          </div>
          <p className="mt-3 font-mono text-xs text-zinc-400">
            {reference.capital.lat.toFixed(4)}, {reference.capital.lon.toFixed(4)}
          </p>
          <p className="mt-2 rounded-xl border border-violet-400/20 bg-violet-400/10 p-3 text-sm text-violet-100">
            {prediction
              ? 'Approximate SVG position: ' + prediction.clue + '.'
              : 'Approximate SVG position unavailable; use the external references and inspect the map manually.'}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <a
              href={buildCapitalAuthoringGoogleMapsUrl(reference)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-700 px-2 py-2 text-center text-xs text-zinc-200 hover:border-violet-300 hover:text-white"
            >
              Google Maps
            </a>
            <a
              href={buildCapitalAuthoringOpenStreetMapUrl(reference)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-700 px-2 py-2 text-center text-xs text-zinc-200 hover:border-violet-300 hover:text-white"
            >
              OpenStreetMap
            </a>
            <a
              href={buildCapitalAuthoringImageSearchUrl(country.capital, country.country)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-700 px-2 py-2 text-center text-xs text-zinc-200 hover:border-violet-300 hover:text-white"
            >
              Image search
            </a>
          </div>
        </>
      )}
    </aside>
  )
}
