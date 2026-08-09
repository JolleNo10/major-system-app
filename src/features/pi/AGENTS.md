# Pi task bootstrap

## Required context — load before inspecting implementation

Before inspecting or modifying implementation files in this feature, you MUST
read `docs/architecture/features/PI.md`.

- Load `docs/architecture/CORE.md` only for shared learning, mnemonic, scoring,
  storage, or UI behavior.
- Load `docs/architecture/PERSISTENCE.md` for keys, IndexedDB, migration/reset,
  stories, or backup/import/export.
- Load `docs/architecture/SYSTEM.md` for public exports, Major System or app
  integration, ownership, or cross-feature work.

ADRs are historical rationale, not normal task context.

## Scope and starting points

Normally remain inside `src/features/pi/` plus direct contracts. Do not inspect
Cards or World Countries for examples.

Start with `index.ts`, `PiDrill.tsx`, and the requested workflow directory:
`memo/`, `recite/`, `maintain/`, or `shared/`. Inspect app settings/layout,
Major System words, or core scoring/storage only when the task touches that
contract.

## Validation

With host Node/npm:

```text
npx vitest run src/features/pi
npx tsc -b
npx vite build
```

Without Node/npm, use the Compose commands in the root `AGENTS.md`.

## Known traps

- Segments are zero-based; pair positions/anchors and displayed digits are
  one-based. A segment is always 10 pairs/20 digits.
- Only whole aligned segments create segment tries, flawless milestones, or
  maintenance rescheduling.
- Anchor runs are isolated from normal Pi attempts, sessions, and progress.
- `PiNumberQuiz` completion is guarded against double recording.
- IndexedDB has one connection/version owner; story adapters reuse it.
- Story object URLs must be revoked; authored write errors remain visible.
- Async segment status hooks use an empty array as the loading state.
