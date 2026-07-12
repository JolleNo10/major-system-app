import { useRef, useState } from 'react'
import { useWords } from '../context/WordsContext'
import { WORDS as DEFAULT_WORDS } from '../data/words'
import { getStats } from '../hooks/useStats'

export function WordListGrid() {
  const { words, overrides, setOverride, resetOverride, resetAll } = useWords()
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stats = getStats()

  const keys = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
  const overrideCount = Object.keys(overrides).length

  const handleExport = () => {
    const text = keys.map(key => `${key} ${words[key]}`).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    a.download = 'major-words.txt'
    a.click()
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      let count = 0
      for (const line of text.split('\n')) {
        const m = line.match(/^(\d{2})\s+(\S+)/)
        if (!m) continue
        const [, key, word] = m
        const num = parseInt(key, 10)
        if (num < 0 || num > 99) continue
        if (word === DEFAULT_WORDS[key]) resetOverride(key)
        else setOverride(key, word)
        count++
      }
      setImportMsg(`Imported ${count} words`)
      setTimeout(() => setImportMsg(null), 3000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

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
      <div className="flex items-center justify-between text-sm flex-wrap gap-2">
        <span className="text-zinc-500">
          {importMsg
            ? <span className="text-violet-300">{importMsg}</span>
            : overrideCount > 0 ? `${overrideCount} word${overrideCount !== 1 ? 's' : ''} changed from default` : 'Click a word to edit'}
        </span>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".txt,.md" className="hidden" onChange={handleImportFile} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ↑ Import
          </button>
          <button
            onClick={handleExport}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ↓ Export
          </button>
          {overrideCount > 0 && (
            <button
              onClick={resetAll}
              className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5"
            >
              ↺ Reset all
            </button>
          )}
        </div>
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
                      className="text-yellow-500 hover:text-yellow-300 text-sm leading-none px-1 -mr-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
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
