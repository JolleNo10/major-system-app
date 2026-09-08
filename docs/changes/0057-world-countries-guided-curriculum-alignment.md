# Change Spec 0057 - World Countries guided curriculum alignment

- **Status:** Implemented
- **Date:** 2026-09-08
- **Issue:** None.
- **Related ADRs:** None. This change refines derived guided recommendation behavior within the existing World Countries ownership model and does not introduce a new durable persistence or subsystem boundary.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`

## Goal

Align the World Countries guided journey, primary Continue behavior, and mastery/progress presentation so they describe the same learner state. In particular, distinguish **caught up for today** from **finished**, keep Capital Learning additive rather than blocked on long-term spaced mastery, and give unfinished scopes a targeted guided practice action instead of forcing the learner into generic Play.

This change continues the experimental `world-countries-learning-journey` branch after Change Spec 0056.

## User-visible behavior

### Caught up for today is not finished

A scope is only presented as complete when its existing core progress definition is complete.

If there is no due review and no new Country/Capital Learning recommendation, but the selected World/Continent scope still contains incomplete core Country/Capital recall, the guided rail must not say only **All caught up** in a way that implies the scope is finished.

Instead, present the distinction explicitly. For example:

```text
Caught up for today

No scheduled review is due.
Europe is still 45 / 46 complete.
Eastern Europe has unfinished core recall.

