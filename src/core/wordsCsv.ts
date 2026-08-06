// Shared parse/serialize for the word-list CSV format.
// Columns: number,default,custom
//   number  — 2-digit "00".."99"
//   default — the shipped/factory word (non-empty)
//   custom  — optional user replacement (empty = use default)
// Used by the seed loader (data/words.ts) and import/export in WordListGrid.

export interface WordRow {
  number: string
  def: string      // "default" column
  custom: string   // "custom" column ("" if none)
}

export interface ParseResult {
  rows: WordRow[]
  errors: string[]
}

export const CSV_HEADER = 'number,default,custom'

const NUM_RE = /^\d{2}$/

function isHeader(line: string): boolean {
  return line.replace(/\s+/g, '').toLowerCase() === 'number,default,custom'
}

export function parseWordsCsv(text: string): ParseResult {
  const rows: WordRow[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  const lines = text.split(/\r?\n/)
  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    if (i === 0 && isHeader(line)) return

    const lineNo = i + 1
    const parts = line.split(',')
    if (parts.length < 2 || parts.length > 3) {
      errors.push(`Line ${lineNo}: expected "number,default[,custom]", got "${line}"`)
      return
    }

    const number = parts[0].trim()
    const def = parts[1].trim()
    const custom = (parts[2] ?? '').trim()

    if (!NUM_RE.test(number)) {
      errors.push(`Line ${lineNo}: invalid number "${parts[0].trim()}" (must be two digits 00–99)`)
      return
    }
    if (!def) {
      errors.push(`Line ${lineNo}: missing word for ${number}`)
      return
    }
    if (seen.has(number)) {
      errors.push(`Line ${lineNo}: duplicate number ${number}`)
      return
    }

    seen.add(number)
    rows.push({ number, def, custom })
  })

  return { rows, errors }
}

export function serializeWordsCsv(rows: WordRow[]): string {
  const body = rows.map(r => `${r.number},${r.def},${r.custom}`).join('\n')
  return `${CSV_HEADER}\n${body}\n`
}
