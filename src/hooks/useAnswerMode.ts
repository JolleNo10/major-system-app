import { useState } from 'react'
import type { AnswerMode } from '../types'

const STORAGE_KEY = 'major-answer-mode'

export function useAnswerMode() {
  const [mode, setMode] = useState<AnswerMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'typing' ? 'typing' : 'multiple-choice'
  })

  const toggle = () => {
    const next: AnswerMode = mode === 'multiple-choice' ? 'typing' : 'multiple-choice'
    setMode(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return { mode, toggle }
}
