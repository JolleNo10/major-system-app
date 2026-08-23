import { useEffect, useState } from 'react'
import type { Country } from '@/features/world-countries/data/countries'
import type { CapitalAuthoringGeoReference } from './capitalAuthoringReferenceData'
import {
  buildCapitalAuthoringGoogleMapsUrl,
  buildCapitalAuthoringGoogleMapsStaticUrl,
  buildCapitalAuthoringImageSearchUrl,
  buildCapitalAuthoringMapMapStaticUrl,
  buildCapitalAuthoringOpenStreetMapUrl,
} from './capitalAuthoringReferenceUrls'

interface CapitalAuthoringReferencePanelProps {
  country: Country
  reference?: CapitalAuthoringGeoReference
  onClose: () => void
}

type ReferenceImageSource = 'google' | 'mapmap' | 'unavailable'
const DEFAULT_REFERENCE_ZOOM = 5
const MIN_REFERENCE_ZOOM = 2
const MAX_REFERENCE_ZOOM = 10

export function CapitalAuthoringReferencePanel({
  country,
  reference,
  onClose,
}: CapitalAuthoringReferencePanelProps) {
  const [referenceZoom, setReferenceZoom] = useState(DEFAULT_REFERENCE_ZOOM)
  const googleStaticApiKey = import.meta.env.VITE_GOOGLE_MAPS_STATIC_API_KEY
  const hasGoogleStaticMap = Boolean(googleStaticApiKey?.trim())
  const googleStaticUrl = reference
    ? buildCapitalAuthoringGoogleMapsStaticUrl(reference, googleStaticApiKey, referenceZoom)
    : null
  const [imageSource, setImageSource] = useState<ReferenceImageSource>(hasGoogleStaticMap ? 'google' : 'mapmap')

  useEffect(() => {
    setImageSource(hasGoogleStaticMap ? 'google' : 'mapmap')
    setReferenceZoom(DEFAULT_REFERENCE_ZOOM)
  }, [country.id, hasGoogleStaticMap, reference?.countryId, reference?.capital.lat, reference?.capital.lon])

  const imageUrl = reference && imageSource === 'google'
    ? googleStaticUrl
    : reference && imageSource === 'mapmap'
      ? buildCapitalAuthoringMapMapStaticUrl(reference, referenceZoom)
      : null

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
          <p className="mt-3 text-xs text-violet-200/80">External geographic reference · advisory to the human author</p>
          <div className="relative mt-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            {!imageUrl ? (
              <div className="flex min-h-32 items-center justify-center px-4 text-center text-xs text-zinc-400">
                Static map image is unavailable. The coordinates and external links remain available.
              </div>
            ) : (
              <>
                <img
                  data-capital-authoring-reference-map
                  alt={'Minimal geographic reference for ' + country.capital + ', ' + country.country}
                  src={imageUrl}
                  loading="lazy"
                  onError={() => setImageSource(imageSource === 'google' ? 'mapmap' : 'unavailable')}
                  className="h-40 w-full object-cover"
                />
                <div className="absolute right-2 top-2 flex overflow-hidden rounded-lg border border-zinc-700/80 bg-zinc-950/85 shadow-lg backdrop-blur-sm">
                  <button
                    type="button"
                    aria-label="Zoom out reference map"
                    title="Zoom out"
                    disabled={referenceZoom <= MIN_REFERENCE_ZOOM}
                    onClick={() => setReferenceZoom(value => Math.max(MIN_REFERENCE_ZOOM, value - 1))}
                    className="h-8 w-8 text-lg text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
                  >
                    −
                  </button>
                  <span className="flex h-8 min-w-8 items-center justify-center border-x border-zinc-700/80 px-1 text-[0.65rem] text-zinc-400" aria-label={`Reference map zoom ${referenceZoom}`}>
                    {referenceZoom}
                  </span>
                  <button
                    type="button"
                    aria-label="Zoom in reference map"
                    title="Zoom in"
                    disabled={referenceZoom >= MAX_REFERENCE_ZOOM}
                    onClick={() => setReferenceZoom(value => Math.min(MAX_REFERENCE_ZOOM, value + 1))}
                    className="h-8 w-8 text-lg text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
                  >
                    +
                  </button>
                </div>
              </>
            )}
          </div>
          <p className="mt-3 font-mono text-xs text-zinc-400">
            {reference.capital.lat.toFixed(4)}, {reference.capital.lon.toFixed(4)}
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
