# Change Spec 0043 - Reduce World Countries Drill coordinator responsibilities

- **Status:** Implemented
- **Date:** 2026-08-29
- **Issue:** None.
- **Related ADRs:** None. This is a behavior-preserving refactor inside the existing World Countries Drill ownership boundary.
- **Related changes:** Change Spec 0041 introduced World-wide multi-Continent Drill scope and cross-Continent Learning progression. Change Spec 0042 is unrelated except as the preceding health cleanup.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`
- **Repository / feature scope:** `JolleNo10/major-system-app` — World Countries / Countries only

## Goal

Reduce the orchestration complexity accumulated in `WorldCountriesDrill.tsx` after multi-Continent Drill/Learning support by extracting Drill-owned Learning-run launch and progression mechanics into focused, testable seams while keeping `WorldCountriesDrill` as the top-level React coordinator required by the current architecture.

The completed refactor must preserve all current Drill, Practice, Learn & Practise, proficiency, retry, multi-Continent, persistence, evidence, and rendering behavior.

RepoWise health is a secondary signal. The implementation should improve responsibility boundaries and testability rather than chase a numeric score.

## User-visible behavior

There is no intended user-visible behavior change.

The following behavior must remain unchanged:

- World-wide Geography selection persists independently of which Continent is open in setup.
- Recorded Drill may span multiple selected Continents.
- Non-recording Practice may span multiple selected Continents.
- Learn Countries and Learn Capitals may advance sequentially across selected Subregions in different Continents.
- Each active Learning Subregion receives its own actual Continent context.
- Proficiency remains a mutually exclusive, Continent-scoped alternative setup scope.
- Proficiency Learning remains temporary and does not write a Subregion Learning milestone.
- Retry Failed Countries remains a transient Country subset and does not alter the configured Geography selection.
- Run again continues to restart the configured activity rather than the last retry subset.
- Active sessions remain snapshotted and compatible only with the active Country population.
- Drill evidence, assisted-answer handling, settings, mnemonics, and contextual authoring refresh behavior remain unchanged.

## Scope

### 1. Extract Drill Learning-run state and pure progression mechanics

`WorldCountriesDrill.tsx` currently owns the `LearningRun` shape and directly implements the rules for:

- durable multi-Subregion Learning runs;
- temporary proficiency Learning runs;
- active Learning Subregion selection;
- run completion versus advancement;
- completion labels.

Move the reusable run model and pure progression calculations to one focused Drill-owned module, for example:

`src/features/world-countries/drill/drillLearningRun.ts`

Exact naming may vary.

A suitable run model remains conceptually equivalent to:

```ts
interface DrillLearningRun {
  mode: WorldCountriesLearningMode
  subregionIds: readonly SubregionId[]
  countryIds?: readonly CountryId[]
  index: number
  newItemsPerSet: LearningSetMaximum
  scopeLabel?: string
  recordCompletion: boolean
}
```

Do not add state that is not required by the existing behavior.

The pure module should own small calculations such as:

- current Subregion ID, when the run is Subregion-backed;
- whether a run is a temporary Country-snapshot/proficiency run;
- whether the current scope is the final scope in the run;
- the existing completion button label;
- advancing to the next selected Subregion versus completing the run.

The exact API is implementation-defined, but the result must make progression rules directly unit-testable without rendering `WorldCountriesDrill`.

### 2. Extract Learning-run launch resolution

The current `startLearning(...)` callback mixes React state mutation with async proficiency resolution and Geography-backed run construction.

Move the calculation/loading needed to resolve a Learning-run launch to a focused Drill-owned resolver, analogous in purpose to the existing `resolveDrillSessionLaunch(...)` seam.

A suitable conceptual API is:

```ts
resolveDrillLearningRunLaunch(options)
  -> DrillLearningRun | null | Promise<DrillLearningRun | null>
