# Change Spec 0015 - Show Learning spaced-practice progress in the right rail

- **Status:** Implemented
- **Date:** 2026-08-19
- **Issue:** None.
- **Related ADRs:** None required.
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Make progress through scheduler-driven spaced Practice visible during World
Countries Learning without taking space from the map or task controls. Show
the current temporary scheduler scope as a compact progress indicator in the
right rail while preserving the existing staged-Learning, Ready, map-centered,
and persistence semantics.

## User-visible behavior

During active scheduler-driven Learning Practice, add a compact **Practice
progress** section to the existing right rail.

It appears for:

- Learn Countries:
  - Set Location Practice.
  - Set Country-name Practice.
  - Combined Country-name Practice.
- Learn Capitals:
  - Set Country-to-Capital Practice.
  - Combined Country-to-Capital Practice.

The progress section contains:

```text
Practice progress
67%
[█████████████-------]
4 / 6 at target
```

The percentage and bar use the existing scheduler's continuous progress value.
An item with no advancing recall contributes no progress. The first advancing
spaced-recall level contributes partial progress; reaching the existing Ready
threshold contributes full progress for that item.

The supporting count reports how many items are currently at the scheduler
target, for example `4 / 6 at target`.

Do not expose scheduler level numbers or use **Mastered** as temporary Learning
UI terminology. **Ready** remains the scope-level term used when every item in
the active scheduler scope reaches the threshold.

Progress is live session state:

- it updates after scheduler-relevant answers;
- it may move backwards when an incorrect answer regresses scheduler state;
- a correct answer that is too soon to advance spacing does not increase the
  bar;
- `Keep practising` resumes the retained scheduler state, so a previously Ready
  scope may initially show 100%;
- each fresh Set or Combined scheduler scope starts from its own fresh progress;
- Combined practice does not inherit progress from earlier Set practice.

When the active scheduler scope transitions to a Ready state, the active
Practice progress section is no longer required. Ready/gate presentation
continues to use the existing map-centered checkpoint behavior.

Do not show this progress indicator during:

- Review/walkthrough;
- Ready checkpoints;
- Final recall or its gate;
- Learning completion;
- ordinary Drill sessions;
- non-recording Learn & Practise Practice activities that do not use this staged
  Learning scheduler contract.

## Scope

- Derive active Learning progress from the existing World Countries scheduler
  adapter.
- Present the progress in the existing Learning right rail during the specified
  scheduler-driven phases.
- Cover Country Location, Country-name, Capital, and Combined Learning scopes.
- Keep progress temporary and scoped to the active scheduler session.
- Reuse one World Countries Learning progress presentation rather than
  duplicating phase-specific progress markup.
- Add focused tests for calculation wiring, phase visibility, regression, and
  rail presentation.
- Update current-state World Countries documentation after implementation.

No scheduler algorithm, threshold, Learning-plan, Final-recall, persistence,
Drill-evidence, or Learning-milestone change is required.

## Interaction and states

### Placement

The right rail is the progress/status surface for this change.

At desktop rail widths, the right rail order is:

1. Practice progress, when an active scheduler scope exists.
2. Existing Learning actions such as Back, Skip/next-stage, and Exit.
3. Any other existing right-rail tools that are valid for the current state.

Do not place the progress bar in the center map/task surface, the task dock, or
the quiet-phase left rail.

The map and immediate answer interaction remain the dominant center workspace.

Below the existing `xl` rail breakpoint, retain current PageLayout/drawer
behavior. Progress remains part of the right-rail content and does not need a
duplicate center-surface representation.

### Progress semantics

Use the progress returned by the feature-local scheduler adapter as the source
of truth.

The bar fill is based on continuous scheduler progress:

```text
barPercent = progress.pct * 100
```

Presentation may round the visible percentage to an integer, but bar width must
remain derived from the same progress value.

The item count is derived from the number of keys currently at the scheduler
target and the total active scheduler keys:

```text
N / total at target
```

