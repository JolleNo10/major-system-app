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

export function buildCapitalAuthoringOpenStreetMapPreviewUrl(reference: CapitalAuthoringGeoReference): string {
  const lat = reference.capital.lat
  const lon = reference.capital.lon
  const latDelta = 0.75
  const lonDelta = 1.1
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - lonDelta},${lat - latDelta},${lon + lonDelta},${lat + latDelta}&layer=mapnik&marker=${lat},${lon}`
}

export function buildCapitalAuthoringImageSearchUrl(
  capital: string,
  country: string,
): string {
  const query = encodeURIComponent(`${capital} ${country} map`)
  return `https://www.google.com/search?tbm=isch&q=${query}`
}
