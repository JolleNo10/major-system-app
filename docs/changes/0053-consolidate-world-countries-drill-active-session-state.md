# Change Spec 0053 - Consolidate World Countries Drill Active Session State

- **Status:** Implemented
- **Date:** 2026-09-01
- **Issue:** None.
- **Related ADRs:** None. This is a behavior-preserving state-ownership refactor inside the existing World Countries Drill coordinator boundary.
- **Related changes:** Change Spec 0043 reduced Learning-run responsibilities in `WorldCountriesDrill.tsx` and deliberately left Drill/Practice session refactoring out of scope.
- **Current-state docs:** [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md)
- **Repository / feature scope:** `JolleNo10/major-system-app` — World Countries / Countries only

## Goal

Make one active Drill or non-recording Practice run a single coherent piece of transient coordinator state instead of representing the same run through several independent React state variables.

`WorldCountriesDrill.tsx` currently stores the active session cursor, launch selection, scope label, activity kind, interaction kind, and accumulated answers separately. Those values are created together, consumed together throughout the run/results lifecycle, and cleared together. The launch resolver already produces most of them as one coherent snapshot, so splitting them immediately into independent state creates unnecessary lifecycle coupling and permits combinations that do not represent a valid run.

Refactor that ownership so one successful Drill/Practice launch installs one complete active-run aggregate, subsequent answer/session updates preserve that aggregate, and exit/invalidation clears it as one unit.

This is a behavior-preserving cleanup. It must not change Drill, Practice, Learning, setup, evidence, persistence, retry, ordering, proficiency, or presentation semantics.

## User-visible behavior

There is no intended user-visible behavior change.

Preserve the existing behavior for:

- starting each recorded Drill mode;
- starting each non-recording Practice mode;
- Geography-backed and proficiency-backed launch scopes;
- active session progress and map/task presentation;
- exact/fuzzy/assisted answer handling;
- Drill evidence recording;
- Practice remaining strictly non-recording;
- transition from active session to results;
- Retry Failed Countries;
- Run again/restart behavior;
- changing setup after leaving a run;
- active-Country-population incompatibility returning an active run to setup;
- guided Learn Countries / Learn Capitals runs.

No migration, reset, or persistence change is required.

## Scope

### 1. Introduce one coordinator-owned active Drill/Practice run aggregate

Replace the parallel run-only state currently held by `WorldCountriesDrill.tsx` with one feature-local aggregate representing the active Drill or Practice run.

The aggregate should conceptually contain the state that shares the same run lifetime, including:

- the current `DrillSessionState`;
- the launch selection snapshot used by session/results presentation;
- the launch scope label;
- whether the run is recorded Drill or non-recording Practice;
- the Practice/recall interaction needed by the active presentation and evidence path;
- the answers accumulated for this run.

A conceptual shape is:

```ts
type ActiveDrillRun = {
  session: DrillSessionState
  selection: WorldCountriesDrillSelection
  scopeLabel: string
  activity: 'drill' | 'practice'
  interaction: PracticeSessionInteraction
  answers: DrillAnswerRecord[]
}
```

This shape is illustrative, not mandatory. Inspect the current callers and tests before choosing the final type. If another launch-owned semantic value is required to preserve behavior cleanly, include it rather than reconstructing it later from incidental session fields.

Do not put setup preferences, `purpose`, `learningRun`, `setupContinent`, Geography revision state, or other differently scoped coordinator state into this aggregate.

Do not introduce a global store, persistence record, generic workflow framework, or reducer merely to package these fields.

### 2. Apply a successful launch atomically

Continue to use `resolveDrillSessionLaunch(...)` as the Drill/Practice launch-resolution seam.

A successful resolved launch must be converted into a complete active-run value and installed through one active-run state transition. Creating a new run must also reset its answer history as part of constructing that value.

An empty/invalid launch must leave setup state intact and must not install a partial run.

The existing asynchronous proficiency launch path may remain asynchronous. This Change Spec does not require redesigning launch cancellation or concurrency.

If `WorldCountriesDrillSessionLaunch` lacks an explicit semantic value that the active lifecycle genuinely needs, extend that existing launch contract and its focused tests. Prefer carrying launch-owned intent explicitly over later inferring it from combinations such as interaction plus skill.

### 3. Update the active run as one lifecycle object

During an active run:

