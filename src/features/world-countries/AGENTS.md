# World Countries task bootstrap

## Required context — load before inspecting implementation

Before inspecting or modifying implementation files in this feature, you MUST
read `docs/architecture/features/WORLD_COUNTRIES.md`.

- Load `docs/architecture/CORE.md` only for a shared learning, mnemonic, UI, or
  storage contract.
- Load `docs/architecture/PERSISTENCE.md` for persistence, stable IDs,
  migration/reset, or backup/import/export.
- Load `docs/architecture/SYSTEM.md` for public exports, app integration,
  ownership, or cross-feature work.

ADRs 0007–0011 are historical rationale, not normal task context.

## Scope and starting points

Normally remain inside `src/features/world-countries/` plus direct dependencies.
Do not scan sibling features for examples.

Start with `index.ts`, `WorldCountries.tsx`, and the owner directory named in
the feature architecture. Persistence tasks start from the defining store;
map tasks start from `maps/SvgMapController.ts` or the relevant adapter.

Do not recreate removed `quiz/`, broad `domain/` or `persistence/` layers,
generic `common/`, or compatibility wrappers for obsolete internal paths.

## Validation

With host Node/npm:

```text
npx vitest run src/features/world-countries
npx tsc -b
npx vite build
```

Without Node/npm, use the Compose commands in the root `AGENTS.md`.

## Known traps

- Country IDs and SVG IDs are different; translation belongs in `maps/`.
- User-authored Country order cannot change canonical membership.
- `MapWorkarea` keeps live controller settings out of its SVG load effect so
  toggles do not reload the asset and clear selection.
- Asset tests exercise both synthetic markup and bundled SVG contents.
- Temporary workflow state stays local unless durable domain state is required.
- World Countries resets must never clear Pi or unrelated feature persistence.
