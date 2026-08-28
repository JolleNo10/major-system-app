# Change Spec 0041 - Multi-continent World Countries Drill scope

- **Status:** Implemented
- **Date:** 2026-08-28
- **Issue:** None.
- **Related ADRs:** None. This change stays inside the existing World Countries Drill ownership, geography-ordering seams, and feature-owned Drill preference key; it does not introduce a new durable cross-feature boundary or dependency direction.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`, `docs/architecture/PERSISTENCE.md`
- **Repository / feature scope:** `JolleNo10/major-system-app` — World Countries / Countries only

## Goal

Allow one World Countries Drill setup to include geography from multiple Continents at the same time, with fast full-Continent selection and continued support for partial Subregion selection.

The canonical authored Drill geography scope becomes a World-wide set of selected stable `SubregionId` values. Opening a Continent remains navigation state and must no longer define or truncate the Drill scope.

A full Continent is not a separate scope type. It is a convenience action that selects all currently defined active Subregions belonging to that Continent.

## User-visible behavior

### World setup

At World level, every Continent exposes two independent actions:

1. **Select / deselect the Continent for the current geography scope.**
2. **Open the Continent** to inspect or change its individual Subregions.

The two actions must not be conflated.

Example:

```text
Geography

[✓] Europe              4/4 Subregions   >
[−] Asia                2/5 Subregions   >
[ ] Africa              0/5 Subregions   >
[✓] Oceania             4/4 Subregions   >
[ ] North America       0/4 Subregions   >
[ ] South America       0/1 Subregion    >

3 Continents · 10 Subregions · 79 Countries selected

Select all World   Clear
```

The exact visual treatment may follow the current UI system, but the semantic states are required:

- unchecked: no Subregions in that Continent are selected;
- mixed / indeterminate: some but not all Subregions in that Continent are selected;
- checked: every currently available Subregion in that Continent is selected.

Selecting an unchecked or partially selected Continent selects **all** of its current Subregions while preserving selections in every other Continent.

Selecting a fully selected Continent clears only that Continent's Subregions while preserving selections in every other Continent.

`Select all World` selects all current active Subregions across all Continents.

`Clear` clears the Geography scope.

### Continent setup

Opening a Continent retains the complete World-wide Geography selection.

The existing Continent setup continues to show and toggle the viewed Continent's Subregions. Those toggles update the same World-wide selection:

- selecting a Subregion does not clear selections in other Continents;
- `Entire Continent` selects all Subregions in the viewed Continent without changing other Continents;
- clearing `Entire Continent` removes only the viewed Continent's Subregions;
- returning to `World` retains all selected geography.

The Continent rail and map continue to expose the selected state of the viewed Continent's Subregions.

### Navigation versus selection

Opening a Continent from the World rail or World map is navigation only.

Navigation must never implicitly:

- select that Continent;
- clear another Continent;
- replace the current Geography scope;
- persist a different Drill scope.

World-map Country activation retains its current navigation behavior. This change does not require the World map fill palette to represent selected Continents; the World rail and scope summary are the authoritative selection surfaces.

### Starting an activity

A geography-backed Drill session may start from World level or Continent level whenever at least one Subregion is selected.

The launch snapshot contains the Countries from **all selected Subregions**, regardless of which Continent is currently open.

Examples:

- Europe + Asia -> one Drill containing the active Countries from both Continents.
- Entire Europe + Eastern Asia -> one Drill containing all Europe Countries plus Countries from Eastern Asia.
- Europe selected, then user opens Oceania without changing scope -> starting still drills Europe.
- Europe + Oceania selected, then one Oceania Subregion is cleared -> Europe remains fully selected and the remaining Oceania Subregions remain selected.

The World-level setup displays a compact derived scope summary with:

- number of Continents containing at least one selected Subregion;
- selected Subregion count;
- selected active Country count.

### Ordered and random session behavior

For `ordered` Drill order, selected Countries are resolved in the existing effective geography order:

```text
World Continent order
  -> effective Subregion order within each Continent
    -> effective Country order within each selected Subregion
