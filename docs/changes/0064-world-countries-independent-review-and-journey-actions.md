# Change Spec 0064 - World Countries independent review and journey actions

- **Status:** Implemented
- **Date:** 2026-09-10
- **Issue:** None.
- **Related ADRs:** None. This change revises learner-facing Today planning and Home composition within the existing World Countries/Today ownership boundary; it does not introduce a new durable architectural boundary or persisted state model.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`

## Goal

Make World Countries Home and Continent hubs present two independent learner intentions: **continue the guided journey** and **review/practise already learned material**. Due review must no longer replace or hide available Country/Capital Learning. Review becomes a separate, rewarding opportunity in the right rail; when no scheduled review is due, that same area may fall back to optional weak-spot strengthening. The map-centered Journey action remains the primary forward-progression action.

This intentionally replaces the old learner-facing Today priority model where review, Learning, and consolidation competed to become one primary action. Today remains the owner of all underlying review, consolidation, and Learning planning.

## User-visible behavior

### 1. Journey progression and Review are independent choices

When a curriculum Learning recommendation exists, Home continues to offer it even when scheduled reviews are due.

The learner can choose either activity without one being presented as a prerequisite for the other:

```text
RIGHT RAIL

REVIEW READY
6 items
See what stuck.
[ Review 6 ]

