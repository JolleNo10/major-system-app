import { useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { readString, safeSet } from '@/core/storage'

const STORAGE_KEY = 'major-answer-mode'

export function useAnswerMode() {
  const [mode, setMode] = useState<AnswerMode>(() =>
    readString(STORAGE_KEY) === 'typing' ? 'typing' : 'multiple-choice')

  const toggle = () => {
    const next: AnswerMode = mode === 'multiple-choice' ? 'typing' : 'multiple-choice'
    setMode(next)
    safeSet(STORAGE_KEY, next)
  }

  return { mode, toggle }
}
