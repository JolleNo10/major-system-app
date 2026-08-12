# Change Spec 0006 - World Countries UI and code cleanup

* **Status:** Implemented
* **Date:** 2026-08-12
* **Issue:** None
* **Related ADRs:** None
* **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md), [Shared core architecture](../architecture/CORE.md)

## Goal

Clean up World Countries UI structure after the recent Prepare and Drill iterations so future work builds on consistent presentation conventions rather than duplicated components, copied Tailwind treatments, mixed naming, oversized UI modules, and obsolete workflow plumbing.

This is primarily a behavior-preserving refactor.

The implementation must reduce duplication, clarify component ownership, normalize naming, remove confirmed stale code, improve test quality, and document the resulting World Countries UI ownership without introducing another visual or workflow redesign.

## User-visible behavior

The completed World Countries feature must behave substantially as it does before this change.

Prepare, Drill, Recite, Maintenance, guided learning, maps, rails, navigation, selection, learning, practice, recall, results, and completion flows must remain functionally unchanged unless this specification explicitly identifies an existing presentation inconsistency to normalize.

Equivalent UI concepts should become consistent:

* rail panels use one canonical presentation;
* World → Continent → Subregion breadcrumbs use one presentation;
* map-linked geography rows use one interaction model;
* primary and secondary actions use consistent hierarchy;
* headings and eyebrow labels use consistent hierarchy;
* hover, selected, keyboard-focus, disabled, completion, and inactive states behave consistently;
* repeated completion and result presentation reuses the correct capability-owned components.

This change must not introduce a new World Countries visual design.

---

## Implementation sequence

Implement this change in three phases.

### Phase A — Safety and inventory

Before structural refactoring:

1. Preserve the existing behavior test suite.
2. Add characterization/semantic tests where an important UI behavior is insufficiently protected.
3. Confirm the production reachability of suspected stale code.
4. Resolve the Capital guided-learning ownership rule defined below before deleting any related implementation.
5. Identify the exact repeated UI concepts being consolidated.

Do not weaken existing behavior coverage before the production refactor is complete.

### Phase B — Structural cleanup

Perform the component consolidation, file decomposition, naming cleanup, and confirmed stale-code removal.

Behavior tests from Phase A remain the regression guard during this phase.

### Phase C — Test and documentation cleanup

After production behavior is stable:

1. replace brittle implementation-detail assertions with equivalent semantic/behavioral coverage;
2. remove obsolete tests tied only to deleted implementation details;
3. update World Countries architecture documentation;
4. run full verification.

---

## Scope

### Feature-local shared UI capability

Introduce:

`src/features/world-countries/ui/`

This directory owns World Countries-specific presentation concepts shared by multiple capability/workflow owners.

It may contain components such as:

* shared rail-panel surfaces;
* World → Continent → Subregion breadcrumbs;
* shared map-linked geography/hierarchy rows;
* repeated World Countries heading/eyebrow presentation;
* other small shared presentation concepts where demonstrated duplication exists.

A component belongs in `world-countries/ui/` only when:

1. it is presentation rather than workflow/domain policy;
2. it contains World Countries-specific concepts or styling;
3. it has concrete use from more than one World Countries owner, or consolidates an already duplicated feature-wide UI convention.

Do not create:

* `common/`;
* a generic World Countries component library;
* feature-specific abstractions under `core/ui`.

One-off controls remain with their capability/workflow owner.

---

## Shared rail-panel presentation

Prepare and Drill currently reconstruct the same rail-panel surface.

Create one canonical feature-local representation of that surface.

The implementation must remove duplicated definitions of the current canonical panel treatment:

`rounded-xl border border-zinc-800 bg-zinc-900 p-4`

The shared concept may be implemented as a component rather than a raw exported class constant when doing so provides clearer semantics.

### Required result

There must be one canonical definition of the standard World Countries rail-panel surface.

No identical inline copies of the canonical panel class string should remain in World Countries production UI code unless a site is intentionally a distinct visual concept and is documented by its component responsibility.

Do not force visually different panels into the abstraction merely to eliminate similar Tailwind classes.

---

## Shared geography hierarchy row

Consolidate the duplicated map-linked hierarchy row behavior currently implemented separately by Prepare and Drill.

The shared row may accept presentation inputs such as:

* label;
* selected state;
* sequence number;
* secondary/trailing content;
* click handler;
* hover/focus group identity;
* disabled state where required.

It must own the shared interaction behavior for:

