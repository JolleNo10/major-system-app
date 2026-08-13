# Major System task bootstrap

## Required context — load before inspecting implementation

Before inspecting or modifying implementation files in this feature, you MUST
read `docs/architecture/features/MAJOR_SYSTEM.md`.

- Load `docs/architecture/CORE.md` for shared scoring, scheduling, UI, matching,
  CSV, or layered-store changes.
- Load `docs/architecture/PERSISTENCE.md` for word/sound-key state, attempts,
  migrations, resets, or import/export.
- Load `docs/architecture/SYSTEM.md` for public exports, app modes/providers, or
  changes affecting Pi or Cards consumers.

## Scope and starting points

Normally remain inside `src/features/major-system/` plus direct contracts.
Start from `index.ts`, the requested drill, `WordNumberDrill.tsx` for
Encode/Decode, or the relevant words/sound-key context and data file.

Do not inspect Pi or Cards unless changing the public word-provider contract.

## Validation

Follow the progressive verification policy in the root `AGENTS.md`.

- Feature root: `src/features/major-system/`.
- During implementation, prefer the owning drill or capability/subdirectory,
  such as `maintain/`, `memo/`, `recite/`, or `shared/`.
- Near feature completion for substantial work, run:

```text
npx vitest run src/features/major-system
npm run typecheck
```

Do not repeatedly run global typecheck or a production `vite build` for normal
feature changes. Use the equivalent scoped Docker command from the root policy
when Node/npm are unavailable; widen to the full repository only at an
integration boundary.

## Known traps

- Number keys remain fixed-width `00`–`99` strings.
- Effective editable data layers shipped, then saved, then trial overrides.
- Change shipped defaults in CSV source, not browser state.
- Pi consumes the public word provider; inspect that consumer before changing
  its contract.
