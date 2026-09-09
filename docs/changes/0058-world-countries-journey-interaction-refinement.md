# Change Spec 0058 - World Countries journey interaction refinement

- **Status:** Implemented
- **Date:** 2026-09-08
- **Issue:** None.
- **Related ADRs:** None. This change refines learner-facing presentation and interaction within the existing World Countries ownership model.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`

## Goal

Make the new World Countries guided journey easier to understand and use by clarifying what the learner is working on **right now**, reducing internal/system language, and simplifying the Home/Continent supporting UI without changing the planner, curriculum, evidence, or Learning engines established by Change Specs 0056 and 0057.

The map remains the primary learning surface. Supporting rails should explain context and progress without competing with the current task.

## User-visible behavior

### Current Set versus full Subregion

During guided Country or Capital Learning, the learner must be able to distinguish:

- the **current Set** being worked on now; and
- the **full Subregion** learning order.

For example, while learning Northern Europe with a 3-Country Set inside a 10-Country Subregion, the UI must not present:

```text
Northern Europe
3 countries in scope
```

beside an apparently equivalent 10-Country `Learning order` without explaining the difference.

The presentation should instead communicate the relationship explicitly, for example:

```text
Current Set
3 Countries

Northern Europe
10 Countries total
```

Exact copy may follow existing UI conventions. The distinction is normative.

The current Set should receive greater visual emphasis than Countries that belong to later Sets. The full learning order remains available for orientation and existing order authoring, but it must not visually imply that all Countries are active in the current task.

### Learning stage language

Active Learning should use the learner-facing journey language introduced by 0057 where practical.

Examples:

- Country introduction should feel like **Meet the countries**, not a generic `Review` session.
- Country locate/practice phases remain clearly Country-focused.
- Capital introduction should feel like **Add the capitals**.
- Combined/final phases may retain their existing precise task labels where those are more useful than the broad journey stage.

Do not make the learner infer the curriculum stage from implementation terms such as `Set 1 · Review` when a clearer journey label is available.

The task itself still needs precise local context such as Set number and progress. Journey language and local task context should complement rather than duplicate each other.

### Learner-facing progress language

Avoid exposing `Learning Readiness` as a prominent system concept during an active session.

Use learner-facing wording aligned with the journey, such as progress/state wording equivalent to:

- Countries not established yet;
- Countries established;
- Adding capitals;
- Countries + Capitals established.

The underlying Learning Readiness model and durable milestone semantics remain unchanged. This is presentation only.

Do not replace useful precise task/progress information with vague motivational copy.

### Home and Continent hub hierarchy

The Home/Continent hub right rail should prioritize:

1. what the learner should do next;
2. why, when useful;
3. the currently inspected/guided journey;
4. Play and Progress as secondary actions.

Do not show low-value zero-state metric boxes merely because the data exists. For example, when there are no due reviews, separate `Due reviews: 0` and `Due Countries: 0` cards should not occupy prominent space.

When review is due, the relevant counts and reason remain useful and should be shown.

Avoid redundant representations of the same next action. For example, a primary Continue explanation plus a separate `Next Learning` card should only both appear when each adds distinct information.

The attached map `TaskDock` remains the single primary action surface.

### Map remains primary

Do not reduce the map to make room for more rail content.

During Learning:

- the map should remain the dominant center surface;
- current Set Countries should be visually understandable as the active working set;
- the full Subregion remains geographic context;
- hover/selection/order-edit behavior continues to use existing map presentation seams.

During Home/Continent navigation:

- the map remains both progress overview and geography navigation;
- current inspection/guided highlighting remains transient and unchanged in meaning.

### Memory aids and actions

Memory aids remain available during walkthrough phases, and Learning actions such as Skip/Back/Exit remain available.

They should remain supporting tools rather than competing with the current Country/Capital task.

Do not remove mnemonic editing or existing navigation behavior in this pass.

## Scope

- Clarify current Set versus full Subregion scope in guided Learning presentation.
- Refine Learning headers/task context to use journey-aligned learner language.
- Replace prominent internal `Learning Readiness` wording in active Learning with learner-facing progress wording while preserving the underlying model.
- Reduce redundant/empty information in Home/Continent guided rails.
- Preserve map dominance and existing map interaction semantics.
- Add/update focused presentation tests.
- Update current-state documentation only where the documented UI contract materially changes.

## Interaction and states

### Country Learning walkthrough

The learner sees:

- the broad stage: **Meet the countries**;
- the current Country;
- current Set progress;
- the map with the current Country highlighted/named;
- clear indication that the active Set is only part of the full Subregion.

Capitals remain absent from Country Learning walkthrough.

### Country locate/practice

The current task remains precise (`Find Norway`, `Name the country`, etc.).

The surrounding UI continues to explain which Set and Subregion the learner is working through without making the full Subregion appear simultaneously active.

### Capital Learning walkthrough

The learner sees:

- the broad stage: **Add the capitals**;
- the current Country ↔ Capital association;
- current Set progress;
- current Set versus full Subregion context.

### Home/Continent - review due

- Continue/review is dominant.
- Relevant due counts/reasons may be shown.
- Journey remains visible where useful.
- Play and Progress remain secondary.

### Home/Continent - next Learning

- Continue Learning is dominant.
- The Subregion and layer (`Countries` or `Capitals`) are clear.
- Do not duplicate the same recommendation in multiple equally prominent cards.

### Home/Continent - caught up but unfinished

- Existing 0057 behavior remains: caught up for today is distinct from complete.
- Unfinished geography remains explainable.
- `Practice unfinished area` remains the single primary attached map action.
- Zero due-review cards are not shown merely to say zero.

### Home/Continent - complete

- Clearly communicate completion without unnecessary due-review metrics.
- Play and Progress remain available.

### Responsive/accessibility

Preserve existing PageLayout responsive behavior and keyboard/accessibility semantics.

Do not hide required task context only in hover states.

Changes to labels/headings must keep meaningful accessible names for the current task and scope.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and `src/features/world-countries/AGENTS.md`.
- This is a presentation/interaction refinement. Do not change the guided planner semantics completed in CS 0057 unless a direct correctness bug is discovered.
- Do not add persisted UI/journey/session state solely for presentation.
- Keep Country/Capital Learning phase/state ownership in `learning/flows/` and staged learning modules.
- Keep Home/Continent guided orchestration in the existing Today-owned seams.
- Reuse `PageLayout`, `MapSurface`, `TaskDock`, `LearningMapSurface`, `GuidedLearningRails`, `GuidedHomeRails`, and existing map presentation helpers.
- Do not create a parallel layout, map, journey, rail, or Learning component system.
- The accompanying visual reference defines hierarchy, grouping, prominence, and copy direction. It is not implementation source code.
- Do not port standalone visual-reference HTML/CSS into React. Reproduce the intent through existing application components and styles.

## Existing capabilities to reuse

- `learning/flows/CountryLearningFlow.tsx` - Country phase/task presentation and current staged Set.
- `learning/flows/CapitalLearningFlow.tsx` - Capital phase/task presentation and current staged Set.
- `learning/flows/GuidedLearningRails.tsx` - active Learning context/order/actions/memory aids.
- `learning/flows/LearningMapMetadata.tsx` - current map scope metadata; extend/refine rather than duplicate.
- `learning/flows/LearningMapSurface.tsx` - canonical Learning map/task composition.
- staged Country/Capital flow helpers - authoritative current Set/stage identity.
- `today/GuidedHomeRails.tsx` - Home/Continent supporting information hierarchy.
- `today/WorldCountriesToday.tsx` - Home/Continent map and primary attached action.
- `today/journeyPresentation.ts` - learner-facing journey labels/status.
- `ui/MapSurface.tsx`, `WorldCountriesPanel.tsx`, `GeographyBreadcrumbs.tsx` - existing visual shell.

## Edge cases

- **Set size equals Subregion size:** do not manufacture a confusing distinction. It is fine to say the current Set contains all Countries in the Subregion.
- **Final/combined phases use the whole introduced scope:** current task metadata should reflect the actual phase scope rather than always saying `Current Set` if the staged flow is no longer operating on one Set.
- **Order editing:** the full Subregion order remains editable through the existing authoring capability. Current Set emphasis must not imply that only the current Set can be reordered if the underlying behavior edits the whole Subregion.
- **Small Subregion:** avoid duplicate counts such as `3 Countries current · 3 Countries total` when a simpler scope label is clearer.
- **Inspected Subregion differs from guided Subregion:** preserve the existing inspection explanation and do not change planner state.
- **No due reviews:** remove unnecessary zero-value status boxes but retain enough context to explain the next guided action.
- **Evidence loading/error:** preserve the stable shell and existing error semantics; do not fabricate journey/progress detail.

## Out of scope

- Planner/curriculum redesign after CS 0057.
- New mastery rules, review scheduling, evidence types, or persistence.
- New Learning activities or Play modes.
- Replacing the six-stage journey.
- Gamification, streaks, achievements, or XP.
- Broad redesign of map colors/geometry/camera behavior.
- Full mobile redesign.
- Removing order authoring or mnemonics.
- Merging `world-countries-learning-journey` to `main`.

## Acceptance criteria

- [x] Active guided Learning clearly distinguishes the current Set from the full Subregion when those scopes differ.
- [x] The full Subregion learning order remains available and existing order editing still works.
- [x] Current Set Countries receive stronger presentation emphasis than later Subregion Countries without changing underlying staged-flow membership.
- [x] Country walkthrough uses learner-facing **Meet the countries** context and remains Capital-free.
- [x] Capital walkthrough uses learner-facing **Add the capitals** context and preserves Country ↔ Capital content.
- [x] Precise local task labels/progress remain available during locate/practice/final phases.
- [x] Active Learning no longer prominently exposes `Learning Readiness` as unexplained system terminology.
- [x] Learner-facing progress wording remains consistent with the existing journey and underlying readiness truth.
- [x] Home/Continent does not show prominent zero-value due-review cards when no review is due.
- [x] Home/Continent avoids duplicating the same next-Learning recommendation in equally prominent status/card surfaces.
- [x] Review-due states still show useful due counts/reasons.
- [x] Caught-up-but-unfinished consolidation remains a single attached map CTA.
- [x] Map remains the dominant center surface in Home/Continent and guided Learning.
- [x] Existing inspection, Play, Progress, mnemonic, Back/Skip/Exit, and order-authoring behavior remains available.
- [x] No new persisted state or parallel UI architecture is introduced.
- [x] Focused automated tests cover the changed presentation semantics and important regressions.

## Source anchors

- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
- `src/features/world-countries/learning/flows/LearningMapMetadata.tsx`
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx`
- `src/features/world-countries/today/GuidedHomeRails.tsx`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/today/journeyPresentation.ts`
- `src/features/world-countries/ui/MapSurface.tsx`
- `docs/changes/0058-world-countries-journey-interaction-refinement-visual-reference.html`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` only if the current-state learner-facing composition description needs to reflect the clarified Set/Subregion or rail hierarchy.

