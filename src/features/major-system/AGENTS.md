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

```text
npx vitest run src/features/major-system
npx tsc -b
npx vite build
```

Use the Docker fallback from the root `AGENTS.md` when Node/npm are unavailable.

## Known traps

- Number keys remain fixed-width `00`–`99` strings.
- Effective editable data layers shipped, then saved, then trial overrides.
- Change shipped defaults in CSV source, not browser state.
- Pi consumes the public word provider; inspect that consumer before changing
  its contract.