```

Only selected Subregions contribute Countries.

For `random`, membership is the same World-wide selected Country population; only the session ordering behavior changes according to the existing Drill random-order contract.

### Drill, Practice, and Learn & Practise

The Geography selection is one setup scope, not separate state per purpose.

All existing geography-backed activities launched from Drill setup consume the selected World-wide Subregion set:

- recorded Drill;
- non-recording Practice;
- Learn Countries;
- Learn Capitals.

For multi-Subregion Learning that crosses Continent boundaries, selected Subregions run sequentially in effective World -> Continent -> Subregion order. Each Learning Subregion must receive its own actual Continent context rather than a stale setup/navigation Continent.

Proficiency remains a separate, mutually exclusive scope source. Its current Continent-scoped semantics are unchanged unless a separate change explicitly broadens proficiency to World scope.

## Scope

### 1. Make Drill Geography selection World-wide

Refactor the Geography selection contract so its canonical membership is independent of the currently opened Continent.

Target semantic shape:

```ts
interface WorldCountriesDrillSelection {
  subregionIds: readonly SubregionId[]
}
```

Equivalent naming is acceptable, but the selection must not require a single `continent` field to validate or interpret the selected Subregion set.

The selection stores stable Subregion IDs, never flattened Country IDs and never display labels.

Normalization must:

- keep only canonical/current Subregion IDs represented by the active Country population;
- support selected Subregions from more than one Continent;
- preserve effective canonical ordering when returning normalized selection;
- avoid silently truncating the selection to one Continent.

### 2. Keep setup Continent as navigation state

`WorldCountriesDrill` already owns transient setup navigation through `setupContinent`.

Use that or an equivalent transient navigation seam as the sole answer to:

> Which Continent is currently open in setup?

Do not persist this navigation state merely because the old persisted selection contained a `continent`.

The setup level remains:

```text
setupContinent === null -> World
setupContinent !== null -> that Continent
```

Opening/closing this navigation context must not mutate Geography membership.

### 3. Add full-Continent selection helpers over the global selection

Provide Drill-owned pure helpers that can derive and toggle a Continent's state against a global selected-Subregion set.

Required semantics include equivalents of:

```ts
getContinentSelectionState(selection, continent, entries)
// 'none' | 'partial' | 'all'

toggleEntireContinentSelection(selection, continent, entries)

