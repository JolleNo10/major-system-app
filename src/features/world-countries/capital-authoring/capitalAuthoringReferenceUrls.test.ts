import { describe, expect, it } from 'vitest'
import {
  buildCapitalAuthoringGoogleMapsUrl,
  buildCapitalAuthoringGoogleMapsStaticUrl,
  buildCapitalAuthoringImageSearchUrl,
  buildCapitalAuthoringOpenStreetMapStaticUrl,
  buildCapitalAuthoringOpenStreetMapUrl,
} from './capitalAuthoringReferenceUrls'

const reference = {
  countryId: 'NO',
  capital: { lat: 59.9139, lon: 10.7522 },
}

describe('capital authoring reference URLs', () => {
  it('builds coordinate links for Google Maps and OpenStreetMap', () => {
    expect(buildCapitalAuthoringGoogleMapsUrl(reference)).toBe('https://www.google.com/maps/search/?api=1&query=59.9139,10.7522')
    expect(buildCapitalAuthoringOpenStreetMapUrl(reference)).toBe('https://www.openstreetmap.org/?mlat=59.9139&mlon=10.7522#map=10/59.9139/10.7522')
  })

  it('builds a styled Google static map when configured', () => {
    const url = buildCapitalAuthoringGoogleMapsStaticUrl(reference, ' test-key ')
    expect(url).not.toBeNull()
    expect(url).toContain('maps.googleapis.com/maps/api/staticmap')
    expect(url).toContain('center=59.9139%2C10.7522')
    expect(url).toContain('markers=color%3Ared%7Clabel%3AC%7C59.9139%2C10.7522')
    expect(url).toContain('feature%3Aroad%7Cvisibility%3Aoff')
    expect(url).toContain('key=test-key')
  })

  it('returns no Google static map URL without configuration and provides an OSM image fallback', () => {
    expect(buildCapitalAuthoringGoogleMapsStaticUrl(reference, '  ')).toBeNull()
    expect(buildCapitalAuthoringOpenStreetMapStaticUrl(reference)).toContain('center=59.9139%2C10.7522')
    expect(buildCapitalAuthoringOpenStreetMapStaticUrl(reference)).toContain('markers=59.9139%2C10.7522%2Cred-pushpin')
  })

  it('encodes the canonical capital and Country in the image search query', () => {
    expect(buildCapitalAuthoringImageSearchUrl('Washington, D.C.', 'United States')).toBe(
      'https://www.google.com/search?tbm=isch&q=Washington%2C%20D.C.%20United%20States%20map',
    )
  })
})
