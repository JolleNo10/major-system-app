# Implementation Prompt - Change Spec 0036

Implement Change Spec **0036 - Unify World Countries active map-session
presentation** in:

`JolleNo10/major-system-app`

Feature scope is strictly:

`src/features/world-countries/**`

plus existing shared layout files only if the current World Countries
`MapSurface`/PageLayout seam genuinely requires a generic correction.

Do not inspect, redesign, or modify unrelated feature areas.

## Delivery contract

Use:

`docs/changes/0036-unify-world-countries-active-map-session-presentation.md`

as the authoritative delivery contract.

No ADR is required unless implementation discovery proves that the change
actually requires a new durable architectural decision outside the existing
World Countries `ui/` ownership. Do not create an ADR merely because components
move.

## First inspect

Read:

- `/CLAUDE.md`
- `/AGENTS.md`
- `/src/features/world-countries/AGENTS.md`
- `/docs/architecture/features/WORLD_COUNTRIES.md`
- Change Spec 0036

Then inspect the current implementations and their focused tests:

### shared UI

- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/ui/MapSurface.test.tsx`
- `src/features/world-countries/ui/WorldCountriesTypedAnswer.tsx`
- `src/features/world-countries/ui/WorldCountriesTypedAnswer.test.tsx`
- `src/features/world-countries/ui/WorldCountriesAnswerKindCue.tsx`

### Drill / Practice

- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/drill/DrillSession.test.tsx`
- `src/features/world-countries/drill/DrillSessionRails.tsx`
- `src/features/world-countries/drill/PracticeSessionRails.tsx`
- `src/features/world-countries/drill/drillTaskPresentation.ts`
- `src/features/world-countries/drill/drillSessionProgress.ts`
- `src/features/world-countries/drill/DrillSessionProgressPanel.tsx`

### Recite

- `src/features/world-countries/recite/WorldCountriesRecite.tsx`
- `src/features/world-countries/recite/WorldCountriesRecite.test.tsx`
- `src/features/world-countries/recite/reciteSession.ts`

### Today

- `src/features/world-countries/today/TodayReviewSession.tsx`
- `src/features/world-countries/today/TodayReviewSession.test.tsx`
- `src/features/world-countries/today/TodayRails.tsx`
- `src/features/world-countries/today/reviewQueue.ts`

### Learning

- `src/features/world-countries/learning/flows/LearningMapSurface.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/flows/SchedulerLocationPracticeStep.tsx`
- `src/features/world-countries/learning/flows/SchedulerPracticeStep.tsx`
- `src/features/world-countries/learning/flows/StagedFinalRecallStep.tsx`
- `src/features/world-countries/learning/flows/StagedCountryWalkthroughStep.tsx`
- `src/features/world-countries/learning/flows/StagedCapitalWalkthroughStep.tsx`
- `src/features/world-countries/learning/learningPracticeProgress.ts`

Search references to:

- `MapSurface`
- `expandedContext`
- `expandedCompanion`
- `useMapSurfacePresentation`
- `WorldCountriesAnswerKindCue`
- `DrillSessionProgressBar`

within `src/features/world-countries/**`.

Stop discovery once all active map-session callers and the shared seams are
accounted for. Do not scan sibling features.

## Architectural target

The code should end with this responsibility split:

```text
MapSurface
  generic expansion/layout/map/feedback/dock mechanics

World Countries shared task/activity UI
  task hierarchy
  standard vs expanded task composition
  compact secondary session context
  generic progress card/bar
  map-task + dock composition

Workflow owners
  task meaning
  mode/geography/session context
  progress semantics
  answer/retry/scheduling/evidence/transitions
```

Do not solve the problem with independent:

```text
DrillExpandedHeader
ReciteExpandedHeader
TodayExpandedHeader
LearningExpandedHeader
```

The point of 0036 is to remove that axis of duplication.

## Preferred shared-component shape

Exact component names/types are not mandated, but prefer a small feature-local
API under `src/features/world-countries/ui/`.

A reasonable shape is:

```ts
interface WorldCountriesActivityProgress {
  label: string
  current?: number
  total?: number
  percent?: number
}

interface WorldCountriesActivityTask {
  direction?: ReactNode
  cue: ReactNode
  sessionContext?: ReactNode
  progress?: WorldCountriesActivityProgress
}
```

with responsibilities equivalent to:

```text
WorldCountriesMapActivitySurface
WorldCountriesTaskHeader
WorldCountriesSessionProgress
```