YOUR JOURNEY · NORTHERN EUROPE
✓ Countries       Complete
● Capitals        Current
○ Mastery         Upcoming
```

The map area independently presents the Journey continuation:

```text
CONTINUE YOUR JOURNEY
Add the capitals · Northern Europe
[ Continue learning ]
```

Starting Review launches the bounded review block. Starting Continue Learning launches the current curriculum recommendation. Review does not advance or replace the Journey; continuing the Journey does not dismiss or consume scheduled review work.

### 2. Review has its own top right-rail panel

Review is not nested inside `Your journey` and is not represented by the map's primary Journey button.

When scheduled review is due, the top right-rail panel communicates a positive, compact opportunity equivalent to:

```text
REVIEW READY
6 items
See what stuck.
[ Review 6 ]
```

The panel should feel inviting rather than overdue or punitive. Avoid debt, backlog, obligation, or guilt language.

The existing scheduler truth remains authoritative. The button count is the bounded block that will launch now. When the total due count is greater than the bounded block, supporting copy may communicate the total as long as the distinction is explicit, for example:

```text
12 ready to review now
20 ready overall
```

Do not present the total due count as though all of it will launch in the current block.

Existing review-reason information remains available where useful, but it must not turn the panel into a dense diagnostic surface. Review should read first as a small, achievable opportunity.

### 3. Consolidation becomes the fallback inside the Review area

When no scheduled review is due but introduced core material remains below mastery and a consolidation queue is available, the Review panel becomes quieter and offers optional strengthening rather than a competing Home mode.

Use learner-facing language equivalent to:

```text
REVIEWS CAUGHT UP
4 weak spots available
[ Strengthen weak spots ]
```

The learner-facing Home and active practice surfaces should not require the term `consolidation`. Internal types and implementation terminology may remain if they are still useful and accurate.

This fallback launches the existing bounded consolidation candidates through the existing typed-recall/evidence mechanics.

### 4. Fully caught-up Review state is compact

When there is no due review and no consolidation opportunity, the Review area remains visually quiet and has no CTA, for example:

```text
REVIEWS CAUGHT UP
Nothing needs your attention right now.
```

Do not fabricate practice just to keep an action visible.

### 5. The Journey panel is orientation only

The right-rail Journey panel answers **where am I in the larger journey?** It retains the region and the learner-facing Countries / Capitals / Mastery projection.

It must not duplicate the specific next Journey action. Remove learner-visible copy such as:

```text
Next in journey: Add the capitals
```

The specific next step and its CTA belong together in the map-attached Journey dock.

The Journey panel continues to own transient inspected-region orientation from Change Spec 0063. Inspecting another Subregion may change the displayed Journey/orientation surface, but it must not change either the underlying curriculum continuation or the Review queue.

### 6. The map-attached dock owns Journey action detail

When a Learning continuation exists, the attached dock beneath the map presents both the meaning of the action and the CTA. Use a hierarchy equivalent to:

```text
CONTINUE YOUR JOURNEY
Add the capitals · Northern Europe
[ Continue learning ]
```

For Country Learning, the action line remains truthful to the actual first staged Set count when that count is available, for example:

```text
Learn 3 countries · Northern Europe
```

The button may remain the stable `Continue learning` action while the line above carries the specific action detail.

The violet Journey CTA remains the strongest forward-progression action on the page. Review Ready may use positive/green ready styling, but hierarchy and meaning must also be understandable from text and semantics rather than color alone.

When no curriculum Learning continuation exists, do not show a fake Continue Learning dock merely because Review or weak-spot practice is available.

### 7. Learning completion follows the Journey, not Review availability

A completed Country or Capital Learning run may still receive a parent-provided direct handoff to the next **Journey Learning** recommendation, preserving the current direct Country -> Capital and Subregion-to-Subregion progression where applicable.

A newly due Review block or available weak-spot practice must not hijack Learning completion and replace that Journey continuation.

If there is no further Journey Learning recommendation, completion returns to the current World/Continent guided surface. Review or weak-spot practice remains available there as an independent choice.

### 8. Review completion returns to the independent Home choices

Completing or exiting Review/weak-spot practice refreshes the existing Home/Continent evidence and planner state. The Review panel updates from current scheduler truth, while any Journey Learning continuation remains independently available.

Do not automatically enter Learning after finishing Review, and do not mark Review as a prerequisite that has now unlocked Learning.

## Scope

- Refactor Today/Home planning so scheduled Review does not suppress the underlying Country/Capital Learning continuation.
- Expose independently consumable Journey continuation and Review/practice opportunity semantics from the existing Today plan.
- Preserve due-review priority over consolidation **within the Review area only**.
- Move Review/weak-spot actions into a standalone top right-rail panel.
- Keep the Journey panel as state/orientation only and remove duplicate `Next in journey` action copy.
- Keep specific Journey action detail and `Continue learning` together in the map-attached dock.
- Prevent Review/consolidation availability from hijacking post-Learning completion handoffs.
- Use learner-facing weak-spot/practice language rather than `consolidation` where that implementation term is currently exposed.
- Preserve current World/Continent inspection behavior, bounded review/consolidation queues, Review session mechanics, staged Learning, and map behavior.
- Update focused tests and current-state architecture documentation.

## Interaction and states

### Review due + Learning available

Both are visible at the same time. Review appears in the standalone top right-rail panel; Continue Learning remains attached to the map. Either can be started directly.

### Review due + no Learning continuation

Show Review Ready in the right rail. Do not render the map-attached Continue Learning dock.

If a Journey orientation remains meaningful because core recall is incomplete, the Journey panel may still show the appropriate state without fabricating a Learning action.

### No review due + Learning available + weak spots available

The map-attached Journey dock remains the primary forward action. The top right-rail Review area quietly says reviews are caught up and offers weak-spot strengthening as a secondary option.

### No review due + Learning available + no weak spots

The Review area is compact/caught up. Continue Learning remains available in the center.

### No review due + no Learning + weak spots available

No Continue Learning dock. The Review area offers weak-spot strengthening.

### Fully complete / no current activity

Do not synthesize a Journey action. Keep caught-up/complete presentation truthful. Play and Progress remain available.

If scheduler truth can still produce due review for otherwise mastered material, scheduled Review remains valid and independently visible; curriculum completion alone must not suppress genuine due work.

### Review due across another region

Example: the Journey is Northern Europe while the bounded Review block contains Southern Europe material.

- right Journey panel remains Northern Europe;
- center Continue Learning launches Northern Europe Learning;
- Review panel launches the actual bounded Review block;
- Review geography does not redefine Journey focus;
- inspected map geography remains a third, transient presentation concept as already established by Change Spec 0063.

### Total due exceeds bounded block

Preserve the current bounded block size and truthful total-vs-block distinction. The CTA launches only the bounded block.

### Loading, error, and zero-country states

Preserve the stable map/rail shell and existing Play availability. Do not render invalid Review or Continue Learning actions while evidence/planning is unavailable.

### Accessibility and keyboard behavior

The two intentions must remain distinguishable through headings, action labels, focus order, and accessible text without relying on panel position or color. Preserve existing focus, keyboard, map-selection, typed-answer, and rail behavior unless a focused adjustment is required by the new action ownership.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and `src/features/world-countries/AGENTS.md`.
- Work only on `world-countries-learning-journey`; do not switch or merge to `main`.
- `today/` remains the owner of derived due review, review queues, consolidation queues, curriculum recommendations, Journey focus, and guided delegation.
- Reuse the already-independent `curriculumRecommendation` derivation. Do not create a second curriculum planner or duplicate Journey state.
- Due Review must no longer null/suppress Journey Learning availability merely to choose one primary Home action.
- The Today plan should expose coherent independent semantics for:
  - current Journey/learning continuation, when one exists;
  - current Review/practice opportunity: due review first, otherwise consolidation/weak-spot practice, otherwise none/caught up.
- Exact property/type names are implementation-defined. If legacy `action`, `nextLearning`, or `caughtUpForToday` semantics become misleading, refactor their callers instead of preserving ambiguous fields or introducing parallel sources of truth.
- Preserve `journeyFocusSubregionId` as derived, non-persisted presentation/planning context. Do not add persisted current-region, curriculum-cursor, review-dismissal, daily-gate, or session bookkeeping state.
- Preserve `WORLD_COUNTRIES_TODAY_REVIEW_BLOCK_SIZE`, review scheduling, due-candidate ranking, interleaving, consolidation candidate derivation/ranking, retry behavior, and review-reason classification.
- Preserve recall evidence semantics, mastery/proficiency derivation, Learning milestones, staged Set/Combined/Final mechanics, answer matching, dwell timing, and map behavior.
- Due Review takes precedence over consolidation only inside the independent Review/practice opportunity. Do not surface consolidation while genuine due Review is available.
- Reuse `WorldCountriesPanel` and existing PageLayout rail composition. Do not create a new global panel/layout primitive for this change.
- Reuse the existing map `TaskDock` for the Journey continuation rather than moving the primary Learning CTA into the right rail.
- Preserve Change Spec 0063's separation of planner-derived Journey focus, action scope, and explicitly inspected Subregion.
- Preserve one-Set presentation cleanup and active Learning rail flattening from Change Spec 0063.

## Existing capabilities to reuse

- `src/features/world-countries/today/todayPlan.ts` - independent `curriculumRecommendation`, stable `journeyFocusSubregionId`, due totals, bounded `reviewQueue`, bounded `consolidationQueue`, and review reason summary.
- `src/features/world-countries/today/WorldCountriesToday.tsx` - Home/Continent orchestration, action launching, evidence refresh, Learning runs, completion handoffs, inspection state, and map-attached `TaskDock` composition.
- `src/features/world-countries/today/GuidedHomeRails.tsx` - Home rail composition, due/reason presentation, inspected-region messaging, Journey projection, and secondary Play/Progress actions.
- `src/features/world-countries/today/TodayReviewSession.tsx` - shared typed recall/evidence session used by scheduled Review and consolidation practice.
- `src/features/world-countries/today/TodayRails.tsx` - active Review/practice rail presentation.
- `src/features/world-countries/today/journeyPresentation.ts` - derived Countries / Capitals / Mastery Journey state.
- `src/features/world-countries/ui/WorldCountriesPanel.tsx` - canonical contained rail panel.
- `src/features/world-countries/ui/MapSurface.tsx` - existing map-attached `TaskDock` presentation.
- Existing focused tests beside these modules.

## Edge cases

- Due Review exists in Southern Europe while Northern Europe Country/Capital Learning remains: both actions are shown; each launches its own truthful scope.
- A bounded Review block spans multiple Subregions: the Review panel may describe that scope, but Journey focus still comes from the existing curriculum/incomplete-region derivation.
- `dueCount > reviewQueue.length`: Review CTA count matches the bounded block; total due context, if shown, is explicitly total/overall.
- `dueCount === reviewQueue.length`: avoid unnecessary repeated counts across the Review panel.
- Due Review and consolidation candidates both exist: show scheduled Review only; consolidation remains fallback after due Review reaches zero.
- No due Review, but consolidation and Learning are both available: Continue Learning remains primary in the map dock while weak-spot strengthening is independently available in the quieter Review panel.
- The learner inspects a Subregion other than Journey focus: inspection changes displayed orientation only, not Journey continuation or Review candidates.
- Learning completion produces another curriculum recommendation while Review is also due: direct Learning handoff follows the new curriculum recommendation; Review remains on Home.
- Learning completion has no further curriculum recommendation but Review is due: return to Home/Continent rather than auto-launching Review.
- Fully introduced material with incomplete mastery can still surface weak-spot strengthening when no scheduled Review is due.
- Review/consolidation session retry and evidence writes remain unchanged.
- Singular/plural counts remain correct for `1 item`, `1 country`, and equivalent labels.

## Out of scope

- Changing review spacing, due calculation, difficulty rules, block size, ranking, or interleaving.
- Changing consolidation target selection/ranking or its bounded queue size.
- Introducing streaks, points, reward currency, celebrations, goals, notifications, or other gamification systems.
- Adding a rule such as “one Review block per session/day before Learning”; Review and Learning are intentionally independent choices.
- Changing Review prompt mechanics, retry mechanics, typed-answer lifecycle, evidence writes, or completion scoring.
- Changing Learning Set sizing, staged flow, milestones, readiness, or curriculum order.
- Persisting new Home/Journey/Review UI state.
- Redesigning Play, Progress, Recite, Drill, Quiz, Settings, or map behavior.
- Moving Continue Learning into the right rail or moving the full Journey orientation surface into the map center.
- New backend/network/account/telemetry behavior.
- Broad palette or shared layout-system changes.
- Merging the branch to `main`.

## Acceptance criteria

- [ ] When scheduled Review is due and a curriculum Learning recommendation exists, both Review and Continue Learning are available simultaneously on Home/Continent.
- [ ] Due Review no longer suppresses/nulls the Journey Learning continuation solely because Review is due.
- [ ] The center/map-attached dock launches only Journey Learning and is not replaced by Review or weak-spot practice.
- [ ] The Journey dock presents both a clear `Continue your journey` context and the specific truthful next Learning action/scope, with a stable forward CTA such as `Continue learning`.
- [ ] Scheduled Review is presented in a standalone top right-rail panel, separate from the Journey panel, with a bounded Review CTA and positive/non-punitive copy.
- [ ] The Review CTA launches the existing bounded Review queue and does not mutate Journey focus or curriculum progression.
- [ ] Total due work and bounded current Review block remain unambiguously distinct when their counts differ, and redundant counts are avoided when they are equal.
- [ ] When no scheduled Review is due and a consolidation queue exists, the same right-rail area offers a quieter weak-spot strengthening action using learner-facing practice language rather than requiring the term `consolidation`.
- [ ] Consolidation/weak-spot practice is not surfaced while due Review exists.
- [ ] When neither due Review nor weak-spot practice exists, the Review panel is compact/caught up and has no CTA.
- [ ] The Journey panel contains region + Countries / Capitals / Mastery orientation and no learner-visible `Next in journey: ...` duplicate action line.
- [ ] Existing inspected-Subregion messaging remains separate from both planner-derived Journey continuation and Review scope.
- [ ] Post-Learning completion can hand off directly to the next Journey Learning recommendation, but due Review or consolidation cannot hijack that handoff.
- [ ] If no further Journey Learning recommendation exists after Learning completion, completion returns to the current Home/Continent surface even when Review/practice is available there.
- [ ] Completing or exiting Review/practice refreshes Home state without automatically launching Learning.
- [ ] Active weak-spot practice no longer exposes `Guided consolidation`/equivalent implementation terminology as the primary learner-facing mode name; internal mode types may remain.
- [ ] Review scheduling, block size, queue ordering/interleaving, consolidation candidate derivation, retry, evidence, mastery, milestones, Learning mechanics, and map behavior do not change as a side effect.
- [ ] No new persisted Journey/Review coordination state or duplicate planner abstraction is introduced.
- [ ] Focused automated tests cover planner coexistence, Home composition with both actions, cross-region independence, Review panel states, consolidation fallback, Journey-only completion handoffs, and removal of duplicate Journey next-action rail copy.

## Source anchors

- `PRODUCT.md`
- `src/features/world-countries/AGENTS.md`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/changes/0063-world-countries-guided-focus-and-context-clarity.md`
- `src/features/world-countries/today/todayPlan.ts`
- `src/features/world-countries/today/todayPlan.test.ts`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/today/WorldCountriesToday.test.tsx`
- `src/features/world-countries/today/GuidedHomeRails.tsx`
- `src/features/world-countries/today/GuidedHomeRails.test.tsx`
- `src/features/world-countries/today/TodayReviewSession.tsx`
- `src/features/world-countries/today/TodayReviewSession.test.tsx`
- `src/features/world-countries/today/TodayRails.tsx`
- `src/features/world-countries/today/journeyPresentation.ts`
- `src/features/world-countries/ui/WorldCountriesPanel.tsx`
- `src/features/world-countries/ui/MapSurface.tsx`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` in the same implementation so current-state documentation no longer describes Home as exposing only one mutually exclusive Today action or states that due Review suppresses new Learning.

