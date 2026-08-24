# Change Spec 0036 - Unify World Countries active map-session presentation

- **Status:** Implemented
- **Date:** 2026-08-24
- **Issue:** None.
- **Related ADRs:** None.
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Make active World Countries map sessions use one feature-local presentation
contract instead of each workflow inventing its own standard/fullscreen task UI.

Drill's current expanded treatment is the starting visual direction, but the
result must be shared by all relevant active map workflows: Drill, Practice,
Recite, Today Review, and map-backed Learning/Final Recall. The map remains the
dominant learning surface, the answer interaction remains compact below it, and
expanded mode promotes only the essential task/session information that was
hidden with the rails.

This change must also extract reusable World Countries UI components so future
changes to task hierarchy, progress presentation, and expanded composition are
made once rather than separately per workflow.

## User-visible behavior

Active map sessions have one visual hierarchy:

```text
task / cue
map
answer or map interaction
```

The active task area does not repeat application/activity branding, an
`ANSWER · COUNTRY` / `ANSWER · CAPITAL` badge, or helper copy that merely
restates the obvious action.

### Standard presentation

On desktop with rails visible:

```text
left rail             center                              right rail
geography/context     task                               session/progress
                      map
                      answer interaction
```

The center contains the current task once. Geography, mode, progress, and
actions stay in their existing rail when that workflow already owns them there.

A workflow that does not have equivalent rail information may supply the
minimum session context needed by the shared task presentation; it must not
create a second bespoke header system.

### Expanded presentation

When the map is expanded and rails are hidden, active sessions use the same
feature-local expanded composition:

```text
┌────────────────────────────────────────────┐ ┌───────────────────┐
│ TASK                               context │ │ progress           │
│ Main cue                                   │ │ X / N       42%    │
└────────────────────────────────────────────┘ │ ━━━━━━━━━━━━━━━    │
                                               └───────────────────┘

                         MAP

                  compact interaction
```

The task card is dominant. Secondary context may include geography and
workflow/mode when it is useful after the rails disappear.

The progress card is secondary and contains only meaningful progress
information. If the workflow has no meaningful progress for the active state,
do not render an empty progress card.

The answer dock or map-click instruction remains below the map. It does not
repeat task direction, answer kind, activity branding, or progress.

Expand/collapse must not reset the current question, typed draft, feedback,
scheduler/queue state, map target, or current semantic zoom intent.

## Scope

### Shared feature-local UI

Create or evolve feature-local UI seams under
`src/features/world-countries/ui/` for the common active-session presentation.

The exact names are not mandated, but the implementation should converge on
responsibilities equivalent to:

- a World Countries map-activity/task surface that composes `MapSurface`;
- a reusable task header/prompt presentation;
- a reusable session progress presentation/bar;
- a semantic input model supplied once by workflows and rendered appropriately
  for standard vs expanded presentation.

The shared seam must own presentation decisions. Individual workflows own the
meaning of their task, context, progress, answer evaluation, state transitions,
and evidence.

Do not solve this by creating separate `DrillExpandedHeader`,
`ReciteExpandedHeader`, `TodayExpandedHeader`, and Learning equivalents.

### Drill and non-recording Practice

Migrate active `DrillSession` / Practice presentation to the shared seam.

Preserve:

- existing `deriveDrillTaskPresentation(...)` semantics;
- Country-answer cyan vs Capital-answer violet map task tone;
- current reveal/visibility behavior;
- Drill/Practice rails and session state;
- typed, multiple-choice, and map-click interactions;
- progress calculations.

The current Drill expanded design supplies the visual baseline, but Drill must
stop owning the generic expanded task/progress components.

### Recite active session

Migrate only the active Recite session to the shared task presentation.

Preserve Recite semantics:

- ordered Country progression;
- Countries, Countries + Capitals, and Countries from Capitals modes;
- retry/reveal behavior;
- current-run map outcomes and assistance behavior;
- `Country X of N` meaning.