```

Equivalent naming is acceptable.

The resolver must preserve two distinct launch sources.

#### Geography-backed Learning

When no proficiency filter is active:

- use the normalized, effectively ordered selected Subregion IDs supplied by the coordinator;
- return no run for an empty selection;
- snapshot the current `New items per set` value into the run;
- set `recordCompletion: true`;
- start at index `0`.

#### Proficiency-backed Learning

When proficiency is active:

- require the currently open setup Continent exactly as today;
- load current recall progress for the active population and Drill-mode skills;
- resolve the existing proficiency scope through `resolveDrillProficiencyScope(...)`;
- return no run for an empty resolved Country scope;
- snapshot the resolved Country IDs into a temporary run;
- retain the existing `Proficiency scope` label;
- set `recordCompletion: false`;
- snapshot the current `New items per set` value.

Do not broaden proficiency to World scope in this refactor.

Do not duplicate proficiency algorithms already owned by `drillProficiencyScope.ts`.

### 3. Centralize active Learning-run scope derivation

The coordinator currently derives `learningEntries`, `learningSubregion`, `learningState`, and `learningContinent` through several separate expressions.

Introduce a focused derivation seam for the active run scope where it makes the code clearer.

The derivation must preserve:

- temporary `countryIds` runs use exactly that Country snapshot, filtered against the active population;
- Subregion-backed runs resolve Countries through `getCountriesForSubregionInEffectiveOrder(...)` and current Subregion metadata;
- the active Subregion is the run's current indexed Subregion;
- the active Continent comes from the current resolved Learning entries rather than stale setup navigation;
- durable Country readiness passed to Capital Learning still comes from the current active Subregion learning state;
- geography refresh continues to affect subsequent Subregion presentation/order as it does today.

Prefer pure derivation helpers. Do not hide storage or React side effects inside them.

### 4. Keep React state application in `WorldCountriesDrill`

`WorldCountriesDrill.tsx` remains responsible for the top-level workflow transition into and out of Learning.

It should continue to own React state such as:

- `phase`;
- `purpose`;
- `learningRun`;
- setup navigation;
- active Drill/Practice session state;
- result state;
- geography/mnemonic refresh counters.

After launch resolution, the coordinator should apply the returned Learning run and enter the existing Learning phase.

After a Learning flow completes its current scope, the coordinator should apply the pure progression result:

- advance the run when another selected Subregion remains;
- otherwise clear the run, return to setup, and return setup navigation to World as today.

Do not introduce a second React coordinator solely to move lines out of this component.

### 5. Preserve Country and Capital Learning flow ownership

`CountryLearningFlow.tsx` and `CapitalLearningFlow.tsx` remain the owners of the guided per-scope Learning UI/state machines.

`WorldCountriesDrill` continues only to delegate the currently resolved Learning scope to the appropriate flow.

Preserve the current props and behavior, including:

- actual active `continent`;
- optional durable `subregion`;
- optional `scopeLabel`;
- resolved `entries`;
- `activeCountries`;
- snapshotted `newItemsPerSet`;
- scheduler settings;
- fuzzy matching;
- incorrect spelling practice opt-in;
- `recordCompletion`;
- Country readiness for Capital Learning;
- `onExit`;
- `onDone`;
- `doneLabel`;
- mnemonic/geography refresh callbacks.

Do not merge Country and Capital Learning flows or move their state machines into Drill.

### 6. Do not reopen already extracted Drill session-launch mechanics

Continue to use:

`src/features/world-countries/drill/drillSessionLaunch.ts`

for Drill/Practice session snapshot resolution.

Do not fold Learning-run launch into `drillSessionLaunch.ts` merely because both are launches. Drill/Practice sessions and guided Learning runs have different lifecycle/state contracts.

A sibling focused module is preferred.

### 7. Keep setup preference and scope semantics explicit

This refactor must not change the setup contract established by Change Spec 0041.

`WorldCountriesDrill` may continue to own the small React callbacks that:

- update normalized preferences;
- make Geography and proficiency mutually exclusive;
- select all World;
- clear World;
- open a Continent;
- return to World;
- change Drill mode/order/purpose.

Do not introduce a generalized reducer or state machine for all setup/session/Learning states unless a concrete correctness problem proves it is necessary.

### 8. Keep session and result behavior unchanged

Do not redesign the existing Drill/Practice lifecycle during this change.

Preserve:

- `resolveDrillSessionLaunch(...)` usage;
- session-country snapshots;
- population compatibility reset behavior;
- answer accumulation;
- durable evidence only for eligible non-assisted recorded Drill answers;
- result transitions;
- retry-failed behavior;
- Practice result behavior;
- Run again behavior.

Small extraction of a trivial pure derivation is acceptable only if it directly clarifies `WorldCountriesDrill`; session refactoring is not the objective of 0043.

## Interaction and states

This is a behavior-preserving refactor.

The top-level phase model remains:

```text
setup
  -> learning
  -> setup

setup
  -> recall
  -> results
  -> recall / setup

setup
  -> practice
  -> results
  -> practice / setup
```

### Geography-backed Learning

```text
selected Subregion 1
  -> selected Subregion 2
  -> ...
  -> final selected Subregion
  -> setup at World level
```

Cross-Continent progression must retain the effective selected Subregion order and derive each scope's Continent from its active Countries.

### Proficiency Learning

```text
Continent-scoped proficiency selection
  -> one temporary Country snapshot
  -> setup at World level