* pointer hover;
* pointer leave;
* keyboard focus;
* keyboard blur;
* map-hover synchronization;
* common row structure and focus treatment.

It must **not** decide:

* Drill scope-selection policy;
* Prepare navigation policy;
* Memo readiness;
* proficiency;
* learning order;
* Continent/Subregion membership;
* which geographic entity is selectable.

Those remain with the caller.

### State precedence

Selected state must remain perceptible while another interaction state is present.

Hover/focus styling may accent a selected row but must not erase the semantic selected state.

Keyboard focus must provide the same relevant map-highlight synchronization as pointer hover.

---

## Shared breadcrumbs

Consolidate the repeated World → Continent → Subregion breadcrumb presentation.

The shared breadcrumb presentation owns:

* common layout;
* separators;
* typography;
* link/button presentation;
* accessible navigation semantics.

The workflow owner continues deciding:

* which breadcrumb levels exist;
* destination/navigation behavior;
* labels and IDs.

Do not embed Prepare or Drill navigation policy into the shared component.

---

## Learning completion presentation

`CountryLearningComplete` and `CapitalLearningComplete` represent the same completion-screen presentation structure with capability-specific text and actions.

Consolidate their repeated presentation within the existing `learning/flows/` ownership.

The shared presentation may receive:

* eyebrow text;
* title;
* completion/status copy;
* review callback;
* return callback;
* button labels where necessary.

Country and Capital domain wording must remain distinct.

Do not move guided-learning completion presentation into `world-countries/ui/` merely because the visual structure is reusable; both callers belong to the same `learning/flows/` capability owner.

---

## Drill results presentation

Treat Drill result duplication separately from guided-learning completion presentation.

Where the Drill main results screen and result rails repeat:

* answer summaries;
* accuracy/stat calculations;
* repeated stat tiles;
* result labels;

consolidate those through Drill-owned presentation/data seams.

Shared Drill result components stay under `drill/`.

Do not move Drill result semantics into `world-countries/ui/`.

A shared World Countries UI primitive may be used for a generic surface, but result calculation and Drill-specific meaning remain owned by Drill.

---

## Decompose oversized UI modules

Split presentation modules that currently own several materially different responsibilities.

### Drill

`drill/DrillRails.tsx` must no longer act as the single implementation owner for setup, active-session, and results rails.

Separate at least the major phase responsibilities so an agent can locate them directly.

A suitable resulting organization may include concepts equivalent to:

* `DrillSetupRails`
* `DrillSessionRails`
* `DrillResultsRails`

Additional Drill-owned subcomponents may be extracted where they have clear responsibility.

Do not split files solely to achieve a target line count.

### Prepare

Apply the same responsibility test to:

* `prepare/WorldCountriesPrepare.tsx`
* `prepare/WorldCountriesPrepareRails.tsx`

Per-scope World/Continent/Subregion screens or rail compositions may be separated where doing so materially improves ownership and discoverability.

Do not over-fragment trivial components.

---

## Naming cleanup

Use the following World Countries presentation naming conventions for touched code:

* React component/context files: `PascalCase.tsx`
* hooks, state, algorithms, adapters, stores, and utilities: `camelCase.ts`
* `...Screen`: center-column workflow/screen presentation
* `...Rails`: component responsible for publishing PageLayout rail content
* `...Panel`: contained visual surface inside a screen or rail
* `...Row`: repeated navigation/list row
* `...Flow`: multi-state workflow orchestration
* `...Context`: React context/provider ownership when that is the primary module responsibility

Names should describe the module's current responsibility rather than its historical origin.

### Required root naming cleanup

Rename:

`src/features/world-countries/worldCountriesPopulation.tsx`

to:

`src/features/world-countries/WorldCountriesPopulationContext.tsx`

unless implementation inspection establishes that `Context` materially misrepresents the module's primary responsibility.

Update all internal imports.

Do not retain a compatibility re-export solely for the obsolete internal filename.

### Domain vocabulary

Do not rename stable domain terminology for cosmetic consistency.

Keep:

* Prepare
* Drill
* Recite
* Memo readiness
* Country
* Capital
* Continent
* Subregion
* proficiency
* mastery
* learning evidence

with their existing domain meanings.

---

## Empty obsolete directories

Remove empty feature directories that contradict current World Countries architecture, including:

* `src/features/world-countries/domain/`
* `src/features/world-countries/persistence/`

if they remain empty at implementation time.

Do not replace them.

