import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { WordRow } from '../data/wordsCsv'
import { safeSet, safeRemove } from '../utils/storage'

// Generic 3-layer word store, each layer overriding the one above:
//   shipped (factory defaults)  →  saved (localStorage)  →  trial overrides (localStorage)
// "trial" edits are yellow/pending; persist() folds them into "saved" (committed).
// Used for both the Major System list (WordsContext) and the Themed Deck list (CardWordsContext).

export type Words = Record<string, string>

export interface WordStoreValue {
  words: Words                 // effective (shipped + saved + trials)
  shipped: Words               // factory defaults
  saved: Words                 // committed customizations
  overrides: Words             // trial edits (pending)
  setOverride: (key: string, value: string) => void
  resetOverride: (key: string) => void
  resetTrials: () => void      // discard all pending trial edits
  persist: () => void          // fold trials into saved
  resetFactory: () => void     // clear saved + trials → back to shipped
  importSaved: (rows: WordRow[]) => void
}

function load(key: string): Words {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

function persistMap(key: string, map: Words) {
  if (Object.keys(map).length) safeSet(key, JSON.stringify(map))
  else safeRemove(key)
}

export function createWordStore(shipped: Words, savedKey: string, overridesKey: string) {
  const Ctx = createContext<WordStoreValue | null>(null)

  function Provider({ children }: { children: ReactNode }) {
    const [overrides, setOverrides] = useState<Words>(() => load(overridesKey))
    const [saved, setSaved] = useState<Words>(() => load(savedKey))

    const words = { ...shipped, ...saved, ...overrides }

    const updateOverrides = useCallback((fn: (prev: Words) => Words) => {
      setOverrides(prev => { const next = fn(prev); persistMap(overridesKey, next); return next })
    }, [])
    const updateSaved = useCallback((fn: (prev: Words) => Words) => {
      setSaved(prev => { const next = fn(prev); persistMap(savedKey, next); return next })
    }, [])

    const setOverride = useCallback((key: string, value: string) => {
      updateOverrides(prev => ({ ...prev, [key]: value }))
    }, [updateOverrides])

    const resetOverride = useCallback((key: string) => {
      updateOverrides(prev => { const next = { ...prev }; delete next[key]; return next })
    }, [updateOverrides])

    const resetTrials = useCallback(() => {
      setOverrides({}); safeRemove(overridesKey)
    }, [])

    const persist = useCallback(() => {
      setOverrides(trials => {
        // Fold each trial into saved; a trial equal to the shipped default clears saved.
        setSaved(prevSaved => {
          const next = { ...prevSaved }
          for (const [k, v] of Object.entries(trials)) {
            if (v === shipped[k]) delete next[k]
            else next[k] = v
          }
          persistMap(savedKey, next)
          return next
        })
        safeRemove(overridesKey)
        return {}
      })
    }, [])

    const resetFactory = useCallback(() => {
      setOverrides({}); safeRemove(overridesKey)
      setSaved({}); safeRemove(savedKey)
    }, [])

    const importSaved = useCallback((rows: WordRow[]) => {
      const affected = new Set(rows.map(r => r.number))
      updateSaved(prev => {
        const next = { ...prev }
        for (const r of rows) {
          const word = r.custom || r.def
          if (word === shipped[r.number]) delete next[r.number]
          else next[r.number] = word
        }
        return next
      })
      // Clear any pending trial for imported numbers so the imported value is effective.
      updateOverrides(prev => {
        const next = { ...prev }
        for (const n of affected) delete next[n]
        return next
      })
    }, [updateSaved, updateOverrides])

    return (
      <Ctx.Provider value={{
        words, shipped, saved, overrides,
        setOverride, resetOverride, resetTrials, persist, resetFactory, importSaved,
      }}>
        {children}
      </Ctx.Provider>
    )
  }

  function useStore(): WordStoreValue {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error('word store hook used outside its provider')
    return ctx
  }

  return { Provider, useStore }
}