In active task presentation, remove redundant `World Countries · Recite` and
`ANSWER · ...` chrome. Keep the meaningful current cue, for example `Next
country`, `Capital of <Country>`, or the Capital cue used by Countries from
Capitals.

Expanded Recite must expose the essential mode/context and Country position
through the common layout instead of retaining its normal stacked header.

### Today Review active session

Migrate `TodayReviewSession` to the shared task presentation.

Preserve:

- due-review queue and retry semantics;
- Today evidence recording;
- location vs capital recall behavior;
- delayed retry `Skip for now`;
- map reveal behavior and feedback lifecycle.

Remove redundant answer-kind/activity chrome from the active task surface.
Expanded mode must show only the meaningful review cue plus compact queue/session
progress.

### Guided Learning active map phases

Use the shared presentation for active map-backed Learning phases in Country and
Capital Learning, including the relevant Review/walkthrough, location practice,
typed practice/combined practice, and ordered Final Recall/repair traversal
states.

At minimum the common seam must cover the components currently participating in
the stable `LearningMapSurface` host:

- `SchedulerLocationPracticeStep`;
- `SchedulerPracticeStep`;
- `StagedFinalRecallStep`;
- walkthrough/task context supplied by `CountryLearningFlow` and
  `CapitalLearningFlow`.

Preserve:

- the mounted `LearningMapSurface` model and phase-specific map overrides;
- scheduler state and progress;
- Learning milestone ownership;
- map-click vs typed interaction semantics;
- Final Recall repair behavior;
- Country/Capital answer semantics and current map reveal rules.

Ready/gate/completion states may keep their current non-task presentation; they
must not be forced into a task/progress card merely for visual uniformity.

### Generic map mechanics

Keep `MapSurface` responsible for generic mechanics:

- expansion state and affordance;
- `expanded-center` PageLayout presentation;
- map/feedback/dock mounting;
- dock placement;
- map slot sizing;
- collapse below desktop;
- generic optional companion/legacy seams where still legitimately needed.

Feature-specific task semantics must not move into `MapSurface`.

The shared World Countries task presentation may use the existing
`useMapSurfacePresentation()` context so callers provide task data once instead
of maintaining parallel standard and expanded React trees.

`expandedContext` may remain for non-task callers or other legitimate uses. Do
not delete it merely to complete this consolidation.

## Interaction and states

### Shared task model

Workflows provide semantic information, not layout.

The common input should be capable of expressing:

- primary task direction/eyebrow when meaningful;
- main cue/title;
- compact secondary session context;
- optional progress label;
- current/total and/or percentage;
- the map;
- the current interaction/dock.

An implementation may use React nodes for workflow-specific copy, but should
keep the common data model small and presentation-oriented. Do not put scoring,
matching, scheduling, persistence, geography queries, or workflow state
machines in the shared UI layer.

### Task hierarchy

For active tasks:

- render the primary task/cue once;
- do not render `ANSWER · COUNTRY` or `ANSWER · CAPITAL`;
- do not render `World Countries · <activity>` as an extra task label when the
  activity is already established by navigation/session context;
- do not add helper text that merely says to type/click what the input or task
  already makes clear;
- retain accessible labels on the actual form/map interaction;
- preserve meaningful direction labels such as `Location → Country`,
  `Country → Capital`, `Capital → Country`, or workflow-equivalent semantics
  when they add information.

`WorldCountriesAnswerKindCue` may remain for any non-migrated/non-task use that
still needs it. Do not delete it without checking references after migration.

### Progress

Extract the visually generic progress bar/presentation from Drill ownership.

The shared progress component must support semantic labels supplied by the
workflow, such as:

- `Country 5 / 12`;
- `Review 4 / 10`;
- `7 / 12`;
- scheduler-derived progress.

It may display a percentage when meaningful. Percentage derivation remains with
the workflow/domain helper unless the calculation is a trivial presentation
derivation from explicit current/total values.

Do not redefine scheduler, Recite, Drill, or Today completion semantics just to
make their progress look identical.

### Responsive behavior

