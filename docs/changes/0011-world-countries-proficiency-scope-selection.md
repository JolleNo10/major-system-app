# Change Spec 0011 - World Countries proficiency scope selection

- **Status:** Implemented
- **Date:** 2026-08-14
- **Issue:** None.
- **Related ADRs:** None required.
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Allow users to focus Drill and non-recording Practice on Countries that currently need work, without manually selecting whole Subregions.

At Continent setup level, add a proficiency-based scope selector for **Weak** and **Developing** Countries as an alternative to the existing Subregion-based geography scope.

Durable Learning milestones remain Subregion-based, while a proficiency scope may
still be used for a temporary Learning run.

## User-visible behavior

At Continent setup level, the left rail contains two scope areas:

1. the existing **Geography** panel;
2. a new **Proficiency** panel directly below it.

The Proficiency panel exposes two independently selectable filters:

- **Weak**
- **Developing**

The user may select either or both.

Selecting proficiency creates a Country-level scope consisting of the Countries in the current Continent whose relevant Drill proficiency currently matches one of the selected states.

Example:

```text
PROFICIENCY

☑ Weak          5 countries
☑ Developing   12 countries
```

With both selected, the effective scope is the union of those sets.

The setup should communicate the resulting Country count, e.g.:

```text
17 Countries selected by proficiency
```

### Alternative scope sources

Geography selection and proficiency selection are mutually exclusive.

If the user:

- selects Weak or Developing while Subregions are selected, clear the Subregion selection;
- selects a Subregion while proficiency scope is active, clear the proficiency selection;
- selects Entire Continent while proficiency scope is active, clear the proficiency selection;
- clicks a Country on the setup map to select its Subregion while proficiency scope is active, clear the proficiency selection and use the normal Subregion selection behavior.

Do not combine Subregion membership and proficiency filters.

The user is always using one of:

```text
Geography scope
OR
Proficiency scope
```

### Drill

Proficiency scope is valid for Drill.

The Country population for a Drill session is derived from:

- current Continent;
- selected proficiency states;
- current Drill mode;
- current Drill evidence.

The existing Drill mode determines which proficiency perspective is relevant.

Existing Drill proficiency semantics remain authoritative.

Do not introduce a second definition of Weak or Developing.

### Practice

Proficiency scope is also valid for the existing non-recording Practice activities.

For Practice, determine Weak / Developing using the recall skill exercised by that Practice activity:

- `Locate Countries` → Location → Country proficiency;
- `Capitals` → Country → Capital proficiency.

Practice continues to be non-recording.

Practice answers must not change Drill evidence, Learning milestones, or the proficiency scope while the session is active.

### Learning

`Learn Countries` and `Learn Capitals` support both Geography and proficiency
scope. Geography Learning remains durable and Subregion-based; proficiency
Learning is a temporary Country run.

When proficiency scope is active:

- `Learn Countries` and `Learn Capitals` can start when the resolved scope has
  at least one Country;
- completing the run does not mark a Subregion's Countries or Capitals as
  learned;
- non-recording Practice remains available.

Show concise guidance such as:

```text
Proficiency Learning is temporary.
Completing it does not mark a Subregion learned.
```

Do not reinterpret a scattered proficiency-selected Country set as a Learning
Subregion or create a fake Subregion identity for it.

Do not write partial Subregion Learning completion from proficiency scope.

## Scope

- Add the Proficiency scope panel under Geography at Continent setup level.
- Support selecting Weak, Developing, or both.
- Show the current matching Country count for each state.
- Derive matching Countries from existing Drill proficiency/evidence semantics.
- Make Geography scope and Proficiency scope mutually exclusive.
- Allow proficiency scope for Drill.
- Allow proficiency scope for non-recording Practice.
- Allow temporary Country and Capital Learning from a proficiency scope without
  creating durable Learning milestones.
- Keep durable Country and Capital Learning milestones restricted to complete
  Subregion scope.
- Construct concrete Country session membership when Drill or Practice starts.
- Recalculate proficiency-derived setup scope from current evidence when setup is shown again.
- Preserve existing map progress presentation and existing Drill/Practice semantics.

No canonical geography membership, Learning milestone semantics, Drill scoring, mastery formula, or persistence schema changes are part of this work.

## Interaction and states

### Visibility

The Proficiency panel is shown only at Continent setup level.

It is not shown on the World-level Continent-selection screen because proficiency scope requires a selected Continent.

### Empty selection

With neither Weak nor Developing selected and no Subregions selected, existing no-scope behavior remains.

No Drill or Practice session can start.

### Selected state