Their concepts continue to belong to the capability owners defined by the World Countries architecture.

---

## Stale-code cleanup

Perform a production-reachability review over support code left behind by previous World Countries UI structures.

Remove code only when it is confirmed obsolete.

Cleanup may include:

* unused types;
* obsolete props;
* dead helper functions;
* unreachable UI branches;
* abandoned workflow dispatch plumbing;
* tests that exist only for removed code;
* imports and compatibility code for deleted internal paths.

---

## Capital guided-learning decision

Do **not** treat the existing Capital guided-learning implementation as dead merely because current Drill UI does not dispatch all of its actions.

The existing Capital learning flow under `learning/flows/` represents a substantial capability and must be preserved unless current architecture/product documentation explicitly establishes that the capability itself has been abandoned.

For this change:

* preserve `CapitalLearningFlow` and its supporting Capital learning screens/components;
* preserve the capability to perform guided Country → Capital learning;
* inspect the old Drill guided-action model separately;
* remove Drill action IDs, dispatch branches, helpers, or types only when they are no longer required to reach a supported workflow.

In particular, suspected obsolete action plumbing such as:

* `getGuidedLearningActions`;
* `GuidedLearningActions`;
* unused `GuidedLearningActionId` members;
* unreachable `review-*`;
* unreachable legacy combined Drill action branches;

must be removed coherently if they no longer represent a supported entry path.

Do not delete `learning/flows/Capital*` components as part of this cleanup simply because their present Drill entry point is absent.

Activation or redesign of Capital guided learning from the current Drill UI is a product/workflow change and is out of scope.

---

## UI-state consistency

Normalize equivalent presentation states across World Countries for:

* default;
* hover;
* selected/active;
* keyboard focus;
* disabled;
* completion/success;
* warning/error where applicable;
* inactive/map-muted presentation where applicable.

### Focus

Equivalent interactive controls must expose a visible keyboard-focus state.

Use focus treatment consistently across shared geography rows, breadcrumb controls, actions, and other interactive UI touched by the refactor.

### Actions

Primary and secondary actions should use consistent World Countries presentation.

Do not introduce a generic application-wide Button abstraction as part of this change.

Reuse an existing `core/ui` button only where it already represents the required domain-neutral contract.

### Headings

Equivalent:

* eyebrow;
* section heading;
* helper text;
* rail heading;

presentation should be normalized where duplicated.

Do not build a typography framework.

---

## Tests

Refactor UI tests toward observable behavior rather than arbitrary Tailwind implementation details.

### Safety requirement

Do not remove existing implementation-detail assertions before equivalent behavior is protected.

During Phase A/B, existing tests remain in place unless they physically prevent the refactor.

After the refactor is stable, replace brittle assertions with semantic equivalents.

### Prefer testing

* accessible roles;
* accessible names;
* selected/pressed/checked state;
* enabled/disabled state;
* workflow transitions;
* visible user-facing content;
* map/rail synchronization;
* navigation behavior;
* which workflow phase is active;
* absence/presence of meaningful UI states.

### Avoid

Assertions whose only purpose is checking arbitrary utility classes such as:

* padding;
* grid column count;
* exact background utility;
* exact border utility;

unless the styling encodes a deliberate structural contract that cannot reasonably be verified another way.

If a class-based test is retained, its reason should be clear from the test.

---

## Interaction and states

### Rails

Prepare and Drill continue publishing supporting UI through the existing PageLayout rail integration.

Desktop rails and narrow-screen rail drawers remain PageLayout responsibilities.

Shared World Countries rail components must render correctly in both contexts.

### Responsive behavior

Do not alter:

* PageLayout center width;
* left/right rail widths;
* layout breakpoints;
* drawer architecture;
* overall map-centered workflow layout.

Refactored components must tolerate existing center/rail widths without horizontal overflow.

### Map synchronization

Map-linked rail controls must continue to synchronize:

* pointer hover → map highlight;
* keyboard focus → map highlight;
* pointer leave/blur → clear transient highlight;

without changing the owning map APIs or geographic selection rules.

### State lifetime

Component extraction must not accidentally:

* recreate stateful components on each render;
* change keys unnecessarily;
* reset Drill selection/session state;
* reset Prepare draft ordering;
* leave stale rails registered after workflow/phase navigation.

---

## Architecture constraints

Follow:

* [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md)
* [Shared core architecture](../architecture/CORE.md)

Existing ownership rules remain authoritative.

### Workflow-neutral shared presentation

