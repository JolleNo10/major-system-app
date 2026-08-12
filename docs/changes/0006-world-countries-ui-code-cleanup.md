# Change Spec 0006 - World Countries UI and code cleanup

* **Status:** Draft
* **Date:** 2026-08-12
* **Issue:** None.
* **Related ADRs:** None.
* **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md), [Shared core architecture](../architecture/CORE.md)

## Goal

Consolidate the World Countries UI after recent Prepare and Drill iterations so future UI work builds on consistent presentation conventions rather than duplicated component implementations and copied Tailwind treatments.

This change is primarily refactoring and standardization. Preserve current user behavior while reducing duplication, clarifying component ownership and naming, removing obsolete UI/code paths, and documenting the feature-local UI conventions future agents should follow.

## User-visible behavior

The completed World Countries UI should behave substantially as it does before this change.

Prepare, Drill, guided learning, results, Recite, Maintenance, maps, rails, navigation, selection, learning, practice, recall, and completion behavior must remain functionally unchanged unless an existing inconsistency is being normalized by this specification.

Visually, equivalent UI concepts should become consistent. In particular:

* equivalent rail panels use one treatment;
* equivalent map-linked geography rows use one interaction and visual treatment;
* breadcrumbs use one treatment;
* primary and secondary actions follow the same hierarchy;
* headings and eyebrow labels follow the same hierarchy;
* selected, hovered, focused, disabled, and inactive states behave consistently;
* repeated completion/result structures do not drift independently.

This change must not introduce a new World Countries visual redesign.

## Scope

### Feature-local UI capability

Introduce a narrow `src/features/world-countries/ui/` capability for presentation concepts shared by multiple World Countries workflow owners.

It may own feature-specific reusable presentation such as:

* rail/panel surfaces;
* World → Continent → Subregion breadcrumbs;
* map-linked geography/hierarchy rows;
* repeated heading/eyebrow presentation;
* other small World Countries presentation primitives where there is demonstrated duplication across workflows.

Do not create a generic `common/` directory.

Do not move feature concepts into `core/ui`.

A component belongs in `world-countries/ui/` only when:

1. it is presentation rather than workflow/domain policy;
2. it contains World Countries-specific concepts or styling;
3. it has concrete use from more than one World Countries capability/workflow, or consolidates an already duplicated feature-wide convention.

One-off controls remain with their owning workflow.

### Remove duplicated presentation

Review World Countries presentation code for copied implementations and consolidate demonstrated duplicates.

Known examples include:

* Prepare and Drill rail-panel styling;
* Prepare and Drill map-linked hierarchy rows;
* breadcrumb presentation;
* common action/button treatments where the same semantic action is currently reconstructed independently;
* repeated completion/result surfaces where components differ mainly by content.

Prefer shared semantic components over exporting large Tailwind class-string collections.

Do not abstract merely because two class strings happen to be similar. The abstraction must represent the same UI concept.

### Decompose oversized UI modules

Split presentation files that currently own several materially different UI responsibilities.

In particular, `drill/DrillRails.tsx` must no longer act as the single owner for unrelated setup, active-session, and results rail implementations.

Keep Drill-specific presentation under `drill/`, but separate components by UI responsibility where that improves discoverability and ownership.

Apply the same test to Prepare presentation, including `WorldCountriesPrepareRails.tsx` and screen-level components currently embedded in `WorldCountriesPrepare.tsx`.

Do not split files solely to reach an arbitrary line-count target.

A useful extraction should create a clear component responsibility or remove duplication.

### Naming cleanup

Normalize World Countries presentation naming using these conventions:

* React component files: `PascalCase.tsx`
* hooks, state, algorithms, adapters, stores, and utility modules: `camelCase.ts`
* `...Screen`: center-column workflow/screen presentation
* `...Rails`: component whose responsibility is publishing PageLayout rail content
* `...Panel`: contained visual surface within a screen or rail
* `...Row`: repeated row/list/navigation presentation
* `...Flow`: multi-state workflow orchestration

Names should describe responsibility rather than historical implementation.

