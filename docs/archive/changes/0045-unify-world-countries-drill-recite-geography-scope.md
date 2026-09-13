# Change Spec 0045 - Unify World Countries Drill and Recite geography scope

- **Status:** Implemented
- **Date:** 2026-08-29
- **Issue:** None.
- **Related ADRs:** None. This change reuses the existing World Countries geography, UI, Drill, and Recite dependency directions; it does not introduce a new cross-feature boundary or persistence model.
- **Related changes:** Change Spec 0041 established World-wide multi-Continent Geography selection for Drill. This change generalizes that reusable scope behavior and applies it to Recite.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`
- **Repository / feature scope:** `JolleNo10/major-system-app` — World Countries / Countries only

## Goal

Give Recite the same World-wide multi-Continent Geography scope capability already available in Drill, while removing unnecessary duplication between the two workflows.

Drill and Recite must share one feature-local model for selecting Subregions across the World, resolving the selected Country population in effective geography order, deriving Continent selection state and counts, and presenting the common Geography selection rail/copy.

Workflow-specific behavior remains separate: Drill keeps Drill/Practice/Learning/proficiency/persistence behavior, while Recite keeps ordered recall, transient setup state, map assistance, retry/reveal behavior, and Recite progress.

## User-visible behavior

### Shared World Geography selection

Drill and Recite use the same Geography selection semantics and the same core selection copy.

At World level, every Continent exposes:

1. a selection action with `none`, `partial`, or `all` state; and
2. a separate navigation action that opens the Continent.

Opening a Continent is navigation only. It never changes the selected Geography scope.

Canonical World-level copy:

> Select Subregions across the World, or open a Continent to inspect its map.

The World rail includes the shared textual summary:

```text
2 Continents · 7 Subregions · 34 Countries selected
```

and the shared actions:

```text
Select all World    Clear
```

Selection semantics:

- selecting an unchecked or partially selected Continent selects all active Subregions in that Continent while preserving every other Continent;
- selecting a fully selected Continent clears only that Continent;
- `Select all World` selects every active Subregion across every Continent;
- `Clear` clears the whole Geography scope;
- partial state is represented semantically, not by color alone.

### Shared Continent Geography selection

Opening a Continent preserves the complete World-wide scope.

The viewed Continent shows its Subregions and their selected state. Toggling one Subregion affects only that Subregion and preserves selections in other Continents.

Canonical Continent-level copy:

> Select Subregions from the rail or map.

The shared full-Continent action is:

```text
Entire Continent
All currently active Subregions
```

The shared empty-scope guidance is:

> Select at least one Subregion to start.

Returning to World does not change selection.

### Drill behavior

Existing Drill behavior established by Change Spec 0041 remains unchanged.

This change may refactor Drill to consume the new shared Geography scope model and shared rail presentation, but must preserve:

- persisted Drill preferences;
- World-wide multi-Continent Drill scope;
- Drill and Practice launch behavior;
- Learn Countries / Learn Capitals multi-Continent progression;
- Geography/proficiency mutual exclusion;
- Drill order editing;
- proficiency scope;
- Drill evidence, results, retries, and scoring;
- existing map/status/readiness presentation.

The shared selector must not force Recite to expose Drill-only order editing or proficiency controls.

### Recite setup supports multiple Continents

Recite setup uses one transient World-wide selected Subregion set.

Example:

1. Select all Europe.
2. Open Asia.
3. Select Eastern Asia and South-Eastern Asia.
4. Return to World.
5. Europe remains fully selected and Asia is partial.
6. Start Recite.
7. One Recite session contains the selected Countries from both Continents.

Recite may start from either World or Continent setup when:

- the normalized World-wide scope resolves to at least one active Country; and
- the currently mounted setup map is ready under the existing map-readiness contract.

Starting from a Continent must not restrict the session to that Continent.

Recite setup selection remains transient. It must not be added to localStorage or another persistence store.

### Recite ordering

A Recite run snapshots the complete selected Country population at launch.

The ordered Country sequence is always resolved through the existing effective geography order:

```text
effective World Continent order
  -> effective Subregion order in each selected Continent
    -> effective Country order in each selected Subregion