```

No Subregion milestone is written by this temporary run.

### Empty/invalid launch

If Geography selection is empty, proficiency has no open Continent, or proficiency resolves to no Countries, no Learning run starts and current setup remains intact.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and `src/features/world-countries/AGENTS.md`.
- Stay inside World Countries plus direct existing dependencies.
- `WorldCountriesDrill.tsx` remains the Drill setup/top-level workflow coordinator.
- `drill/` owns Drill/Learn & Practise setup scope and the sequencing needed to delegate into guided Learning.
- `learning/flows/` continues to own Country and Capital Learning UI/orchestration.
- `learning/` continues to own Learning state machines, scheduler mechanics, evidence semantics, and durable Subregion learning facts.
- `geography/` remains authoritative for effective World -> Continent -> Subregion -> Country ordering.
- Do not make Learning depend on Drill internals; the dependency direction remains Drill coordinator -> reusable Learning flows.
- Do not create broad `common/`, `domain/`, or generic workflow framework layers.
- Prefer pure helpers and explicit input/output contracts.
- Do not persist Learning-run journey state.
- Do not alter persistence keys or preference schema.
- Do not make edits solely to improve RepoWise metrics.

No ADR is required.

## Existing capabilities to reuse

- `src/features/world-countries/drill/drillSessionLaunch.ts`
  - Existing pure/asynchronous resolver for Drill and Practice session snapshots; preserve as a separate sibling responsibility.
- `src/features/world-countries/drill/drillSelection.ts`
  - Existing owner of normalized World-wide Geography selection and effective Country selection.
- `src/features/world-countries/drill/drillProficiencyScope.ts`
  - Existing owner of proficiency Country-scope resolution.
- `src/features/world-countries/learning/recallProgress.ts`
  - Existing recall-progress loading seam required for proficiency resolution.
- `src/features/world-countries/geography/queries.ts`
  - Existing effective Country ordering for an active Subregion.
- `src/features/world-countries/learning/subregionLearningStore.ts`
  - Existing durable Learning readiness lookup.
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
  - Existing Country Learning workflow.
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
  - Existing Capital Learning workflow.
- `src/features/world-countries/drill/WorldCountriesDrill.test.tsx`
  - Existing integration coverage for proficiency Learning, cross-Continent Learning, Drill/Practice, and retry behavior.

## Edge cases

- Empty Geography selection must not start Learning.
- Proficiency Learning without an open Continent must not start.
- Empty resolved proficiency scope must not start.
- A temporary proficiency Country snapshot must not be reinterpreted as a complete Subregion.
- Temporary proficiency Learning must keep `recordCompletion: false`.
- Geography-backed Learning must keep `recordCompletion: true`.
- `New items per set` must remain snapshotted at run launch and not change mid-run if Settings later change.
- Multi-Subregion Learning must continue in the selected effective Subregion order.
- Crossing from one Continent to another must pass the new active Continent to the next Learning flow.
- Effective Country order must be re-resolved for each Subregion using current geography metadata, preserving contextual authoring refresh behavior.
- Country readiness passed to Capital Learning must correspond to the active durable Subregion, not setup navigation.
- Proficiency Country snapshots must be filtered against the active population if population changes before rendering.
- Completing the final Geography-backed Subregion must return to World setup.
- Completing a temporary proficiency run must return to World setup.
- Exiting Learning early must continue to clear the run and return to setup according to the current behavior.
- Existing Drill/Practice population compatibility reset must remain unchanged.
- Retry Failed Countries must continue to preserve the original configured selection snapshot and preferences.

## Out of scope

- Changing World-wide Geography selection behavior from Change Spec 0041.
- Broadening proficiency to World/multi-Continent scope.
- Changing Drill preference persistence.
- Changing `New items per set` behavior.
- Changing guided Country or Capital Learning state machines.
- Changing Learning completion/milestone semantics.
- Changing scheduler behavior.
- Changing answer matching, aliases, evidence, fuzzy matching, or spelling remediation.
- Changing Drill/Practice session mechanics.
- Changing Retry Failed Countries behavior.
- Refactoring `DrillSetup.tsx` except for a direct compile/test adjustment required by this extraction.
- Refactoring `SvgMapController.ts`.
- Changing map behavior or presentation.
- Introducing a generalized top-level workflow reducer/state machine.
- Chasing RepoWise score changes beyond the actual responsibility cleanup.

## Acceptance criteria

### Learning-run launch

- [x] Geography-backed Learning-run construction is implemented outside `WorldCountriesDrill.tsx` and is directly testable.
- [x] Proficiency-backed Learning-run resolution is implemented outside `WorldCountriesDrill.tsx` and is directly testable.
- [x] Empty Geography, missing proficiency Continent, and empty proficiency results produce no run.
- [x] `New items per set` is snapshotted at run launch.
- [x] Durable Geography Learning uses `recordCompletion: true`.
- [x] Temporary proficiency Learning uses `recordCompletion: false` and retains the existing scope label.

### Learning-run progression

- [x] Current Learning Subregion/run position is derived through a focused run seam rather than duplicated coordinator branching.
- [x] Advancement to the next selected Subregion is pure and directly testable.
- [x] Final-run completion is pure and directly testable.
- [x] Existing done-label behavior is preserved.
- [x] Multi-Continent advancement preserves the effective selected Subregion order.

### Coordinator responsibilities

- [x] `WorldCountriesDrill.tsx` remains the top-level React coordinator.
- [x] It applies Learning launch/progression results but no longer contains the detailed launch/progression algorithms.
- [x] Country and Capital Learning flow state machines remain separate and outside Drill.
- [x] `drillSessionLaunch.ts` remains the Drill/Practice session-launch owner.
- [x] No generic workflow framework, broad reducer, or new persistence layer is introduced.

### Behavior preservation

- [x] Existing Geography-backed Drill behavior is unchanged.
- [x] Existing Practice behavior is unchanged.
- [x] Existing proficiency Drill/Practice behavior is unchanged.
- [x] Existing proficiency Learning behavior is unchanged.
- [x] Existing cross-Continent Learning behavior is unchanged.
- [x] Existing Learning milestone/readiness behavior is unchanged.
- [x] Existing retry-failed and Run again behavior is unchanged.
- [x] Existing setup navigation and World-wide selection behavior is unchanged.
- [x] Existing population compatibility behavior is unchanged.

### Regression coverage

- [x] Existing `WorldCountriesDrill.test.tsx` tests remain green.
- [x] Add focused tests for the new Learning-run launch resolver.
- [x] Add focused tests for Learning-run advancement/completion.
- [x] Keep/increase explicit coverage for cross-Continent progression.
- [x] Keep explicit coverage for temporary proficiency Learning not writing durable completion.

## Source anchors

- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
- `src/features/world-countries/drill/WorldCountriesDrill.test.tsx`
- `src/features/world-countries/drill/drillSessionLaunch.ts`
- `src/features/world-countries/drill/drillSessionLaunch.test.ts`
- `src/features/world-countries/drill/drillSelection.ts`
- `src/features/world-countries/drill/drillProficiencyScope.ts`
- `src/features/world-countries/learning/recallProgress.ts`
- `src/features/world-countries/learning/subregionLearningStore.ts`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/geography/queries.ts`
- `docs/changes/0041-world-countries-multi-continent-drill-scope.md`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `src/features/world-countries/AGENTS.md`

