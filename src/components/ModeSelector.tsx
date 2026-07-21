import type { Mode } from '../types'
import { getStats, getDueCount } from '../hooks/useStats'
import { WORDS } from '../data/words'

const ALL_NUMS = Object.keys(WORDS)

interface ModeCard {
  id: Mode
  emoji: string
  title: string
  subtitle: string
  description: string
  accent: string
}

const PRACTICE_MODES: ModeCard[] = [
  {
    id: 'encoding',
    emoji: '🧠',
    title: 'Encoding',
    subtitle: 'Number → Word',
    description: 'See a number 00–99, recall its associated word',
    accent: 'group-hover:border-violet-500/60 group-hover:shadow-violet-900/20',
  },
  {
    id: 'decoding',
    emoji: '🔍',
    title: 'Decoding',
    subtitle: 'Word → Number',
    description: 'See a word, recall which number it represents',
    accent: 'group-hover:border-blue-500/60 group-hover:shadow-blue-900/20',
  },
  {
    id: 'repetition',
    emoji: '🔁',
    title: 'Repetition',
    subtitle: 'Spaced repetition',
    description: 'Practice what\'s due — SM-2 schedules the next session automatically',
    accent: 'group-hover:border-violet-500/60 group-hover:shadow-violet-900/20',
  },
  {
    id: 'sound-key',
    emoji: '🔢',
    title: 'Sound Key',
    subtitle: 'Digit → Sounds',
    description: 'What are the sounds for each digit 0–9?',
    accent: 'group-hover:border-emerald-500/60 group-hover:shadow-emerald-900/20',
  },
  {
    id: 'reverse-sound-key',
    emoji: '🔤',
    title: 'Reverse Sound Key',
    subtitle: 'Sound → Digit',
    description: 'Which sound belongs to which digit?',
    accent: 'group-hover:border-teal-500/60 group-hover:shadow-teal-900/20',
  },
  {
    id: 'sequence',
    emoji: '🔗',
    title: 'Sequences',
    subtitle: 'Long number sequences',
    description: 'Encode and decode number sequences pair by pair',
    accent: 'group-hover:border-orange-500/60 group-hover:shadow-orange-900/20',
  },
  {
    id: 'speed-round',
    emoji: '⚡',
    title: 'Speed Round',
    subtitle: '60 seconds',
    description: 'How many encodings can you do in 60 seconds?',
    accent: 'group-hover:border-yellow-500/60 group-hover:shadow-yellow-900/20',
  },
  {
    id: 'weak-spots',
    emoji: '🎯',
    title: 'Weak Spots',
    subtitle: 'Your worst numbers',
    description: 'Drill on the numbers you make the most mistakes on',
    accent: 'group-hover:border-red-500/60 group-hover:shadow-red-900/20',
  },
]

const CHALLENGE_MODES: ModeCard[] = [
  {
    id: 'pi-digits',
    emoji: '𝝅',
    title: 'Digits of π',
    subtitle: 'Sequential chain',
    description: 'Memorise the digits of π as a chain of major system words',
    accent: 'group-hover:border-cyan-500/60 group-hover:shadow-cyan-900/20',
  },
  {
    id: 'cards',
    emoji: '🃏',
    title: 'Card Deck',
    subtitle: 'Encode 52 cards',
    description: 'Each card maps to a number — drill the word for every card in the deck',
    accent: 'group-hover:border-rose-500/60 group-hover:shadow-rose-900/20',
  },
  {
    id: 'themed-cards',
    emoji: '🎭',
    title: 'Themed Deck',
    subtitle: 'A person per card',
    description: 'Each suit is its own cast — recall the person for every card',
    accent: 'group-hover:border-fuchsia-500/60 group-hover:shadow-fuchsia-900/20',
  },
]

interface Props {
  onSelectMode: (mode: Mode) => void
}

export function ModeSelector({ onSelectMode }: Props) {
  const stats = getStats()
  const entries = Object.values(stats)
  const total = entries.reduce((s, e) => s + e.correct + e.wrong, 0)
  const correct = entries.reduce((s, e) => s + e.correct, 0)
  const dueCount = getDueCount(ALL_NUMS)

  return (
    <div className="space-y-6">
      {total > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Total practiced</p>
            <p className="text-2xl font-bold text-zinc-100 mt-0.5">{total.toLocaleString()} answers</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Accuracy</p>
            <p className="text-2xl font-bold text-violet-400 mt-0.5">
              {Math.round((correct / total) * 100)}%
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PRACTICE_MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            className={`group relative text-left p-5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/80 transition-all duration-200 shadow-lg hover:shadow-xl ${mode.accent}`}
          >
            {mode.id === 'repetition' && dueCount > 0 && (
              <span className="absolute top-3 right-3 min-w-[1.5rem] h-6 px-1.5 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center tabular-nums">
                {dueCount}
              </span>
            )}
            <div className="text-3xl mb-3">{mode.emoji}</div>
            <div className="font-bold text-zinc-100 text-base">{mode.title}</div>
            <div className="text-xs text-violet-400 font-semibold mb-1.5 uppercase tracking-wide">
              {mode.subtitle}
            </div>
            <div className="text-sm text-zinc-500">{mode.description}</div>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Challenges</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CHALLENGE_MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={`group relative text-left p-5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/80 transition-all duration-200 shadow-lg hover:shadow-xl ${mode.accent}`}
            >
              <div className="text-3xl mb-3">{mode.emoji}</div>
              <div className="font-bold text-zinc-100 text-base">{mode.title}</div>
              <div className="text-xs text-cyan-400 font-semibold mb-1.5 uppercase tracking-wide">
                {mode.subtitle}
              </div>
              <div className="text-sm text-zinc-500">{mode.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
