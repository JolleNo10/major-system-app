export type OrderedRecallMode = 'clean' | 'repair'

export interface OrderedRecallConfig<TId> {
  order: readonly TId[]
  rewindOnError: number
}
export interface OrderedRecallState<TId> {
  order: readonly TId[]
  rewindOnError: number
  currentIndex: number
  mode: OrderedRecallMode
  completed: boolean
}

export interface OrderedRecallResult<TId> {
  state: OrderedRecallState<TId>
  correct: boolean
  expectedId: TId
  completedNow: boolean
  restartedCleanPass: boolean
}

export function createOrderedRecallSession<TId>(
  config: OrderedRecallConfig<TId>,
): OrderedRecallState<TId> {
  const order = [...new Set(config.order)]
  return {
    order,
    rewindOnError: Math.max(0, Math.floor(config.rewindOnError)),
    currentIndex: 0,
    mode: 'clean',
    completed: order.length === 0,
  }
}

/**
 * Submit either the expected ID or a boolean result. The boolean form lets a
 * country-specific answer matcher stay outside this generic engine.
 */
export function submitOrderedRecall<TId>(
  state: OrderedRecallState<TId>,
  answer: TId | boolean,
): OrderedRecallResult<TId> {
  const expectedId = state.order[state.currentIndex]
  if (state.completed || expectedId === undefined) {
    return {
      state,
      correct: true,
      expectedId,
      completedNow: false,
      restartedCleanPass: false,
    }
  }

  const correct = typeof answer === 'boolean' ? answer : Object.is(answer, expectedId)
  if (!correct) {
    const currentIndex = Math.max(0, state.currentIndex - state.rewindOnError)
    return {
      state: { ...state, currentIndex, mode: 'repair', completed: false },
      correct: false,
      expectedId,
      completedNow: false,
      restartedCleanPass: false,
    }
  }

  const atEnd = state.currentIndex === state.order.length - 1
  if (!atEnd) {
    return {
      state: { ...state, currentIndex: state.currentIndex + 1 },
      correct: true,
      expectedId,
      completedNow: false,
      restartedCleanPass: false,
    }
  }

  if (state.mode === 'repair') {
    return {
      state: { ...state, currentIndex: 0, mode: 'clean', completed: false },
      correct: true,
      expectedId,
      completedNow: false,
      restartedCleanPass: true,
    }
  }

  return {
    state: { ...state, completed: true },
    correct: true,
    expectedId,
    completedNow: true,
    restartedCleanPass: false,
  }
}