## Documentation impact

No current-state architectural change is expected.

The current architecture already states that `WorldCountriesDrill.tsx` owns the top-level Drill/Learn & Practise coordinator while reusable guided Learning flows remain under `learning/flows/`. The new helper/module should implement that boundary, not change it.

If implementation reveals a need to change ownership or dependency direction, stop and evaluate that separately rather than silently encoding it in this refactor.

Do not rewrite historical Change Specs.

## Verification

- Implemented and verified on 2026-08-29.
- Evidence: focused Learning-run tests cover Geography and proficiency launch
  resolution, Drill-mode skill loading, active-population filtering,
  cross-Continent scope derivation, immutable progression, completion, and
  done labels. Existing coordinator tests remain green for proficiency
  Learning, cross-Continent Learning, Drill/Practice, evidence, and retry
  behavior.
- Verification commands:
  - `npx.cmd vitest run src/features/world-countries/drill/drillLearningRun.test.ts` — passed (1 file, 14 tests).
  - `npx.cmd vitest run src/features/world-countries/drill/WorldCountriesDrill.test.tsx` — passed (1 file, 12 tests).
  - `npx.cmd vitest run src/features/world-countries/drill` — passed (19 files, 125 tests).
  - `npx.cmd vitest run src/features/world-countries` — passed (101 files, 522 tests).
  - `npm.cmd run typecheck` — passed.
  - `git diff --check` — passed; only line-ending normalization warnings were reported.
  - `repowise health` — passed; overall Healthy. `WorldCountriesDrill.tsx`
    reports score 3.7 / CCN 39 / Nest 3 / NLOC 309 (baseline 3.9 / 48 / 3 /
    326).
- No ADR was added because ownership and dependency direction remain
  unchanged.