Weak and Developing are toggle controls, not a single-choice radio group.

Valid combinations are:

```text
Weak
Developing
Weak + Developing
```

Selecting an already-selected proficiency state deselects it.

If the final selected proficiency state is deselected, the effective scope becomes empty.

### Counts

Each proficiency option shows its current number of matching Countries in the selected Continent.

Counts must use the same proficiency classification that determines actual session membership.

Do not calculate display counts using separate approximate logic.

Changing the relevant Drill/Practice mode may change the counts and effective proficiency scope.

### No matching Countries

A proficiency filter may legitimately resolve to zero Countries.

When the effective proficiency scope contains zero Countries:

- keep the selected proficiency filters visible;
- show `0 Countries`;
- disable Drill/Practice start;
- give concise feedback explaining that no Countries currently match the selected proficiency.

Do not silently fall back to Entire Continent or Subregions.

### Session snapshot

Proficiency selection is criteria used to derive the session population.

When Drill or Practice starts:

1. resolve the currently matching Countries;
2. create the concrete session Country population/queue;
3. keep that population stable for the lifetime of the active session.

Evidence or proficiency changes during an active Drill session must not remove Countries from or add Countries to that active queue.

When the user returns to setup, recalculate Weak/Developing membership from current evidence.

### Map behavior

When proficiency scope is active:

- keep the existing Continent map;
- retain the existing progress colors;
- visually distinguish Countries that are inside the effective proficiency scope from Countries outside it using existing selection/focus affordances where possible;
- do not replace proficiency colors with a new selection palette;
- clicking a Country switches back to Geography/Subregion scope as defined above.

The map remains progress-first: the user should still be able to see why a Country belongs to Weak or Developing.

### Purpose and mode changes

The selected proficiency filter values may remain selected when switching between Drill and Learn & Practise.

However, eligibility and derived membership depend on the active activity:

- Drill uses the current Drill mode proficiency perspective;
- Practice uses the skill exercised by the selected Practice activity;
- Learning uses the current Drill mode perspective to derive a temporary Country
  scope and does not write a Subregion milestone.

If a mode change causes the current proficiency scope to resolve to zero Countries, keep the filters selected and disable start rather than clearing them automatically.

## Architecture constraints

Follow [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md).

- `learning/recallProgress.ts`, `learning/recallMastery.ts`, and the existing progress-presentation seams remain authoritative for proficiency semantics.
- Do not duplicate Weak/Developing classification logic in rail components.
- `drill/` owns proficiency scope because it is a Drill/Practice setup concern.
- `geography/` continues to own canonical/effective geographic membership and order. Proficiency is not geography metadata.
- Learning flows continue to receive concrete Country entries and explicit scope
  metadata; they must not import Drill-specific proficiency selection. Only
  geographic Subregion runs may write Subregion milestones.
- Practice remains non-recording.
- Active session Country membership is fixed at session construction.
- Do not add a shared/core abstraction for this feature-local scope behavior.
- Do not change PageLayout or generic rail behavior.

No ADR is required: this adds a feature-local scope-selection behavior within existing ownership and persistence boundaries.

## Existing capabilities to reuse

- `drill/drillProgressPresentation.ts` for Drill-mode progress perspective and Country state derivation.
- `learning/progressPresentation.ts` for canonical Weak/Developing state semantics.
- `learning/recallProgress.ts` for existing Country recall evidence.
- `drill/drillSelection.ts` as the existing Geography-scope seam; extend or complement it without converting proficiency into fake Subregion IDs.
- `drill/DrillSetup.tsx` for setup-time evidence loading, progress presentation, and derived scope data.
- `drill/DrillSetupRails.tsx` for the left-rail scope controls.
- `drill/WorldCountriesDrill.tsx` for session construction and purpose-specific start behavior.
- existing `DrillSession` / Practice session mechanics after the concrete Country population has been derived.

## Edge cases

- Weak and Developing may overlap only if existing semantics permit it; use the canonical single proficiency state per relevant perspective rather than double-classifying a Country.
- Countries with no relevant Drill evidence are not Weak or Developing unless the existing proficiency model explicitly classifies them as such.
- `Strong`, `Mastered`, `Complete`, `Unpractised`, and Learning Readiness are not selectable in this change.
- Switching Continent preserves no cross-Continent derived Country membership. Proficiency criteria may remain selected, but counts and effective membership are recomputed for the new Continent.
- Country-set/settings changes recompute setup membership from the active population.
- Active sessions remain stable if evidence, authored order, or active population changes after session construction; existing compatibility/reset behavior remains authoritative where applicable.
- A proficiency scope with one matching Country is valid for Drill/Practice.
- Proficiency selection must not change geographic authored order.

