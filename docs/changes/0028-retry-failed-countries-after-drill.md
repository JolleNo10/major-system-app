# Change Spec 0028 - Retry failed Countries after Drill

- **Status:** Implemented
- **Date:** 2026-08-22
- **Current-state docs:** [SYSTEM.md](../architecture/SYSTEM.md), [WORLD_COUNTRIES.md](../architecture/features/WORLD_COUNTRIES.md)

## Goal

After completing a World Countries Drill, let the user immediately run another normal Drill limited to the Countries they failed in the just-completed run, so weak Countries can be reinforced without manually rebuilding the scope.

## User-visible behavior

A Country is a **failed Country** for a completed Drill run when at least one answer for that Country in that run is incorrect.

When one or more retryable failed Countries exist, the Drill results right rail shows these actions in this order:

1. **Retry failed countries (N)** — primary action, where `N` is the number of unique failed Countries.
2. **Run again** — reruns the normal configured Drill scope using its existing behavior.
3. **Change scope** — returns to Drill setup using its existing behavior.

When no failed Countries exist, **Retry failed countries** is not shown and the existing **Run again** action remains the primary action.

Selecting **Retry failed countries (N)** starts a new Drill using only those Countries. It is a Country-level retry, not a failed-question replay. The retry keeps the completed run's Drill mode and therefore asks the complete skill set owned by that mode for every failed Country.

Example for `Countries + Capitals`:

- Brunei: Location -> Country correct; Country -> Capital incorrect.
- Myanmar: Location -> Country correct; Country -> Capital incorrect.
- Philippines: both answers correct.

The retry scope is Brunei and Myanmar. Both `Location -> Country` and `Country -> Capital` are asked again for each Country.

After the retry completes, its results contain only that retry run. Failed Countries are recalculated from the new run, so repeated narrowing is supported naturally, for example `5 failed -> retry -> 2 failed -> retry -> 0 failed`.

## Scope

- Derive the failed-Country set from the answer records of the immediately completed Drill run.
- Deduplicate by Country ID: multiple incorrect skills for one Country still produce one failed Country.
- Start a normal Drill session from an explicit transient Country subset.
- Keep the completed run's Drill mode for the retry.
- Apply the existing Drill order policy to the retry subset:
  - `ordered` uses the retry Countries in their effective scope order;
  - `random` creates a fresh random order for the retry run.
- Reset run-local answers/results when the retry starts; do not merge the previous run into the retry results.
- Record Drill evidence during the retry exactly as for an ordinary Drill. Existing assisted-answer and evidence rules remain unchanged.
- Preserve the existing semantics of **Run again** and **Change scope**.

## Interaction and states

### Completed run with failures

- Results stay on the existing map-centered Drill completion surface.
- The result list continues to show the completed run's individual answers.
- The next-action rail exposes **Retry failed countries (N)** as the primary action before the existing actions.
- `N` represents unique Countries that are both failed in the completed run and still available in the active World Countries population.

### Retry active

- The retry uses the existing Drill session UI and answer lifecycle; there is no separate retry mode, badge, or interaction model.
- The active session scope contains only the retry Countries.
- The mode, answer interaction, evidence behavior, progress behavior, and completion behavior are ordinary Drill behavior.

### Retry completed

- Results describe only the retry run and its retry scope.
- The same failed-Country derivation is applied again.
- If failures remain, another **Retry failed countries (N)** action is available.
- If none remain, the retry action disappears.

### Population change

If a Country from the completed run is no longer in the active Country population before a retry starts, it is not retryable. The action count and retry scope use only failed Countries still present in the active population. If none remain, the retry action is absent.

## Architecture constraints

- Follow [WORLD_COUNTRIES.md](../architecture/features/WORLD_COUNTRIES.md): `drill/` owns Drill selection, session mechanics, results, and transient workflow state.
- A retry is a transient Drill session scope. Do not persist retry state, retry chains, failed-Country lists, or a new preference.
- Do not modify the configured geographic selection or proficiency selection to represent the retry subset.
- Do not add a new `WorldCountriesDrillMode`, recall skill, evidence type, or persistence schema.
- Active Drill queues remain snapshots constructed at session start.
- Keep the change inside World Countries Drill unless an existing shared contract genuinely requires modification. No new app/core or cross-feature dependency is expected.
- No ADR is required unless implementation discovers a durable architectural choice not represented by the current architecture.

## Existing capabilities to reuse

