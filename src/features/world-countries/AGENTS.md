# World Countries feature guide

## Feature purpose

World Countries is one application with three user-directed activities:

- `Memo` teaches new geography and authors memory structures.
- `Drill` is deliberate practice over a user-selected scope.
- `Recite` is complete ordered recall over a learned scope.

`Maintenance` is a separate system-directed review capability. It may later
recommend Drill or Recite, but it is not a kind of Recite session.

The feature owns canonical geography data, pure geography rules, mnemonic
content, its own persistence, and SVG map infrastructure. It does not own
application mode registration, shared layout/UI primitives, Pi persistence,
or unrelated feature state.

## Scope and discovery boundaries

- Treat `src/features/world-countries/` as the default discovery and
  modification scope. Start with this guide, `index.ts`, and the relevant
  owner directory.
- Inspect directly imported files outside this directory only when needed for
  a shared type, layout/UI contract, asset handling, or a failing check.
- Do not scan sibling features for examples or general context. Prefer the
  contracts recorded here.
- Keep World Countries persistence changes narrowly scoped to its own keys.
  Never use broad storage cleanup such as `localStorage.clear()` in feature
  code; Pi and unrelated feature persistence must remain untouched.

## Architecture map

- `WorldCountries.tsx` — application shell and Memo/Drill/Recite navigation;
  it may expose a high-level Maintenance entry but owns no domain rules.
- `data/` — canonical Country, Continent, Subregion, and classification data.
- `domain/` — pure Country identity, geography queries, answer matching,
  Subregion metadata reconciliation, and reusable session rules.
- `persistence/` — World Countries storage keys, serialization, reads, writes,
  resets, and durable Subregion learning facts.
- `maps/` — SVG controller/view, Country ID ↔ SVG ID adapters, map definitions,
  bundled map assets, and the experimental `maps/workarea/`.
- `mnemonics/` — geography mnemonic IDs, story/image storage, and import/export.
- `memo/` — instructional geography navigation and Subregion learning flow.
- `drill/` — lightweight entry point for future deliberate practice.
- `recite/` — lightweight entry point for future complete ordered recall.
- `maintenance/` — lightweight entry point for future review selection.

There is no World Countries Quiz architecture. Do not recreate `quiz/`,
generic `common/`, or compatibility wrappers for removed internal paths.

## Dependency direction

```text
data → domain → persistence
             ↘ maps
             ↘ mnemonics

domain / persistence / maps / mnemonics → Memo, Drill, Recite
domain + learning history → Maintenance
all workflows → WorldCountries.tsx
```

`domain` must not depend on React, maps, or persistence. Persistence may use
domain validation and models, but domain never reads localStorage or IndexedDB.
Workflow folders are siblings and must not import one another's internals.
If shared session mechanics grow, extract them into `domain` only when there
is a concrete shared requirement.

## Important invariants

- `CountryId` is geography identity. SVG IDs are map identifiers. Workflows
  persist and exchange `CountryId`; translation to SVG IDs belongs in
  `maps/geographyMapAdapter.ts`.
- `data/` remains authoritative for Country membership and classification.
  User-authored order is `SubregionMetadata.countryOrder`; metadata only
  overrides order and cannot add non-member Countries.
- Geography queries in `domain/geography.ts` are pure. Effective order takes
  metadata as an input; callers read stored metadata through `persistence/`.
- `SvgMapController` remains imperative, framework-independent SVG
  infrastructure. It knows about loading, validation, discovery, DOM styles,
  hover, labels, highlights, zoom, listeners, and cleanup—not learning,
  correctness, mastery, or workflow state.
- `SvgMapView.tsx` is the React adapter around that controller.
- World Countries persistence may be reset during structural work. Do not add
  migration code solely to preserve obsolete World Countries state.
- Pi persistence, schemas, backup formats, and storage keys are outside this
  feature and must not be changed.

## Public boundary

Consumers import from `@/features/world-countries`. The public API is the
`WorldCountries` shell, the optional `MapWorkarea`, canonical data/types, and
small pure domain queries. Internal stores, workflow coordinators, mnemonic
implementations, map controller details, and session helpers stay internal.
`src/app/modes.tsx` is the application composition consumer.

## Where changes should go

- Canonical geography content → `data/`.
- Country identity, geography queries, answer matching, or pure metadata
  reconciliation → `domain/` and its tests.
- World Countries storage or durable learning facts → `persistence/` and its
  tests.
- SVG loading/discovery/rendering, map assets, definitions, or ID translation
  → `maps/` and its tests.
- Mnemonic target/content behavior → `mnemonics/`.
- Instructional learning behavior → `memo/`.
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

- The geography dataset and SVG assets are separate sources; names and
  coverage are not automatically synchronized.
- `MapWorkarea` intentionally keeps live controller settings out of its load
  effect. Adding them reloads the SVG and clears selections on every toggle.
- `SvgMapController.test.ts` exercises synthetic markup and a real bundled
  asset. Asset moves must preserve SVG contents and update only import paths.
- The Memo map and Subregion learning flow own temporary React/session state;
  do not move it into persistence just because it is visible in the UI.