- Expanded presentation remains desktop-only according to the existing
  `MapSurface` breakpoint behavior.
- Below the expansion breakpoint, existing standard/mobile flow remains usable.
- The shared expanded top row may collapse gracefully if available width is
  insufficient, but must not reduce the map to a secondary surface.
- Long geography/mode labels must not force the task cue or progress card out of
  the viewport.

### Accessibility

- The primary task remains exposed as a heading/appropriate semantic region.
- Progress has an accessible label; visual percentage is not the only progress
  information.
- Existing typed-answer labels and map `ariaLabel` behavior remain authoritative
  for the interaction.
- Expand/collapse retains its existing accessible name/state.
- Removing visible answer-kind badges must not remove the accessible answer
  label from the form or map interaction.

## Architecture constraints

- Follow [World Countries](../architecture/features/WORLD_COUNTRIES.md).
- Keep this consolidation inside the World Countries feature unless a genuine
  generic `app/` correction is required by the existing `MapSurface` /
  PageLayout seam.
- `ui/` owns shared feature-local task, map-surface, dock, and progress
  presentation.
- `MapSurface` remains workflow-neutral and does not learn Drill, Recite, Today,
  or Learning semantics.
- Workflow/domain owners continue to own task meaning, state, scheduling,
  evidence, persistence, and transitions.
- `learning/flows/` must not import Drill internals to obtain the common
  presentation.
- Recite and Today must not import Drill internals.
- Reuse the existing `WorldCountriesTypedAnswer` lifecycle for typed recall; do
  not create a second answer lifecycle as part of this UI change.
- Keep the existing map camera/refit contract from the current World Countries
  architecture. Presentation consolidation must not change semantic map zoom
  intent or SVG fitting behavior.
- Do not introduce persisted UI state.

No ADR is required. This consolidates presentation under the feature-local
`ui/` ownership that already exists and does not change persistence identity,
public feature boundaries, dependency direction, or cross-feature ownership.

## Existing capabilities to reuse

- `src/features/world-countries/ui/MapSurface.tsx`
  - Existing expand/collapse mechanics, presentation context, map/feedback/dock
    layout, and PageLayout integration.
- `useMapSurfacePresentation()`
  - Preferred seam for a shared task component to render standard vs expanded
    presentation without every workflow maintaining two independent context
    trees.
- `src/features/world-countries/ui/WorldCountriesTypedAnswer.tsx`
  - Existing typed-answer lifecycle and feedback overlay.
- `src/features/world-countries/drill/drillTaskPresentation.ts`
  - Existing Drill semantic task model; keep it Drill-owned while mapping it
    into the shared presentation.
- `src/features/world-countries/drill/drillSessionProgress.ts`
  - Existing Drill progress semantics.
- `src/features/world-countries/drill/DrillSessionProgressPanel.tsx`
  - Source of the currently Drill-named but visually generic progress bar;
    generalize/move the presentation rather than duplicating it.
- `src/features/world-countries/recite/WorldCountriesRecite.tsx`
  - Recite active prompt/session owner.
