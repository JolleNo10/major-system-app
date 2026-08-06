import { Fragment, useRef, useState } from 'react'
import { usePaoStore } from '@/features/cards/pao/PaoCardsContext'
import { useCardWords } from '@/features/cards/themed/CardWordsContext'
import { paoKey, PAO_FIELDS, type PaoField } from '@/features/cards/pao/paoCards'
import { parsePaoCsv, serializePaoCsv, type PaoRow } from '@/features/cards/pao/paoCsv'
import { CARDS } from '@/core/cards'
import type { Suit } from '@/core/cards'

interface Layered { def: string; custom: string }

const COLS: { field: PaoField; label: string; placeholder: string }[] = [
  { field: 'person', label: 'Person', placeholder: 'e.g. Einstein' },
  { field: 'action', label: 'Action', placeholder: 'e.g. dancing' },
  { field: 'object', label: 'Object', placeholder: 'e.g. cactus' },
]

const SUIT_GROUPS: { suit: Suit; label: string }[] = [
  { suit: '♣', label: '♣ Clubs' },
  { suit: '♦', label: '♦ Diamonds' },
  { suit: '♥', label: '♥ Hearts' },
  { suit: '♠', label: '♠ Spades' },
]

const cardsForSuit = (suit: Suit) => CARDS.filter(c => c.suit === suit)

