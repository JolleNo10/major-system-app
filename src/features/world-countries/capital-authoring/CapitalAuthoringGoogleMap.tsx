import { useEffect, useMemo, useRef, useState } from 'react'
import type { Country } from '@/features/world-countries/data/countries'
import type { CapitalAuthoringGeoReference } from './capitalAuthoringReferenceData'

interface GoogleMapStyle {
  featureType?: string
  elementType?: string
  stylers: Array<Record<string, string | number>>
}

interface GoogleMapOptions {
  center: { lat: number; lng: number }
  zoom: number
  mapTypeId: 'roadmap'
  zoomControl: boolean
  mapTypeControl: boolean
  streetViewControl: boolean
  fullscreenControl: boolean
  clickableIcons: boolean
  gestureHandling: 'greedy'
  styles: GoogleMapStyle[]
}

interface GoogleMapInstance {
  setCenter(center: { lat: number; lng: number }): void
  setZoom(zoom: number): void
}

interface GoogleMarkerInstance {
  setMap(map: GoogleMapInstance | null): void
  setPosition(position: { lat: number; lng: number }): void
  setTitle(title: string): void
}

interface GoogleMapsApi {
  maps: {
    Map: new (element: HTMLElement, options: GoogleMapOptions) => GoogleMapInstance
    Marker: new (options: {
      map: GoogleMapInstance
      position: { lat: number; lng: number }
      title: string
    }) => GoogleMarkerInstance
  }
}

const DEFAULT_REFERENCE_ZOOM = 5
const GOOGLE_MAPS_SCRIPT_SELECTOR = 'script[data-capital-authoring-google-maps]'
const STATIC_MAP_SIZE = '640x360'

/** Keep the reference map useful without turning it into another map workflow. */
export const CAPITAL_AUTHORING_GOOGLE_MAP_STYLES: GoogleMapStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.province', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.sublocality', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.country', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#64748b' }] },
]

export function getCapitalAuthoringGoogleMapOptions(reference: CapitalAuthoringGeoReference): GoogleMapOptions {
  return {
    center: { lat: reference.capital.lat, lng: reference.capital.lon },
    zoom: DEFAULT_REFERENCE_ZOOM,
    mapTypeId: 'roadmap',
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    gestureHandling: 'greedy',
    styles: CAPITAL_AUTHORING_GOOGLE_MAP_STYLES,
  }
}

interface GoogleMapsKeys {
  javascriptApiKey?: string
  staticApiKey?: string
}

function getGoogleMapsKeys(): GoogleMapsKeys {
  const environment = import.meta.env as ImportMetaEnv & {
    VITE_GOOGLE_MAPS_API_KEY?: string
    VITE_GOOGLE_MAPS_STATIC_API_KEY?: string
  }
  return {
    javascriptApiKey: environment.VITE_GOOGLE_MAPS_API_KEY?.trim() || undefined,
    staticApiKey: environment.VITE_GOOGLE_MAPS_STATIC_API_KEY?.trim() || undefined,
  }
}

function getLoadedGoogleMapsApi(): GoogleMapsApi | null {
  const google = (window as Window & { google?: GoogleMapsApi }).google
  return google?.maps?.Map && google.maps.Marker ? google : null
}

let googleMapsApiPromise: Promise<GoogleMapsApi> | null = null

function loadGoogleMapsApi(apiKey: string): Promise<GoogleMapsApi> {
  const loadedApi = getLoadedGoogleMapsApi()
  if (loadedApi) return Promise.resolve(loadedApi)
  if (googleMapsApiPromise) return googleMapsApiPromise

  const promise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(GOOGLE_MAPS_SCRIPT_SELECTOR)
    // A script left behind by a previous failed attempt is not a useful retry
    // target. Remove it before installing a fresh listener/source.
    existingScript?.remove()
    const script = document.createElement('script')
    const removeFailedScript = () => script.remove()
    const handleLoad = () => {
      const api = getLoadedGoogleMapsApi()
      if (api) resolve(api)
      else {
        removeFailedScript()
        reject(new Error('Google Maps loaded without its map API.'))
      }
    }
    const handleError = () => {
      removeFailedScript()
      reject(new Error('Google Maps could not be loaded.'))
    }

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    script.async = true
    script.defer = true
    script.dataset.capitalAuthoringGoogleMaps = 'true'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`
    document.head.append(script)
  })

  googleMapsApiPromise = promise.catch(error => {
    googleMapsApiPromise = null
    throw error
  })
  return googleMapsApiPromise
}

export function buildCapitalAuthoringStaticMapUrl(
  reference: CapitalAuthoringGeoReference,
  apiKey: string,
  zoom: number,
): string {
  const center = `${reference.capital.lat},${reference.capital.lon}`
  const parameters = new URLSearchParams({
    center,
    zoom: String(zoom),
    size: STATIC_MAP_SIZE,
    scale: '2',
    maptype: 'roadmap',
    key: apiKey,
  })
  const styles = CAPITAL_AUTHORING_GOOGLE_MAP_STYLES.flatMap(style => {
    const feature = style.featureType ? `feature:${style.featureType}` : ''
    const element = style.elementType ? `element:${style.elementType}` : ''
    return style.stylers.map(styler => {
      const [property, value] = Object.entries(styler)[0]
      return `style=${[feature, element, `${property}:${value}`].filter(Boolean).join('|')}`
    })
  })
  styles.forEach(style => parameters.append('style', style.replace(/^style=/, '')))
  parameters.append('markers', `color:red|label:C|${center}`)
  return `https://maps.googleapis.com/maps/api/staticmap?${parameters.toString()}`
}

