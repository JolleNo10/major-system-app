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

Legacy ADRs and archived change records are historical rationale, not normal
task context. If a task explicitly requires one, check
`docs/adr/LEGACY_CLASSIFICATION.md` before loading it.

## Scope and starting points

Normally remain inside `src/features/world-countries/` plus direct dependencies.
Do not scan sibling features for examples.

Start with `index.ts`, `WorldCountries.tsx`, and the owner directory named in
the feature architecture (`today/` for Today orchestration). Persistence tasks start from the defining store;
overview/globe tasks start from `maps/GeographyOverviewMap.tsx` and the
globe geography/renderer adapters; precision, tiny-Country, task-pointer, and
Country-for-Shape tasks start from `learning/CountryLearningMap.tsx` and
`maps/SvgMapController.ts`.

Do not recreate removed `quiz/`, broad `domain/` or `persistence/` layers,
generic `common/`, or compatibility wrappers for obsolete internal paths.

## Validation

Follow the progressive verification policy in the root `AGENTS.md`.

- Feature root: `src/features/world-countries/`.
- During implementation, prefer the nearest capability/subdirectory, such as
  `today/`, `drill/`, `learning/`, `maps/`, `geography/`, or `setup/`.
- Near feature completion for substantial work, run:

```text
npx vitest run src/features/world-countries
npm run typecheck
```

Do not repeatedly run global typecheck or a production `vite build` for normal
feature changes. Use the equivalent scoped Docker command from the root policy
when Node/npm are unavailable; widen to the full repository only at an
integration boundary.

## Known traps

- Country IDs and SVG IDs are different; translation belongs in `maps/`.
- User-authored Country order cannot change canonical membership.
- Asset tests exercise both synthetic markup and bundled SVG contents.
- Temporary workflow state stays local unless durable domain state is required.
- World Countries resets must never clear Pi or unrelated feature persistence.
