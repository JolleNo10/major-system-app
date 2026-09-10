# Change Spec 0060 - World Countries Learning completion handoff

- **Status:** Implemented
- **Date:** 2026-09-10
- **Issue:** None.
- **Related ADRs:** None. This change uses the existing Today-planner and Learning-flow ownership boundaries.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`

## Goal

Make the end of Country and Capital Learning feel like a meaningful step in the guided journey rather than a generic session result. Completion must tell the learner what was achieved, distinguish a durable Subregion Learning milestone from a temporary scope, and—when Learning was launched by guided Home/Continent—offer the next action derived from the existing Today planner.

The completion screen must not become a second planner. `today/` remains authoritative for guided next-action priority; `learning/flows/` remains authoritative for the Learning session and its milestone write.

## User-visible behavior

### Completion answers “what did I achieve?”

For a real Subregion Country Learning completion, present the completed Learning layer as **Countries established**, not as generic “result recorded” or long-term mastery.

Conceptually:

```text
Countries established
Northern Europe countries established ✓

You completed Country Learning for Northern Europe.
The countries are established; recall can keep strengthening over time.
```

For a real Subregion Capital Learning completion, present **Capitals established** without claiming the region is mastered:

```text
Capitals established
Northern Europe capitals established ✓

You completed Capital Learning for Northern Europe.
The country–capital layer is established; recall can keep strengthening over time.
```

Exact copy may be refined to fit the existing completion component, but milestone completion and long-term recall mastery must remain distinct.

### Guided completion answers “what next?”

When `WorldCountriesToday` launched the Learning flow, the completion surface must use the **latest derived Today plan after the Learning milestone has been written** to present the next guided action.

The primary completion action should continue directly when an actionable plan exists instead of forcing an unnecessary return to Home/Continent first.

Examples:

- Country Learning completion followed by same-Subregion Capital Learning: explain that capitals come next and use a primary action such as **Add the capitals**.
- A later Learning recommendation: name the actual next Learning activity/scope truthfully.
- Due review: use the review action rather than bypassing it for a preferred Learning step.
- Consolidation: explain that unfinished recall should be strengthened and use the existing **Practice unfinished area** intent.
- Complete/unavailable/caught-up state: do not invent more work; return to the current World/Continent guided surface with truthful caught-up/completion wording.

The completion surface may use more specific learner-facing wording than the Home CTA, but the underlying action and priority must be the same planner truth.

### Country completion normally layers Capitals next

Within the existing planner, a Subregion whose Country layer has just become established but whose Capital layer is not established remains the first incomplete unit, so guided completion normally hands directly into Capital Learning for that same Subregion.

This behavior must come from the re-derived planner, not from hard-coding `Country completion => Capital Learning` inside `CountryLearningComplete`.

### Capital completion does not imply Master region

Completing Capital Learning records/establishes the Capital layer. It does not by itself mean the Subregion's core Country and Capital recall is mastered.

The next action may be another required Learning unit, due review, consolidation, or completion depending on Today-plan truth. Do not force a same-Subregion “Put it all together” action if the planner currently prioritizes something else.

### Direct Learn & Practise keeps its run contract

Learning launched from `WorldCountriesDrill` / Learn & Practise is not Today-guided planning.

Preserve its existing coordinator behavior:

- selected Subregions continue sequentially using `advanceDrillLearningRun`;
- an intermediate completion can continue to the next selected Subregion;
- the final selected Subregion returns to Learn & Practise;
- an intentional Learn Countries run does not automatically switch to Learn Capitals;
- `Learn again` remains available as the secondary restart action.

The completion presentation can use clearer achievement language, but must not import or recreate Today planner logic in Drill.

### Temporary proficiency scope stays non-milestone

A temporary proficiency Learning run (`subregion` absent / `recordCompletion=false`) must not say `Countries established`, `Capitals established`, `learned Subregion`, or otherwise imply a durable journey milestone.

Use scope-neutral completion language, for example:

```text
Learning complete
Proficiency scope complete ✓

