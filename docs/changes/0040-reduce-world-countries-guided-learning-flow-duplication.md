# Change Spec 0040 - Reduce World Countries guided learning flow duplication

- **Status:** Implemented
- **Date:** 2026-08-28
- **Issue:** None.
- **Related ADRs:** None. This is a behavior-preserving refactor inside the existing World Countries Learning ownership boundary and does not introduce a new durable architectural decision.
- **Related changes:** Change Spec 0009 established staged World Countries Learning; later World Countries changes established the shared map/task presentation seams. The recent health cleanup already consolidated staged walkthrough navigation into `StagedWalkthroughStep`.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`
- **Repository / feature scope:** `JolleNo10/major-system-app` — World Countries / Countries only

## Goal

Reduce duplicated orchestration and presentation plumbing between `CountryLearningFlow.tsx` and `CapitalLearningFlow.tsx` without merging their state machines or obscuring their real behavioral differences.

The completed code should make the two flow components smaller and easier to reason about by centralizing only behavior that is currently structurally the same. Country Learning must continue to own its additional Location phases, while Capital Learning must continue to own its Capital-specific transitions, completion reporting, and walkthrough notification behavior.

RepoWise health is a secondary signal. The implementation must optimize for clearer responsibility boundaries and lower duplicated behavior, not for a numeric score target.

## User-visible behavior

There is no intended user-visible behavior change.

Country Learning must continue to run its existing sequence, including:

- Review walkthrough;
- Location practice / Location ready;
- Country-name Practice;
- Combined practice;
- Final recall / repair;
- completion and Country-learning milestone behavior.

Capital Learning must continue to run its existing sequence, including:

- Review walkthrough;
- Capital Practice;
- Combined practice;
- Final recall / repair;
- completion and Capital-learning milestone behavior.

All existing labels, map behavior, task cues, answer semantics, keyboard behavior, order-authoring behavior, progress presentation, expanded-map behavior, milestone writes, and completion behavior remain unchanged.

## Scope

### 1. Centralize shared learning-plan presentation helpers

Both flow components currently contain equivalent logic for deriving the label of the next learning-plan action:

- no next stage -> `Continue to Final recall`;
- next `set` stage -> `Continue to Set N`;
- next combined stage -> `Practise all N`.

Move this derivation to one small shared helper under World Countries Learning.

The helper must operate on the existing staged learning-plan representation. It must not know whether the caller is Country Learning or Capital Learning.

### 2. Centralize order-save plan rebuilding

Both flow components currently rebuild the staged learning plan in the same way after the user saves a Country order:

- map the saved draft to Country IDs;
- rebuild the plan using the existing `maximum`;
- preserve the current stage when possible;
- clamp `stageIndex` to the rebuilt plan;
- reset `walkthroughIndex` to `0`.

Move the common calculation to a pure shared helper.

A suitable result is conceptually:

```ts
{
  countryIds,
  plan,
  stageIndex,
  walkthroughIndex: 0,
}
```

The flow component remains responsible for applying that result to its own state with `setFlow`.

Do not create a generic state-machine type merely to make this helper compile. The helper should depend only on the common data it actually needs.

### 3. Centralize shared map-scope and map-presentation derivation

`CountryLearningFlow.tsx` and `CapitalLearningFlow.tsx` currently duplicate the same core derivation for:

- whether the map shows full `entries` versus current `stageEntries`;
- active walkthrough Country;
- current final-recall Country;
- current practice Country;
- base `CountryLearningMap` presentation flags;
- highlighted/named Country behavior;
- order-authoring map presentation composition;
- practice map height class;
- final-recall aria label;
- `presentationKey`.

Extract this into a focused shared pure helper or narrowly scoped hook under `learning/flows/`.

The shared seam must be workflow-neutral. It may accept the current phase and the IDs/entries needed to derive map presentation, but it must not contain branches such as:

```ts
if (track === 'countries') ...
if (track === 'capitals') ...
```

solely to recreate the two callers.

The helper must allow Country-only phases such as `location-practice` and `location-ready` to pass through without inventing Capital behavior or forcing a generic combined phase model.

### 4. Centralize the duplicated map metadata presentation

Both flows render the same map metadata block:

- current learning scope label;
- number of Countries in map scope;
- singular/plural `country` / `countries`.

Move this identical presentation into one small shared component or helper under `learning/flows/`.

The caller supplies the scope label and map-scope count/entries.

Do not move workflow-specific task headers into this component.

### 5. Keep phase-specific orchestration explicit

After extracting the common seams above, keep genuine Country/Capital differences in their existing owners.

Country Learning must continue to own explicitly:

- `location-practice`;
- `location-ready`;
- `SchedulerLocationPracticeStep`;
- `submitStagedCountryLocation`;
- `startStagedCountryLocation`;
- Country-specific skip/back transitions;
- Country milestone reporting via `markSubregionCountriesLearned`.

Capital Learning must continue to own explicitly:

- its direct walkthrough -> Practice transition;
- `onWalkthroughCountryChange`;
- Capital completion reporting via `createSubregionCapitalCompletionReporter`;
- Capital-specific answer evaluation / feedback;
- Capital-specific skip/back transitions.

Both flows must continue to render their own phase switch and invoke their own staged state-machine functions.

### 6. Do not merge the staged state machines

The following remain separate domain/state-machine modules:

- `src/features/world-countries/learning/stagedCountryLearningFlow.ts`
- `src/features/world-countries/learning/stagedCapitalLearningFlow.ts`

Do not introduce:

- `GenericStagedLearningFlow`;
- a generic reducer that unions every Country and Capital phase;
- mode/track conditionals that parameterize one state machine into two behaviors;
- a broad new `common/`, `domain/`, or framework layer.

Some implementation duplication between the two state machines may be legitimate because their transition graphs differ. That is outside this change unless an extracted helper is obviously pure, identical, and independent of the transition graph.

### 7. Preserve task/header semantics

The two flow components currently have similar-looking header/task switches but the copy and semantics differ.

Do not force these into a shared config-driven phase renderer merely to reduce lines.

Only extract an additional header/task helper if, after implementation, there is a clearly identical block whose extraction makes the code easier to understand without creating a configuration object that is more complex than the duplicated code.

In particular preserve:

- Country `Location -> Country` task semantics;
- Country Practice `Location -> Country`;
- Capital Practice `Country -> Capital`;
- answer-kind semantics;
- set numbering;
- repair traversal context;
- final-recall progress;
- all current copy.

### 8. Keep the current shared walkthrough seam

Continue using:

- `src/features/world-countries/learning/flows/StagedWalkthroughStep.tsx`

Do not recreate Country- or Capital-specific walkthrough wrappers.

## Interaction and states

This is a behavior-preserving refactor.

The state/transition graph must remain unchanged.

### Country Learning

Expected phase ownership remains:

```text
walkthrough
  -> location-practice
  -> location-ready
  -> practice
  -> set-ready
  -> combined-practice / combined-ready as planned
  -> final-gate
  -> final-recall
  -> complete
