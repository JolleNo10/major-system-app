import { useState } from 'react'
import type { AnswerMode } from '../types'
import { safeSet } from '../utils/storage'

const STORAGE_KEY = 'major-answer-mode'

export function useAnswerMode() {
  const [mode, setMode] = useState<AnswerMode>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'typing' ? 'typing' : 'multiple-choice'
    } catch {
      return 'multiple-choice'
    }
  })

  const toggle = () => {
    const next: AnswerMode = mode === 'multiple-choice' ? 'typing' : 'multiple-choice'
    setMode(next)
    safeSet(STORAGE_KEY, next)
  }

  return { mode, toggle }
}
