# Change Spec 0014 - World Countries world mastery overview

- **Status:** Implemented
- **Date:** 2026-08-16
- **Issue:** None.
- **Related ADRs:** None required.
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Make long-term World Countries mastery visible from the World-level Drill setup without requiring the user to infer total progress from individual map colors.

Expose one stable **World mastery** summary derived from the active Country population and the existing core recall finish line:

- Location → Country
- Country → Capital

The summary is informational only. It does not introduce new mastery semantics, evidence, persistence, or activity behavior.

## User-visible behavior

At the World-level Drill setup, show a compact **World mastery** summary in the center content immediately above the World map.

Example:

```text
WORLD MASTERY

67 / 195 complete                         34%
[===========-------------------------------]

Unpractised 47   Weak 8   Developing 41   Strong 32   Complete 67

Complete requires both Location → Country and Country → Capital to be Mastered.
```

Exact responsive layout may compress or wrap, but the same information must remain available.

The summary contains:

1. completed Countries;
2. active Country total;
3. whole-number completion percentage;
4. Country count by core progress state:
   - Unpractised
   - Weak
   - Developing
   - Strong
   - Complete
5. concise finish-line explanation.

The primary number is:

```text
complete Countries / active Countries
```

Do not replace it with attempt count, average accuracy, Learning Readiness, Recite status, or an opaque composite score.

### Stable meaning

**World mastery is independent of the currently selected Drill purpose or Drill mode.**

Changing between:

- Drill;
- Learn & Practise;
- Countries;
- Countries + Capitals;
- Countries from Capitals;
- Practice/Learning activities;

must not change the World mastery counts unless the underlying durable core recall evidence or active Country population changed.

The existing map may continue to show the progress perspective owned by the active setup context. The World mastery summary is the stable long-term finish-line view and must be labeled distinctly enough that users do not interpret it as the active mode's legend.

### Mastery semantics

Reuse the existing Country core progress model.

A Country is **Complete** only when its existing derived core state is `complete`.

The existing core finish line remains authoritative:

```text
Location → Country = Mastered
AND
Country → Capital = Mastered
=> Country = Complete
```

`Capital → Country` is an additional recall skill and does not change World mastery completion.

Do not create a new World-specific mastery formula.

### Active population

The denominator is the active World Countries population supplied to the feature after the current Country-set policy is resolved.

Examples:

- if 193 entities are active, the denominator is 193;
- if additional configured entities are active, they participate normally;
- inactive entities retain their historical evidence but are excluded from the displayed World mastery calculation.

Do not use the bundled canonical `countries` array as an unconditional denominator when an active `entries`/population value is available.

## Scope

- Add a compact World mastery summary to World-level Drill setup.
- Derive the summary from existing atomic recall evidence and existing core Country aggregation.
- Use the active Country population as the denominator.
- Show complete count, total count, percentage, and all five core Country-state counts.
- Reuse existing progress/mastery semantics and existing status presentation tokens where visual state markers are used.
- Recompute the summary when the loaded evidence or active Country population changes.
- Keep the summary informational and non-interactive.
- Add focused tests for derivation, population boundaries, loading, and presentation.
- Update World Countries current-state architecture documentation after implementation.

No new persistence schema, evidence kind, mastery formula, activity, navigation state, or map palette is part of this work.

## Interaction and states

### Visibility

Show World mastery only when `DrillSetup` is at:

```text
level === "world"
```

Do not add the same summary to Continent setup in this change.

The World mastery summary remains visible whether the current purpose is:

- not yet selected;
- Drill;
- Learn & Practise.

### Loading

World mastery depends on durable recall evidence.

While the evidence required for the summary is loading:

- preserve the summary's layout position;
- show a neutral loading state such as `Loading mastery…` or equivalent skeleton;
- do not temporarily display `0 / N complete`;
- do not treat missing-yet-unloaded evidence as Unpractised.

The existing World map loading behavior remains independent.

### No evidence

After recall evidence has loaded, a population with no relevant attempts is valid.

Display:

```text
0 / N complete
0%
Unpractised N
Weak 0
Developing 0
Strong 0
Complete 0
```

This is not an error state.

### Empty active population

If the active population is empty:

- show `0 Countries active`;
- do not divide by zero;
- do not present the World as complete;
- state counts are all zero.

This is a defensive state; normal product configuration is expected to provide Countries.

### Percentage

Display completion as a whole-number percentage derived from the same `completeCountries / totalCountries` result used for the primary count.