## Out of scope

- Selecting Strong, Mastered, Complete, Unpractised, or Learning Readiness states.
- Combining Subregion and proficiency filters.
- Cross-Continent or whole-World proficiency scope.
- Country-by-Country manual setup selection.
- Running durable Learning on arbitrary Country subsets; proficiency Learning is
  temporary and non-milestoning.
- Partial Subregion Learning milestones.
- New Drill proficiency formulas, thresholds, evidence types, or colors.
- New Practice modes.
- Changing Drill result metrics.
- Persisting a resolved Country list.
- Changes to Recite or Due Review/Maintenance.

## Acceptance criteria

- [x] At Continent setup level, a Proficiency panel is visible directly below Geography.
- [x] The panel exposes independently selectable Weak and Developing filters with current matching Country counts.
- [x] Weak + Developing resolves to the union of Countries in those states within the current Continent.
- [x] Selecting proficiency clears existing Subregion scope.
- [x] Selecting a Subregion, Entire Continent, or a map Country for geographic selection clears proficiency scope.
- [x] Geography and proficiency scope are never combined.
- [x] Drill proficiency scope uses the current Drill mode's existing proficiency perspective and canonical state derivation.
- [x] `Locate Countries` Practice derives proficiency from Location → Country.
- [x] `Capitals` Practice derives proficiency from Country → Capital.
- [x] Drill and Practice start from the currently resolved proficiency Country population.
- [x] The active Drill/Practice Country population remains fixed for that session even when proficiency evidence changes.
- [x] Returning to setup recalculates matching Countries from current evidence.
- [x] A zero-match proficiency scope remains selected, shows zero, and disables start without falling back to another scope.
- [x] Learn Countries and Learn Capitals can start from a non-empty proficiency-only scope.
- [x] Proficiency Learning remains temporary and completing it does not create a partial Subregion milestone.
- [x] Non-recording Practice remains available from proficiency scope.
- [x] Learning milestone semantics remain unchanged and no partial Subregion milestone can be created.
- [x] The setup map retains canonical progress colors while making effective proficiency scope understandable.
- [x] Countries with no relevant evidence are not accidentally treated as Weak/Developing contrary to existing proficiency semantics.
- [x] No fake Subregion IDs or geography metadata are introduced for proficiency scope.
- [x] No new persistence key/schema is required for resolved Country membership.
- [x] Existing Subregion Drill/Practice selection behavior continues to work unchanged when proficiency scope is not active.
- [x] Existing Drill scoring/evidence, Practice non-recording behavior, geographic Learning milestones, geography ordering, and map palette semantics remain unchanged.

## Source anchors

- `src/features/world-countries/drill/DrillSetup.tsx`
- `src/features/world-countries/drill/DrillSetupRails.tsx`
- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
- `src/features/world-countries/drill/drillSelection.ts`
- `src/features/world-countries/drill/drillProgressPresentation.ts`
- `src/features/world-countries/learning/progressPresentation.ts`
- `src/features/world-countries/learning/recallProgress.ts`
- `src/features/world-countries/learning/recallMastery.ts`
- `src/features/world-countries/drill/DrillSetup.test.tsx`
- `src/features/world-countries/drill/drillSelection.test.ts`
- `src/features/world-countries/drill/drillProgressPresentation.test.ts`

## Documentation impact

After implementation, update `docs/architecture/features/WORLD_COUNTRIES.md` to record that:

- Drill setup supports mutually exclusive Geography and proficiency scope sources;
- Weak/Developing scope is feature-local Drill/Practice setup behavior;
- proficiency-derived sessions snapshot concrete Country membership at start;
- proficiency Learning snapshots concrete Country membership at start without a
  durable milestone;
- durable Learning milestones remain Subregion-scoped.

Do not create an ADR unless implementation discovers a genuinely new architectural decision.

## Verification

Implemented with focused proficiency-scope, setup interaction, and temporary
Learning-scope coverage.

- `npx.cmd vitest run --cache=false src/features/world-countries` — 62 files,
  228 tests passed.
- `npm.cmd run typecheck` — passed.
- `npm.cmd test -- --cache=false` — 94 files, 421 tests passed.

Complete this section when setting the status to `Implemented`.

During implementation, prefer focused tests under:

```text
src/features/world-countries/drill/
```

Near feature completion run:

```text
npx vitest run src/features/world-countries
npm run typecheck
```

Follow the repository progressive verification policy. Do not widen to unrelated feature tests unless an integration boundary requires it.