export function PaoWordsGrid() {
  const {
    words, shipped, saved, overrides,
    setOverride, resetOverride, resetTrials, persist, resetFactory, importEffective,
  } = usePaoStore()
  const { words: themedWords } = useCardWords()

  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const trialCount = Object.keys(overrides).length
  const savedCount = Object.keys(saved).length

  const flash = (msg: string) => { setImportMsg(msg); setTimeout(() => setImportMsg(null), 3000) }

  const layered = (number: string, field: PaoField): Layered => {
    const k = paoKey(number, field)
    const def = shipped[k] ?? ''
    const eff = words[k] ?? ''
    return { def, custom: eff !== def ? eff : '' }
  }

  const handleExport = () => {
    const rows: PaoRow[] = CARDS.map(c => ({
      number: c.number,
      person: words[paoKey(c.number, 'person')] ?? '',
      action: words[paoKey(c.number, 'action')] ?? '',
      object: words[paoKey(c.number, 'object')] ?? '',
    }))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([serializePaoCsv(rows)], { type: 'text/csv' }))
    a.download = 'pao-cards.csv'
    a.click()
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const { rows, errors } = parsePaoCsv(ev.target?.result as string)
      if (errors.length) {
        setImportErrors(errors)
        setImportMsg(null)
      } else {
        setImportErrors([])
        const map: Record<string, string> = {}
        for (const r of rows) {
          map[paoKey(r.number, 'person')] = r.person
          map[paoKey(r.number, 'action')] = r.action
          map[paoKey(r.number, 'object')] = r.object
        }
        importEffective(map)
        flash(`Imported ${rows.length} card${rows.length !== 1 ? 's' : ''}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Seed every Person from the Themed Deck word list (one word per card = the P
  // of PAO). Only the person column is touched; actions/objects are left as-is.
  const importFromThemed = () => {
    const map: Record<string, string> = {}
    for (const c of CARDS) {
      const w = (themedWords[c.number] ?? '').trim()
      if (w) map[paoKey(c.number, 'person')] = w
    }
    const n = Object.keys(map).length
    if (!n) return
    if (!confirm(`Set every Person (${n} cards) from the Themed Deck word list? This overwrites the current persons; actions and objects are unchanged.`)) return
    importEffective(map)
    flash(`Imported ${n} person${n !== 1 ? 's' : ''} from the Themed Deck`)
  }

  const startEdit = (key: string) => { setEditing(key); setEditValue(words[key] ?? '') }

  const confirmEdit = (key: string) => {
    const val = editValue.trim()
    if (!val) { setEditing(null); return }  // all three fields are required
    const baseline = saved[key] ?? shipped[key] ?? ''
    if (val === baseline) resetOverride(key)
    else setOverride(key, val)
    setEditing(null)
  }

  const btn = 'text-zinc-400 hover:text-zinc-200 transition-colors'

  const renderCell = (number: string, field: PaoField, placeholder: string) => {
    const key = paoKey(number, field)
    const isEditing = editing === key
    const isTrial = key in overrides
    const isSaved = !isTrial && key in saved
    const value = words[key] ?? ''

    return (
      <td key={field} className="px-3 py-2 align-top">
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={editValue}
            placeholder={placeholder}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') confirmEdit(key)
              if (e.key === 'Escape') setEditing(null)
            }}
            onBlur={() => confirmEdit(key)}
            className="w-full bg-transparent text-sm text-zinc-100 outline-none border-b border-violet-400"
          />
        ) : (
          <div className="flex items-start gap-1.5 group">
            <button
              onClick={() => startEdit(key)}
              className={`text-left text-sm rounded px-1.5 py-1 -mx-1.5 -my-1 transition-colors w-full ${
                isTrial ? 'text-yellow-300 bg-yellow-600/10 hover:bg-yellow-600/20'
                : isSaved ? 'text-violet-300 hover:bg-violet-600/10'
                : 'text-zinc-300 hover:bg-zinc-800'
              }`}
              aria-label={`Edit ${field} for card ${number}: ${value || '(empty)'}`}
            >
              {value || <span className="text-zinc-600 italic">empty</span>}
            </button>
            {(isTrial || isSaved) && (
              <button
                onClick={() => resetOverride(key)}
                className={`${isTrial ? 'text-yellow-500 hover:text-yellow-300' : 'text-violet-400 hover:text-violet-300'} text-sm leading-none mt-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0`}
                title={isTrial ? 'Discard pending edit' : 'Revert to shipped default'}
                aria-label={isTrial ? `Discard pending edit for ${field} of card ${number}` : `Revert ${field} of card ${number} to shipped default`}
              >
                ↺
              </button>
            )}
          </div>
        )}
      </td>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm flex-wrap gap-2">
        <span className="text-zinc-500">
          {importMsg
            ? <span className="text-violet-300">{importMsg}</span>
            : trialCount > 0 ? `${trialCount} pending edit${trialCount !== 1 ? 's' : ''} — Persist to save`
            : savedCount > 0 ? `${savedCount} saved customization${savedCount !== 1 ? 's' : ''}`
            : 'Click a value to edit'}
        </span>
        <div className="flex items-center gap-3">
          <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImportFile} />
          <button onClick={importFromThemed} className={btn} title="Set the Person column from the Themed Deck word list">🎭 From Themed Deck</button>
          <button onClick={() => fileInputRef.current?.click()} className={btn}>↑ Import</button>
          <button onClick={handleExport} className={btn}>↓ Export</button>
          {trialCount > 0 && (
            <button onClick={persist} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">✓ Persist</button>
          )}
          {trialCount > 0 && (
            <button onClick={resetTrials} className={btn}>↺ Reset edits</button>
          )}
          {(savedCount > 0 || trialCount > 0) && (
            <button
              onClick={() => { if (confirm('Reset the PAO deck to the shipped defaults? Saved customizations will be lost.')) resetFactory() }}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              Reset to factory
            </button>
          )}
        </div>
      </div>

      {importErrors.length > 0 && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-red-300 font-medium">Import failed — {importErrors.length} error{importErrors.length !== 1 ? 's' : ''}, nothing applied</span>
            <button onClick={() => setImportErrors([])} className="text-red-400 hover:text-red-200">×</button>
          </div>
          <ul className="text-red-300/80 font-mono text-xs space-y-0.5 max-h-40 overflow-y-auto">
            {importErrors.slice(0, 20).map((err, i) => <li key={i}>{err}</li>)}
            {importErrors.length > 20 && <li>…and {importErrors.length - 20} more</li>}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-800/60">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Card</th>
              {COLS.map(c => (
                <th key={c.field} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {SUIT_GROUPS.map(({ suit, label }) => (
              <Fragment key={label}>
                <tr className="bg-zinc-900/60">
                  <td colSpan={1 + COLS.length} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {label}
                  </td>
                </tr>
                {cardsForSuit(suit).map(card => (
                  <tr key={card.number} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-2 align-top whitespace-nowrap">
                      <span className={`text-lg font-bold ${card.red ? 'text-rose-400' : 'text-zinc-300'}`}>
                        {card.rank}{card.suit}
                      </span>
                    </td>
                    {COLS.map(c => renderCell(card.number, c.field, c.placeholder))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-600 text-center">
        Yellow = pending edit (not yet saved) · Violet = saved customization · All three fields are required
      </p>
    </div>
  )
}