The UI must not infer progress from question count, answer count, current Set
index, or number of correct answers submitted.

A scope becomes Ready only through the existing scheduler/session transition.
The progress presentation must not introduce or duplicate readiness logic.

### Accessibility

Render the visual bar with progress semantics equivalent to:

- `role="progressbar"`;
- minimum `0`;
- maximum `100`;
- current value derived from scheduler progress;
- an accessible label such as `Practice progress`.

Keep the visible percentage/count available as text.

Do not announce every progress increment through a new assertive or repetitive
live region. Existing Ready-state announcement behavior remains authoritative
for the meaningful scope transition.

## Architecture constraints

Follow [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md)
and the implementation boundaries established by Change Spec 0009 and Change
Spec 0010.

Change-specific constraints:

- `src/features/world-countries/learning/schedulerLearningSession.ts` remains the
  World Countries adapter around the shared scheduler.
- Use `schedulerLearningProgress(...)` as the World Countries progress seam.
  Learning UI must not recreate `roundProgress` rules or calculate scheduler
  levels itself.
- `learning/flows/` continues to own Learning orchestration and phase-specific
  visibility.
- `GuidedLearningRails` remains the existing Learning rail composition surface.
  Extend that composition without moving scheduler semantics into generic
  PageLayout or map components.
- Keep reusable progress presentation World Countries/Learning-local. Do not
  make generic `ui/`, maps, or PageLayout scheduler-aware solely for this
  change.
- `core/scoring/roundScheduler.ts` remains unchanged unless an unrelated defect
  is discovered; no new World Countries scheduling algorithm is allowed.
- Temporary progress remains session-only. It must not be written to
  localStorage, Learning milestones, Drill evidence, Practice results, or any
  new persistence schema.
- Do not change Set planning, Combined-practice placement, Ready thresholds,
  Final recall, Back/Skip semantics, or milestone ownership.
- Do not change map geometry, map remount behavior, task-dock placement, or
  rail widths.
- Do not use temporary scheduler **Mastered** terminology in the Learning UI.

No ADR is required: this change adds presentation of state already owned by the
existing scheduler and Learning architecture.

## Existing capabilities to reuse

- `src/features/world-countries/learning/schedulerLearningSession.ts`
  - `schedulerLearningProgress(...)` is the authoritative feature-local progress
    seam.
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
  - existing right-rail ownership for Learning workflow status/actions.
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
  - owns active Country Location, Country-name, and Combined scheduler sessions.
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
  - owns active Capital and Combined scheduler sessions.
- `src/features/world-countries/learning/flows/SchedulerPracticeStep.tsx`
  - existing typed scheduler Practice interaction.
- `src/features/world-countries/learning/flows/SchedulerLocationPracticeStep.tsx`
  - existing location scheduler Practice interaction.
- existing feature-local panel/typography primitives for visual consistency.

Prefer passing or deriving a small presentation model from the owning Learning
flow rather than coupling rail presentation directly to scheduler internals.

## Edge cases

- A one-item scheduler scope shows `0 / 1 at target` until the item reaches the
  threshold and must not deadlock or divide by zero.
- An empty scheduler scope must not render a misleading progress bar.
- After the first advancing recall for every item, the bar may show partial
  progress even when `0 / N at target`; this is expected.
- A too-soon correct recall may leave both percentage and target count
  unchanged.
- A wrong answer may reduce percentage and may reduce the target count.
- `Keep practising` after Ready reuses the existing scheduler state; progress
  may start at 100% and later regress.
- Starting the next Set starts fresh progress for that Set's scheduler scope.
- Starting Combined practice starts fresh progress even when every included
  item was previously Ready in earlier scopes.
- Back into a retained scheduler-backed stage shows progress derived from the
  retained in-memory scheduler snapshot.
- Skip must not fabricate progress or Ready state.
- Temporary proficiency-scoped Learning uses the same progress presentation as
  ordinary Subregion Learning because the scheduler contract is the same.
