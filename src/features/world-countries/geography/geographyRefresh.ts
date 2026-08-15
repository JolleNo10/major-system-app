import { useSyncExternalStore } from 'react'

type GeographyListener = () => void

let geographyRevision = 0
const listeners = new Set<GeographyListener>()

export function getWorldCountriesGeographyRevision(): number {
  return geographyRevision
}

export function subscribeToWorldCountriesGeography(listener: GeographyListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Notify mounted World Countries setup views after a successful order write. */
export function notifyWorldCountriesGeographyChanged(): void {
  geographyRevision += 1
  for (const listener of listeners) listener()
}

export function useWorldCountriesGeographyRevision(): number {
  return useSyncExternalStore(
    subscribeToWorldCountriesGeography,
    getWorldCountriesGeographyRevision,
    getWorldCountriesGeographyRevision,
  )
}
