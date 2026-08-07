// Single source of truth for how the three PAO roles (Person / Action / Object)
// look everywhere — Encode, Decode, and Deck Memo. Each role has one emoji, one
// label, and one accent color, so a "Person" reads the same way in every drill.
// (Previously the emoji list was duplicated per-file and only Deck Memo tinted
// the roles at all.) Warm → cool triad, all readable on the zinc-950/800 dark base.
import { PAO_FIELDS, type PaoField } from '@/features/cards/pao/paoCards'

export interface PaoRoleMeta {
  label: string
  emoji: string
  text: string    // value text color
  border: string  // accent border for a role-owned container
  bg: string      // subtle background tint
  pill: string    // active-toggle / selected-chip fill
}

export const PAO_ROLE: Record<PaoField, PaoRoleMeta> = {
  person: { label: 'Person', emoji: '👤', text: 'text-amber-300',  border: 'border-amber-500/40',  bg: 'bg-amber-500/10',  pill: 'bg-amber-600' },
  action: { label: 'Action', emoji: '🎬', text: 'text-violet-300', border: 'border-violet-500/40', bg: 'bg-violet-500/10', pill: 'bg-violet-600' },
  object: { label: 'Object', emoji: '📦', text: 'text-cyan-300',   border: 'border-cyan-500/40',   bg: 'bg-cyan-500/10',   pill: 'bg-cyan-600' },
}

// The role at position i within a triple (0 → person, 1 → action, 2 → object).
export const roleByIndex = (i: number): PaoField => PAO_FIELDS[i] ?? 'person'

// Emoji + label, role-tinted. The small header that names a cue/field.
export function RoleTag({ field, className = '' }: { field: PaoField; className?: string }) {
  const m = PAO_ROLE[field]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${className}`}>
      <span aria-hidden>{m.emoji}</span>
      <span className={m.text}>{m.label}</span>
    </span>
  )
}

// Emoji + the role's value in the role color. The shared way to *show* a P/A/O
// word (Deck Memo story line, Encode answer review).
export function RoleValue({ field, value, className = '' }: { field: PaoField; value: string; className?: string }) {
  const m = PAO_ROLE[field]
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span aria-hidden title={m.label}>{m.emoji}</span>
      <span className={`font-semibold ${m.text}`}>{value}</span>
    </span>
  )
}