withAllDrillSubregionsForContinent(selection, continent, entries)
withoutDrillSubregionsForContinent(selection, continent, entries)
```

Exact names may vary.

A Continent toggle modifies only Subregions belonging to that Continent.

Subregion toggling must likewise accept a canonical `SubregionId` without relying on a single selected Continent stored inside the selection.

### 4. Resolve selected Countries across the World hierarchy

Update the Drill Geography query seam so it derives the selected Country population across every selected Continent.

The ordered resolver must reuse existing `geography/` effective-order capabilities and user-authored metadata.

Do not:

- sort Continents alphabetically when an effective World order exists;
- flatten Countries into persisted preferences;
- duplicate canonical membership or ordering rules inside React components;
- infer Continent or Subregion identity from array positions.

A pure selection resolver should remain the authoritative seam used by session launch and setup count derivation.

### 5. World-level multi-Continent controls

Update World-level Drill Geography UI to expose independent selection and navigation.

For each Continent, present:

- semantic tri-state selection state;
- current selected/total Subregion count;
- navigation into that Continent.

The selection control and navigation control must be separate accessible interactive elements. Do not nest one button/checkbox inside another interactive `GeographyHierarchyRow` button.

Reusing or extending the shared row is acceptable only if existing callers remain valid and the resulting DOM has correct interactive semantics.

Keyboard and assistive-technology behavior must expose checked / mixed / unchecked state. A native checkbox with an indeterminate state or an equivalent `aria-checked="mixed"` control is acceptable.

### 6. World-level scope summary and start state

Derive the scope summary from the normalized active selection.

Required summary values:

```text
selected Continent count = Continents containing >= 1 selected Subregion
selected Subregion count = normalized selected Subregions
selected Country count   = active Countries belonging to selected Subregions
```

World-level Drill start is enabled when the selected Geography scope resolves to at least one active Country.

An empty Geography selection keeps Start disabled and presents the existing style of concise selection guidance.

Starting from World and starting from a Continent with the same selected Geography must resolve the same Country membership.

### 7. Preserve Geography/proficiency mutual exclusion

The existing setup treats Geography and proficiency as alternative scope sources.

Preserve that rule.

When the user selects or changes Geography:

- clear the current proficiency selection.

When the user selects a proficiency scope:

- clear the entire World-wide Geography selection, not only the currently viewed Continent.

Proficiency continues to derive from the currently viewed Continent according to the existing contract. Do not broaden proficiency to multi-Continent selection in this change.

### 8. Multi-Continent Learning context

The existing Learn Countries / Learn Capitals path must not assume that every selected Subregion belongs to one setup Continent.

When Geography spans multiple Continents:

- order selected Subregions by effective World -> Continent -> Subregion order;
- derive the active Learning Continent from the active Learning Subregion / Countries;
- mount each Country/Capital Learning flow with the correct Continent;
- preserve existing per-Subregion Learning milestone rules;
- preserve `New items per set`, Country ordering, mnemonics, map behavior, and staged Learning semantics.

Completing one Subregion advances to the next selected Subregion even when that next Subregion belongs to another Continent.

After the full multi-Continent Learning run completes, returning to World-level Drill setup is acceptable and preferred over inventing a persisted "last Learning Continent" contract.

### 9. Session snapshots and results

An active Drill/Practice session snapshots the resolved selected Country membership at launch, as today.

Changing setup navigation later must not affect an already active session.

Adapt session selection/context consumers so they do not require one Continent when the session spans multiple Continents.

Where UI needs a scope label:

- one selected Continent may use its Continent label;
- multiple selected Continents should use a concise World/multi-Continent label;
- do not arbitrarily report the navigation Continent as the session's geographic scope.

Retry-failed behavior continues to use the original session Country IDs and remains transient.

### 10. Persist the global setup selection and read legacy preferences

Keep ownership in:

`src/features/world-countries/drill/drillPreferences.ts`

Keep the existing localStorage key:

`world-countries-drill-preferences`

Newly saved preferences contain setup state equivalent to:

```ts
{
  subregionIds: SubregionId[]
  mode: WorldCountriesDrillMode
  order: WorldCountriesDrillOrder
}
```

Do not persist:

- the currently opened setup Continent;
- flattened Country IDs;
- derived Continent selection state;
- scope counts.

Backward compatibility is required for the existing stored shape:

```ts
{
  continent: Continent
  subregionIds: SubregionId[]
  mode: WorldCountriesDrillMode
  order: WorldCountriesDrillOrder
}
```

On read, preserve the legacy record's valid selected Subregions as the new World-wide selection.

Do not reset Drill preferences merely because the schema changes.

An explicit schema version may be added if useful, but do not introduce a second storage key or a broad migration framework for this small feature-owned preference.

### 11. Documentation correction

Update current-state documentation with the implemented behavior.

`docs/architecture/features/WORLD_COUNTRIES.md` must state that:

- Drill Geography selection is a World-wide stable Subregion-ID set;
- `setupContinent` / equivalent is transient navigation, not scope membership;
- full-Continent selection is derived from Subregion membership;
- geography-backed Drill/Practice/Learning may span multiple Continents;
- proficiency remains an alternative Continent-scoped scope source.

`docs/architecture/PERSISTENCE.md` must no longer state that Drill preferences contain one Continent. Document the new setup preference shape and legacy-read compatibility at the appropriate current-state level.

Do not rewrite historical Change Specs.

## Interaction and states

### World Continent selection state

For each Continent with `N` current active Subregions:

```text
0 selected     -> unchecked
1..N-1         -> mixed
N selected     -> checked
```

A Continent with no current active Subregions should not become a selectable empty scope. Preserve existing active-population filtering behavior.

### Selection while navigating

Example:

1. At World, select all Europe.
2. Select all Asia.
3. Open Asia.
4. Deselect Western Asia.
5. Return to World.

Expected result:

- Europe remains fully selected.
- Asia is mixed/partial.
- World summary reflects the union.
- Drill Start uses that union.

### Active population changes

If Settings changes which World Countries entity groups are active, normalize persisted/current selected Subregion IDs against the resulting active population.

Selection must not create Countries that are outside the active population.

Do not delete or modify recall attempts, Learning milestones, geography metadata, or unrelated settings because a selected scope shrinks.

### Empty selection

With no selected Geography and no proficiency scope:

- Start is disabled;
- scope summary reports zero selected;
- concise guidance asks the user to select Geography.

### Accessibility

Continent selection state must not depend on color alone.

The user must be able to:

- focus the Continent selection action;
- determine none/partial/all state;
- toggle it from the keyboard;
- separately focus/activate navigation into the Continent.

The World scope summary must be textual.

## Architecture constraints

- Follow `src/features/world-countries/AGENTS.md`.
- Follow `docs/architecture/features/WORLD_COUNTRIES.md`.
- Follow `docs/architecture/PERSISTENCE.md` for the preference-shape change.
- Keep work inside World Countries plus direct existing dependencies genuinely required by the change.
- `drill/` remains the owner of Drill selection, preferences, setup orchestration, session launch, and Geography/proficiency exclusivity.
- `geography/` remains the owner of effective World -> Continent -> Subregion -> Country ordering.
- Canonical identity and membership remain in `data/`.
- React setup components must not become the canonical geography resolver.
- Maps remain workflow-neutral; World map activation remains navigation and Continent map activation continues to report geography clicks to its caller.
- Learning flows must not import Drill internals merely to determine canonical geography. Pass resolved navigation/context through existing flow inputs or derive it through geography/data seams.
- Do not persist flattened Country membership.
- Do not persist derived Continent checked/mixed state.
- Do not add a new cross-feature store.
- Do not change atomic Drill evidence, mastery/proficiency derivation, scoring, retry semantics, Country IDs, Subregion IDs, or user-authored geography order.
- Do not broaden proficiency scope to multiple Continents in this change.

No new ADR is required. The change corrects Drill's scope representation inside ownership boundaries that are already documented.

## Existing capabilities to reuse

- `src/features/world-countries/drill/drillSelection.ts`
  - Existing owner of Drill Geography membership derivation and full-Continent/Subregion toggle behavior. Refactor this seam from one-Continent normalization to World-wide Subregion normalization rather than creating a parallel selector.
- `src/features/world-countries/drill/drillPreferences.ts`
  - Existing owner of the feature-local setup preference key and backward-compatible preference read/write behavior.
- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
  - Existing setup navigation owner (`setupContinent`), purpose/session coordinator, Learning run coordinator, and session snapshot boundary.
- `src/features/world-countries/drill/DrillSetup.tsx`
  - Existing World/Continent setup composition, Geography/proficiency exclusivity, progress/readiness presentation, and map routing.
- `src/features/world-countries/drill/DrillSetupRails.tsx`
  - Existing World and Continent Geography rails and activity start gating.
- `src/features/world-countries/drill/drillSessionLaunch.ts`
  - Existing pure launch resolver and Country membership snapshot boundary.
- `src/features/world-countries/geography/queries.ts`
  - Existing active-population and effective hierarchy-order queries.
- `src/features/world-countries/geography/worldMetadataStore.ts`
  - Existing effective World Continent ordering metadata.
- `src/features/world-countries/geography/continentMetadataStore.ts`
  - Existing per-Continent Subregion ordering metadata.
- `src/features/world-countries/geography/subregionMetadataStore.ts`
  - Existing per-Subregion Country ordering metadata.
- `src/features/world-countries/ui/GeographyHierarchyRow.tsx`
  - Existing map-linked hierarchy row. Reuse only if it can support separate valid selection/navigation semantics without nested interactive controls.

## Edge cases

- Legacy preferences containing a single Continent and no selected Subregions load as an empty global Geography selection with mode/order preserved.
- Invalid/stale Subregion IDs in stored preferences are ignored without discarding valid IDs.
- Selecting a partially selected Continent selects all of it rather than clearing the partial selection.
- Clearing a fully selected Continent never clears another Continent.
- A selected Subregion that becomes empty under the active Country population must not contribute phantom Countries or enable Start by itself.
- Effective ordered resolution remains deterministic even when selected Subregions are interleaved across several Continents.
- Random mode changes order, not membership.
- Opening a Continent after a session starts must not mutate the session snapshot.
- Retry Failed Countries after a multi-Continent Drill uses only failed Countries from that completed session.
- Proficiency selection clears all Geography selections and Geography selection clears proficiency.
- Multi-Continent Learning advances across Continent boundaries with correct map/flow Continent context and without writing cross-Subregion completion state.

## Out of scope

- World-wide or multi-Continent proficiency filters.
- Selecting arbitrary individual Countries directly from Drill setup.
- New saved named scope presets such as "Europe + Asia".
- Persisting setup navigation / last-opened Continent.
- Changing World Countries canonical geography.
- Changing World/Continent/Subregion/Country authoring semantics.
- Changing Drill modes, answer handling, scoring, proficiency thresholds, retry rules, or progress colors.
- Adding selection colors to the World overview map.
- Changes to Today or Recite setup selection models.
- Changes outside World Countries unless required by an existing direct shared UI dependency.

## Acceptance criteria

- [x] At World setup, the user can fully select two or more Continents without the later selection replacing the earlier one.
- [x] Each World Continent exposes none / partial / all selection state derived from selected Subregions.
- [x] Toggling a Continent from none or partial selects all of its current Subregions and preserves all other Continents.
- [x] Toggling a fully selected Continent clears only that Continent's Subregions.
- [x] World-level selection and navigation are separate accessible actions with no nested interactive-control violation.
- [x] Opening a Continent from the World rail or map does not change the Geography selection.
- [x] Subregion toggles and `Entire Continent` on Continent setup update the same World-wide selection and preserve other Continents.
- [x] Returning from Continent to World preserves all selections.
- [x] `Select all World` selects all active Subregions and `Clear` clears the Geography scope.
- [x] World setup shows accurate selected Continent, Subregion, and active Country counts.
- [x] A Geography-backed activity can start from World level when at least one active Country resolves from the selection.
- [x] Starting from World and starting while a Continent is open produce identical Country membership for the same selected Subregions.
- [x] An ordered multi-Continent Drill follows effective World -> Continent -> Subregion -> Country order.
- [x] Random multi-Continent Drill uses the same selected Country membership as ordered mode before randomization.
- [x] A session spanning Europe + Asia includes active Countries from both selected Continents and excludes unselected Subregions.
- [x] Geography/proficiency mutual exclusion still works; choosing proficiency clears the complete World-wide Geography selection.
- [x] Geography selection changes clear proficiency selection.
- [x] Learn Countries and Learn Capitals can traverse selected Subregions across Continent boundaries in effective World order with the correct Continent context for each active Subregion.
- [x] Existing whole-Subregion Learning milestone semantics remain unchanged for multi-Continent Learning runs.
- [x] The existing Drill preference key is retained.
- [x] Newly saved Drill preferences persist stable selected Subregion IDs plus mode/order, but not navigation Continent or flattened Country IDs.
- [x] Existing legacy preferences containing one `continent` load without losing their valid selected Subregions, mode, or order.
- [x] Invalid/stale stored Subregion IDs are ignored without resetting the complete preference record.
- [x] Active Country population filtering still prevents excluded Countries from entering the selected session.
- [x] Retry Failed Countries continues to operate on the completed session snapshot across multi-Continent sessions.
- [x] Existing single-Continent Drill setup and launch behavior remains valid as a subset of the new model.
- [x] Existing World/Continent order authoring remains functional.
- [x] World overview progress/readiness map colors are not repurposed as selection-state colors.
- [x] `docs/architecture/features/WORLD_COUNTRIES.md` reflects World-wide Drill Geography selection and transient Continent navigation.
- [x] `docs/architecture/PERSISTENCE.md` reflects the new Drill preference shape and legacy-read behavior.
- [x] Focused and feature-wide tests pass without weakening unrelated assertions.

## Source anchors

- `src/features/world-countries/AGENTS.md`
- `src/features/world-countries/drill/drillSelection.ts`
- `src/features/world-countries/drill/drillSelection.test.ts`
- `src/features/world-countries/drill/drillPreferences.ts`
- `src/features/world-countries/drill/drillPreferences.test.ts`
- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
- `src/features/world-countries/drill/DrillSetup.tsx`
- `src/features/world-countries/drill/DrillSetupRails.tsx`
- `src/features/world-countries/drill/DrillSetup.test.tsx`
- `src/features/world-countries/drill/drillSessionLaunch.ts`
- `src/features/world-countries/drill/drillSessionLaunch.test.ts`
- `src/features/world-countries/geography/queries.ts`
- `src/features/world-countries/geography/worldMetadataStore.ts`
- `src/features/world-countries/geography/continentMetadataStore.ts`
- `src/features/world-countries/geography/subregionMetadataStore.ts`
- `src/features/world-countries/ui/GeographyHierarchyRow.tsx`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/architecture/PERSISTENCE.md`