A wrapper can compose `MapSurface`, or the shared task context can be passed to
`MapSurface`; choose the smaller design after inspecting current callers.

### Important: one semantic task input, not two trees

Prefer using the existing:

```ts
useMapSurfacePresentation()
```

inside the shared World Countries task/header component.

That allows a caller to provide the semantic task once:

```tsx
<WorldCountriesTaskContext
  direction={...}
  cue={...}
  sessionContext={...}
  progress={...}
/>
```

and lets the shared component decide whether the current presentation is
`standard` or `expanded`.

Avoid this recurring pattern in workflow owners:

```tsx
const context = ...
const expandedContext = ...
```

when both trees express the same task semantics.

Keep `MapSurface.expandedContext` available for legitimate non-task callers;
0036 does not require deleting the generic seam.

## Shared visual contract

### Standard

```text
task
map
interaction
```

With rails present, do not duplicate rail-owned geography/mode/progress in the
center.

### Expanded

```text
[ dominant task + compact context ][ progress-only card ]
[                    MAP                              ]
[              compact interaction                   ]
```

Rules:

- task card is dominant;
- map remains dominant overall;
- progress card is visually secondary;
- omit progress card if there is no meaningful progress;
- answer/map interaction stays below map;
- no duplicate task/progress copy in the dock;
- no full rail recreation.

## Remove redundant active-task chrome

For migrated active tasks, remove:

```text
ANSWER · COUNTRY
ANSWER · CAPITAL
World Countries · Recite
Today · Review
```

when those labels are only redundant activity/answer-kind chrome around the
actual task.

Do not remove meaningful task direction.

Do not remove accessible answer labels from forms/maps.

Do not delete `WorldCountriesAnswerKindCue.tsx` until all references are checked.
If it remains useful outside the migrated active-task contexts, keep it.

Also remove helper sentences whose only function is to restate the visible
input/map action.

## Generic progress extraction

`DrillSessionProgressBar` is visually generic despite its Drill name.

Move/generalize the presentation to `src/features/world-countries/ui/` or an
equivalent shared feature-local location.

The shared progress view should accept workflow-owned values and labels. It must
not import Drill/Recite/Today/Learning state.

Do not centralize progress *semantics*:

- Drill remains derived by Drill;
- Recite remains based on its ordered session/country position;
- Today remains based on its queue semantics;
- Learning scheduler progress remains derived by Learning;
- Final Recall remains based on ordered-recall state.

Only presentation is shared.

## Migrate workflows

### 1. Drill + Practice

Start here because current Drill expanded UI is the visual baseline.

Replace Drill-owned generic expanded task/progress markup with the shared
components.

Preserve:

- `deriveDrillTaskPresentation`;
- direction/cue copy;
- answer labels/placeholders;
- task highlight tones;
- reveal/visibility logic;
- typed/multiple-choice/map-click behavior;
- rails;
- progress semantics.

Do not reintroduce a bottom expanded progress companion.

Update existing Drill presentation tests to assert semantic behavior through the
shared seam rather than exact Drill-owned component structure.

### 2. Recite active session

Do not change Recite setup or completion.

For `phase === 'session'`:

- feed the current prompt/cue into the shared task surface;
- provide compact Recite mode/geography context as useful;
- provide `Country X / N` progress from existing session semantics;
- preserve Countries + Capitals as one Country position while Country and
  Capital prompts occur;
- preserve Countries-from-Capitals cue semantics;
- preserve retry/reveal state.

Expanded Recite must no longer look like the screenshot-style normal stacked
header carried into fullscreen.

Do not alter Recite persistence/outcome logic.

### 3. Today Review

Migrate `TodayReviewSession`.

Provide:

- meaningful recall cue;
- location/capital direction when useful;
- compact Today Review session context;
- queue progress derived from existing queue state.

Preserve:

- delayed retry;
- `Skip for now`;
- evidence writes;
- map reveal;
- typed feedback lifecycle.

Do not modify Today home/mastery overview.

### 4. Guided Learning

Use the stable `LearningMapSurface` host as the integration point.

Do not create a new fullscreen map per Learning phase.

Extend the host/context inputs so active Learning phases can provide shared task
presentation data while keeping one mounted map.

Cover the active phases represented by:

- walkthrough/review;
- location practice;
- typed Country practice;
- typed Capital practice;
- combined practice where the map-task surface is active;
- Final Recall and repair traversal.

