import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { WORDS } from '../data/words'
import type { WordRow } from '../data/wordsCsv'

// Three layers, each overriding the one above:
//   shipped (WORDS, from words.csv)  →  saved (localStorage)  →  trial overrides (localStorage)
// "trial" edits are yellow/pending; Persist folds them into "saved" (committed).
const OVERRIDES_KEY = 'major-word-overrides' // trial edits
const SAVED_KEY = 'major-word-saved'         // persisted/committed words

type Words = Record<string, string>

function load(key: string): Words {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

function persistMap(key: string, map: Words) {
  if (Object.keys(map).length) localStorage.setItem(key, JSON.stringify(map))
  else localStorage.removeItem(key)
}

interface WordsContextValue {
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

const WordsContext = createContext<WordsContextValue | null>(null)

export function WordsProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Words>(() => load(OVERRIDES_KEY))
  const [saved, setSaved] = useState<Words>(() => load(SAVED_KEY))

  const words = { ...WORDS, ...saved, ...overrides }

  const updateOverrides = useCallback((fn: (prev: Words) => Words) => {
    setOverrides(prev => { const next = fn(prev); persistMap(OVERRIDES_KEY, next); return next })
  }, [])
  const updateSaved = useCallback((fn: (prev: Words) => Words) => {
    setSaved(prev => { const next = fn(prev); persistMap(SAVED_KEY, next); return next })
  }, [])

  const setOverride = useCallback((key: string, value: string) => {
    updateOverrides(prev => ({ ...prev, [key]: value }))
  }, [updateOverrides])

  const resetOverride = useCallback((key: string) => {
    updateOverrides(prev => { const next = { ...prev }; delete next[key]; return next })
  }, [updateOverrides])

  const resetTrials = useCallback(() => {
    setOverrides({}); localStorage.removeItem(OVERRIDES_KEY)
  }, [])

  const persist = useCallback(() => {
    setOverrides(trials => {
      // Fold each trial into saved; a trial equal to the shipped default clears saved.
      setSaved(prevSaved => {
        const next = { ...prevSaved }
        for (const [k, v] of Object.entries(trials)) {
          if (v === WORDS[k]) delete next[k]
          else next[k] = v
        }
        persistMap(SAVED_KEY, next)
        return next
      })
      localStorage.removeItem(OVERRIDES_KEY)
      return {}
    })
  }, [])

  const resetFactory = useCallback(() => {
    setOverrides({}); localStorage.removeItem(OVERRIDES_KEY)
    setSaved({}); localStorage.removeItem(SAVED_KEY)
  }, [])

  const importSaved = useCallback((rows: WordRow[]) => {
    const affected = new Set(rows.map(r => r.number))
    updateSaved(prev => {
      const next = { ...prev }
      for (const r of rows) {
        const word = r.custom || r.def
        if (word === WORDS[r.number]) delete next[r.number]
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
    <WordsContext.Provider value={{
      words, shipped: WORDS, saved, overrides,
      setOverride, resetOverride, resetTrials, persist, resetFactory, importSaved,
    }}>
      {children}
    </WordsContext.Provider>
  )
}

export function useWords() {
  const ctx = useContext(WordsContext)
  if (!ctx) throw new Error('useWords must be used within WordsProvider')
  return ctx
}