- `drill/WorldCountriesDrill.tsx` — existing Drill coordinator and session-start boundary. Extend/reuse this boundary so a Drill can start from an explicit transient Country subset without rewriting persisted/configured selection.
- `drill/drillSessionState.ts` — `createDrillSession` already accepts an arbitrary Country-ID scope and deduplicates it.
- `drill/drillOrder.ts` — existing ordered/random Drill queue semantics must apply to the retry subset.
- `drill/drillResultSummary.ts` and the completed run's `DrillAnswerRecord[]` — derive unique failed Country IDs from current-run answers; keep the derivation pure and testable.
- `drill/DrillResults.tsx` / `drill/DrillResultsRails.tsx` — existing completion surface and next-action rail; add the retry action without creating a new results screen.
- Existing Drill evidence recording through `recordWorldCountriesAttempt` — retry answers use the same recording path as ordinary Drill answers.

## Edge cases

- A perfect run has no retry action.
- One failed answer produces a one-Country retry.
- Several incorrect answers for the same Country produce one retry Country.
- In a multi-skill mode, failing one skill causes all skills for that Country to be drilled again.
- The retry must not include Countries that were fully correct in the immediately completed run.
- A retry must not inherit the previous run's answer records, failed count, or result statistics.
- Repeated retries always derive from the immediately preceding completed run, not the union of failures across the retry chain.
- An explicit retry subset that becomes empty after active-population filtering must not start an empty session.

## Out of scope

- Retrying only the exact failed questions/skills.
- Persisting a failed-Country queue across navigation, reload, or app restart.
- Changing Drill mastery/proficiency calculations or evidence semantics.
- Changing the behavior of Practice, Learn & Practise, Today, or Recite results.
- Automatically starting a retry without user action.
- Adding new setup controls or a general-purpose custom Country picker.

## Acceptance criteria

- [ ] A completed Drill with at least one incorrect answer shows **Retry failed countries (N)**, where `N` is the number of unique retryable Countries with at least one incorrect answer in that run.
- [ ] A completed Drill with no incorrect answers does not show the retry action.
- [ ] Selecting the retry action starts a Drill containing only the unique failed Countries from the immediately completed run that remain in the active population.
- [ ] The retry keeps the completed run's Drill mode.
- [ ] For `Countries + Capitals`, a Country failed on either constituent skill is retried on both mode skills; equivalent complete-mode behavior holds for every Drill mode.
- [ ] Ordered retries preserve effective scope order for the failed subset; random retries create a fresh random ordering of that subset.
- [ ] Retry does not change the configured geographic selection, proficiency selection, Drill mode preference, or Drill order preference.
- [ ] Retry answers follow ordinary Drill evidence rules and are recorded through the existing Drill evidence path.
- [ ] Retry results and statistics contain only answers from the retry run.
- [ ] Completing a retry recalculates failures from that retry alone and allows another narrowing retry when failures remain.
- [ ] **Run again** retains its existing full configured-scope behavior after both ordinary and failed-Country retry runs.
- [ ] **Change scope** retains its existing setup-navigation behavior.
- [ ] Countries removed from the active population after completion are excluded from the retry count and scope, and an empty retry cannot be started.
- [ ] Existing ordinary Drill start, completion, results, and evidence behavior remain valid when the retry action is not used.

## Source anchors

- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
- `src/features/world-countries/drill/DrillResults.tsx`
- `src/features/world-countries/drill/DrillResultsRails.tsx`
- `src/features/world-countries/drill/drillResultSummary.ts`
- `src/features/world-countries/drill/drillSessionState.ts`
- `src/features/world-countries/drill/drillOrder.ts`
- `src/features/world-countries/drill/WorldCountriesDrill.test.tsx`

## Documentation impact

The current World Countries architecture already owns results and transient Drill session scopes in `drill/`, so no architecture update is expected if implementation follows this spec. Update `docs/architecture/features/WORLD_COUNTRIES.md` only if implementation changes the documented current-state behavior or ownership beyond this transient results action.

When delivery is complete, mark this Change Spec `Implemented` and record verification evidence below.

## Verification

Complete this section when setting the status to `Implemented`.

- Implemented and verified on 2026-08-22.
- Evidence: focused Drill result/session tests (17 passing), World Countries feature suite (83 files / 364 tests passing), and `npm run typecheck` passing. Vitest was run with `--cache=false` because the default cache write was blocked by an existing `node_modules/.vite` permission error.
