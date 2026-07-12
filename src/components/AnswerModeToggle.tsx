import type { AnswerMode } from '../types'

interface Props {
  mode: AnswerMode
  onToggle: () => void
}

export function AnswerModeToggle({ mode, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      title={mode === 'multiple-choice' ? 'Switch to typing' : 'Switch to multiple choice'}
      className="flex items-center justify-center gap-2 px-3 min-h-[40px] min-w-[40px] rounded-lg bg-zinc-800 border border-zinc-700 hover:border-violet-500 transition-colors text-sm font-medium text-zinc-300 hover:text-zinc-100"
    >
      {mode === 'multiple-choice' ? (
        <>
          <span className="text-base">≡</span>
          <span className="hidden sm:inline">Multiple choice</span>
        </>
      ) : (
        <>
          <span className="text-base">⌨</span>
          <span className="hidden sm:inline">Typing</span>
        </>
      )}
    </button>
  )
}
