# Change Spec 0059 - World Countries Learning session context continuity

- **Status:** Implemented
- **Date:** 2026-09-09
- **Issue:** None.
- **Related ADRs:** None. This change refines presentation within the existing World Countries Learning ownership model.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`

## Goal

Keep the learner oriented throughout a guided Country or Capital Learning run by preserving a lightweight Learning-context rail from walkthrough through practice, combined work, and Final recall. The context must explain where the learner is in the ordered Subregion without competing with the map or reintroducing authoring controls during recall.

This is an in-session continuity change only. It does not change curriculum, scheduling, milestones, evidence, completion behavior, Home/Continent guidance, or map semantics.

## User-visible behavior

### One continuous Learning context

The left Learning rail must no longer disappear when the learner leaves walkthrough and enters active recall.

Across a guided run, the learner should retain enough context to answer:

- which geography am I learning;
- whether I am working on one Set, combined introduced material, or the full final scope; and
- where the Countries sit in the established Learning order.

The map remains the dominant center surface. The persistent rail is orientation, not a second task surface.

### Walkthrough remains the rich authoring state

During **Meet the countries** and **Add the capitals** walkthroughs, preserve the existing rich Learning rail:

- geography/breadcrumb context;
- learner-facing Learning progress;
- full Learning order;
- previous/current/upcoming Set presentation;
- existing Country-order authoring where available;
- existing mnemonic support in the appropriate rail.

No walkthrough capability is removed by this change.

### Set-local recall and ready phases use compact context

During Country Locate/Practice and Country/Capital Set-ready or Practice phases, keep a compact, non-authoring left rail.

It must:

- keep the geography/scope visible;
- identify the active Set using the existing staged plan identity;
- keep the full ordered Country list available for orientation;
- distinguish previous, current, and upcoming Countries truthfully;
- keep current-Set Countries visually stronger than upcoming Countries; and
- avoid showing `Edit order`, mnemonic editing, or other authoring controls.

Exact copy may follow existing conventions, but the learner must not lose the relationship between the current Set and the full Learning order.

### Combined practice shows introduced scope, not a current Set

During Combined Practice and Combined-ready phases, do not continue the Set-local visual model.

The compact rail must communicate that the learner is now practising the cumulative introduced scope, for example conceptually:

```text
Northern Europe
Combined practice
6 of 10 Countries introduced
```

The ordered list may remain visible, but Countries included in the combined scope must read as the active introduced scope and later Countries as upcoming. Do not mark one Set as `Current Set` during a combined phase.

The introduced membership must be derived from the existing combined plan stage; do not reconstruct or persist separate journey state.

### Final recall shows the full scope

During Final-recall gate and Final recall, the compact rail must present the whole Learning scope as active.

Conceptually:

```text
Northern Europe
Final recall
All 10 Countries
```

Do not show a current Set, previous Set, or upcoming Set distinction once the flow is operating on the full final scope. Existing task-dock/session progress remains the source of per-answer traversal progress; the rail does not need to duplicate every progress counter.

### Completion stays unchanged

The `complete` phase is deliberately excluded from this change. Existing Country/Capital completion presentation and actions remain unchanged. A richer journey handoff after completion is separate work.

## Scope

- Preserve the left guided Learning rail through all in-session Country and Capital Learning phases up to Final recall.
- Introduce a compact non-authoring rail presentation for non-walkthrough phases.
- Derive Set, combined introduced-scope, and final full-scope presentation from existing staged Learning state/plan.
- Preserve the full ordered Country sequence as orientation where useful without changing its authoring semantics.
- Keep authoring and mnemonic editing restricted to their existing walkthrough context.
- Preserve existing right-rail Practice progress and Back/Skip/Exit behavior.
- Update focused Learning presentation tests.
- Update current-state World Countries documentation to describe the persistent-but-reduced in-session Learning rail.

## Interaction and states

### Walkthrough

Use the existing rich Learning rail. Current Set emphasis, order editing, hover coupling, and mnemonic behavior remain unchanged.

### Set-local active recall

Country phases include Locate and typed Country Practice. Capital Learning includes typed Capital Practice.

The left rail remains visible, but authoring is disabled/hidden. The current Set and full order remain understandable while the central task retains visual priority.

### Set-ready

Keep the same compact Set context visible while the learner chooses to continue or keep practising. Do not switch back to an authoring presentation merely because active answer entry has paused.

### Combined practice / combined-ready

Show cumulative introduced scope. Do not label any individual Set as current. Future not-yet-introduced Countries may remain subdued in the full ordered list.

### Final gate / Final recall

Show the full scope as active and remove Set-local distinctions. Existing Final-recall task progress and repair traversal behavior remain unchanged.

### Complete

No new left-rail requirement. Existing completion behavior remains authoritative.

### Temporary proficiency Learning scope

When Learning is running over a temporary proficiency scope rather than a durable Subregion, preserve the existing truthful temporary-scope semantics. Do not fabricate a Subregion, milestone, Set ownership, or durable journey status that the flow does not have.

### Responsive/accessibility

Reuse the existing PageLayout rail behavior. Do not create a new overlay, drawer, or independent responsive system for this context.

The compact rail must retain meaningful headings/accessible labels, and required orientation must not depend only on hover or color.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and `src/features/world-countries/AGENTS.md`.
- Keep Country/Capital flow and staged-plan ownership in `learning/` and `learning/flows/`.
- Reuse the existing `PageLayout`/`useRails` slot and `GuidedLearningRails`; do not create a parallel session-context surface.
- Derive presentation from existing `flow.plan`, `stageIndex`, current staged membership, and ordered entries. Do not add persisted state or a second curriculum/session model.
- Prefer a small derived presentation extension/helper when needed over duplicating Set/combined/final interpretation independently in Country and Capital UI.
- Do not change scheduler thresholds, answer transitions, Learning milestone writes, planner semantics, map presentation semantics, or evidence.
- Leaving walkthrough must still clear/discard transient order-authoring/hover/click-order state so hidden authoring state cannot leak into recall phases.
- Do not reduce the center map width or change `LearningMapSurface` composition solely to fit more rail content.

## Existing capabilities to reuse

- `learning/flows/GuidedLearningRails.tsx` - canonical Learning rail and the existing rich/quiet-phase split to refine.
- `learning/stagedLearningPlan.ts` - authoritative Set, combined, and final stage membership and `deriveLearningSetPresentation` seam.
- `learning/flows/CountryLearningFlow.tsx` - Country flow phase/stage ownership and staged membership.
- `learning/flows/CapitalLearningFlow.tsx` - Capital flow phase/stage ownership and staged membership.
- `learning/flows/SchedulerPracticeProgress.tsx` - existing right-rail scheduler progress; preserve rather than duplicate in the left context.
- `app/layout/PageLayoutContext.tsx` - existing single PageLayout rail registration seam.

## Edge cases

- **One-Set scope:** avoid redundant wording such as `Set 1 of 1` plus `all Countries` when a simpler truthful label is clearer. Final recall still becomes full-scope presentation.
- **Set size equals full scope:** do not invent upcoming Countries or a false Set/full-scope distinction.
- **Combined stage contains all Countries:** it is still Combined Practice until the flow enters Final recall; label the phase truthfully even if introduced count equals total count.
- **Variable Set sizes:** never infer Set number or membership from Country counts alone; use staged-plan identity.
- **Order editing transition:** entering recall after editing must use the saved effective order and must not leave an invisible edit draft active.
- **Repair traversal during Final recall:** rail scope remains the full Learning scope; repair traversal is task/session detail, not a different geography scope.
- **Temporary proficiency scope:** retain non-recording/non-milestone semantics and a truthful provided scope label.

## Out of scope

- Completion-screen next-step recommendations or journey handoff.
- Home/Continent copy, metric, or hierarchy cleanup.
- Planner/curriculum changes after CS 0057.
- New Learning activities, Practice modes, or Play modes.
- Scheduler, mastery, evidence, or persistence changes.
- Gamification, streaks, achievements, XP, or celebratory effects.
- Map color, camera, geometry, labeling, or interaction changes.
- New responsive layout architecture.
- Broad rail redesign outside guided Learning.
- Merging `world-countries-learning-journey` to `main`.

## Acceptance criteria

- [x] Guided Country Learning retains a left Learning-context rail from walkthrough through Location, Practice, Set-ready, Combined, Final gate, and Final recall phases.
- [x] Guided Capital Learning retains a left Learning-context rail from walkthrough through Practice, Set-ready, Combined, Final gate, and Final recall phases.
- [x] Walkthrough preserves the existing rich rail, order authoring, Set emphasis, and mnemonic behavior.
- [x] Non-walkthrough in-session phases do not expose order editing or mnemonic editing.
- [x] Entering a non-authoring phase still clears transient order draft, hover, and click-order authoring state.
- [x] Set-local phases identify the active Set from existing staged-plan truth and keep previous/current/upcoming Countries understandable in the full Learning order.
- [x] Combined phases present cumulative introduced scope and do not label any individual Set as current.
- [x] Final gate/Final recall present the full Learning scope and do not retain previous/current/upcoming Set semantics.
- [x] Variable Set sizes, one-Set scopes, and combined-full-scope cases remain truthful without count-based inference of stage identity.
- [x] Existing right-rail Practice progress and Back/Skip/Exit action ordering remain unchanged.
- [x] Existing map/task presentation, answer behavior, scheduler state, milestone writes, evidence, and planner behavior remain unchanged.
- [x] Temporary proficiency Learning scopes retain truthful non-Subregion semantics.
- [x] No new persisted state or parallel rail/layout/session model is introduced.
- [x] Focused automated tests cover the shared rail semantics plus Country/Capital caller integration and important regressions.

## Source anchors

- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
- `src/features/world-countries/learning/flows/GuidedLearningRails.test.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.test.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.test.tsx`
- `src/features/world-countries/learning/stagedLearningPlan.ts`
- `src/app/layout/PageLayoutContext.tsx`
- `docs/architecture/features/WORLD_COUNTRIES.md`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` so current-state Learning composition explicitly states that the Learning context rail persists through in-session recall with reduced, non-authoring presentation; Set-local, combined, and final phases must describe their actual staged scope.