The displayed percentage must not reach `100%` unless the derived World scope is actually complete.

Do not calculate the percentage separately from the aggregate used for the displayed counts.

### Evidence refresh

When the user returns from a recording Drill session and setup reloads current evidence, World mastery reflects the newly derived state.

Practice, Learning milestones, and Recite outcomes do not change World mastery unless they already write the same authoritative core recall evidence under existing architecture rules. This change must not add new writes to make the number move.

### Responsive behavior

Keep the map as the dominant center surface.

The mastery summary must remain compact:

- desktop: one compact block/strip above the map;
- narrow layouts: counts may wrap into multiple rows;
- do not turn the summary into a dashboard page;
- do not reduce the map to a secondary surface.

### Accessibility

- Expose the summary with a meaningful heading such as `World mastery`.
- Make the completed/total value and state distribution available as text; color alone is insufficient.
- Loading changes should use the existing accessible status conventions where appropriate.
- Decorative progress visualization must not duplicate or obscure the textual values.

## Architecture constraints

Follow [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md).

- `learning/recallMastery.ts` remains authoritative for atomic proficiency and Country core-state semantics.
- `learning/recallProgress.ts` remains the evidence-to-Country progress seam.
- `learning/scopeProgress.ts` remains the scope aggregation seam. Reuse `deriveWorldCountriesWorldProgress` or the equivalent existing scope-progress path rather than duplicating World aggregation in UI code.
- Always pass the active Country population into World aggregation; do not rely on the helper's canonical-data default for this presentation.
- `drill/DrillSetup.tsx` may consume the derived World progress for presentation, but `drill/` must not own or redefine mastery semantics.
- The summary must not write recall evidence, Learning milestones, Recite outcomes, Drill preferences, Geography metadata, or Settings.
- The summary must not add a persisted cached World score. World mastery remains derived state.
- Do not merge Learning Readiness, Drill proficiency, and Recite outcome into one stored or derived universal score.
- Do not add a shared/core abstraction for this feature-local presentation.
- Do not change PageLayout, rail geometry, map ownership, or workflow dependency direction.

No ADR is required: this exposes an already-defined derived progress concept inside the existing World Countries ownership and persistence boundaries. If implementation discovers a need to change the source of truth, mastery definition, persistence contract, or dependency direction, stop and raise that as a separate architectural decision rather than silently expanding this Change Spec.

## Existing capabilities to reuse

- `learning/scopeProgress.ts`
  - `deriveWorldCountriesWorldProgress`
  - `WorldCountriesScopeProgress`
  - existing `countryStateCounts`, `completeCountries`, `totalCountries`, `completionRatio`, and `complete`.
- `learning/recallProgress.ts`
  - existing loading/derivation of World Countries atomic evidence.
- `learning/recallMastery.ts`
  - canonical `unpractised | weak | developing | strong | mastered` atomic proficiency and Country core-state derivation inputs.
- `learning/recallTargets.ts`
  - canonical core/additional recall-skill classification.
- `drill/DrillSetup.tsx`
  - World-level setup composition, evidence loading, and center map surface.
- `drill/drillProgressPresentation.ts`
  - existing user-facing progress terminology and explanation patterns where applicable.
- existing World Countries progress colors/tokens if the summary uses colored state markers.

Prefer deriving one World aggregate and rendering from that aggregate. Do not independently count states in the component when the existing scope-progress seam already provides them.

## Edge cases

- A Country with only `Capital → Country` evidence remains Unpractised for core World mastery if neither core skill has relevant evidence.
- A Country may have one core skill Mastered and still be Developing/Strong/Weak according to the existing aggregate rules; only existing `coreState === "complete"` counts toward the completed total.
- Learning Readiness `Countries + Capitals learned` does not by itself make a Country Complete for World mastery.
- A successful Recite result does not affect World mastery.
- Non-recording Practice does not affect World mastery.
- Historical evidence for an inactive Country remains stored but is excluded from the current denominator and all displayed state counts.
- Re-activating a Country includes its retained evidence normally through existing evidence loading.
- Country-set changes must make:
  - `totalCountries`;
  - `completeCountries`;
  - percentage;
  - every state count
  agree with the same active population.
- The five displayed state counts must sum to `totalCountries`.
- Changing authored Continent/Subregion/Country order does not change mastery totals.
- Changing Drill order (`Random` / `In order`) does not change mastery totals.
- Changing fuzzy-answer settings does not retroactively reclassify stored evidence.
- A failed evidence load must follow existing setup error/loading behavior; do not fabricate a zero-progress World summary as a fallback.

