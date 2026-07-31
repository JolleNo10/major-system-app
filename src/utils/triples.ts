// Group a list into consecutive chunks of `size` (default 3, for PAO's
// Person/Action/Object triples). The final chunk keeps whatever remains, so a
// deck whose length isn't a multiple of 3 ends in a partial group of 1 or 2.
export function groupTriples<T>(items: T[], size = 3): T[][] {
  const groups: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size))
  }
  return groups
}

// The PAO role a card plays at position `i` within its triple: 0 → person,
// 1 → action, 2 → object.
export const TRIPLE_ROLES = ['person', 'action', 'object'] as const
export type TripleRole = typeof TRIPLE_ROLES[number]

export function roleAt(indexInTriple: number): TripleRole {
  return TRIPLE_ROLES[indexInTriple] ?? 'person'
}
