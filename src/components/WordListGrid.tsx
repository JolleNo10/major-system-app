import { useState } from 'react'
import { useWords } from '../context/WordsContext'
import { WORDS as DEFAULT_WORDS } from '../data/words'
import { getStats } from '../hooks/useStats'

export function WordListGrid() {
  const { words, overrides, setOverride, resetOverride, resetAll } = useWords()
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const stats = getStats()

  const keys = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
  const overrideCount = Object.keys(overrides).length

  const startEdit = (key: string) => {
    setEditing(key)
    setEditValue(words[key])
  }

  const confirmEdit = (key: string) => {
    const val = editValue.trim()
    if (!val) { setEditing(null); return }
    if (val === DEFAULT_WORDS[key]) {
      resetOverride(key)
    } else {
      setOverride(key, val)
    }
    setEditing(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, key: string) => {
    if (e.key === 'Enter') confirmEdit(key)
    if (e.key === 'Escape') setEditing(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-500">
          {overrideCount > 0 ? `${overrideCount} word${overrideCount !== 1 ? 's' : ''} changed from default` : 'Click a word to edit'}
        </span>
        {overrideCount > 0 && (
          <button
            onClick={resetAll}
            className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5"
          >
            ↺ Reset all
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {keys.map(key => {
          const isEditing = editing === key
          const isOverridden = key in overrides
          const s = stats[key]
          const total = s ? s.correct + s.wrong : 0
          const accuracy = total > 0 ? s.correct / total : null

          return (
            <div
              key={key}
              className={`relative rounded-lg border p-2.5 transition-all cursor-pointer group min-h-[60px]
                ${isEditing
                  ? 'border-violet-500 bg-violet-500/10'
                  : isOverridden
                  ? 'border-yellow-600/40 bg-zinc-800/60 hover:border-yellow-500/60 hover:bg-zinc-800'
                  : 'border-zinc-800 bg-zinc-800/40 hover:border-zinc-700 hover:bg-zinc-800'
                }
              `}
              onClick={() => !isEditing && startEdit(key)}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-xs font-mono text-zinc-600">{key}</span>
                <div className="flex items-center gap-1">
                  {accuracy !== null && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        accuracy >= 0.8 ? 'bg-green-500' : accuracy >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      title={`${s.correct}✓ ${s.wrong}✗`}
                    />
                  )}
                  {isOverridden && (
                    <button
                      onClick={e => { e.stopPropagation(); resetOverride(key) }}
                      className="text-yellow-500 hover:text-yellow-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Reset to default"
                    >
                      ↺
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <input
                  autoFocus
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => handleKeyDown(e, key)}
                  onBlur={() => confirmEdit(key)}
                  onClick={e => e.stopPropagation()}
                  className="w-full bg-transparent text-sm font-semibold text-zinc-100 outline-none border-b border-violet-400"
                />
              ) : (
                <div className={`text-sm font-semibold truncate ${isOverridden ? 'text-yellow-300' : 'text-zinc-200'}`}>
                  {words[key]}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-zinc-600 text-center">
        Yellow = changed from default · Coloured dot = training history (green/yellow/red)
      </p>
    </div>
  )
}