Do not add styling details or duplicate Change Spec rationale into architecture documentation.

## Verification

Complete this section when setting the status to `Implemented`.

### Implementation evidence

- `npx.cmd vitest run src/features/world-countries/learning` — 37 test files and 197 tests passed, including the shared rail, staged-plan, Country-flow, and Capital-flow coverage.
- `npm.cmd run lint` — passed.
- `git diff --check` — passed.
- `npm.cmd run typecheck` — the changed Learning files typecheck, but the repository check is blocked by an unrelated existing error at `src/features/world-countries/drill/DrillSetup.test.tsx:301` (`Map<any, any>` is not assignable to `Map<string, never>`).
- Browser/manual verification was not run; it is not required for this change by the repository workflow.

Expected risk-proportionate evidence:

- focused `GuidedLearningRails` tests covering rich walkthrough, compact Set-local context, Combined scope, Final scope, hidden authoring, and authoring-state cleanup;
- focused Country and Capital Learning flow tests confirming the shared rail receives/derives truthful staged context through representative phase transitions;
- existing right-rail Practice progress/action regression tests remain passing;
- nearest staged-plan tests only if a shared presentation derivation helper is added or changed.

Start with the focused Learning test files. Widen to the World Countries feature slice only if touched shared seams or failures justify it. Run `git diff --check`. Run typecheck/lint only when materially relevant to the implementation or changed contracts.

Browser/manual verification is not required by default. Do not start or troubleshoot a dev server solely for verification.
