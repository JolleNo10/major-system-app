import { useState, useRef, useEffect, useCallback } from 'react'

// Active-elapsed answer timer shared by the Encoding/Decoding drills.
// Excludes paused spans: timerStart = last resume; activeElapsed = ms accrued
// before the current running segment. Resets on each new question object (fresh
// per pick, so a one-number pool still resets). `answered` blocks pausing after
// the answer is in.
export function useAnswerTimer(question: unknown, answered: string | null) {
  const timerStartRef = useRef(Date.now())
  const activeElapsedRef = useRef(0)
  const everPausedRef = useRef(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    timerStartRef.current = Date.now()
    activeElapsedRef.current = 0
    everPausedRef.current = false
    setPaused(false)
  }, [question])

  const togglePause = useCallback(() => {
    if (answered !== null) return
    setPaused(p => {
      if (!p) {
        activeElapsedRef.current += Date.now() - timerStartRef.current
        everPausedRef.current = true
        return true
      }
      timerStartRef.current = Date.now()
      return false
    })
  }, [answered])

  // ms elapsed excluding paused spans; whether the timer was ever paused.
  const elapsedMs = useCallback(() => activeElapsedRef.current + (Date.now() - timerStartRef.current), [])
  const wasPaused = useCallback(() => everPausedRef.current, [])

  return { paused, togglePause, elapsedMs, wasPaused }
}