Rename files/components where current naming materially conflicts with these conventions.

Do not rename stable domain terminology merely for cosmetic consistency.

In particular:

* `Prepare`, `Drill`, and `Recite` remain the workflow vocabulary;
* `Memo readiness` remains the established internal domain terminology;
* Country, Capital, Continent, Subregion, proficiency, mastery, and learning evidence retain their current domain meanings.

### Remove stale code

Perform a reachability pass over World Countries UI/workflow support code created by previous UI structures.

Delete components, types, functions, branches, props, tests, and imports that no longer have a production path.

Known review targets include Drill guided/practice action terminology and branches that may have survived the recent Drill UI reorganization.

Do not remove a path based only on its name appearing old. Confirm that it has no current production caller and is not required by the documented architecture.

Do not retain compatibility wrappers for obsolete internal World Countries paths.

### UI-state consistency

Normalize equivalent presentation states across the feature:

* default;
* hover;
* selected/active;
* keyboard focus;
* disabled;
* completion/success where applicable;
* warning/error where applicable.

Map-linked rail rows must preserve synchronization between map hover and rail hover/focus.

Interactive rows and controls must retain appropriate accessible semantics and keyboard operation.

### Tests

Refactor UI tests so they primarily verify observable UI contracts rather than exact Tailwind implementation details.

Prefer assertions for:

* roles and accessible names;
* selected/pressed state;
* enabled/disabled state;
* workflow transitions;
* visible content;
* map/rail interaction;
* presence or absence of meaningful UI states.

Avoid tests whose only purpose is asserting specific utility classes such as a particular padding, grid, background, or color class unless that class encodes a behavior that cannot reasonably be verified otherwise.

Existing behavior tests must continue protecting workflow semantics during refactoring.

## Interaction and states

### Rails

Prepare and Drill continue publishing supporting UI through the existing PageLayout rail integration.

Desktop rail and narrow-screen drawer behavior remains owned by PageLayout.

Feature-local shared rail components must work identically whether rendered directly in desktop rails or within the existing responsive drawers.

### Geography rows

A shared map-linked geography row must support the behaviors required by its callers without acquiring workflow policy.

The row may receive presentation inputs such as:

* label;
* secondary/trailing content;
* sequence number;
* selected state;
* hover-group identity;
* click callback;
* hover/focus callback.

It must not decide:

* which Continent or Subregion is selectable;
* Drill selection rules;
* Memo readiness;
* proficiency;
* learning order;
* navigation transitions.

### Focus and accessibility

Equivalent interactive controls must expose a visible keyboard-focus treatment.

Refactoring must preserve or improve:

* tab navigation;
* radio/tab semantics;
* `aria-selected`, `aria-pressed`, `aria-checked`, and disabled semantics where applicable;
* accessible headings and labels;
* tooltip accessibility;
* map/rail hover synchronization when keyboard focus is used instead of pointer hover.

### Responsive behavior

Do not alter PageLayout widths, breakpoints, center-column geometry, or drawer architecture.

Shared World Countries components must tolerate their existing center/rail widths and narrow-screen drawer rendering without horizontal overflow.

## Architecture constraints

Follow [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md) and [Shared core architecture](../architecture/CORE.md).

Existing ownership rules remain authoritative.

### Shared World Countries UI

Presentation shared by sibling World Countries workflows must not be owned by one workflow folder.

Use `src/features/world-countries/ui/` for demonstrated feature-specific shared presentation rather than making `prepare/` depend on `drill/`, `drill/` depend on `prepare/`, or creating a generic `common/` layer.

### Workflow ownership

Refactoring presentation must not move workflow policy.

* Prepare continues owning preparation navigation, order authoring, readiness presentation, and mnemonic authoring.
* Drill continues owning Drill setup, preferences, selection, session orchestration, practice, recall, and results.
* `learning/flows/` continues owning reusable guided Country and Capital learning presentation/orchestration.
* `maps/` continues owning map infrastructure and workflow-neutral geography-map presentation.
* `learning/` continues owning reusable learning semantics and Country learning map presentation.
* `WorldCountries.tsx` remains the shell/composition owner.