- `src/features/world-countries/today/TodayReviewSession.tsx`
  - Today active review owner.
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx`
  - Stable mounted map host for guided Learning phases. Extend its presentation
    inputs rather than bypassing it with per-step fullscreen maps.
- `src/features/world-countries/learning/learningPracticeProgress.ts`
  - Existing scheduler progress projection for Learning Practice.
- `src/features/world-countries/learning/flows/SchedulerLocationPracticeStep.tsx`
- `src/features/world-countries/learning/flows/SchedulerPracticeStep.tsx`
- `src/features/world-countries/learning/flows/StagedFinalRecallStep.tsx`

## Edge cases

- A workflow with no meaningful progress must render no empty progress card.
- Countries + Capitals Recite may have Country and Capital prompts for the same
  Country; Country position must remain consistent with existing Recite
  semantics rather than treating each prompt as a new Country.
- Recite retry/reveal must not advance progress early.
- Today retry prompts must preserve the queue semantics already used by Today;
  presentation must not reinterpret a retry as new evidence or a new Country.
- Learning repair traversal progress must reflect the existing ordered-recall
  state and must not change repair mechanics.
- A correct/incorrect/fuzzy feedback overlay active during expand/collapse must
  remain attached to the same task and map.
- Typed text entered before expand/collapse must remain intact.
- Multiple-choice selection state and map-click feedback must remain intact
  across expand/collapse.
- Expanded mode entered while the current map is waiting for a resize/refit must
  still settle on the existing semantic camera intent without cumulative drift.
- Long Capital/Country names and long mode/geography labels must remain
  readable without covering the expand button or progress card.
- Workflows that use a map surface for setup, overview, readiness, or completion
  must not accidentally receive active-task chrome.

## Out of scope

- Changing Drill, Recite, Today, Learning, or Practice scoring/scheduling.
- Changing evidence or milestone persistence.
- Changing map status/proficiency/result colors.
- Changing Country-answer vs Capital-answer task highlight colors.
- Reworking the SVG camera algorithm beyond regressions caused by this change.
- Redesigning Today home/mastery overview.
- Redesigning Drill setup or results.
- Redesigning Recite setup or completion.
- Forcing Learning ready/gate/completion screens into the task presentation.
- A repository-wide generic task component for non-World-Countries features.
- New mobile fullscreen behavior.
- Removing `MapSurface.expandedContext` or `expandedCompanion` solely because
  the migrated active sessions no longer need them.

## Acceptance criteria

### Shared presentation

- [ ] World Countries has one feature-local shared active map-task presentation
      seam used by the relevant workflows rather than separate per-workflow
      fullscreen headers.
- [ ] The shared seam derives standard vs expanded layout from the existing
      map-surface presentation state or an equivalent single source of truth;
      callers do not maintain duplicated standard/expanded task trees.
- [ ] The generic progress visual is no longer Drill-owned in name/placement and
      can render workflow-supplied progress semantics.
- [ ] `MapSurface` remains workflow-neutral and still owns generic expansion,
      map/feedback/dock mounting, and layout mechanics.

### Active task UI

- [ ] Active migrated tasks render one primary cue/direction hierarchy.
- [ ] Active migrated tasks do not render `ANSWER · COUNTRY` or
      `ANSWER · CAPITAL`.
- [ ] Active migrated tasks do not repeat `World Countries · <activity>` as
      redundant task chrome.
- [ ] Helper copy that merely restates the obvious type/click interaction is not
      shown in the active task header/dock.
- [ ] Accessible answer labels and map labels remain present.

### Expanded presentation

- [ ] Drill, Practice, Recite, Today Review, and relevant map-backed Learning
      tasks use the common expanded task composition.
- [ ] When rails disappear, the expanded task card contains the current cue plus
      only useful compact session context.
- [ ] When progress is meaningful, the secondary progress card shows the
      workflow's current/total and percentage/progress bar without duplicating
      task/context copy.
- [ ] A workflow without meaningful progress does not render an empty progress
      card.
- [ ] The map remains the visually dominant region.
- [ ] The answer form or map-click instruction remains compact below the map and
      does not duplicate task/progress labels.

### Workflow regressions

- [ ] Drill preserves all four task modes, answer modes, semantic task map tones,
      reveal rules, and progress behavior.
- [ ] Non-recording Practice remains usable with typed, multiple-choice, and
      map-click interactions as applicable.
- [ ] Recite preserves ordered progression, all three modes, retry/reveal
      behavior, assistance modes, and latest-run outcome semantics.
- [ ] Today Review preserves due queue, retry, Skip, evidence recording, and
      feedback behavior.
- [ ] Country/Capital Learning preserves scheduler behavior, map overrides,
      walkthrough/practice semantics, Final Recall repair behavior, and milestone
      ownership.
- [ ] Typed draft, active feedback, multiple-choice state, and map-click task
      state survive expand/collapse.
- [ ] Existing viewport-aware map camera fitting still refits correctly on
      expand/collapse without drift.

### Maintainability

- [ ] Workflow files provide semantic task/context/progress data to shared UI
      rather than duplicating expanded layout markup.
- [ ] Learning continues to use the stable `LearningMapSurface` host rather than
      creating per-phase alternate fullscreen map paths.
- [ ] No workflow imports another workflow's presentation internals.
- [ ] Meaningful behavior tests cover the shared presentation contract plus
      representative integrations; tests do not freeze exact pixel sizes or
      utility-class strings.
- [ ] Current-state World Countries architecture is updated to describe the
      shared active map-task presentation ownership and remove the Drill-specific
      expanded presentation rule.

## Source anchors

- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/ui/MapSurface.test.tsx`
- `src/features/world-countries/ui/WorldCountriesTypedAnswer.tsx`
- `src/features/world-countries/ui/WorldCountriesAnswerKindCue.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/drill/DrillSession.test.tsx`
- `src/features/world-countries/drill/DrillSessionProgressPanel.tsx`
- `src/features/world-countries/recite/WorldCountriesRecite.tsx`
- `src/features/world-countries/recite/WorldCountriesRecite.test.tsx`
- `src/features/world-countries/today/TodayReviewSession.tsx`
- `src/features/world-countries/today/TodayReviewSession.test.tsx`
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/flows/SchedulerLocationPracticeStep.tsx`
- `src/features/world-countries/learning/flows/SchedulerPracticeStep.tsx`
- `src/features/world-countries/learning/flows/StagedFinalRecallStep.tsx`
- `src/features/world-countries/learning/learningPracticeProgress.ts`
- `docs/architecture/features/WORLD_COUNTRIES.md`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` in the implementation
change.

