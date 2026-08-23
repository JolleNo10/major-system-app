import { useEffect, useRef, useState } from 'react'
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

function getGoogleMapsApiKey(): string | undefined {
  const environment = import.meta.env as ImportMetaEnv & {
    VITE_GOOGLE_MAPS_API_KEY?: string
    VITE_GOOGLE_MAPS_STATIC_API_KEY?: string
  }
  return environment.VITE_GOOGLE_MAPS_API_KEY?.trim() || environment.VITE_GOOGLE_MAPS_STATIC_API_KEY?.trim()
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
    const script = document.querySelector<HTMLScriptElement>(GOOGLE_MAPS_SCRIPT_SELECTOR) ?? document.createElement('script')
    const handleLoad = () => {
      const api = getLoadedGoogleMapsApi()
      if (api) resolve(api)
      else reject(new Error('Google Maps loaded without its map API.'))
    }
    const handleError = () => reject(new Error('Google Maps could not be loaded.'))

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    if (!script.parentElement) {
      script.async = true
      script.defer = true
      script.dataset.capitalAuthoringGoogleMaps = 'true'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`
      document.head.append(script)
    }
  })

  googleMapsApiPromise = promise.catch(error => {
    googleMapsApiPromise = null
    throw error
  })
  return googleMapsApiPromise
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
  const apiKey = getGoogleMapsApiKey()

  useEffect(() => {
    let cancelled = false

    if (!reference || !apiKey) {
      markerRef.current?.setMap(null)
      mapRef.current = null
      setStatus('unavailable')
      return () => {
        cancelled = true
      }
    }

    setStatus('loading')
    void loadGoogleMapsApi(apiKey)
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
  }, [apiKey, country.country, country.capital, reference?.capital.lat, reference?.capital.lon, reference?.countryId])

  return (
    <div
      data-capital-authoring-reference-map
      data-capital-authoring-reference-capital={country.capital}
      data-capital-authoring-reference-lat={reference ? String(reference.capital.lat) : undefined}
      data-capital-authoring-reference-lon={reference ? String(reference.capital.lon) : undefined}
      data-capital-authoring-reference-zoom-controls="enabled"
      className="relative h-48 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
      aria-label={`Google reference map for ${country.country} and ${country.capital}`}
    >
      <div ref={mapMountRef} className="h-full w-full" />
      {status !== 'ready' && (
        <div
          data-capital-authoring-reference-unavailable
          role={status === 'unavailable' ? 'status' : undefined}
          className="absolute inset-0 flex items-center justify-center bg-zinc-900 px-4 text-center text-xs text-zinc-400"
        >
          {status === 'loading' ? 'Loading Google reference map…' : 'Google reference map unavailable.'}
        </div>
      )}
    </div>
  )
}