- answer accumulation must update the active run without disconnecting it from its session snapshot/metadata;
- `submitDrillStep(...)` remains the owner of pure cursor/session progression;
- completion continues to move the top-level phase to results while retaining the same completed active run for results rendering and retry calculations;
- result presentation must read the selection, scope label, activity, interaction, session, and answers from the same run aggregate;
- Practice answer conversion must continue to use the active interaction/evidence-kind semantics;
- recorded Drill evidence must still be written only for eligible non-assisted Drill answers.

Use functional state updates or an equivalent approach where needed so session/answer changes are based on one current active-run value rather than independently captured sibling states.

Do not move pure session mechanics from `drillSessionState.ts` into React state management.

### 4. Make run exit and invalidation atomic

When leaving a Drill/Practice run, clear the active-run aggregate as one operation.

Preserve the existing population compatibility rule: if an active Drill/Practice session is no longer compatible with the active Country population, discard that run and return to setup.

Do not clear unrelated setup preferences or persistent Drill configuration when the active run is discarded.

Guided Learning remains separately owned by `learningRun` and its existing phase/lifecycle.

### 5. Preserve retry and restart semantics

Retry and restart must continue to launch a new run rather than mutate the completed run in place.

#### Retry Failed Countries

Preserve the current behavior:

- available only for recorded Drill results where failed Countries are retryable;
- retries exactly the failed Country subset;
- does not alter the configured Geography selection or persisted preferences;
- starts with a fresh answer list;
- keeps the applicable Drill mode and launch semantics.

#### Run again / restart

Preserve the current behavior for both recorded Drill and non-recording Practice.

For Practice in particular, avoid reconstructing the intended Practice mode from incidental runtime fields if the launch contract can carry the semantic identity directly and more safely. The exact representation is implementation-defined, but restart must reproduce the same configured Practice activity without making Practice record evidence.

Do not make the last Retry Failed Country subset become the persisted/configured Run again scope.

### 6. Keep top-level phase and setup ownership explicit

`WorldCountriesDrill.tsx` remains the React coordinator described by the current architecture.

The existing top-level phase model may remain separate from the active-run aggregate. Do not broaden this change into a generalized state-machine rewrite.

Maintain the practical invariant that:

- setup and guided Learning do not require an active Drill/Practice run;
- recall, Practice, and Drill/Practice results operate on one coherent active run.

If a small phase simplification follows directly from the aggregate and is demonstrably behavior-preserving, it is acceptable, but reducing the number of phase states is not an objective of this Change Spec.

## Interaction and states

This is a behavior-preserving refactor.

The user-facing lifecycle remains:

```text
setup
  -> recall (recorded Drill)
  -> results
  -> retry / run again / setup

setup
  -> practice (non-recording Practice)
  -> results
  -> run again / setup

setup
  -> learning
  -> setup
```

### Before a Drill/Practice launch

- no active Drill/Practice run exists;
- setup preferences, Geography/proficiency scope, purpose, and mode remain coordinator setup state.

### Successful launch

- launch scope is resolved through `resolveDrillSessionLaunch(...)`;
- one complete active-run value is created;
- the run's answer list starts empty;
- phase enters recorded recall or non-recording Practice according to the resolved activity.

### Active run

- session cursor and answer history evolve inside the same run aggregate;
- launch-scoped selection/scope/activity/interaction remain stable for the run;
- changing live setup/persistence elsewhere must not silently rewrite the run snapshot.

### Results

- the completed active run remains available as the authoritative source for result presentation, retry eligibility, and Run again semantics;
- entering results does not create a second result-state copy of the same run metadata.

### Exit / incompatible active population

- the complete active run is discarded;
- phase returns to setup;
- unrelated setup/persistent state is preserved according to current behavior.

## Architecture constraints

- Follow `src/features/world-countries/AGENTS.md` and `docs/architecture/features/WORLD_COUNTRIES.md`.
- Stay inside World Countries plus direct existing dependencies.
- `WorldCountriesDrill.tsx` remains the top-level Drill setup coordinator and owner of active sessions/results.
- `practice/` remains the owner of reusable non-recording Practice execution and presentation; do not move Practice UI/state machines into `drill/`.
- `drillSessionLaunch.ts` remains the focused launch-snapshot seam for Drill/Practice.
- `drillSessionState.ts` remains the pure Drill cursor/session mechanics seam.
- `drillSelection.ts` remains the setup/effective Geography selection owner.
- Durable evidence rules remain in the existing learning/recall evidence seams; the active-run aggregate is transient workflow state only.
- Do not persist active-run state or change Drill preference persistence/schema.
- Do not create broad `common/`, `domain/`, `persistence/`, or generic workflow abstractions.
- Prefer reuse and local consolidation over introducing a new abstraction layer.
- Do not introduce a generalized reducer/state machine solely to reduce React setter count.