Presentation shared by sibling World Countries workflow owners must not be owned by one sibling workflow.

Use:

`src/features/world-countries/ui/`

for demonstrated feature-specific shared presentation.

Do not solve duplication by introducing imports such as:

* `prepare/` → `drill/`
* `drill/` → `prepare/`

### Workflow ownership remains unchanged

* `prepare/` owns preparation navigation, order authoring, Memo readiness presentation, and mnemonic authoring.
* `drill/` owns Drill setup, preferences, geographic selection, practice/recall orchestration, sessions, and results.
* `learning/flows/` owns reusable guided Country and Capital learning presentation/orchestration.
* `learning/` owns reusable recall and learning semantics.
* `maps/` owns map infrastructure and workflow-neutral geographic map presentation.
* `recite/` owns Recite.
* `maintenance/` owns Maintenance.
* `WorldCountries.tsx` remains the feature shell/composition owner.

### Feature UI boundary

`world-countries/ui/` must contain presentation only.

It must not own:

* stores;
* persistence;
* Drill selection;
* learning state;
* Memo readiness;
* proficiency;
* scheduling;
* Country membership;
* map translation;
* workflow transitions.

### Core boundary

Do not move World Countries concepts to `core/ui`.

A shared feature component must not be promoted to core solely because it could theoretically be useful elsewhere.

Core extraction requires:

* no World Countries semantics;
* a feature-independent contract;
* a concrete cross-feature consumer or independently justified shared need.

No such extraction is required by this change.

### PageLayout boundary

Do not change PageLayout architecture.

Continue using the existing:

* PageLayout;
* rail context;
* layout-header integration;

as currently defined.

---

## Behavior and persistence freeze

This cleanup must not change:

* active country population resolution;
* Country IDs;
* Continent IDs;
* Subregion IDs;
* Country membership;
* user-authored geography order semantics;
* learning evidence IDs;
* proficiency calculations;
* mastery calculations;
* Memo readiness;
* Drill scheduling;
* Drill preference schema;
* scoring;
* mnemonic persistence;
* country-set settings;
* map SVG IDs;
* Country ↔ SVG translation;
* backup format;
* storage keys;
* storage schemas.

No migration is expected.

---

## Existing capabilities to reuse

Reuse the established seams rather than creating parallel mechanisms:

* `src/app/layout/PageLayout.tsx`
* `src/app/layout/PageLayoutContext.tsx`
* `src/features/world-countries/maps/GeographyOverviewMap.tsx`
* `src/features/world-countries/learning/CountryLearningMap.tsx`
* existing `learning/flows/` Country and Capital learning flows
* existing Prepare entry/orchestration
* existing Drill entry/session orchestration
* existing Recite and Maintenance workflow entries
* existing domain-neutral `core/ui` components where already appropriate

Do not replace these as part of cleanup.

---

## Edge cases

* Prepare hierarchy rows must still support sequence/trailing content.
* Drill hierarchy rows must still support selected state and summary content.
* The shared row must support both without embedding workflow policy.
* Selected state remains perceptible during hover/focus.
* Keyboard focus must trigger relevant map highlighting.
* Drawer rendering must not assume desktop rail width.
* Renaming modules must update imports and tests completely.
* Do not leave internal compatibility wrappers for old filenames.
* Capital guided learning must survive cleanup even if its current Drill dispatch plumbing is removed.
* Removing a guided action requires coordinated removal of its type members, branches, helpers, callers, and tests.
* Drill result refactoring must not change result calculation.
* Country/Capital completion consolidation must preserve their different copy and domain meaning.
* Component extraction must not reset workflow-local state.
* Rails must still unregister correctly during phase/workflow changes.
* Similar-looking controls with different semantics must not be forced into one abstraction.

---

## Out of scope

* Redesigning Prepare.
* Redesigning Drill.
* Redesigning Recite.
* Redesigning Maintenance.
* Redesigning guided learning.
* Adding a new Capital-learning entry point.
* Removing the Capital-learning capability.
* Changing activity navigation.
* Changing the map-centered layout.
* Changing PageLayout geometry or responsive breakpoints.
* Changing Memo readiness colors.
* Changing Drill proficiency colors.
* Changing map geometry or assets.
* Changing learning algorithms.
* Changing mastery rules.
* Changing evidence rules.
* Changing Drill scheduling.
* Changing scoring.
* Changing persistence.
* Changing country classification.
* Introducing a repository-wide design system.
* Standardizing unrelated features.
* Creating generic `common/` infrastructure.
* Promoting World Countries UI into `core/ui`.
* Enabling repository-wide `noUnusedLocals`.
* Enabling repository-wide `noUnusedParameters`.
* Broad folder reorganization unrelated to demonstrated cleanup needs.