You completed final recall for this temporary scope.
This does not establish a Subregion Learning milestone.
```

Its primary action remains the caller-owned fallback; no guided Today next step is fabricated.

## Scope

- Refine Country and Capital completion presentation to distinguish durable Subregion milestone completion from temporary Learning completion.
- Add the smallest completion-handoff contract needed for a parent coordinator to provide a learner-facing next action to the reusable Learning flow/completion UI.
- In `WorldCountriesToday`, derive guided completion handoff from the latest existing `WorldCountriesTodayPlan` after milestone notification.
- Allow guided completion to launch the planner-authoritative next review, Learning, or consolidation action directly when appropriate.
- Preserve Home/Continent fallback when there is no actionable next plan step.
- Preserve direct Learn & Practise multi-Subregion progression and temporary proficiency behavior.
- Update focused Learning and Today orchestration tests.
- Update current-state World Countries documentation to describe planner-owned guided completion handoff.

## Interaction and states

### Country Learning — durable Subregion completion

The completion surface identifies **Countries established** as the achieved journey milestone. It must not say `mastered` merely because Country Learning completed.

When the latest guided plan recommends `learn-capitals` for the same Subregion, show an explicit next-step message and make the primary action start that Capital Learning flow directly.

### Capital Learning — durable Subregion completion

The completion surface identifies **Capitals established**. Do not display `Master region` unless existing derived journey/core recall truth independently supports completion.

The guided primary action follows the latest Today plan rather than a hard-coded Capital follow-up.

### Guided next action: review

If the latest plan action is `review`, the completion primary action enters the existing Today review flow with the planner-provided candidates and ordinary review semantics.

Transitioning from completion must clear/replace the finished Learning run so the existing `learningRun` render branch cannot mask the review flow.

### Guided next action: learn

If the latest action is `learn`, the primary action starts the existing recommended Learning flow using the recommendation supplied by the planner. Do not reconstruct its Subregion, track, or membership in completion code.

For the common Country -> Capital case, learner-facing CTA can be `Add the capitals` when the recommendation is Capital Learning for the just-completed Subregion.

### Guided next action: consolidate

If the latest action is `consolidate`, the primary action starts the existing consolidation review path with the planner-provided candidates. Preserve current evidence and review-mode semantics.

### Guided next action: complete or unavailable

Do not invent a continuation. The primary action returns to the originating World/Continent guided surface. Completion copy may say that the learner is caught up for now or that core work is complete only when the corresponding existing plan truth supports that claim.

### Planner refresh timing

Completion handoff must be based on post-milestone state. The existing Learning store publishes a synchronous revision signal when a Subregion milestone is written; `WorldCountriesToday` already derives its plan from subscribed learning state plus recall evidence.

Do not snapshot the pre-completion recommendation as the post-completion handoff. Do not add persisted “next action after completion” state.

### Restart and exit

`Learn again` remains a secondary action owned by the active Learning flow and restarts that same flow as today.

Exit/back behavior remains caller-owned. A guided next action must not remove the ability to leave the completion surface through the existing navigation contract.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and `src/features/world-countries/AGENTS.md`.
- `today/` owns planner priority and guided action selection. Completion components must not import `todayPlan` or derive planner state themselves.
- `learning/flows/` owns Country/Capital session completion presentation and milestone writes.
- `drill/` owns its Learn & Practise run progression and must not depend on Today planner internals.
- Prefer a small parent-provided presentation/action contract at the Learning-flow boundary over a second completion coordinator or generic event bus.
- Reuse/refactor the existing `WorldCountriesToday` action-launch switch rather than creating separate competing implementations for Home Continue and completion Continue.
- Do not persist completion handoff, journey stage, active recommendation, or current scope.
- Do not change the Today priority order, Learning readiness rules, milestone semantics, atomic mastery, scheduler behavior, or evidence model.
- Do not make Capital Learning manufacture Country establishment or make either Learning milestone imply two-date mastery.

## Existing capabilities to reuse

- `src/features/world-countries/today/WorldCountriesToday.tsx` — owns the active Today plan, guided Learning run, and launching of review/Learning/consolidation actions.
- `src/features/world-countries/today/todayPlan.ts` — authoritative derived action priority and Learning recommendation.
- `src/features/world-countries/today/journeyPresentation.ts` — existing learner-facing distinction between Countries established, Add the capitals, Put it all together, and Master the region.
- `src/features/world-countries/learning/subregionLearningStore.ts` — milestone writes and revision notification; do not add another completion store.
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx` and `CapitalLearningFlow.tsx` — milestone-writing Learning coordinators.
- `src/features/world-countries/learning/flows/CountryLearningComplete.tsx`, `CapitalLearningComplete.tsx`, and `LearningComplete.tsx` — existing reusable completion presentation/actions.
- `src/features/world-countries/drill/WorldCountriesDrill.tsx` and `drillLearningRun.ts` — existing non-Today multi-Subregion Learn & Practise progression and fallback labels.