No ADR is required. The change implements the active-session ownership already assigned to `WorldCountriesDrill.tsx` by current-state architecture rather than establishing a new architectural boundary.

## Existing capabilities to reuse

- `src/features/world-countries/drill/drillSessionLaunch.ts`
  - Already resolves one coherent Drill/Practice launch snapshot with selection, scope label, Country snapshot/order, skills, interaction, and activity.
- `src/features/world-countries/drill/drillSessionState.ts`
  - Existing pure `createDrillSession(...)`, `submitDrillStep(...)`, and compatibility mechanics.
- `src/features/world-countries/drill/drillSelection.ts`
  - Existing normalized selection and scope-label behavior.
- `src/features/world-countries/drill/drillResultSummary.ts`
  - Existing failed-Country derivation for Retry Failed Countries.
- `src/features/world-countries/practice/PracticeSession.tsx`
  - Existing non-recording Practice execution/presentation contract.
- `src/features/world-countries/practice/PracticeResults.tsx`
  - Existing Practice results presentation.
- `src/features/world-countries/drill/DrillSession.tsx`
  - Existing recorded Drill session presentation.
- `src/features/world-countries/drill/DrillResults.tsx`
  - Existing recorded Drill results presentation.
- `src/features/world-countries/drill/WorldCountriesDrill.test.tsx`
  - Existing coordinator regression coverage across Drill, Practice, Learning, proficiency, retry, and run lifecycle behavior.
- `src/features/world-countries/drill/drillSessionLaunch.test.ts`
  - Existing focused coverage of launch snapshot resolution.

## Edge cases

- A launch resolving to no Countries must not create an active run.
- An asynchronous proficiency launch must install either one complete resolved run or no run; no partial sibling state may be visible.
- A Geography-backed run must keep the resolved selection/scope presentation that belongs to that launch.
- A proficiency-backed run must retain its existing scope-label behavior.
- Active Country population incompatibility must clear the complete active run and return to setup.
- Practice must remain non-recording even after restart/run again.
- Assisted recorded Drill answers must remain excluded from evidence.
- Answer accumulation must reset for every newly launched run, including Retry Failed Countries and Run again.
- Retry Failed Countries must use the failed Country subset without rewriting persisted/configured Geography selection.
- Run again after a failed-Country retry must preserve the existing configured-activity semantics rather than accidentally treating the retry subset as the new preference scope.
- Results must use metadata from the completed run, not newly normalized live setup state.
- Exiting a run must not clear unrelated setup preferences, Learning state, or World Countries persistence.
- Guided Learning lifecycle and `learningRun` behavior from Change Spec 0043 must remain unchanged.

## Out of scope

- Merging or otherwise deduplicating `CountryLearningFlow.tsx` and `CapitalLearningFlow.tsx`.
- Changing Learning-run launch/progression extracted by Change Spec 0043.
- Redesigning `DrillSetup.tsx` or setup information architecture.
- Changing Drill or Practice modes.
- Changing Geography/proficiency scope behavior.
- Changing session ordering/randomization.
- Changing answer matching, fuzzy matching, spelling remediation, or feedback timing.
- Changing evidence semantics, scoring, mastery, or scheduling.
- Changing Retry Failed Countries or Run again user behavior.
- Changing persistence keys, Drill preference schema, or adding persisted active-session state.
- Solving asynchronous launch cancellation/race behavior unless a concrete regression is exposed while implementing this refactor.
- Introducing a generalized workflow reducer/state machine.
- Refactoring map code or Country/Capital Learning flows.
- Unrelated code-health cleanup.

## Acceptance criteria

### Active-run ownership