[ Practice unfinished area ]
```

Exact copy may follow existing UI conventions, but the semantic distinction is normative:

- **caught up for today** = no scheduled due review/new guided Learning right now;
- **complete/mastered scope** = existing core completion criteria are actually satisfied.

Play remains available separately and is not the required path for finishing guided knowledge.

### Targeted guided consolidation

When a scope is caught up for scheduled work but still incomplete, expose a guided consolidation/practice action targeted at unfinished core recall within that scope.

The action should:

- remain inside the guided Home/Continent experience;
- target incomplete core `location-to-country` and/or `country-to-capital` evidence rather than an arbitrary generic Play scope;
- prioritize the weakest/incomplete relevant targets using existing proficiency/evidence where practical;
- remain bounded like existing guided review rather than becoming an endless session;
- use existing recall interaction/evidence seams rather than duplicate a new quiz/session engine;
- record evidence with the same semantics as equivalent guided free recall so subsequent progress/review derivation can react truthfully;
- return to the same World/Continent hub and refresh derived evidence afterward.

Because `mastered` requires recall success on at least two learner-local dates, optional same-day consolidation is not required to make an item immediately complete. The UI must not promise that one extra practice run will necessarily advance `45 / 46` to `46 / 46` on the same day.

### Guided action hierarchy

The existing Today-owned planner remains authoritative for guided scheduling/recommendation. Extend/refactor its derived output so the Home/Continent surface can distinguish the learner-facing action classes it needs.

Conceptually the guided state needs to cover outcomes equivalent to:

1. **review due** - scheduled/due core recall has priority;
2. **learn Countries** - the next whole-Subregion Country Learning flow is needed;
3. **learn Capitals** - the next whole-Subregion Capital Learning flow is needed;
4. **consolidate unfinished core recall** - no scheduled/new Learning action is currently required, but the scope is not complete;
5. **complete** - the scope's existing core completion criteria are satisfied.

These are derived recommendations, not persisted curriculum states. Exact internal type names are implementation details.

Review due remains higher priority than introducing new material, consistent with current scheduling semantics.

### Country learning readiness before Capitals

Do not require long-term `mastered` Country recall before Capital Learning can begin.

The learner-facing journey must stop using **Master the countries** as an intermediate prerequisite if that label implies the same two-date spaced mastery used by core completion.

Refine the third journey stage to mean that Country Learning is established sufficiently for Capitals to be layered on top. Use learner-facing wording consistent with that meaning, preferably:

1. **Meet the countries**
2. **Practice the countries**
3. **Countries established**
4. **Add the capitals**
5. **Put it all together**
6. **Master the region**

`Countries established` is satisfied by the existing whole-Subregion Country Learning milestone/readiness semantics, not by requiring every Country `location-to-country` target to have long-term `mastered` proficiency.

Country recall strength remains visible/meaningful and continues to improve through guided review/consolidation while Capitals are added.

### Add Capitals remains additive

After the Country Learning milestone is established and no higher-priority review blocks progression, the planner may recommend the existing Capital Learning flow even if long-term Country spaced mastery is not yet complete.

This is intentional: Capitals extend established Country knowledge rather than waiting for all Country targets to reach the final spaced-mastery finish line.

The UI must therefore not simultaneously present the learner as being blocked at an unfinished **Master the countries** stage while Continue launches Capital Learning.

### Combined mastery after Capital Learning

After both whole-Subregion Learning milestones exist, incomplete core recall belongs to the combined consolidation/mastery part of the journey.

If no scheduled review is currently due but core recall remains incomplete:

- the journey shows **Put it all together** as the active/unfinished stage;
- the guided status says the learner is caught up for scheduled work but not finished;
- targeted guided consolidation remains available;
- **Master the region** becomes complete only when the existing core Country completion definition is satisfied for the relevant Subregion/scope.

### Scope behavior

At World scope, consolidation remains within the active World Country population and chooses unfinished targets using existing effective geography ordering/progress evidence.

At a Continent hub, consolidation must remain inside that Continent. It must never silently pull unfinished targets from another Continent.

When the user is merely inspecting a Subregion different from the current guided recommendation, inspection remains transient. Do not silently make inspection mutate the planner. If a targeted consolidation action is presented for an inspected Subregion, it must be an explicit user choice and remain clearly distinct from the default guided Continue recommendation.

## Scope

- Align journey-stage semantics with existing Country/Capital Learning milestones and long-term recall mastery.
- Rename/refine the intermediate Country stage so it represents established Country Learning rather than final spaced mastery.
- Extend/refactor the existing Today-derived plan/presentation so it distinguishes caught-up-but-incomplete from truly complete.
- Add a targeted guided consolidation/practice action for unfinished core recall when no scheduled/new Learning action is currently due.
- Reuse existing guided recall interaction and evidence-writing behavior for consolidation.
- Keep World and Continent scoping correct.
- Update guided rail/call-to-action copy to communicate scheduled status versus overall mastery truthfully.
- Update current-state World Countries architecture when implemented.

## Interaction and states

### Review due

- Primary CTA remains **Continue review**.
- Review is bounded and remains higher priority than new Learning/consolidation.
- Existing reason/scheduling semantics remain authoritative.

### New Country Learning available

- Primary CTA starts the existing `CountryLearningFlow` recommendation.
- Journey reflects Country introduction/practice/establishment truthfully.

### Country Learning established; Capitals not yet learned

- Do not wait for final two-date Country mastery solely to unlock Capitals.
- When no blocking review is due, primary guided continuation may start existing Capital Learning.
- Journey stage 3 is already established/complete and **Add the capitals** is current.

### Both Learning milestones complete; core recall incomplete; review due

- Primary CTA remains scheduled review.
- Journey remains in combined consolidation/mastery territory.

### Both Learning milestones complete; core recall incomplete; nothing due

- Status is **caught up for today**, not **finished/all mastered**.
- Show scope completion such as `45 / 46 complete` and identify unfinished geography where useful.
- Provide **Practice unfinished area** (or equivalent learner-facing CTA).
- The resulting bounded consolidation session targets unfinished core evidence in the current guided scope.

### Scope complete

- Only when existing scope core progress is complete should the UI present a true completed/mastered state.
- No fake primary Continue CTA is required.
- Play and Progress remain available.

### Loading/error/empty

Retain the usable loading, evidence-error, and zero-active-Country shell behavior from Change Spec 0056. Do not fabricate consolidation recommendations while evidence is unavailable.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and `src/features/world-countries/AGENTS.md`.
- `today/` remains the owner of derived guided planning/review recommendation semantics.
- Extend/refactor `todayPlan` or the narrowest existing Today planning seam rather than creating a second planner or `journey` coordinator.
- `learning/flows/` remains the owner of Country/Capital Learning and milestone writes.
- Existing recall history/proficiency and review scheduling remain authoritative for evidence and long-term mastery.
- Journey presentation remains derived; do not persist the current stage/action.
- Do not change the two-distinct-local-date mastery rule merely to make consolidation complete an item immediately.
- Do not alter review interval policy unless repository inspection shows that the current policy itself prevents the specified behavior; if so, report the conflict rather than silently rewriting scheduling.
- Prefer refactoring the existing guided review/session presentation to support a bounded consolidation candidate set over duplicating its typed-answer/map/session behavior.
- Preserve Recite, Practice, Quiz, Drill, map, geography, and persistence ownership.
- Keep work on `world-countries-learning-journey`; do not merge to `main`.

## Existing capabilities to reuse

- `today/todayPlan.ts` - existing derived due-review and Learning recommendation owner.
- `today/TodayReviewSession.tsx` and `today/reviewQueue.ts` - existing bounded guided free-recall interaction/retry behavior to reuse or narrowly generalize for consolidation.
- `today/GuidedHomeRails.tsx` - guided status and secondary action presentation.
- `today/WorldCountriesToday.tsx` - Home/Continent orchestration, evidence refresh, and flow delegation.
- `today/journeyPresentation.ts` - learner-facing derived journey.
- `learning/recallProgress.ts` / `learning/recallMastery.ts` - existing atomic/core progress and proficiency truth.
- `learning/reviewSchedule.ts` - current scheduled-review due semantics.
- `learning/flows/CountryLearningFlow.tsx` and `CapitalLearningFlow.tsx` - existing guided Learning execution.
- `learning/subregionLearningStore.ts` / Learning readiness - durable Country/Capital Learning milestones.
- existing effective geography ordering and scope-progress helpers for World/Continent bounded target selection.

## Edge cases

- **Europe 45 / 46 complete, no due review, no new Learning:** show caught up for today plus unfinished status and targeted practice; do not say only `All caught up` and leave Play as the only action.
- **One developing target has only one successful recall date:** consolidation may provide useful practice but must not fabricate two-date mastery or promise immediate 46 / 46 completion.
- **Latest target is weak after failure:** consolidation should be able to revisit it using existing free-recall evidence semantics.
- **Countries Learning milestone complete but Country proficiency not mastered:** Capital Learning may still be the next guided curriculum action; journey must show Countries established rather than a contradictory uncompleted mastery gate.
- **Capital milestone complete but Country recall later lapses:** journey does not regress to "Add the capitals"; unfinished Country/Capital evidence belongs to combined consolidation/mastery while the durable Capital Learning milestone remains true.
- **Continent incomplete because one Subregion is unfinished:** the Continent hub identifies the unfinished geography and keeps consolidation within the Continent.
- **World has unfinished Countries in several Continents:** use existing effective ordering/priority evidence for a bounded consolidation recommendation; do not create a persisted current Continent.
- **Inspected Subregion differs from guided recommendation:** inspection alone does not change the default planner action.
- **No active Countries or evidence load failure:** no consolidation action is fabricated.

## Out of scope

- Replacing the spaced-review scheduler or interval ladder.
- Changing the core mastery requirement from two learner-local recall dates.
- Persisting journey/action state.
- A general weak-items dashboard or new analytics subsystem.
- New Play modes, achievements, streaks, XP, or gamification.
- Reworking maps, geography authoring, Country data, or active-population policy.
- Broad renaming of the internal `today/` package.
- Merging the experimental branch to `main`.

## Acceptance criteria

- [x] A scope with no due review/new Learning but incomplete core progress is presented as **caught up for today but unfinished**, not simply complete/all caught up.
- [x] The Europe-style `45 / 46 complete` case exposes a guided targeted-practice action without requiring the user to enter generic Play.
- [x] Targeted guided consolidation remains bounded to unfinished core recall in the current World/Continent scope.
- [x] Consolidation reuses existing guided free-recall interaction/evidence semantics and refreshes progress after completion/exit.
- [x] Consolidation does not bypass/fabricate the existing two-distinct-local-date mastery requirement.
- [x] Scheduled due review remains higher priority than consolidation or new Learning.
- [x] Country Learning establishment, not final spaced Country mastery, is the prerequisite represented before **Add the capitals**.
- [x] The learner-facing stage previously implying `Master the countries` is renamed/refined so Continue can legitimately recommend Capital Learning without contradicting the journey.
- [x] Capital Learning still reuses the existing whole-Subregion Capital Learning flow and does not reset Country evidence.
- [x] After both Learning milestones, incomplete core recall is represented as combined consolidation/mastery rather than unfinished Capital introduction.
- [x] A truly core-complete scope is distinguishable from merely caught-up scheduled work.
- [x] Continent consolidation never includes Countries outside the selected Continent.
- [x] Subregion inspection remains transient and does not silently change the default guided recommendation.
- [x] No new persisted journey/action/curriculum state is introduced.
- [x] Focused automated tests cover planner action precedence, caught-up-but-incomplete behavior, Country-established-to-Capital progression, consolidation scoping, and completed scope behavior.
- [x] Current-state World Countries architecture is updated to describe the aligned guided-action semantics.
- [x] All work remains on `world-countries-learning-journey`; no merge to `main` is performed.

## Source anchors

- `src/features/world-countries/today/todayPlan.ts`
- `src/features/world-countries/today/todayPlan.test.ts`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/today/WorldCountriesToday.test.tsx`
- `src/features/world-countries/today/GuidedHomeRails.tsx`
- `src/features/world-countries/today/GuidedHomeRails.test.tsx`
- `src/features/world-countries/today/journeyPresentation.ts`
- `src/features/world-countries/today/journeyPresentation.test.ts`
- `src/features/world-countries/today/TodayReviewSession.tsx`
- `src/features/world-countries/today/reviewQueue.ts`
- `src/features/world-countries/learning/recallProgress.ts`
- `src/features/world-countries/learning/recallMastery.ts`
- `src/features/world-countries/learning/reviewSchedule.ts`
- `src/features/world-countries/learning/subregionLearningStore.ts`
- `docs/architecture/features/WORLD_COUNTRIES.md`