- Final recall never reuses or displays temporary scheduler progress.

## Out of scope

- An overall Learn Countries/Learn Capitals journey progress bar.
- Combining Set, Combined, and Final-recall progress into one percentage.
- Persisting progress between Learning sessions.
- Changing the two-spaced-recall scheduler threshold or spacing algorithm.
- Changing scheduler weighted selection, anti-repeat behavior, regression, or
  speed policy.
- Changing Ready-state wording or Final-recall qualification.
- Adding progress to ordinary Drill, Recite, Maintenance, or unrelated
  Learn & Practise Practice modes.
- Redesigning rails, PageLayout drawers, map surfaces, or task docks.
- New Learning statistics, analytics, history, or durable per-item mastery
  records.

## Acceptance criteria

- [x] During Learn Countries Location Practice, the right rail shows Practice
  progress derived from the active location scheduler session.
- [x] During Learn Countries Set Country-name Practice, the right rail shows
  Practice progress derived from the active Set scheduler session.
- [x] During Learn Countries Combined practice, the right rail shows Practice
  progress derived from the active Combined scheduler session.
- [x] During Learn Capitals Set Practice and Combined practice, the same
  progress presentation is shown from their active scheduler sessions.
- [x] The visual bar uses `schedulerLearningProgress(...).pct`; the UI does not
  infer progress from submitted-question or correct-answer counts.
- [x] The visible supporting count reports `N / total at target` without using
  temporary **Mastered** terminology.
- [x] A first advancing recall can increase the bar before the corresponding
  item is counted as at target.
- [x] A too-soon correct answer does not falsely increase progress.
- [x] Scheduler regression after a wrong answer is reflected by a decreasing
  bar/count when applicable.
- [x] A fresh Set or Combined scheduler scope starts with fresh progress and
  does not inherit progress from another scheduler scope.
- [x] `Keep practising` reflects retained scheduler state rather than resetting
  it.
- [x] The progress section is not shown for Review, Ready checkpoints, Final
  recall/gate, or completion.
- [x] The center map/task presentation is unchanged; progress is not added to
  the map surface or task dock.
- [x] The quiet-phase left rail remains hidden; progress is placed in the
  existing right rail above Learning actions.
- [x] Existing below-`xl` right-rail drawer behavior is preserved without
  duplicating progress in the center.
- [x] The progress bar exposes accessible progress semantics and text without
  adding noisy per-answer live announcements.
- [x] No new persistence key, milestone write, Drill evidence, scheduler
  algorithm, threshold, or shared-core behavior is introduced.
- [x] Focused tests cover the reusable progress presentation and Country/Capital
  phase wiring.

## Source anchors

- `src/features/world-countries/AGENTS.md`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/changes/0009-stage-world-countries-learning-with-spaced-recall.md`
- `docs/changes/0010-world-countries-map-centered-interaction-qol.md`
- `src/features/world-countries/learning/schedulerLearningSession.ts`
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/flows/SchedulerPracticeStep.tsx`
- `src/features/world-countries/learning/flows/SchedulerLocationPracticeStep.tsx`

## Documentation impact

After implementation, update
`docs/architecture/features/WORLD_COUNTRIES.md` to state that active
scheduler-driven Learning Practice exposes temporary scheduler progress in the
right rail, using the feature-local scheduler progress seam, while the map/task
surface remains unchanged.

Do not create an ADR unless implementation discovers a genuinely new durable
architectural decision.

## Verification

Implementation completed in commit `67ebc96`.

Verification completed:

- Focused progress/rail/flow tests: 15 passed.
- `npx vitest run src/features/world-countries`: 73 files, 300 tests passed.
- `npm run typecheck`: passed.
- Full repository suite with cache disabled: 106 files, 498 tests passed.
- A later full-suite rerun had one unrelated intermittent Settings test
  failure; the isolated Settings test passed on rerun.

```text
npm test -- --cache=false
```