- [ ] `WorldCountriesDrill.tsx` has one coordinator-owned active Drill/Practice run state containing the runtime session plus run-lifetime launch metadata and answer history.
- [ ] Independent sibling React state for `sessionSelection`, `sessionScopeLabel`, `sessionActivity`, `sessionInteraction`, and `answers` is removed or otherwise no longer represents the same active run separately from the session.
- [ ] Setup, Learning, navigation, preferences, and other differently scoped state remain separate rather than being swept into the aggregate.
- [ ] No global store, persistence record, generic workflow layer, or broad reducer is introduced.

### Launch and lifecycle

- [ ] A successful `resolveDrillSessionLaunch(...)` result is converted into one complete active-run value and installed atomically.
- [ ] An empty/invalid launch does not install partial active-run state.
- [ ] Answer accumulation and session progression update the active run coherently.
- [ ] Entering results retains the completed active run as the authoritative source for result presentation and retry calculations.
- [ ] Exit and active-population incompatibility discard the active run as one unit.

### Behavior preservation

- [ ] Recorded Drill launch, answer, evidence, completion, and results behavior is unchanged.
- [ ] Non-recording Practice launch, answer, completion, results, and Run again behavior is unchanged.
- [ ] Practice never writes recorded Drill evidence.
- [ ] Assisted Drill answers remain excluded from evidence.
- [ ] Retry Failed Countries still retries only the failed Country subset without changing configured/persisted selection and starts with fresh answers.
- [ ] Run again retains the current configured-activity semantics, including after a retry run.
- [ ] Geography-backed and proficiency-backed session launch behavior remains unchanged.
- [ ] Active-Country-population incompatibility still returns the run to setup.
- [ ] Guided Learning behavior and Change Spec 0043's extracted Learning-run seams remain unchanged.

### Regression coverage

- [ ] Existing `WorldCountriesDrill.test.tsx` behavior remains green.
- [ ] Add or strengthen focused coordinator coverage showing Drill and Practice launches install coherent run metadata and lifecycle state.
- [ ] Keep explicit coverage that Practice restart/run again remains non-recording and retains the intended Practice activity.
- [ ] Keep explicit coverage for Retry Failed Countries and subsequent configured Run again behavior.
- [ ] Keep explicit coverage for active-population incompatibility cleanup.
- [ ] Update `drillSessionLaunch.test.ts` if the launch contract is extended with explicit semantic identity.

## Source anchors

- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
- `src/features/world-countries/drill/WorldCountriesDrill.test.tsx`
- `src/features/world-countries/drill/drillSessionLaunch.ts`
- `src/features/world-countries/drill/drillSessionLaunch.test.ts`
- `src/features/world-countries/drill/drillSessionState.ts`
- `src/features/world-countries/drill/drillSessionState.test.ts`
- `src/features/world-countries/drill/drillResultSummary.ts`
- `src/features/world-countries/practice/PracticeSession.tsx`
- `src/features/world-countries/practice/PracticeResults.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/drill/DrillResults.tsx`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/changes/0043-reduce-world-countries-drill-coordinator-responsibilities.md`

## Documentation impact

No ADR or new architecture boundary is expected.

The current World Countries architecture already states that `WorldCountriesDrill.tsx` owns active sessions/results and that temporary workflow state remains local. This refactor should normally require no architecture-document change because it makes the implementation conform more closely to that existing ownership.

Update `docs/architecture/features/WORLD_COUNTRIES.md` only if implementation reveals a material current-state contract that future work must know; do not document the internal aggregate shape merely because it exists.

When implementation has sufficient risk-proportionate automated evidence, set this Change Spec to `Implemented` and record the verification evidence actually performed.

## Verification

Completed focused automated verification for this localized coordinator/state-ownership refactor:

```text
npx.cmd vitest run src/features/world-countries/drill/WorldCountriesDrill.test.tsx src/features/world-countries/drill/drillSessionLaunch.test.ts src/features/world-countries/drill/drillSessionState.test.ts
```

- Result: 3 files passed, 26 tests passed. Coordinator coverage includes recorded Drill evidence/assistance, Practice restart and non-recording behavior, Retry Failed Countries with configured Run again semantics, and active-population invalidation.
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- Code inspection confirmed the active run is coordinator-owned as one transient aggregate; setup, Learning, Geography revisions, and preferences remain separate.
- Browser/manual verification was intentionally not performed, as prohibited/unnecessary for this behavior-preserving refactor.
- The full repository suite and production build were not run; the change is limited to the World Countries Drill coordinator and its launch contract, with focused coverage plus compile/lint validation providing sufficient evidence.
