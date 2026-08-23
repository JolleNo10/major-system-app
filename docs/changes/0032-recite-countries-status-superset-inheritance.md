# Change Spec 0032 - Recite Countries status inherits stronger Countries + Capitals outcome

- **Status:** Implemented
- **Date:** 2026-08-23
- **Issue:** None.
- **Related ADRs:** None. This changes derived Recite setup presentation within the existing Recite ownership model and does not introduce a new durable architectural boundary.
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)
- **Related changes:** [Change Spec 0012](0012-map-centered-world-countries-recite.md)

## Goal

Make the Recite setup map reflect stronger demonstrated knowledge when a learner has a better **Countries + Capitals** outcome than their standalone **Countries** outcome.

A harder/superset recall mode may strengthen the displayed status of the simpler Country-only mode, but simpler evidence must never strengthen a harder mode.

## User-visible behavior

When Recite setup is in **Countries** mode, each Country's displayed status is the stronger of:

1. its latest stored **Countries** outcome; and
2. its latest stored **Countries + Capitals** outcome.

Use the existing Recite status ordering:

`Unrecited < Revealed < Recovered < Recalled`

Examples:

| Countries | Countries + Capitals | Countries map status |
| --- | --- | --- |
| Unrecited | Recalled | Recalled |
| Revealed | Recovered | Recovered |
| Recovered | Recalled | Recalled |
| Recalled | Recovered | Recalled |
| Recalled | Unrecited | Recalled |

This inheritance is one-way.

- **Countries + Capitals** continues to display only its own mode outcome.
- **Countries from Capitals** continues to display only its own mode outcome.
- **Countries** does not contribute upward to **Countries + Capitals**.
- Neither Countries nor Countries + Capitals contributes to **Countries from Capitals**.

The result is a derived setup-map status only. The app must continue storing each Recite mode independently.

## Scope

- Add a Recite-owned derivation for the effective setup status of one Country for a selected Recite mode.
- For selected mode `countries`, compare the latest stored outcomes for `countries` and `countries-capitals` and return the stronger status.
- For `countries-capitals` and `countries-from-capitals`, preserve current mode-isolated status behavior.
- Use the same effective-status derivation for setup map colors and setup accessible Country descriptions so visual and semantic status cannot diverge.
- Update Recite setup legend/help copy so it no longer claims all displayed mode statuses are always independent.
- Preserve existing per-mode persistence and completed-run writes.
- Preserve active-session map behavior: historical status is suppressed while a Recite run is active.

## Interaction and states

### Setup: Countries mode

For every visible in-scope Country:

1. read its latest stored `countries` outcome, if any;
2. read its latest stored `countries-capitals` outcome, if any;
3. map missing outcomes to `unrecited` for comparison;
4. choose the stronger status according to the fixed Recite status ordering;
5. use that effective status for the Country's setup-map color and accessible status description.

The timestamps on the two mode entries do not decide which status wins. Each mode already stores its own latest completed outcome; the setup map compares those current per-mode outcomes by status strength.

### Setup: Countries + Capitals mode

Use only the stored `countries-capitals` outcome exactly as today.

A stronger `countries` result must not upgrade this mode.

### Setup: Countries from Capitals mode

Use only the stored `countries-from-capitals` outcome exactly as today.

No other Recite mode contributes to this direction because recalling a Country from its Capital is a distinct recall task.

### Active Recite session

Do not apply inheritance to current-run coloring.

Active Recite maps continue to suppress historical setup status and reflect only the current run's transient outcomes.

### Completion and persistence

A completed run continues to write only the mode that was actually performed.

Examples:

- Completing `countries-capitals` must not write a synthetic `countries` progress entry.
- Completing `countries` must not modify `countries-capitals`.
- The inherited Country status disappears or changes naturally only when the underlying stored per-mode outcomes change.

### Legend and descriptions

When **Countries** is selected, the setup legend/help text must explain that a stronger **Countries + Capitals** result also counts toward the Country-only map status.

Do not present this as merged progress or as if a standalone Countries run occurred.

Accessible Country descriptions must describe the effective status shown on the map. If provenance is included, it should identify **Countries + Capitals** only when that mode supplies the winning status; provenance is not required as additional visible map UI.

## Architecture constraints

Follow [World Countries](../architecture/features/WORLD_COUNTRIES.md).

- `recite/` owns Recite progress interpretation and setup presentation semantics.
- Keep the derivation inside the Recite capability; do not move it into generic map code.
- `maps/` remains a caller-controlled rendering layer and must continue receiving resolved Country colors/descriptions rather than learning Recite hierarchy semantics.
- Preserve the current `WorldCountriesReciteProgress` persistence shape and per-mode outcome records.
- Do not duplicate or rewrite progress entries to implement inheritance.
- Do not add a new persistence version or migration for this presentation rule.
- Keep current-run outcome semantics unchanged.
- Keep `ReciteCountryOutcome` unchanged: `recalled | recovered | revealed`.
- Use one explicit status-strength comparison seam rather than duplicating ordering logic separately in color and description builders.
- Do not infer status strength from color values.
- Do not use `completedAt` as a cross-mode winner rule; timestamps remain metadata for each mode's latest stored entry.

## Existing capabilities to reuse

### Recite durable progress

`src/features/world-countries/recite/reciteProgress.ts`