### Core boundary

Do not add World Countries concepts to `core/ui`.

An existing duplicated component must not be promoted to `core/ui` merely because it could theoretically be reused by another feature.

Cross-feature extraction requires a real feature-independent contract and concrete consumer and is out of scope for this change.

### Behavior and persistence

This cleanup must not change:

* country population resolution;
* Country/Subregion/Continent identity;
* learning evidence;
* proficiency or mastery calculations;
* Memo readiness transitions;
* Drill scheduling;
* Drill preference schema;
* scoring;
* mnemonic persistence;
* country-set settings;
* map ID translation;
* persistent storage keys or schemas.

No migration is expected.

### No new ADR

This change applies the existing rule that capabilities shared by workflows must live outside individual workflow folders.

A new ADR is not required unless implementation discovers that the requested cleanup requires changing an existing architectural boundary such as PageLayout ownership, `core/ui`, persistence, or workflow ownership.

Do not create such a boundary change merely to complete this cleanup.

## Existing capabilities to reuse

* `src/app/layout/PageLayout.tsx` and `PageLayoutContext.tsx` remain the layout and rail integration seams.
* `src/features/world-countries/maps/GeographyOverviewMap.tsx` remains the workflow-neutral World/Continent map presentation.
* `src/features/world-countries/learning/CountryLearningMap.tsx` remains the individual Country learning/recall map presentation.
* Existing Prepare, Drill, Recite, Maintenance, and guided-learning entry points remain workflow owners.
* Existing World Countries architecture rules determine whether code belongs in `learning/`, `maps/`, `prepare/`, `drill/`, or the new feature-local `ui/` capability.
* Existing `core/ui` components should continue to be reused where they already satisfy a feature-independent UI requirement.

Do not replace existing capabilities with parallel abstractions during cleanup.

## Edge cases

* A shared hierarchy row must support Prepare's ordered/trailing presentation and Drill's selected-state presentation without embedding either workflow's policy.
* Hover state and selected state may coexist; selected state must not disappear merely because another row is hovered.
* Keyboard focus must trigger the same relevant map highlighting as pointer hover where currently supported.
* Components rendered in PageLayout drawers must not assume desktop rail width.
* Removing stale Drill actions must not remove a still-reachable guided-learning route.
* Renaming internal files must update imports/tests completely; do not leave compatibility re-export files solely to preserve obsolete internal paths.
* Component extraction must not reset workflow-local React state by introducing unstable component identity or changing keys unnecessarily.
* Refactoring must not cause rails from a previous workflow/phase to remain registered after navigation.
* Completion/result refactoring must retain the distinct wording and domain meaning for Countries versus Capitals even when sharing presentation.

## Out of scope

* Redesigning Prepare, Drill, Recite, Maintenance, or guided learning.
* Changing the map-centered World Countries layout.
* Changing World Countries activity navigation.
* Changing PageLayout geometry, rail widths, center-column width, or breakpoints.
* Introducing a repository-wide design system.
* Standardizing unrelated features.
* Moving World Countries-specific presentation into `core/ui`.
* Changing color semantics for Memo readiness or Drill proficiency.
* Changing learning algorithms, mastery, evidence, scheduling, scoring, persistence, or country classification.
* Adding new user-facing functionality.
* Enabling repository-wide TypeScript `noUnusedLocals` or `noUnusedParameters`.
* Large folder reorganizations unrelated to demonstrated UI ownership or duplication.

## Acceptance criteria

