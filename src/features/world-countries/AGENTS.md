# World Countries feature guide

## Feature purpose

World Countries is one application with three user-directed activities:

- `Memo` teaches new geography and authors memory structures.
- `Drill` is deliberate practice over a user-selected scope.
- `Recite` is complete ordered recall over a learned scope.

`Maintenance` is a separate system-directed review capability. It may later
recommend Drill or Recite, but it is not itself either workflow.

The feature owns canonical Geography data, Geography queries and metadata,
learning mechanics and state, mnemonic content, and SVG map infrastructure. It
does not own application mode registration, shared layout/UI primitives, Pi
persistence, or unrelated feature state.

## Scope and discovery boundaries

- Treat `src/features/world-countries/` as the default discovery and
  modification scope. Start with this guide, `index.ts`, and the relevant
  owner directory.
- Inspect directly imported files outside this directory only when needed for
  a shared type, layout/UI contract, asset handling, or a failing check.
- Do not scan sibling features for examples or general context. Prefer the
  contracts recorded here.
- Keep World Countries persistence changes narrowly scoped to its own keys.
  Never use broad storage cleanup such as `localStorage.clear()` in production
  feature code; Pi and unrelated feature persistence must remain untouched.

## Architecture map

- `WorldCountries.tsx` — application shell and Memo/Drill/Recite navigation;
  it may expose a high-level Maintenance entry but owns no capability rules.
- `data/` — canonical Country, Continent, Subregion, and classification data.
- `geography/` — shared Geography queries, user-authored Subregion metadata,
  effective Country order, and the metadata store.
- `learning/` — answer evaluation, reusable recall/session mechanics, pure
  learning-flow state, durable Subregion learning facts, and their store.
- `maps/` — SVG controller/view, Country ID ↔ SVG ID adapters, map definitions,
  bundled assets, and the experimental `maps/workarea/`.
- `mnemonics/` — Geography mnemonic IDs, story/image storage, and import/export.
- `memo/` — instructional Geography navigation and Subregion learning UI.
- `drill/` — entry point for future deliberate practice.
- `recite/` — entry point for future complete ordered recall.
- `maintenance/` — entry point for future review selection.

There is no World Countries Quiz architecture. Do not recreate `quiz/`, broad
feature-local `domain/` or `persistence/` layers, generic `common/`, or
compatibility wrappers for removed internal paths.

## Dependency direction

```text
                       data
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
        geography              learning
             │                     │
             ├─────────┬───────────┤
             ▼         ▼           ▼
           maps    mnemonics   learning state
             \         |           /
              └────────┼──────────┘
                       ▼
          ┌────────────┼────────────┐
          ▼            ▼            ▼
        Memo         Drill        Recite
                                      ▲
                                      │
                                 Maintenance

                       ▼
                WorldCountries.tsx
```

Higher-level workflows may consume shared capabilities. Shared capabilities
must not depend on workflow implementations. Workflow folders are siblings and
must not import one another's internals.

Pure and impure modules may share a capability owner. For example,
`learning/subregionLearningState.ts` remains pure while
`learning/subregionLearningStore.ts` may use storage APIs.

## Important invariants

- Canonical `Country.id` and `Country.subregionId` are required runtime
  identity. Normal code reads these fields directly; it must not reconstruct
  identity from labels, dataset indexes, fallback slugs, or SVG IDs.
- `CountryId` is Geography identity. SVG IDs are map identifiers. Translation
  belongs in `maps/geographyMapAdapter.ts`; workflows persist `CountryId`.
- `data/` remains authoritative for Country membership and classification.
  User-authored order is `SubregionMetadata.countryOrder`; metadata only
  overrides order and cannot add non-member Countries.
- `learning/countryLearningFlow.ts` owns pure state and transitions.
  `memo/subregion/CountryLearningFlow.tsx` owns Memo UI orchestration.
- `SvgMapController` remains imperative, framework-independent SVG
  infrastructure. It knows about loading, validation, discovery, DOM styles,
  hover, labels, highlights, zoom, listeners, and cleanup—not learning rules.
- `SvgMapView.tsx` is the React adapter around that controller.
- World Countries persistence may reset during structural work. Do not add
  migration code solely to preserve obsolete World Countries state.
- Pi persistence, schemas, backup formats, and storage keys are outside this
  feature and must not be changed.

## Public boundary

Consumers outside this feature import from `@/features/world-countries`.
`index.ts` exports only the `WorldCountries` shell and optional `MapWorkarea`
because those are the current external requirements.

Internal World Countries imports bypass the root barrel and point directly to
the owning capability. Do not export stores, session reducers, Geography
helpers, mnemonic implementations, or map adapters without a demonstrated
external consumer.

## Where changes should go

- Canonical Geography content and identity → `data/`.
- Geography queries or user-specific Subregion metadata → `geography/`.
- Answer evaluation, learning state, recall mechanics, or their stores →
  `learning/`.
- SVG loading/discovery/rendering, map assets, definitions, or ID translation
  → `maps/`.
- Mnemonic target/content behavior → `mnemonics/`.
- Instructional learning UI → `memo/`.
- Future deliberate practice, complete recall, or review selection → the
  corresponding sibling workflow directory.

## Validation

With the host toolchain:

```text
npx vitest run src/features/world-countries
npx tsc -b
npx vite build
```

Without Node/npm, use the Compose-built image and isolated container
dependencies:

```text
docker compose run --rm app sh -c "npx vitest run src/features/world-countries"
docker compose run --rm app sh -c "npx tsc -b && npx vite build"
```

When package manifests change, rebuild once with `docker compose build app`.

## Known traps

- The Geography dataset and SVG assets are separate sources; names and
  coverage are not automatically synchronized.
- `MapWorkarea` intentionally keeps live controller settings out of its load
  effect. Adding them reloads the SVG and clears selections on every toggle.
- `SvgMapController.test.ts` exercises synthetic markup and a real bundled
  asset. Asset moves must preserve SVG contents and update only import paths.
- Memo map and Subregion learning components own temporary React/session state;
  do not move it into a store merely because it is visible in the UI.
