import { vowelSkeleton } from '../utils/vowelSkeleton'

interface Props {
  word: string
  revealed: boolean
  onReveal: () => void
}

export function HintButton({ word, revealed, onReveal }: Props) {
  const skeleton = vowelSkeleton(word)
  // Insert spaces between characters so underscores read clearly: _ y _ e
  const display = [...skeleton].join(' ')

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={revealed ? undefined : onReveal}
        disabled={revealed}
        title={revealed ? '' : 'Hint (H)'}
        className={`flex items-center justify-center min-h-[40px] px-4 rounded-lg text-sm font-medium transition-colors ${
          revealed
            ? 'bg-zinc-800/40 text-zinc-700 cursor-default'
            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
        }`}
      >
        💡 Hint
      </button>
      {revealed && (
        <p className="font-mono text-xl text-violet-300 tracking-[0.2em] select-none">
          {display}
        </p>
      )}
    </div>
  )
}