* [ ] Current Prepare, Drill, Recite, Maintenance, guided-learning, map, recall, result, and completion behavior remains functionally unchanged.
* [ ] A narrow `src/features/world-countries/ui/` capability owns World Countries-specific presentation that is demonstrably shared across workflow owners.
* [ ] Prepare and Drill no longer independently define equivalent rail-panel presentation.
* [ ] Prepare and Drill no longer maintain separate implementations of the same map-linked geography/hierarchy row concept.
* [ ] Shared UI components contain presentation behavior only and do not acquire Prepare, Drill, learning, or geography-selection policy.
* [ ] Workflow folders do not import sibling workflow internals as a result of the cleanup.
* [ ] `DrillRails.tsx` is decomposed so setup, session, and results rail responsibilities are discoverable rather than accumulated in one broad UI module.
* [ ] Prepare presentation files are similarly decomposed where multiple materially distinct UI responsibilities are currently combined.
* [ ] World Countries React component and presentation naming follows the conventions defined by this Change Spec.
* [ ] Obsolete and unreachable World Countries UI/workflow support code identified during the cleanup is removed rather than retained as compatibility code.
* [ ] Any potentially stale Drill guided/practice actions are reachability-checked and either retained with a current production reason or removed with their unused code/tests.
* [ ] Equivalent panels, breadcrumbs, hierarchy rows, actions, headings, and common states have consistent visual and interaction treatment.
* [ ] Keyboard focus remains visible and map-linked rail interactions remain operable using keyboard navigation.
* [ ] Responsive rail/drawer behavior continues to work without changes to PageLayout geometry or breakpoints.
* [ ] UI tests prefer semantic/behavioral assertions over exact Tailwind utility-class assertions.
* [ ] No persistence schemas, keys, learning evidence, mastery rules, Drill scheduling, country-set behavior, map identity rules, or workflow semantics change.
* [ ] No World Countries-specific component is moved into `core/ui` without an independently justified cross-feature contract.
* [ ] `docs/architecture/features/WORLD_COUNTRIES.md` documents the resulting feature-local shared UI ownership and any source anchors that materially changed.
* [ ] World Countries feature tests pass.
* [ ] TypeScript compilation passes.
* [ ] Production build passes.

## Source anchors

Primary review/refactor anchors:

* `src/features/world-countries/WorldCountries.tsx`
* `src/features/world-countries/prepare/WorldCountriesPrepare.tsx`
* `src/features/world-countries/prepare/WorldCountriesPrepareRails.tsx`
* `src/features/world-countries/drill/WorldCountriesDrill.tsx`
* `src/features/world-countries/drill/DrillSetup.tsx`
* `src/features/world-countries/drill/DrillRails.tsx`
* `src/features/world-countries/drill/DrillResults.tsx`
* `src/features/world-countries/drill/DrillGuidedLearning.tsx`
* `src/features/world-countries/drill/guidedLearning.ts`
* `src/features/world-countries/learning/flows/`
* `src/features/world-countries/recite/WorldCountriesRecite.tsx`
* `src/features/world-countries/maps/GeographyOverviewMap.tsx`
* `src/features/world-countries/learning/CountryLearningMap.tsx`
* `src/app/layout/PageLayout.tsx`
* `src/app/layout/PageLayoutContext.tsx`
* `src/core/ui/`

`PageLayout`, `PageLayoutContext`, and `core/ui` are boundary/reference anchors. They should not require architectural modification for this change.

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` after implementation to document:

* `ui/` as the owner of demonstrated World Countries-specific presentation shared by multiple workflow owners;
* the dependency of relevant workflows on that feature-local presentation capability;
* the rule that shared presentation does not contain workflow policy;
* updated source anchors if large presentation modules are decomposed or renamed.

Do not turn the architecture document into a styling catalogue.

The architecture documentation should describe ownership and boundaries; concrete visual implementation remains in the components.

No ADR update is expected unless implementation changes an existing durable architecture boundary.

## Verification

Complete when the status is changed to `Implemented`.

Required verification:

```text
npx vitest run src/features/world-countries
npx tsc -b
npx vite build
```

Also perform focused verification that:

* Prepare World/Continent/Subregion navigation still works;
* Drill World/Continent setup and selection still work;
* Drill practice and normal Drill start paths still work;
* active Drill recall and results still work;
* guided Country/Capital learning routes that remain supported are reachable;
* map ↔ rail hover/focus synchronization works;
* activity switching does not leave stale rails registered;
* narrow-screen rail drawers render the consolidated components correctly.