interface CapitalAuthoringGoogleMapProps {
  country: Country
  reference?: CapitalAuthoringGeoReference
}

export function CapitalAuthoringGoogleMap({ country, reference }: CapitalAuthoringGoogleMapProps) {
  const mapMountRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<GoogleMapInstance | null>(null)
  const markerRef = useRef<GoogleMarkerInstance | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [staticZoom, setStaticZoom] = useState(DEFAULT_REFERENCE_ZOOM)
  const { javascriptApiKey, staticApiKey } = getGoogleMapsKeys()
  const staticMapUrl = useMemo(() => (
    !javascriptApiKey && reference && staticApiKey
      ? buildCapitalAuthoringStaticMapUrl(reference, staticApiKey, staticZoom)
      : undefined
  ), [javascriptApiKey, reference, staticApiKey, staticZoom])

  useEffect(() => {
    let cancelled = false

    if (!reference || !javascriptApiKey) {
      markerRef.current?.setMap(null)
      mapRef.current = null
      setStatus(staticApiKey && reference ? 'ready' : 'unavailable')
      return () => {
        cancelled = true
      }
    }

    setStatus('loading')
    void loadGoogleMapsApi(javascriptApiKey)
      .then(google => {
        if (cancelled || !mapMountRef.current) return

        const options = getCapitalAuthoringGoogleMapOptions(reference)
        const map = mapRef.current ?? new google.maps.Map(mapMountRef.current, options)
        mapRef.current = map
        map.setCenter(options.center)
        map.setZoom(options.zoom)

        const title = `${country.capital}, ${country.country}`
        const marker = markerRef.current ?? new google.maps.Marker({
          map,
          position: options.center,
          title,
        })
        markerRef.current = marker
        marker.setMap(map)
        marker.setPosition(options.center)
        marker.setTitle(title)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable')
      })

    return () => {
      cancelled = true
    }
  }, [javascriptApiKey, staticApiKey, country.country, country.capital, reference?.capital.lat, reference?.capital.lon, reference?.countryId])

  const unavailableMessage = !javascriptApiKey && !staticApiKey
    ? 'Set VITE_GOOGLE_MAPS_API_KEY or VITE_GOOGLE_MAPS_STATIC_API_KEY.'
    : 'Google Maps could not be loaded. Check VITE_GOOGLE_MAPS_API_KEY.'

  return (
    <div
      data-capital-authoring-reference-map
      data-capital-authoring-reference-capital={country.capital}
      data-capital-authoring-reference-lat={reference ? String(reference.capital.lat) : undefined}
      data-capital-authoring-reference-lon={reference ? String(reference.capital.lon) : undefined}
      data-capital-authoring-reference-zoom-controls="enabled"
      className="relative h-64 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
      aria-label={`Google reference map for ${country.country} and ${country.capital}`}
    >
      {javascriptApiKey ? (
        <div ref={mapMountRef} className="h-full w-full" />
      ) : staticMapUrl ? (
        <>
          <img
            src={staticMapUrl}
            alt={`Google reference map showing ${country.capital}, ${country.country}`}
            className="h-full w-full object-cover"
            data-capital-authoring-reference-static-map
          />
          <div className="absolute right-2 top-2 flex overflow-hidden rounded-md border border-zinc-300/70 bg-white/95 shadow-sm">
            <button
              type="button"
              aria-label="Zoom out reference map"
              className="h-8 w-8 text-lg leading-none text-zinc-700 hover:bg-zinc-100"
              onClick={() => setStaticZoom(zoom => Math.max(1, zoom - 1))}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Zoom in reference map"
              className="h-8 w-8 border-l border-zinc-300 text-lg leading-none text-zinc-700 hover:bg-zinc-100"
              onClick={() => setStaticZoom(zoom => Math.min(20, zoom + 1))}
            >
              +
            </button>
          </div>
        </>
      ) : (
        <div ref={mapMountRef} className="h-full w-full" />
      )}
      {status !== 'ready' && (
        <div
          data-capital-authoring-reference-unavailable
          role={status === 'unavailable' ? 'status' : undefined}
          className="absolute inset-0 flex items-center justify-center bg-zinc-900 px-4 text-center text-xs text-zinc-400"
        >
          {status === 'loading' ? 'Loading Google reference map…' : unavailableMessage}
        </div>
      )}
    </div>
  )
}