Already stores latest completed outcomes independently by `ReciteMode` and exposes `getReciteProgressOutcome(...)`.

Keep this storage model. Derive effective setup status from these independent entries at read/presentation time.

### Recite setup presentation

`src/features/world-countries/recite/recitePresentation.ts`

Already owns:

- Recite status names and colors;
- mapping persisted outcomes to setup colors;
- setup accessible descriptions;
- active-run map colors.

This is the primary seam for the new effective-status derivation. Prefer a small pure helper that returns the effective `ReciteStatus` for a selected mode and Country, then reuse it from both setup color and description creation.

### Recite setup orchestration

`src/features/world-countries/recite/WorldCountriesRecite.tsx`

Already supplies selected mode and progress to setup map presentation and renders the Recite status legend.

Update only the wording/integration required to explain the Countries-mode inheritance rule. Do not create a second progress model in the component.

## Edge cases

- Neither mode has progress: Countries remains `unrecited`.
- Countries has progress and Countries + Capitals does not: Countries uses its own status.
- Countries + Capitals has progress and Countries does not: Countries uses the Countries + Capitals status.
- Both modes have the same status: Countries shows that status.
- Countries is stronger than Countries + Capitals: Countries keeps the stronger standalone status.
- Countries + Capitals is stronger than Countries: Countries is upgraded to the stronger Countries + Capitals status.
- A newer weaker result in one mode does not override a stronger current result stored for the other mode solely because its timestamp is newer.
- Changing selected mode immediately recomputes the setup colors/descriptions using that mode's inheritance rules.
- Countries + Capitals and Countries from Capitals remain mode-isolated even when Countries has a stronger status.
- Countries outside the active Recite setup scope remain context grey exactly as today; inheritance must not change scope handling.
- Active-session historical suppression remains unchanged.

## Out of scope

- Merging Recite mode histories.
- Writing inferred Countries progress when Countries + Capitals is completed.
- Persisting an `effective` or `best` status field.
- Changing the Recite progress storage version or migration behavior.
- Changing Recite outcome definitions or colors.
- Tracking Country and Capital prompt outcomes separately inside a Countries + Capitals completed Country result.
- Letting Countries strengthen Countries + Capitals.
- Letting Countries + Capitals strengthen Countries from Capitals.
- Applying Recite outcomes to Drill proficiency, Learning Readiness, Today, World mastery, or other learning evidence.
- Changing active Recite session coloring, retry, Reveal / Skip, answer matching, order, or completion behavior.
- Generalizing a cross-feature hierarchy/inheritance framework.

## Acceptance criteria

- [ ] In Recite setup with **Countries** selected, each Country displays the stronger status from its latest `countries` and latest `countries-capitals` outcomes.
- [ ] Status strength is exactly `unrecited < revealed < recovered < recalled`.
- [ ] A `recalled` Countries + Capitals result can make the Country appear `recalled` in Countries mode even when standalone Countries is weaker or unrecited.
- [ ] A stronger standalone Countries result is never downgraded by a weaker Countries + Capitals result.
- [ ] **Countries + Capitals** setup status remains based only on `countries-capitals` progress.
- [ ] **Countries from Capitals** setup status remains based only on `countries-from-capitals` progress.
- [ ] The derived status is used consistently for both setup map color and accessible Country description.
- [ ] Context-grey behavior for Countries outside the active setup scope is unchanged.
- [ ] Active Recite sessions continue to ignore historical setup status and show only current-run outcomes.
- [ ] Completing Countries + Capitals does not create or modify a persisted Countries entry.
- [ ] Existing `WorldCountriesReciteProgress` version and storage shape remain unchanged.
- [ ] Recite legend/help copy accurately explains the one-way Countries <- Countries + Capitals inheritance.
- [ ] Focused tests cover all four cross-mode combinations where either Countries or Countries + Capitals is stronger/weaker, plus isolation of the other two setup modes.
- [ ] Existing Recite progress/session tests remain green.

## Source anchors

- `src/features/world-countries/recite/recitePresentation.ts`
- `src/features/world-countries/recite/recitePresentation.test.ts`
- `src/features/world-countries/recite/reciteProgress.ts`
- `src/features/world-countries/recite/reciteProgress.test.ts`
- `src/features/world-countries/recite/WorldCountriesRecite.tsx`
- `src/features/world-countries/recite/WorldCountriesRecite.test.tsx`
- `src/features/world-countries/recite/reciteSession.ts`
- `docs/architecture/features/WORLD_COUNTRIES.md`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` to describe the resulting current state:

- Recite progress remains stored independently per mode.
- Countries setup presentation derives its effective status from the stronger of Countries and Countries + Capitals.
- Countries + Capitals and Countries from Capitals remain mode-isolated.
- Active Recite sessions continue to suppress historical setup status.

No ADR is required unless implementation discovers a genuinely new durable architectural decision beyond this Recite-local derived presentation rule.

## Verification

- Implemented and verified on 2026-08-24.
- Evidence: focused Recite presentation/progress/component tests passed (18 tests); full World Countries suite passed (88 files, 403 tests); `npm.cmd run typecheck` passed; `git diff --check` passed.
- Automated coverage verifies Countries setup inheritance, strength ordering, isolated alternative modes, scope-grey behavior, setup description/color alignment, active-session historical suppression, legend wording, and mode-specific Countries + Capitals persistence. Browser manual verification was unavailable in this environment.