```

Selection click order must not determine recall order.

The Recite session continues to use its existing mode-specific prompt sequencing after the Country snapshot is built:

- Countries;
- Countries + Capitals;
- Countries from Capitals.

### Recite active map follows the current Country

A multi-Continent Recite run is one continuous session.

During the active run, the displayed Continent map follows the current prompt Country:

```text
current Country in Europe -> Europe map
next Country in Asia      -> Asia map
```

Crossing a Continent boundary must not create a new Recite session, reset outcomes, reset progress, or require user confirmation.

`Visible` and `Reveal as you go` continue to use the existing Recite semantics. Hidden/resolved/highlighted Country presentation is derived for the currently displayed Continent from the one World-wide run snapshot.

For a one-Continent Recite scope, existing Continent map behavior remains unchanged.

### Recite active Geography rail

During an active Recite session the Geography rail is read-only.

It shows the selected scope grouped by Continent in effective World order, with selected Subregions under each Continent in effective Subregion order.

The Continent containing the current prompt Country is visually and semantically emphasized so the rail follows the same context as the map.

The rail must not expose setup toggles while the run is active.

It must continue to expose the existing `Back to setup` action.

### Scope labels and completion

A selected scope contained entirely within one Continent may use that Continent name as its concise scope label.

A scope spanning two or more Continents uses `World` as the concise scope label. Do not report the setup/navigation Continent or only the current prompt Continent as the total session scope.

Completion counts and persisted Recite outcomes cover the entire combined Country snapshot.

For completion presentation:

- a one-Continent run may retain the existing Continent completion map;
- a multi-Continent run presents the World scope rather than falsely presenting one Continent as the completed scope;
- completion copy reports the total Country count for the full run.

Recite progress persistence remains per Country and per Recite mode exactly as today.

## Scope

### 1. Introduce a shared World-wide Subregion scope model

Extract/generalize the pure selection behavior that is currently Drill-specific into a feature-local reusable geography seam.

A suitable semantic model is:

```ts
interface WorldCountriesSubregionScope {
  subregionIds: readonly SubregionId[]
}
```

Equivalent naming is acceptable.

The shared seam owns pure behavior equivalent to:

```ts
normalizeSubregionScope(...)
toggleSubregionInScope(...)
getContinentScopeState(...) // none | partial | all
toggleContinentInScope(...)
selectAllSubregions(...)
clearSubregionScope(...)
getCountriesForSubregionScopeInEffectiveOrder(...)
getSubregionScopeCounts(...)
getSubregionScopeLabel(...)
```

Exact function names are implementation-defined.

The shared seam should live with World Countries geography responsibilities, for example under:

`src/features/world-countries/geography/`

Do not create a generic cross-feature scope framework.

### 2. Preserve stable-ID and active-population semantics

The shared scope stores stable `SubregionId` values.

Normalization must:

- retain only current Subregions represented by the active Country population;
- support Subregions from any number of Continents;
- return membership in effective World -> Continent -> Subregion order;
- never infer identity from labels or array positions;
- never persist or treat flattened Country IDs as the configured Geography scope.

Country resolution must reuse existing `geography/` ordering queries and current geography metadata.

### 3. Refactor Drill onto the shared scope seam

Drill must stop owning a parallel implementation of generic World/Subregion scope calculations when an equivalent shared geography function now exists.

The implementation may retain Drill-specific types/wrappers where they clarify ownership or persistence contracts, but they must delegate to the shared pure scope seam rather than duplicate the algorithms.

Do not regress Change Spec 0041 behavior.

Drill preference storage remains Drill-owned and unchanged in meaning.

### 4. Refactor Recite onto one World-wide scope

Replace Recite's current per-Continent selection interpretation with one canonical World-wide scope.

The open Continent remains transient setup navigation, equivalent in concept to Drill's `setupContinent`.

The Recite coordinator must be able to:

- open and close Continent navigation without changing selection;
- toggle a Continent against the global scope;
- toggle a Subregion against the global scope;
- select all World;
- clear World;
- resolve counts and Country membership from the global scope;
- start from either setup level.

Do not persist Recite setup scope.

### 5. Remove the single-Continent Recite run assumption

The active Recite run must represent the complete Country snapshot and selected geography without requiring one run-level `continent` to define the scope.

A suitable conceptual run shape is:

```ts
interface ActiveReciteRun {
  subregionIds: readonly SubregionId[]
  mode: ReciteMode
  assistance: ReciteMapAssistance
  population: readonly Country[]
  scopeCountries: readonly Country[]
  session: ReciteSessionState
}
```

Exact fields/naming may vary.

Where a Continent is needed for active presentation, derive it from the current prompt Country.

Do not copy the Drill session state model into Recite; only the geography-scope concern is shared.

### 6. Share the Geography selection rail and common copy

Drill and Recite must not maintain separate implementations of the same World/Continent selection rail and its common wording.

Extract or compose a feature-local reusable UI seam for the common Geography selection presentation.

It must support:

- World and Continent navigation levels;
- World Continent tri-state selection;
- separate selection and navigation controls;
- selected/total Subregion summaries;
- World scope counts;
- `Select all World`;
- `Clear`;
- `Entire Continent`;
- Subregion selection;
- hover/navigation hooks already used by World Countries maps;
- accessible checked/mixed/unchecked state;
- the canonical shared copy defined by this spec.

Workflow-specific additions remain outside or are composed around the shared selector.

In particular:

- Drill may continue to expose order editing and proficiency UI.
- Recite must not gain order editing or proficiency.
- Recite mode/map-assistance/status controls remain Recite-owned.
- Drill purpose/mode/readiness/progress controls remain Drill-owned.

Do not create a large configurable component that owns workflow behavior.

### 7. Preserve map ownership

Maps remain workflow-neutral.

Setup maps continue to report neutral Country/geography activation to their caller.

At World setup, the rail/summary is the authoritative selection surface; this change does not require World-map fills to become selection-state fills.

At Continent setup, clicking a Country may continue to toggle that Country's Subregion according to the shared selector semantics.

Active Recite presentation supplies the current Continent, selected Subregions, status colors, highlights, and hidden Country IDs to existing map seams. Do not add Recite-specific state inside the map controller.

### 8. Preserve Recite prompt and progress behavior

Do not change:

- answer classification;
- exact/fuzzy/incorrect typed-answer lifecycle;
- the Recite incorrect-answer retry behavior;
- Reveal / Skip semantics;
- Countries + Capitals prompt order within each Country;
- Countries from Capitals semantics;
- latest outcome rules;
- Countries status inheritance from Countries + Capitals;
- Recite progress storage shape/key unless a compile-only type adjustment is necessary with no persisted semantic change.

A multi-Continent run is simply a larger ordered Country snapshot consumed by the same Recite session mechanics.

### 9. Update current-state architecture

Update `docs/architecture/features/WORLD_COUNTRIES.md` so current-state documentation reflects the implemented shared model.

The document must state, at an appropriate current-state level, that:

- Drill and Recite consume a shared feature-local World-wide Subregion-scope selection seam;
- geography owns the generic normalization/effective membership calculations;
- the common Geography selection rail/copy is feature-local reusable UI;
- Drill persists its configured selection while Recite setup selection remains transient;
- Recite may span multiple Continents;
- active multi-Continent Recite maps follow the current prompt Country's Continent;
- Recite and Drill session/workflow mechanics remain independently owned.

Do not rewrite historical Change Specs.

No persistence architecture document update is required unless implementation unexpectedly changes a persistence contract, which this spec does not authorize.

## Interaction and states

### World Continent state

For a Continent with `N` active Subregions:

```text
0 selected     -> none / unchecked
1..N-1         -> partial / mixed
N selected     -> all / checked
```

A Continent with zero active Subregions must not produce a selectable empty scope.

### Navigation does not mutate scope

Given Europe and Asia selected:

```text
World
 -> open Oceania
 -> return to World