## Out of scope

- Continent mastery summary cards or numeric completion in Continent rows.
- Subregion mastery summary cards.
- A dedicated stats/dashboard screen.
- Clicking a progress state to create a Drill scope.
- Recommended-next-action behavior.
- Due Review / Maintenance behavior.
- World-wide Recite.
- New mastery thresholds or decay/staleness semantics.
- New attempt/evidence types.
- Treating `Capital → Country` as a core completion requirement.
- Changing Learning Readiness semantics or milestones.
- Combining Learning, Drill, and Recite into a universal progress score.
- Persisting aggregate World/Continent/Subregion scores.
- New map status colors or palette changes.
- Recoloring the World map solely to match this summary.
- Changing the existing map legend semantics for the active Drill/Learning context.
- Changes outside World Countries except direct reusable dependencies already allowed by the feature architecture.

## Acceptance criteria

- [ ] World-level Drill setup displays a compact `World mastery` summary above the World map.
- [ ] Continent-level setup does not display the World mastery summary.
- [ ] The summary displays `completeCountries / totalCountries`.
- [ ] The summary displays a whole-number completion percentage derived from the same World aggregate.
- [ ] The summary displays counts for Unpractised, Weak, Developing, Strong, and Complete.
- [ ] The five state counts always sum to the active Country total.
- [ ] Country Complete uses the existing core Country-state semantics; no World-specific mastery formula is introduced.
- [ ] Location → Country and Country → Capital remain the only core skills that determine Country completion.
- [ ] Capital → Country evidence does not move the World completion numerator.
- [ ] The active Country population, not unconditional canonical membership, defines the denominator and state counts.
- [ ] Inactive Countries are excluded without deleting their retained evidence.
- [ ] Re-activated Countries reuse their retained evidence through existing progress loading.
- [ ] Changing Drill purpose or mode does not change the World mastery summary when evidence and active population are unchanged.
- [ ] Changing authored geography order or Drill question order does not change the World mastery summary.
- [ ] No-evidence state displays all active Countries as Unpractised after evidence loading completes.
- [ ] Loading state does not briefly misrepresent unloaded evidence as zero mastery.
- [ ] Empty-population state does not divide by zero or report the World as complete.
- [ ] The displayed percentage never reports 100% unless the derived World scope is complete.
- [ ] Text exposes all status/count information without requiring color perception.
- [ ] The World map remains the dominant center surface and existing map/legend semantics remain unchanged.
- [ ] No new persistence key, cached aggregate score, evidence type, Learning milestone, Recite outcome, or preference write is introduced.
- [ ] Focused tests cover aggregate semantics, active-population behavior, loading/no-evidence behavior, and World-only presentation.
- [ ] Existing World Countries Drill, Learn & Practise, Recite, Geography authoring, and country-set behavior regressions remain green.

## Source anchors

- `src/features/world-countries/drill/DrillSetup.tsx`
- `src/features/world-countries/drill/DrillSetup.test.tsx`
- `src/features/world-countries/learning/scopeProgress.ts`
- `src/features/world-countries/learning/scopeProgress.test.ts`
- `src/features/world-countries/learning/recallProgress.ts`
- `src/features/world-countries/learning/recallMastery.ts`
- `src/features/world-countries/learning/recallTargets.ts`
- `src/features/world-countries/drill/drillProgressPresentation.ts`
- `src/features/world-countries/learning/progressPresentation.ts`

## Documentation impact

After implementation, update `docs/architecture/features/WORLD_COUNTRIES.md` to record that:

- World-level Drill setup exposes a derived World core-mastery summary;
- the summary uses the active Country population;
- Country completion is still the existing core recall finish line;
- World mastery is derived, non-persisted presentation state;
- activity-specific map progress, Learning Readiness, and Recite outcomes remain separate concepts.

No ADR should be created unless implementation discovers a genuinely new durable architectural decision.

## Verification

Verification completed for the implemented change:

During implementation, prefer focused tests under:

```text
src/features/world-countries/learning/
src/features/world-countries/drill/
```

Near feature completion run:

```text
npx vitest run src/features/world-countries
npm run typecheck
```

Followed the repository progressive verification policy. The focused suite passed 21 tests, the World Countries feature suite passed 285 tests, and `npm.cmd run typecheck` passed.