```

Existing back, skip, keep-practising, repair, and restart transitions remain unchanged.

### Capital Learning

Expected phase ownership remains:

```text
walkthrough
  -> practice
  -> set-ready
  -> combined-practice / combined-ready as planned
  -> final-gate
  -> final-recall
  -> complete
```

Existing back, skip, keep-practising, repair, and restart transitions remain unchanged.

Country-order editing continues to rebuild the remaining staged plan through the same semantics in both flows.

The map must remain mounted through the existing `LearningMapSurface` behavior while flow phases change.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and `src/features/world-countries/AGENTS.md`.
- Work only inside World Countries unless an existing direct dependency genuinely requires a change.
- `learning/flows/` continues to own Country and Capital Learning UI/orchestration.
- `learning/` continues to own the staged learning plan and state-machine mechanics.
- `maps/` remains workflow-neutral.
- `ui/` ownership established for shared task/answer presentation is unchanged.
- `CountryLearningFlow` and `CapitalLearningFlow` remain separate workflow coordinators.
- Do not move Country Learning into Drill internals or make Learning depend on Drill.
- Do not introduce persistence or migration changes.
- Do not alter Learning milestone ownership.
- Do not change scheduler mechanics, ordered recall, answer matching, aliases, fuzzy matching, or evidence behavior.
- Prefer pure shared derivation helpers over hooks when React state/lifecycle is not required.
- Do not add abstractions whose only justification is improving RepoWise metrics.

No ADR is required.

## Existing capabilities to reuse

- `src/features/world-countries/learning/stagedLearningPlan.ts`
  - Existing owner of staged Set / Combined / Final plan construction.
- `src/features/world-countries/learning/stagedCountryLearningFlow.ts`
  - Country Learning transition/state owner; keep separate.
- `src/features/world-countries/learning/stagedCapitalLearningFlow.ts`
  - Capital Learning transition/state owner; keep separate.
- `src/features/world-countries/learning/flows/useLearningCountryOrderAuthoring.ts`
  - Existing shared Country-order authoring/presentation seam used by both flows.
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx`
  - Existing mounted Learning map host.
- `src/features/world-countries/learning/flows/StagedWalkthroughStep.tsx`
  - Existing shared walkthrough/navigation component.
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
  - Existing shared Learning rail presentation.
- `src/features/world-countries/learning/flows/StagedLearningReadyStep.tsx`
  - Existing shared ready/final-gate presentation.
- `src/features/world-countries/learning/flows/StagedFinalRecallStep.tsx`
  - Existing shared Final recall presentation.

## Edge cases

- Reordering while on a later plan stage must clamp the stage index exactly as today.
- Reordering resets walkthrough position to the first Country exactly as today.
- A one-Set learning scope must retain the existing no-duplicate-Combined behavior from `buildLearningPlan`.
- Final-gate, Final recall, and Complete maps must continue to use the full learning scope.
- Stage-local phases must continue to use the current stage scope, with the existing order-authoring fallback.
- Empty or unexpectedly missing `stageEntries` must retain the existing map fallback behavior.
- Final-recall highlighted Country and practice highlighted Country must not become stale after phase transitions.
- Country-only Location phases must not accidentally receive a Capital-style practice highlight or task.
- Capital `onWalkthroughCountryChange` must continue to publish the active walkthrough Country and clear it outside walkthrough.
- Completion must still be reported once according to each flow's existing completion mechanism.
- Temporary proficiency Learning scopes must remain non-milestone-writing when `recordCompletion` is false.