## Documentation impact

When implemented, update `docs/architecture/features/WORLD_COUNTRIES.md` to make clear that:

- guided Home/Continent presentation distinguishes scheduled catch-up from overall core completion;
- the Today-owned planner can derive a bounded consolidation action for incomplete core recall when nothing is due;
- Country Learning establishment is sufficient to layer Capital Learning on top, while long-term Country mastery continues through review/consolidation;
- learner-facing journey/action state remains derived and non-persisted.

## Verification

Complete this section when setting the status to `Implemented`.

Expected risk-proportionate evidence includes:

- focused `todayPlan` tests for action precedence and caught-up-but-incomplete recommendation;
- `journeyPresentation` tests for Countries established -> Add Capitals -> combined mastery;
- guided rail/home tests for 45/46 caught-up presentation and targeted CTA;
- bounded consolidation session tests proving only incomplete core targets in the current scope are exercised and evidence is recorded through existing semantics;
- Continent scoping regression tests;
- relevant existing review/Learning flow tests when their seams are generalized.

Because this changes the central guided recommendation loop, run the World Countries feature slice after focused tests when practical. Run `git diff --check`. Run lint/typecheck/build only when materially relevant; report the known unrelated `DrillSetup.test.tsx` type inference blocker if it remains the only repository-wide typecheck/build failure.