---

## Acceptance criteria

### Behavior

* [x] Prepare behavior remains functionally unchanged.
* [x] Drill setup behavior remains functionally unchanged.
* [x] Active Drill behavior remains functionally unchanged.
* [x] Drill results remain functionally unchanged.
* [x] Recite remains functionally unchanged.
* [x] Maintenance remains functionally unchanged.
* [x] Existing supported guided Country learning remains functional.
* [x] Existing Capital guided-learning implementation remains present and functional at its capability boundary.
* [x] Map interactions remain functionally unchanged.
* [x] No persistent state or learning semantics change.

### Shared UI

* [x] `src/features/world-countries/ui/` exists as the owner of demonstrated World Countries-specific cross-workflow presentation.
* [x] `world-countries/ui/` contains no workflow state, stores, persistence, learning policy, or selection policy.
* [x] Prepare and Drill do not import one another's internal presentation to share UI.
* [x] The standard World Countries rail-panel surface has exactly one canonical implementation.
* [x] No unintentional duplicate of `rounded-xl border border-zinc-800 bg-zinc-900 p-4` remains in World Countries production UI code.
* [x] The repeated World → Continent → Subregion breadcrumb pattern uses one shared presentation implementation.
* [x] Prepare and Drill use one shared map-linked geography-row interaction implementation.
* [x] Keyboard focus and pointer hover both preserve map ↔ rail synchronization.
* [x] Selected state remains visually perceptible during hover/focus.

### Learning and Drill presentation

* [x] Country and Capital learning completion screens share their duplicated presentation through `learning/flows/`.
* [x] Country-specific and Capital-specific completion wording remains distinct.
* [x] Drill result calculations remain Drill-owned.
* [x] Duplicate Drill result/stat presentation is consolidated where the same concept appears in main content and rails.

### File structure

* [x] Drill setup, active-session, and results rail responsibilities are no longer accumulated in one broad `DrillRails.tsx` implementation.
* [x] Prepare screen/rail modules are decomposed where they currently combine materially distinct World/Continent/Subregion responsibilities.
* [x] Extracted files have clear ownership/responsibility rather than being split solely by size.
* [x] `worldCountriesPopulation.tsx` is renamed to a PascalCase context/component filename, preferably `WorldCountriesPopulationContext.tsx`.
* [x] Internal imports are updated without compatibility re-export wrappers.
* [x] Empty `world-countries/domain/` and `world-countries/persistence/` directories are removed if still empty.

### Stale code

* [x] `getGuidedLearningActions` has a confirmed production justification or is removed.
* [x] `GuidedLearningActions` has a confirmed production justification or is removed.
* [x] Unsupported/unreachable Drill guided-action IDs and dispatch branches are removed coherently.
* [x] Capital learning-flow components are not removed merely because a current Drill dispatcher does not expose them.
* [x] No known obsolete UI branch remains solely for compatibility with deleted internal behavior.
* [x] No stale tests remain for code removed by this change.

### Naming and UI conventions

* [x] Touched React component/context files follow PascalCase naming.
* [x] Touched hooks/utilities/state files follow camelCase naming.
* [x] `Screen`, `Rails`, `Panel`, `Row`, `Flow`, and `Context` suffixes reflect actual responsibility.
* [x] Existing World Countries domain terminology is preserved.
* [x] Equivalent panels, breadcrumbs, headings, actions, and interaction states use consistent presentation.

### Tests

* [x] Existing behavior tests are kept as regression protection through the structural refactor.
* [x] Characterization/semantic tests are added before refactoring where behavior was inadequately protected.
* [x] Brittle Tailwind-class assertions are replaced only after equivalent semantic/behavior coverage exists.
* [x] Remaining class assertions represent deliberate structural contracts rather than incidental implementation.

### Architecture

* [x] No workflow folder depends on sibling workflow internals.
* [x] No World Countries-specific abstraction is moved to `core/ui`.
* [x] PageLayout architecture and geometry remain unchanged.
* [x] No generic `common/`, `domain/`, or `persistence/` layer is introduced.
* [x] `docs/architecture/features/WORLD_COUNTRIES.md` documents the resulting `ui/` ownership and relevant updated source anchors.

