import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { WORDS } from '../data/words'

const STORAGE_KEY = 'major-word-overrides'

function loadOverrides(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

interface WordsContextValue {
  words: Record<string, string>
  overrides: Record<string, string>
  setOverride: (key: string, value: string) => void
  resetOverride: (key: string) => void
  resetAll: () => void
}

const WordsContext = createContext<WordsContextValue | null>(null)

export function WordsProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, string>>(loadOverrides)

  const words = { ...WORDS, ...overrides }

  const setOverride = useCallback((key: string, value: string) => {
    setOverrides(prev => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const resetOverride = useCallback((key: string) => {
    setOverrides(prev => {
      const next = { ...prev }
      delete next[key]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setOverrides({})
  }, [])

  return (
    <WordsContext.Provider value={{ words, overrides, setOverride, resetOverride, resetAll }}>
      {children}
    </WordsContext.Provider>
  )
}

export function useWords() {
  const ctx = useContext(WordsContext)
  if (!ctx) throw new Error('useWords must be used within WordsProvider')
  return ctx
}
