# ADR 0002 — Package-by-feature `src/` layout + `@/` alias

- **Status:** Accepted
- **Date:** 2026-08-06

## Context

`src/` was organized **by technical kind** — `components/`, `data/`, `utils/`,
`hooks/`, `context/`. Every feature was smeared across all five folders:
understanding "everything Pi" or "everything PAO" meant jumping between five
directories and guessing which `util` or `data` module belonged to which drill.

Two problems compounded:

- **No boundary.** Nothing distinguished a feature-local helper (used by one
  drill) from a genuinely shared one (used everywhere). `utils/` and `data/`
  were grab-bags; any module could import any other, so coupling grew silently.
- **High-churn moves.** Relative imports (`../../utils/quiz`) hard-coded each
  importer's location, so moving a file rewrote every path that pointed at it —
  making exactly the reorganization we needed expensive and risky.

## Decision

Reorganize `src/` **by domain**, introduce a path alias, and give each feature a
public barrel.

| Aspect | Decision |
|---|---|
| **Shape** | `app/` (composition shell) + `core/{scoring,ui}/` (shared) + `features/{major-system,pi,cards,pao}/` (one folder per domain, flat inside). |
| **Alias** | `@/*` → `src/*` (tsconfig + vite + vitest). Every import is location-independent (`@/core/scoring/quiz`), so future moves rewrite only the pointed-at string, not the importers. |
| **Core split** | `core/scoring/` = the spaced-repetition/latency engine; `core/ui/` = answer inputs & primitives; shared infra (`types`, `storage`, `createWordStore`, `wordsCsv`, `answerMatch`, `cards`) at `core/` root. |
| **Coupling audit** | Placement of each former `utils`/`data` module was decided by its real consumers: single-feature helpers moved **into** the feature; multi-consumer ones (`cards.ts`, `RankRangeSelector`, `WordListGrid`, `types.ts`) went to `core/`. `types.ts` sits in `core` — not `app` — because `core/scoring` consumes it, and `core` must stay self-contained. |
| **Feature barrels** | Each feature has an `index.ts` re-exporting its **public interface** (drill entry-points, providers/hooks, the few data/stats symbols the shell needs). Outside code imports from `@/features/<name>`; deep paths are internal. |
| **Layering rule** | `core/` → self only. `features/*` → `core/`. `app/` → anything. |

### Kept feature→feature edges

The barrels make cross-feature dependencies explicit rather than forbidden.
Three are intentional and preserved:

- `cards → major-system` and `pi → major-system` — both reuse the Words store.
- `pao → cards` — the PAO deck's "🎭 From Themed Deck" seeding.

The 52-card deck lives in `core/cards.ts` (not `cards/`) specifically to avoid a
`pao → cards` edge that would exist *only* for the deck definition.

### Execution (recorded so the pattern is repeatable)

The move was made safe by **absolutizing before moving**: (1) add the alias;
(2) codemod every relative import to its `@/`-absolute form based on current
location; (3) `git mv` files (history preserved); (4) rewrite each moved
module's specifier. Because imports were already absolute, step 4 changed only
the pointed-at string — importer locations were irrelevant.

## Consequences

- **A feature is one folder.** "Everything Pi" is `features/pi/`; its internals
  can be renamed or restructured without touching any consumer, because the only
  contractual surface is `index.ts`.
- **The boundary is enforceable.** No file outside a feature may reach a deep
  path; a grep proves it. Adding to a feature's public surface is a deliberate
  one-line edit to its barrel.
- **Cheap future moves.** With `@/` aliases, relocating a module rewrites only
  its own specifier string, not every importer.
- **Cost:** a large one-time mechanical move (~120 files) + one merge to
  integrate concurrent work. Documentation (`CLAUDE.md` module map + this
  context) had to be rewritten to the new tree.
- **Constraint to preserve:** keep the layering direction (`core` depends on
  nothing; `features` on `core`; `app` on anything) and route all cross-feature
  and app→feature imports through barrels — never deep paths.

## Confirmation

Implemented and verified against the repository on 2026-08-09.