### Verification

* [x] `npx vitest run src/features/world-countries`
* [x] `npx tsc -b`
* [x] `npx vite build`

---

## Source anchors

Primary implementation/review anchors:

* `src/features/world-countries/AGENTS.md`
* `src/features/world-countries/WorldCountries.tsx`
* `src/features/world-countries/WorldCountriesPopulationContext.tsx`
* `src/features/world-countries/prepare/WorldCountriesPrepare.tsx`
* `src/features/world-countries/prepare/WorldCountriesPrepareRails.tsx`
* `src/features/world-countries/drill/WorldCountriesDrill.tsx`
* `src/features/world-countries/drill/DrillSetup.tsx`
* `src/features/world-countries/drill/DrillSetupRails.tsx`
* `src/features/world-countries/drill/DrillSessionRails.tsx`
* `src/features/world-countries/drill/DrillResultsRails.tsx`
* `src/features/world-countries/drill/DrillResults.tsx`
* `src/features/world-countries/drill/DrillResultStat.tsx`
* `src/features/world-countries/drill/DrillGuidedLearning.tsx`
* `src/features/world-countries/drill/guidedLearning.ts`
* `src/features/world-countries/learning/flows/CountryLearningComplete.tsx`
* `src/features/world-countries/learning/flows/CapitalLearningComplete.tsx`
* `src/features/world-countries/learning/flows/`
* `src/features/world-countries/recite/WorldCountriesRecite.tsx`
* `src/features/world-countries/maps/GeographyOverviewMap.tsx`
* `src/features/world-countries/learning/CountryLearningMap.tsx`
* `src/app/layout/PageLayout.tsx`
* `src/app/layout/PageLayoutContext.tsx`
* `src/core/ui/`
* `docs/architecture/features/WORLD_COUNTRIES.md`
* `docs/architecture/CORE.md`

`PageLayout`, `PageLayoutContext`, and `core/ui` are boundary/reference anchors. They should not require architectural changes for this work.

---

## Documentation impact

After implementation, update:

`docs/architecture/features/WORLD_COUNTRIES.md`

to document:

* `ui/` as the owner of demonstrated World Countries-specific presentation shared across multiple workflow/capability owners;
* that `ui/` contains presentation only;
* that workflows may depend on `ui/`, but `ui/` does not acquire workflow policy;
* resulting dependency arrows where useful;
* renamed/decomposed source anchors where architecture documentation names them;
* removal of obsolete internal structures if currently mentioned.

Do not convert the architecture document into a style guide.

Architecture documentation should describe ownership, dependencies, and boundaries. Concrete Tailwind/style implementation remains in source components.

No ADR is required for this change.

If implementation reveals that completion requires changing:

* PageLayout ownership;
* `core/ui` ownership;
* workflow boundaries;
* persistence ownership;

stop that architectural expansion and handle it through a separate ADR/change rather than silently broadening Change Spec 0006.

---

## Verification

Complete when the status is changed to `Implemented`.

Required automated verification:

```text
npx vitest run src/features/world-countries
npx tsc -b
npx vite build
```

Required focused manual verification:

* Prepare World navigation works.
* Prepare Continent navigation works.
* Prepare Subregion navigation works.
* Prepare ordering controls retain local draft/state behavior.
* Drill World/Continent setup works.
* Entire Continent and Subregion selection work.
* Learn Countries practice entry still works.
* Normal Drill start paths still work.
* Active Drill recall works.
* Drill completion/results work.
* Supported guided Country learning remains reachable.
* Capital learning capability remains intact.
* Map ↔ rail pointer-hover synchronization works.
* Map ↔ rail keyboard-focus synchronization works.
* Switching workflows/phases does not leave stale rails registered.
* Shared rail content renders correctly in narrow-screen drawers.
* No new horizontal overflow is introduced.

When implemented, record:

* implementation date;
* relevant commit/PR;
* automated verification results;
* any intentionally retained duplication with justification.

Implementation record:

* Implementation date: 2026-08-12.
* Commit: the Change Spec 0006 implementation commit on the current branch.
* Automated verification: `npx vitest run src/features/world-countries` (63 files, 221 tests), `npx tsc -b`, and `npx vite build` all passed.
* Retained duplication: smaller `p-3` sub-panels, green completion status surfaces, and map/learning-specific panels remain intentionally distinct visual concepts; the canonical `p-4` surface has one implementation in `ui/WorldCountriesPanel.tsx`.
