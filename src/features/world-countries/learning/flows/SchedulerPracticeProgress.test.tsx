// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { LearningPracticeProgress } from '@/features/world-countries/learning/learningPracticeProgress'
import { SchedulerPracticeProgress } from './SchedulerPracticeProgress'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

function renderProgress(progress: LearningPracticeProgress | null) {
  const mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    root = createRoot(mount)
    root.render(createElement(SchedulerPracticeProgress, { progress }))
  })
  return mount
}

describe('SchedulerPracticeProgress', () => {
  it('shows continuous progress, target count, and progress semantics', () => {
    const mount = renderProgress({ pct: 2 / 3, atTarget: 4, total: 6 })
    const bar = mount.querySelector('[role="progressbar"]') as HTMLElement | null

    expect(mount.textContent).toContain('Practice progress')
    expect(mount.textContent).toContain('67%')
    expect(mount.textContent).toContain('4 / 6 at target')
    expect(bar).not.toBeNull()
    expect(bar?.getAttribute('aria-label')).toBe('Practice progress')
    expect(bar?.getAttribute('aria-valuemin')).toBe('0')
    expect(bar?.getAttribute('aria-valuemax')).toBe('100')
    expect(Number(bar?.getAttribute('aria-valuenow'))).toBeCloseTo(200 / 3)
    expect(bar?.getAttribute('aria-valuetext')).toBe('67%')
    expect((bar as HTMLElement).style.width).toBe(`${(2 / 3) * 100}%`)
  })

  it('renders nothing when no active scheduler scope exists', () => {
    const mount = renderProgress(null)

    expect(mount.textContent).toBe('')
    expect(mount.querySelector('[role="progressbar"]')).toBeNull()
  })
})