Document the implemented current state at the appropriate existing sections:

- Home/Continent can simultaneously expose a Journey Learning continuation and an independent Review/practice opportunity.
- Today remains the owner of both derivations.
- Journey Learning is based on the curriculum recommendation and remains available independently of due Review.
- The Review/practice opportunity chooses due scheduled Review first; when none is due, bounded unfinished-core consolidation may be offered as weak-spot practice.
- The map-attached dock owns Journey progression; the right rail owns the independent Review/practice panel and Journey orientation.
- Post-Learning direct handoffs follow Journey Learning only; Review/practice remains independently selectable from Home.

Preserve the existing documentation of stable non-persisted Journey focus, review block size/interleaving, staged Learning, evidence, and persistence semantics.

## Verification

Evidence collected 2026-09-10:

- Focused Today/Home/Review checks passed: 4 files, 37 tests (`todayPlan.test.ts`, `GuidedHomeRails.test.tsx`, `WorldCountriesToday.test.tsx`, and `TodayReviewSession.test.tsx`).
- Directly affected Learning, rail, and completion checks passed: 11 files, 74 tests.
- World Countries feature slice passed: 115 files, 819 tests.
- Full repository test suite passed: 150 files, 1,030 tests.
- `npm run lint` passed and `git diff --check` passed.
- The final accessibility-label and presentation-name cleanup was covered by a subsequent focused 37-test run and lint pass.
- `npm run typecheck` and `npm run build` reached TypeScript but stop on the unrelated existing `src/features/world-countries/drill/DrillSetup.test.tsx` `Map<any, any>` to `Map<string, never>` error. No build output was produced.
- Browser/manual verification was not run, as permitted by this presentation-only change contract.