```

Expected:

- Europe remains selected;
- Asia remains selected;
- Oceania remains unselected unless explicitly changed;
- scope counts are unchanged.

### Start from different setup levels

Given the same selected scope:

```text
Start from World
```

and

```text
Open Europe -> Start from Europe setup
```

must snapshot the same Recite Country sequence.

### Crossing Continent boundaries

For an ordered scope containing Europe followed by Asia:

- the final European prompt completes normally;
- the next prompt starts normally;
- the active map/rail context changes to Asia;
- session position continues monotonically;
- prior Country outcomes remain intact.

### Active population changes during setup

If the active Country population changes before launch, normalize the transient selection against the current active population.

Do not create Countries outside the active population.

Do not modify Drill evidence, Recite progress, Learning milestones, geography order metadata, or unrelated feature state because selection normalizes.

### Empty selection

With no selected Subregions:

- shared summary reports zero;
- workflow Start is disabled;
- shared empty guidance is visible where appropriate.

### Accessibility

Continent selection and navigation are independent accessible actions.

Users must be able to:

- focus selection;
- determine unchecked/mixed/checked state;
- toggle selection with keyboard;
- separately open the Continent;
- read the textual scope summary.

Do not nest interactive controls in invalid button-inside-button structures.

## Architecture constraints

- Follow `src/features/world-countries/AGENTS.md`.
- Follow `docs/architecture/features/WORLD_COUNTRIES.md`.
- Stay inside World Countries plus direct existing dependencies genuinely required by the change.
- `data/` remains authoritative for canonical identity and membership.
- `geography/` remains authoritative for effective World -> Continent -> Subregion -> Country ordering and now provides the reusable pure Subregion-scope calculations consumed by sibling workflows.
- `ui/` owns the reusable feature-local Geography selection presentation/copy.
- `drill/` retains ownership of Drill preferences, proficiency, Drill/Practice launch, Learning delegation, evidence, results, and Drill-specific setup augmentation.
- `recite/` retains ownership of transient Recite setup/session state, modes, map assistance, ordered recall mechanics, retries/reveals, completion, and Recite progress.
- Recite must not import Drill internals to gain multi-Continent behavior.
- Drill must not import Recite internals.
- Do not introduce broad `common/`, `domain/`, or generic workflow layers.
- Do not move workflow persistence into the shared scope seam.
- Do not persist Recite setup selection.
- Do not change Drill preference semantics.
- Do not change World Countries Country/Subregion IDs.
- Do not duplicate canonical geography ordering in React components.
- Do not put workflow-specific state into map controllers.
- Prefer one small shared scope engine and one small shared selection presentation over a configurable all-purpose setup framework.

No ADR is required. The shared seam is a feature-local reuse of existing geography/UI ownership and does not establish a new cross-feature dependency direction.

## Existing capabilities to reuse

- `src/features/world-countries/geography/queries.ts`
  - Existing authority for active-population and effective hierarchy ordering.
- `src/features/world-countries/drill/drillSelection.ts`
  - Current implemented World-wide scope algorithms from Change Spec 0041; use as the primary extraction/generalization source rather than reimplementing them in parallel.
- `src/features/world-countries/drill/DrillSetup.tsx`
  - Existing Drill setup map integration and workflow-specific augmentation.
- `src/features/world-countries/drill/DrillSetupRails.tsx`
  - Current multi-Continent selection UI and copy that should become the shared selection precedent.
- `src/features/world-countries/recite/reciteScope.ts`
  - Current Recite scope seam; replace its single-Continent assumptions with delegation to the shared World-wide scope behavior and retain only Recite-specific helpers if still useful.
- `src/features/world-countries/recite/WorldCountriesRecite.tsx`
  - Current Recite setup/session coordinator and the main single-Continent assumptions to remove.
- `src/features/world-countries/recite/reciteSession.ts`
  - Existing ordered Recite prompt mechanics; preserve rather than generalize into Drill.
- `src/features/world-countries/ui/GeographyHierarchyRow.tsx`
  - Existing hierarchy row presentation primitive.
- `src/features/world-countries/ui/GeographyBreadcrumbs.tsx`
  - Existing World/Continent navigation presentation.
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
  - Existing workflow-neutral setup/active map seam.
- `src/features/world-countries/recite/reciteProgress.ts`
  - Existing Recite outcome persistence; semantics remain unchanged.

## Edge cases

- Selecting a partial Continent and then toggling `Entire Continent` selects all of that Continent without changing other Continents.
- Toggling a fully selected Continent clears only that Continent.
- A selected Subregion that disappears from the active population is removed by normalization without clearing other valid selected Subregions.
- Duplicate Subregion IDs do not produce duplicate Countries.
- Duplicate Country input records do not produce duplicate Country IDs in a resolved run.
- Effective World order, not selection order, determines cross-Continent recall order.
- Effective Subregion and Country authoring order remains respected.
- A one-Continent Recite run behaves as before.
- A multi-Continent Recite run does not reset when changing maps.
- `Reveal as you go` does not accidentally reveal unresolved Countries in a later Continent.
- Current prompt highlighting applies only to the current Country on the currently displayed Continent map.
- Completion persists outcomes for every Country in the combined snapshot exactly once.
- `Recite again` repeats the same snapshotted combined run/order rather than re-resolving current setup selection.
- `Back to setup` discards the incomplete active Recite run but returns to the existing transient setup selection for the mounted Recite activity unless current behavior intentionally resets only run state.
- Drill order editing remains available in Drill and absent from Recite.
- Drill proficiency remains mutually exclusive with Drill Geography and absent from Recite.
- World map navigation must not toggle Continent selection by accident.
- Common UI extraction must not introduce invalid nested interactive elements.

## Out of scope

- Persisting Recite setup selection.
- Sharing Drill preferences with Recite.
- Broadening Drill proficiency to World scope.
- Adding proficiency to Recite.
- Adding geography order editing to Recite.
- Changing Recite modes.
- Changing Recite scoring/outcome definitions.
- Changing Recite progress persistence semantics.
- Changing Drill evidence, scoring, retries, Practice, or Learning behavior.
- Changing Today.
- Changing Learning flow state machines.
- Changing map SVG assets or map-controller geography behavior.
- Changing the World map palette to encode selected scope.
- Creating a cross-feature geography-selection framework.
- Merging Drill and Recite coordinators or session state machines.
- Refactoring unrelated World Countries UI.

## Acceptance criteria

### Shared scope engine

- [x] One feature-local pure scope seam supports World-wide selected `SubregionId` membership for both Drill and Recite.
- [x] It normalizes against the active Country population without truncating to one Continent.
- [x] It derives none/partial/all Continent state.
- [x] It toggles one Subregion and one full Continent while preserving other Continents.
- [x] It supports select-all-World and clear.
- [x] It derives Continent/Subregion/Country counts.
- [x] It resolves Countries in effective World -> Continent -> Subregion -> Country order.
- [x] It avoids duplicate Country IDs.
- [x] Focused tests cover cross-Continent normalization, toggling, counts, ordering, and deduplication.

### Shared setup presentation

- [x] Drill and Recite use one reusable World/Continent Geography selection presentation for the common rail behavior/copy.
- [x] World Continent selection and navigation are separate accessible controls.
- [x] none/partial/all state is exposed semantically.
- [x] Both workflows display the same shared World selection guidance, scope summary, `Select all World`, and `Clear` behavior.
- [x] Both workflows display the same shared Continent selection guidance and `Entire Continent` semantics/copy.
- [x] Drill-only order editing/proficiency behavior remains Drill-only.
- [x] Recite-only mode/map-assistance/status controls remain Recite-owned.

### Drill regression

- [x] Drill still persists and restores the same World-wide configured Subregion selection semantics.
- [x] Multi-Continent Drill/Practice/Learning behavior remains unchanged.
- [x] Geography/proficiency mutual exclusion remains unchanged.
- [x] Drill session membership/order remains unchanged for equivalent selection and metadata.
- [x] Existing meaningful Drill tests remain green after the shared extraction.

### Recite setup

- [x] Recite can select Subregions in more than one Continent without losing prior selections.
- [x] World rail shows none/partial/all state for each Continent.
- [x] `Select all World` and `Clear` work in Recite.
- [x] Opening/closing a Continent does not mutate Recite selection.
- [x] Recite Start works from World and Continent setup for a non-empty ready scope.
- [x] Starting from different setup levels with the same scope snapshots the same Country sequence.
- [x] Recite setup selection remains transient and creates no new persisted preference.

### Recite session

- [x] A multi-Continent selection creates one continuous Recite session.
- [x] Country sequence follows effective World -> Continent -> Subregion -> Country order.
- [x] The active map switches to the current prompt Country's Continent at a Continent boundary.
- [x] The active read-only Geography rail shows the whole selected scope grouped by Continent and emphasizes the current Continent.
- [x] Session progress does not reset when the active Continent changes.
- [x] `Visible` assistance works across the full run.
- [x] `Reveal as you go` hides/reveals the correct Countries across Continent boundaries.
- [x] Existing wrong-answer retry and Reveal / Skip behavior remains unchanged.
- [x] `Recite again` replays the same combined snapshot.
- [x] A one-Continent Recite run remains behaviorally compatible with the existing flow.

### Completion and persistence

- [x] Completion counts include every Country in the combined run.
- [x] Multi-Continent completion uses a World/full-scope presentation rather than labeling the run as one Continent.
- [x] Completed outcomes persist once per Country under the existing Recite mode-specific progress semantics.
- [x] No Drill evidence or Learning milestone is written by Recite.
- [x] Existing Countries status inheritance behavior remains unchanged.

### Documentation and verification

- [x] `docs/architecture/features/WORLD_COUNTRIES.md` describes the shared scope seam, shared selection UI, transient Recite scope, and multi-Continent Recite behavior.
- [x] No ADR is introduced unless implementation discovers a genuinely new durable architectural decision not covered by this spec.
- [x] Run focused scope/helper tests while iterating.
- [x] Run the Recite capability tests.
- [x] Run relevant Drill setup/selection tests after shared extraction.
- [x] Near completion run `npx vitest run src/features/world-countries`.
- [x] Near completion run `npm run typecheck`.
- [x] Do not run a full production build unless a narrower failure or integration boundary justifies it.

## Source anchors

- `src/features/world-countries/AGENTS.md`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `src/features/world-countries/geography/queries.ts`
- `src/features/world-countries/drill/drillSelection.ts`
- `src/features/world-countries/drill/DrillSetup.tsx`
- `src/features/world-countries/drill/DrillSetupRails.tsx`
- `src/features/world-countries/recite/reciteScope.ts`
- `src/features/world-countries/recite/WorldCountriesRecite.tsx`
- `src/features/world-countries/recite/WorldCountriesRecite.test.tsx`
- `src/features/world-countries/recite/reciteScope.test.ts`
- `src/features/world-countries/ui/GeographyHierarchyRow.tsx`
- `src/features/world-countries/ui/GeographyBreadcrumbs.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`

## Documentation impact

Update:

- `docs/architecture/features/WORLD_COUNTRIES.md`

Do not change persistence documentation unless the implementation violates this spec and introduces a persistence change, in which case stop and resolve the scope rather than silently widening it.

## Verification

Complete this section when setting the status to `Implemented`.

- Implemented and verified on 2026-08-29.
- Evidence: `npx.cmd vitest run src/features/world-countries` passed 102 test files / 534 tests; `npm.cmd run typecheck` passed; focused shared-scope, Recite workflow, Drill selection, and Drill setup tests passed during iteration.