The current-state document should state that:

- `ui/` owns the shared active map-task/task-header/session-progress
  presentation in addition to generic map-surface/dock presentation;
- active Drill/Practice, Recite, Today Review, and map-backed Learning tasks
  provide semantic task/context/progress data to that shared seam;
- `MapSurface` remains the workflow-neutral expansion/layout mechanic;
- active task composition adapts from standard to expanded from one presentation
  source rather than workflow-authored parallel fullscreen trees;
- expanded mode promotes only essential hidden-rail context/progress and keeps
  the map dominant;
- setup, overview, readiness, and completion screens are not required to use the
  active task presentation.

Replace the current Drill-specific expanded-presentation rule with this general
World Countries active-session rule while retaining Drill-specific task-tone
semantics where they belong.

Do not change unrelated architecture documents.

## Verification

Implemented evidence:

```text
npx vitest run src/features/world-countries/drill/DrillSession.test.tsx src/features/world-countries/maps/WorldCountriesMapClick.integration.test.tsx src/features/world-countries/ui/WorldCountriesActivity.test.tsx src/features/world-countries/learning/flows/SchedulerPracticeStep.test.tsx src/features/world-countries/learning/flows/StagedFinalRecallStep.test.tsx src/features/world-countries/recite/WorldCountriesRecite.test.tsx src/features/world-countries/today/TodayReviewSession.test.tsx
npx vitest run src/features/world-countries
npm run typecheck
git diff --check
```

Results: focused coverage passed (7 files, 49 tests); the World Countries
feature suite passed (92 files, 435 tests); typecheck and diff checks passed.

The real bundled SVG Learning click path is covered by
`WorldCountriesMapClick.integration.test.tsx`, including the shared active-map
task surface's standard/expanded round trip in
`WorldCountriesActivity.test.tsx`. A local Vite HTTP smoke check also served
the app successfully. A browser executable/connector is not available in this
environment, so the manual browser matrix below remains the follow-up needed
for visual confirmation:

- Drill typed recall and one map-click or multiple-choice task;
- non-recording Practice;
- Recite Countries + Capitals;
- Today Review;
- Country Learning location/typed practice;
- Capital Learning typed practice;
- Country or Capital Final Recall.

For each representative active task, verify both standard and expanded
presentation and at least one expand -> collapse round trip.