Browser/manual verification is not required by default. Do not start or troubleshoot a dev server solely for verification.

## Implementation evidence

- Focused guided-loop checks: `npx.cmd vitest run src/features/world-countries/today/todayPlan.test.ts src/features/world-countries/today/journeyPresentation.test.ts src/features/world-countries/today/GuidedHomeRails.test.tsx src/features/world-countries/today/WorldCountriesToday.test.tsx src/features/world-countries/today/TodayReviewSession.test.tsx src/features/world-countries/learning/recallProgress.test.ts` — 6 files, 40 tests passed.
- Today capability slice: `npx.cmd vitest run src/features/world-countries/today` — 9 files, 42 tests passed.
- World Countries feature slice: `npx.cmd vitest run src/features/world-countries` — 115 files, 752 tests passed.
- `npm.cmd run lint` passed.
- `git diff --check` passed.
- `npm.cmd run typecheck` reports only the known unrelated `src/features/world-countries/drill/DrillSetup.test.tsx:301` `Map<any, any>` inference error; no changed-file type errors remain.
- Existing recall mastery tests continue to prove that same-day additional success does not satisfy the two-distinct-local-date rule. Consolidation session tests prove evidence is written through the existing `record` recall path.
- Browser/manual verification was not run, as permitted by the spec and repository instructions.

Residual risk is limited to the unrelated repository-wide typecheck blocker and the absence of browser verification. No material deviation from the Change Spec or visual hierarchy contract was identified; the implementation extends the existing Today, Home/Continent, map dock, rails, and guided recall seams without porting the prototype HTML/CSS or adding journey persistence.
