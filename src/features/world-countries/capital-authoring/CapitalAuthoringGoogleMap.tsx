import { useEffect, useState } from 'react'
import type { Country } from '@/features/world-countries/data/countries'
import type { CapitalAuthoringGeoReference } from './capitalAuthoringReferenceData'

const DEFAULT_REFERENCE_ZOOM = 5

/** Build the no-key Google web-map reference around the checked-in capital point. */
export function buildCapitalAuthoringGoogleMapUrl(
  reference: CapitalAuthoringGeoReference,
): string {
  const parameters = new URLSearchParams({
    q: `${reference.capital.lat},${reference.capital.lon}`,
    z: String(DEFAULT_REFERENCE_ZOOM),
    output: 'embed',
  })
  return `https://www.google.com/maps?${parameters.toString()}`
}

interface CapitalAuthoringGoogleMapProps {
  country: Country
  reference?: CapitalAuthoringGeoReference
}

export function CapitalAuthoringGoogleMap({ country, reference }: CapitalAuthoringGoogleMapProps) {
  const referenceKey = reference
    ? `${reference.countryId}:${reference.capital.lat}:${reference.capital.lon}`
    : 'unavailable'
  const [loadError, setLoadError] = useState(!reference)
  const mapUrl = reference ? buildCapitalAuthoringGoogleMapUrl(reference) : undefined

  useEffect(() => {
    setLoadError(!reference)
  }, [referenceKey])

  return (
    <div
      data-capital-authoring-reference-map
      data-capital-authoring-reference-capital={country.capital}
      data-capital-authoring-reference-lat={reference ? String(reference.capital.lat) : undefined}
      data-capital-authoring-reference-lon={reference ? String(reference.capital.lon) : undefined}
      data-capital-authoring-reference-zoom-controls="native"
      className="relative h-72 max-h-[calc(100vh-10rem)] min-h-64 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
      aria-label={`Google reference map for ${country.country} and ${country.capital}`}
    >
      {mapUrl && (
        <iframe
          key={referenceKey}
          src={mapUrl}
          title={`Google reference map for ${country.country} and ${country.capital}`}
          className="h-full w-full border-0"
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          data-capital-authoring-reference-iframe
          onLoad={() => setLoadError(false)}
          onErrorCapture={() => setLoadError(true)}
        />
      )}
      {loadError && (
        <div
          data-capital-authoring-reference-unavailable
          role="status"
          className="absolute inset-0 flex items-center justify-center bg-zinc-900 px-4 text-center text-xs text-zinc-400"
        >
          Google reference map could not be loaded.
        </div>
      )}
    </div>
  )
}