## Edge cases

- **Temporary proficiency scope:** never show Subregion establishment or Today handoff.
- **Direct Learn & Practise with multiple Subregions:** completion continues the selected Learning mode to the next Subregion, not automatically to Capitals.
- **Direct Learn & Practise final Subregion:** return to Learn & Practise as today.
- **Guided Country completion:** use the post-milestone plan; do not reuse the just-completed `learn-countries` recommendation if a transient stale render occurs.
- **Guided Capital completion with another incomplete Subregion:** planner may recommend the next required Learning unit before consolidation; show that real next unit.
- **Due work becomes authoritative:** review wins according to the existing planner priority.
- **Caught up but unfinished:** do not say the region/world is complete. Preserve the existing distinction between `caughtUpForToday` and `scopeComplete`.
- **Scope complete:** only use completion/mastery wording supported by existing plan/journey derivations.
- **Restart:** restarting must reset only the current Learning flow as it does today; it must not execute the guided handoff.

## Out of scope

- Changing Today-plan priority or recommendation rules.
- Changing the six-stage journey model.
- Home/Continent copy cleanup outside the completion handoff.
- New review/consolidation mechanics.
- New evidence, scheduler, mastery, or milestone semantics.
- New persistence or saved journey/session state.
- Changes to map geometry, camera, labels, or interaction.
- Achievements, XP, streaks, badges, confetti, or broader gamification.
- Redesigning Drill/Play/Progress navigation.
- Merging the feature branch to `main`.

## Acceptance criteria

- [x] Durable Country Learning completion is presented as Countries established without claiming long-term mastery.
- [x] Durable Capital Learning completion is presented as Capitals established without claiming Master region/core mastery.
- [x] Temporary proficiency completion uses non-milestone language and does not fabricate a Subregion journey state.
- [x] Guided completion uses the latest post-milestone Today plan as the source of its next action.
- [x] The common guided Country -> same-Subregion Capital transition can continue directly with an explicit Add the capitals action.
- [x] Guided completion respects existing Today priority for review, Learning, consolidation, complete, and unavailable states.
- [x] Starting review/consolidation from Learning completion cannot be masked by the still-mounted finished `learningRun`.
- [x] Guided Learning recommendations reuse the planner-supplied track/Subregion/membership rather than reconstructing them.
- [x] Direct Learn & Practise preserves same-mode multi-Subregion progression and final return behavior.
- [x] `Learn again` remains a secondary restart action for the just-completed flow.
- [x] Caught-up-but-unfinished completion does not claim scope completion.
- [x] No new persisted handoff/journey/action state is introduced.
- [x] Existing milestone writes remain owned by the Learning flows and still happen only at successful Final recall completion.
- [x] Focused automated tests cover durable Country/Capital completion copy, temporary scope truth, Today planner handoff, and Drill progression regression.

## Source anchors

- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/today/WorldCountriesToday.test.tsx`
- `src/features/world-countries/today/todayPlan.ts`
- `src/features/world-countries/today/todayPlan.test.ts`
- `src/features/world-countries/today/journeyPresentation.ts`
- `src/features/world-countries/learning/subregionLearningStore.ts`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CountryLearningComplete.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningComplete.tsx`
- `src/features/world-countries/learning/flows/LearningComplete.tsx`
- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
- `src/features/world-countries/drill/drillLearningRun.ts`
- `docs/architecture/features/WORLD_COUNTRIES.md`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` to state that guided Today owns the post-Learning completion handoff: Learning flows write their milestone and present a parent-provided next action, while the latest derived Today plan remains authoritative for review/Learning/consolidation priority. Preserve the documented distinction for direct Learn & Practise and temporary proficiency runs.

Do not duplicate the full Change Spec rationale in current-state architecture.

## Verification

Observed evidence:

- affected Learning-flow and Today capability suite: 23 files, 135 tests passed;
- full repository suite: 150 files, 1,016 tests passed;
- `npm.cmd run lint` passed;
- `git diff --check` passed;
- `npm.cmd run typecheck` reached the changed code without errors but remains non-zero on the unrelated existing `src/features/world-countries/drill/DrillSetup.test.tsx:301` type error.

Start with the nearest Learning completion and Today orchestration tests. Widen to the World Countries feature slice only if shared contracts or failures justify it.

Browser/manual verification is not required by default. Do not start or troubleshoot a dev server solely for this change.
