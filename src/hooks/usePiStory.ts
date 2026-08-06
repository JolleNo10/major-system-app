import { useEffect, useState } from 'react'
import { getStory, getStorySegs, type PiStory } from '../data/piStories'

// Async-load one segment's story from IndexedDB. `refreshKey` re-fetches when it
// changes — bump it after a write so the panel reflects the new state.
export function usePiStory(seg: number | null, refreshKey: unknown): { story: PiStory | null; loading: boolean } {
  const [story, setStory] = useState<PiStory | null>(null)
  const [loading, setLoading] = useState(seg !== null)
  useEffect(() => {
    if (seg === null) {
      setStory(null)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    getStory(seg).then(s => {
      if (alive) { setStory(s); setLoading(false) }
    })
    return () => { alive = false }
  }, [seg, refreshKey])
  return { story, loading }
}

// The set of segments with a story — feeds the grid "has story" indicator.
export function usePiStorySegs(refreshKey: unknown): Set<number> {
  const [segs, setSegs] = useState<Set<number>>(new Set())
  useEffect(() => {
    let alive = true
    getStorySegs().then(list => { if (alive) setSegs(new Set(list)) })
    return () => { alive = false }
  }, [refreshKey])
  return segs
}

// Object-URL lifecycle for a stored Blob. Revokes on blob-change and unmount —
// StrictMode's double-mount makes a missing revoke a guaranteed leak.
export function useBlobUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])
  return url
}