## Out of scope

- Merging Country and Capital state machines.
- Redesigning staged learning progression.
- Changing Set sizing or `buildLearningPlan`.
- Changing scheduler thresholds or practice progress.
- Changing answer matching, aliases, fuzzy behavior, spelling remediation, or feedback dwell.
- Changing Country/Capital task colors or answer-kind semantics.
- Changing map zoom, SVG geometry, tiny-country assistance, synthetic dots, or pointer intent.
- Changing rail layout, map layout, expanded/fullscreen behavior, or visual copy.
- Refactoring `subregionLearningStore.ts`; treat that as a separate follow-up.
- Refactoring `DrillSetup.tsx`.
- Further `SvgMapController` restructuring.
- Chasing RepoWise score changes beyond the actual code-quality improvement.

## Acceptance criteria

### Shared derivation

- [ ] The duplicated next-ready-label logic is implemented once and reused by both flows.
- [ ] The duplicated order-save learning-plan rebuild calculation is implemented once as a pure helper and reused by both flows.
- [ ] The common map-scope / map-presentation / presentation-key derivation is implemented once and reused by both flows.
- [ ] The duplicated map scope metadata presentation is implemented once and reused by both flows.
- [ ] Shared helpers have no Country-vs-Capital branching unless it represents an actual common semantic rather than caller identity.

### Architecture

- [ ] `CountryLearningFlow.tsx` remains the explicit Country Learning coordinator.
- [ ] `CapitalLearningFlow.tsx` remains the explicit Capital Learning coordinator.
- [ ] `stagedCountryLearningFlow.ts` and `stagedCapitalLearningFlow.ts` remain separate.
- [ ] No generic state-machine framework, mode-driven mega-component, or broad `common/` layer is introduced.
- [ ] Country-only Location phases remain visible and understandable directly from `CountryLearningFlow.tsx`.
- [ ] Capital-specific completion and walkthrough notification remain visible and understandable directly from `CapitalLearningFlow.tsx`.

### Behavior preservation

- [ ] Country Review -> Locate -> Practice behavior is unchanged.
- [ ] Capital Review -> Practice behavior is unchanged.
- [ ] Set / Combined / Final recall progression is unchanged.
- [ ] Back / Skip / Keep practising behavior is unchanged.
- [ ] Country-order editing and Save behavior is unchanged.
- [ ] Final recall repair behavior is unchanged.
- [ ] Country and Capital completion/milestone behavior is unchanged.
- [ ] Current map scope, highlight, names, order numbers, hover behavior, and aria labels are unchanged.
- [ ] Current task/header copy is unchanged.
- [ ] Existing standard and expanded Learning map behavior is unchanged.

### Regression coverage

- [ ] Existing Country Learning flow/state tests remain green.
- [ ] Existing Capital Learning flow/state tests remain green.
- [ ] Add focused unit tests for new pure shared derivation helpers.
- [ ] Existing order-authoring integration tests remain green.
- [ ] Existing Learning map/task integration tests remain green.

## Source anchors

- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/flows/useLearningCountryOrderAuthoring.ts`
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx`
- `src/features/world-countries/learning/flows/StagedWalkthroughStep.tsx`
- `src/features/world-countries/learning/stagedLearningPlan.ts`
- `src/features/world-countries/learning/stagedCountryLearningFlow.ts`
- `src/features/world-countries/learning/stagedCapitalLearningFlow.ts`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `src/features/world-countries/AGENTS.md`

## Documentation impact

No current-state architecture change is expected.

If implementation reveals a genuinely new ownership rule, stop and evaluate whether an architecture update or ADR is required rather than silently encoding that decision in a helper.

Do not rewrite historical change specs.

## Verification

Complete this section when setting the status to `Implemented`.

Minimum verification:

```bash
npx vitest run src/features/world-countries/learning
npx vitest run src/features/world-countries
npm run typecheck
```

Completed on 2026-08-28 (the host PowerShell environment used the equivalent
`.cmd` shims):

- `npx vitest run src/features/world-countries/learning` — 35 files, 150 tests passed.
- `npx vitest run src/features/world-countries` — 100 files, 490 tests passed.
- `npm run typecheck` — passed (`tsc -b`).
- `repowise update` — already up to date.
- `repowise health` — `CountryLearningFlow.tsx`: score 4.4, CCN 19, Nest 2,
  NLOC 247; `CapitalLearningFlow.tsx`: score 4.4, CCN 16, Nest 2, NLOC 235.

After behavioral verification, rerun:

```bash
repowise health
```

RepoWise is informational. Record the resulting `CountryLearningFlow.tsx` and `CapitalLearningFlow.tsx` scores/NLOC if useful, but do not make follow-up edits solely to meet a numeric threshold.
