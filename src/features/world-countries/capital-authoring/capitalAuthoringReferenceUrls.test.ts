import { describe, expect, it } from 'vitest'
import {
  buildCapitalAuthoringGoogleMapsUrl,
  buildCapitalAuthoringImageSearchUrl,
  buildCapitalAuthoringOpenStreetMapPreviewUrl,
  buildCapitalAuthoringOpenStreetMapUrl,
} from './capitalAuthoringReferenceUrls'

const reference = {
  countryId: 'NO',
  capital: { lat: 59.9139, lon: 10.7522 },
  countryReference: { lat: 65, lon: 11 },
}

describe('capital authoring reference URLs', () => {
  it('builds coordinate links for Google Maps and OpenStreetMap', () => {
    expect(buildCapitalAuthoringGoogleMapsUrl(reference)).toBe('https://www.google.com/maps/search/?api=1&query=59.9139,10.7522')
    expect(buildCapitalAuthoringOpenStreetMapUrl(reference)).toBe('https://www.openstreetmap.org/?mlat=59.9139&mlon=10.7522#map=10/59.9139/10.7522')
    expect(buildCapitalAuthoringOpenStreetMapPreviewUrl(reference)).toContain('marker=59.9139,10.7522')
  })

  it('encodes the canonical capital and Country in the image search query', () => {
    expect(buildCapitalAuthoringImageSearchUrl('Washington, D.C.', 'United States')).toBe(
      'https://www.google.com/search?tbm=isch&q=Washington%2C%20D.C.%20United%20States%20map',
    )
  })
})