Ready/gate/completion states can retain their current presentation.

`SchedulerLocationPracticeStep`, `SchedulerPracticeStep`, and
`StagedFinalRecallStep` should stop owning duplicated task/answer-kind chrome
when hosted on `LearningMapSurface`. They should provide task/dock behavior to
the shared host.

Preserve all scheduler and milestone semantics.

## State-preservation requirement

This is not just visual.

The same task state must remain mounted and valid across:

```text
standard -> expanded -> standard
```

Protect:

- typed draft;
- fuzzy/incorrect/exact feedback;
- delayed transition timer behavior;
- Recite retry/reveal state;
- Today retry state;
- multiple-choice selection state;
- map-click feedback;
- Learning scheduler current item;
- Final Recall traversal state;
- map task target/reveal IDs;
- semantic camera intent.

Do not key/remount workflow state from presentation mode.

## Map behavior

0036 is not a camera or map-domain redesign.

Keep:

- current map component for each workflow;
- current Country/Capital task highlight tone;
- current answer-selection assistance;
- current hidden/visible/named/highlighted IDs;
- current semantic zoom intent;
- viewport-aware expanded fit.

If the shared wrapper changes DOM geometry enough to reveal a camera regression,
fix the regression through the existing measurement/refit seam rather than
adding workflow-specific viewBox constants.

## Tests

Follow root `AGENTS.md`: protect meaningful behavior, not exact Tailwind
classes/pixels.

### Shared UI tests

Add tests that prove the shared seam:

- renders task semantics once;
- renders standard vs expanded composition from the same semantic input;
- shows optional session context/progress only where appropriate;
- omits an empty progress card;
- keeps MapSurface generic;
- does not require separate workflow-specific expanded trees.

### Drill

Preserve/adjust tests for:

- all answer modes remain usable;
- task copy;
- semantic map tone;
- no redundant answer-kind badge;
- no bottom progress companion;
- expand/collapse preserves input/task state.

### Recite

Add focused regression coverage for an active session:

- expanded uses the common task presentation;
- no redundant `World Countries · Recite` or `ANSWER · ...` chrome;
- correct cue and `Country X / N`;
- Countries + Capitals does not double-count Country progress;
- typed draft/retry state survives expand/collapse.

### Today Review

Add focused coverage:

- common active task presentation;
- meaningful review progress;
- no redundant answer-kind/activity chrome;
- retry/Skip behavior unchanged;
- input state survives presentation toggle.

### Learning

Use representative integration tests rather than cloning the same layout test
for every phase.

At minimum cover:

- Country location practice;
- one typed Country/Capital scheduler practice;
- Final Recall/repair.

Prove the shared host does not reset scheduler/ordered state on
expand/collapse.

## Browser verification is mandatory

Run the app and inspect representative flows at desktop width.

### Drill

Check:

- normal rails remain correct;
- expanded dominant task + progress;
- map remains dominant;
- compact dock;
- Country/Capital tone transition remains correct.

### Practice

Check one map-click and/or typed Practice path.

### Recite

Use Countries + Capitals and verify:

- Country prompt;
- Capital prompt for same Country;
- correct Country position;
- retry/reveal;
- standard and expanded composition.

### Today Review

Verify both a normal answer and a retry/Skip state.

### Learning

Verify:

- Country location practice;
- Country or Capital typed practice;
- Final Recall;
- expand/collapse does not change current item.

Also verify at least one long Country/Capital/geography label.

## Documentation

Update:

`docs/architecture/features/WORLD_COUNTRIES.md`

in the same implementation.

Change the current-state ownership/rules so they describe:

- shared World Countries active map-task presentation under `ui/`;
- workflow-owned semantic task/context/progress inputs;
- generic `MapSurface` expansion mechanics;
- one standard/expanded presentation source;
- common use by Drill/Practice, Recite, Today Review, and map-backed Learning;
- non-task setup/overview/ready/completion exclusions.

Replace the current Drill-specific expanded rule with the general rule. Keep
Drill-specific task-tone semantics in Drill/map presentation where they still
apply.

Do not modify unrelated architecture documents.

## Verification commands

Use progressive verification while implementing.

Near completion run:

```text
npx vitest run src/features/world-countries
npm run typecheck
git diff --check
```

Do not mark Change Spec 0036 Implemented until the required browser verification
has passed and the architecture document reflects the delivered current state.

When committing an implementation of this delivery contract, include
`Change Spec 0036` in the commit message.