Do not add detailed visual styling rules to architecture documentation.

## Verification

Complete this section when setting the status to `Implemented`.

Expected risk-proportionate evidence includes:

- focused Country Learning presentation tests for current Set/Subregion distinction and `Meet the countries` context;
- focused Capital Learning presentation tests for current Set/Subregion distinction and `Add the capitals` context;
- Guided Learning rail tests for learner-facing progress terminology and retained order authoring/actions;
- Guided Home rail tests for zero-due simplification, review-due detail, next-Learning hierarchy, and caught-up consolidation regression;
- nearest existing map/task composition tests when props/contracts change.

Run the World Countries feature slice if focused tests pass and the touched presentation seams justify it. Run `git diff --check`. Run lint/typecheck only when materially relevant; report unrelated existing failures rather than fixing them.

Browser/manual verification is not required by default. Do not start or troubleshoot a dev server solely for verification.

## Implementation evidence

- Focused presentation checks: `npx.cmd vitest run src/features/world-countries/learning/flows/CountryLearningFlow.test.tsx src/features/world-countries/learning/flows/CapitalLearningFlow.test.tsx src/features/world-countries/learning/flows/GuidedLearningRails.test.tsx src/features/world-countries/today/GuidedHomeRails.test.tsx src/features/world-countries/today/WorldCountriesToday.test.tsx src/features/world-countries/learning/flows/LearningMapSurface.test.tsx src/features/world-countries/ui/MapSurface.test.tsx` — 7 files, 44 tests passed. These cover Set/Subregion metadata, full-order/current-Set emphasis, walkthrough stage language and task semantics, truthful progress after Learn again, the journey-consistent Country back action, learner-facing progress wording, zero/review-due Home rails, and retained map/interaction seams.
- `npx.cmd vitest run src/features/world-countries` — 115 files, 772 tests passed.
- `npm.cmd test` — 150 files, 983 tests passed.
- `git diff --check` — passed.
- `npm.cmd run lint` — passed.
- `npm.cmd run typecheck` — reports only the known unrelated `src/features/world-countries/drill/DrillSetup.test.tsx:301` `Map<any, any>` inference error; no changed-file type errors remain.
- Browser/manual verification was not run, as permitted by the spec and repository instructions.

No material deviation from the visual reference was identified. The current
Set/full Subregion distinction and supporting hierarchy use the existing
Learning map metadata, rails, order editor, map surface, and attached dock;
the reference HTML/CSS was not ported.
