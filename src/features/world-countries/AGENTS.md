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
map tasks start from `maps/SvgMapController.ts` or the relevant adapter.

Do not recreate removed `quiz/`, broad `domain/` or `persistence/` layers,
generic `common/`, or compatibility wrappers for obsolete internal paths.

## Validation

Follow the risk-proportionate verification policy in the root `AGENTS.md`.

- Feature root: `src/features/world-countries/`.
- Start with the nearest relevant capability or test files in the affected
  subdirectory, such as `today/`, `drill/`, `learning/`, `maps/`,
  `geography/`, or `setup/`.
- Widen to a larger World Countries slice only when the change spans that
  slice or focused evidence is insufficient.
- Use feature-wide tests, typecheck, lint, or build only when the change's
  risk or blast radius materially justifies them.
- Localized UI, styling, keyboard, or interaction changes normally need
  focused tests and code inspection only.
- Follow the root browser/manual verification prohibition. Never start a dev
  server or attempt browser verification unless the user explicitly requested
  it for the current task.

```text
npx vitest run src/features/world-countries
npm run typecheck
```

The commands above are examples for changes whose feature-wide risk justifies
them, not an automatic near-completion gate. Use the equivalent scoped Docker
command from the root policy when Node/npm are unavailable; widen to the full
repository only when the broader integration scope justifies it.

## Known traps

- Country IDs and SVG IDs are different; translation belongs in `maps/`.
- User-authored Country order cannot change canonical membership.
- Asset tests exercise both synthetic markup and bundled SVG contents.
- Temporary workflow state stays local unless durable domain state is required.
- World Countries resets must never clear Pi or unrelated feature persistence.
