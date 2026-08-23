import type { CapitalAuthoringGeoReference } from './capitalAuthoringReferenceData'

function coordinate(value: number): string {
  return String(value)
}

export function buildCapitalAuthoringGoogleMapsUrl(reference: CapitalAuthoringGeoReference): string {
  return `https://www.google.com/maps/search/?api=1&query=${coordinate(reference.capital.lat)},${coordinate(reference.capital.lon)}`
}

export function buildCapitalAuthoringOpenStreetMapUrl(reference: CapitalAuthoringGeoReference): string {
  const lat = coordinate(reference.capital.lat)
  const lon = coordinate(reference.capital.lon)
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=10/${lat}/${lon}`
}

export function buildCapitalAuthoringGoogleMapsStaticUrl(
  reference: CapitalAuthoringGeoReference,
  apiKey: string | undefined,
): string | null {
  const key = apiKey?.trim()
  if (!key) return null

  const lat = coordinate(reference.capital.lat)
  const lon = coordinate(reference.capital.lon)
  const params = new URLSearchParams({
    center: `${lat},${lon}`,
    zoom: '5',
    size: '600x320',
    scale: '2',
    maptype: 'roadmap',
    markers: `color:red|label:C|${lat},${lon}`,
    key,
  })
  for (const style of [
    'feature:road|visibility:off',
    'feature:poi|visibility:off',
    'feature:transit|visibility:off',
    'feature:landscape|visibility:simplified',
    'feature:administrative.locality|visibility:off',
    'feature:administrative.neighborhood|visibility:off',
    'feature:administrative.province|visibility:off',
    'feature:administrative.country|element:geometry.stroke|color:0x64748b',
  ]) {
    params.append('style', style)
  }
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`
}

export function buildCapitalAuthoringMapMapStaticUrl(reference: CapitalAuthoringGeoReference): string {
  const lat = coordinate(reference.capital.lat)
  const lon = coordinate(reference.capital.lon)
  const params = new URLSearchParams({
    center: `${lon},${lat}`,
    zoom: '5',
    size: '600x320@2x',
    style: 'light',
    pois: '0',
    markers: `${lon},${lat},C,red`,
  })
  return `https://mapmap.ai/api/static-map?${params.toString()}`
}

export function buildCapitalAuthoringImageSearchUrl(
  capital: string,
  country: string,
): string {
  const query = encodeURIComponent(`${capital} ${country} map`)
  return `https://www.google.com/search?tbm=isch&q=${query}`
}