## Documentation impact

Update:

- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/architecture/PERSISTENCE.md`

No ADR is required unless implementation discovers a genuinely new durable ownership, persistence-system, public API, or dependency-direction decision not covered by current architecture.

Do not rewrite historical Change Specs.

## Verification

Complete this section when setting the status to `Implemented`.

- Implemented and verified on 2026-08-28.
- Evidence: focused Drill selection, preferences, setup, session-launch,
  session, results, and coordinator tests pass; the coordinator coverage
  includes navigation-only setup and Learning across Europe and Asia.
- Verification commands:
  - `npx.cmd vitest run src/features/world-countries/drill/drillSelection.test.ts src/features/world-countries/drill/drillPreferences.test.ts src/features/world-countries/drill/drillSessionLaunch.test.ts src/features/world-countries/drill/DrillSetup.test.tsx src/features/world-countries/drill/WorldCountriesDrill.test.tsx src/features/world-countries/drill/DrillSession.test.tsx src/features/world-countries/drill/DrillResults.test.tsx` — passed (7 files, 71 tests).
  - `npx.cmd vitest run src/features/world-countries` — passed (100 files, 500 tests).
  - `npm.cmd run typecheck` — passed.
  - `git diff --check` — passed; only line-ending normalization warnings were reported.
- `repowise update` — already up to date.
- `repowise health` — Healthy; CountryLearningFlow.tsx 4.4 / CCN 19 / Nest 2 / NLOC 247 and CapitalLearningFlow.tsx 4.4 / CCN 16 / Nest 2 / NLOC 235.
- Manual check: the World setup composition was verified through the focused
  setup tests for separate keyboard-accessible selection/navigation controls,
  unchecked/mixed/checked `aria-checked` states, World summary counts, and
  World-level Start enablement. No separate browser session was required.
