import type { AnswerMode } from '../types'
import { FAST_MS, SLOW_MS, DAY_MS, type ItemRecord } from './itemStore'

export function gradeAnswer(correct: boolean, ms: number, answerMode: AnswerMode): number {
  if (!correct) return 2
  if (ms <= FAST_MS[answerMode]) return 5
  if (ms >= SLOW_MS[answerMode]) return 3
  return 4
}

export function applySm2(item: ItemRecord, grade: number): ItemRecord {
  const now = Date.now()
  if (grade < 3) {
    return {
      ...item,
      reps: 0,
      intervalDays: 0,
      ease: Math.max(1.3, item.ease - 0.2),
      dueAt: now,
      lastSeenAt: now,
    }
  }
  const reps = item.reps + 1
  const intervalDays =
    reps === 1 ? 1
    : reps === 2 ? 3
    : Math.round(item.intervalDays * item.ease)
  const ease = Math.max(
    1.3,
    item.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)),
  )
  return {
    ...item,
    reps,
    intervalDays,
    ease,
    dueAt: now + intervalDays * DAY_MS,
    lastSeenAt: now,
  }
}
