# Change Spec 0063 - World Countries guided focus and context clarity

- **Status:** Implemented
- **Date:** 2026-09-10
- **Issue:** None.
- **Related ADRs:** None. This change refines derived Today/Learning presentation within existing ownership and persistence boundaries.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`

## Goal

Finish the remaining guided-journey UX cleanup after Change Specs 0061 and 0062 by making the Home journey focus stable across review/consolidation actions, distinguishing total due work from the bounded next review block, removing meaningless `Set 1` ceremony for one-Set Learning plans, and flattening the active Learning rail into lightweight orientation rather than another nested card. Preserve the current Today priority, staged Learning mechanics, review scheduling, evidence, milestones, persistence, map behavior, and completion handoff.

This is a focused follow-up to the implemented 0062 hierarchy work. It does not reopen the broader Home/Learning redesign.

## User-visible behavior

### 1. The Home journey does not jump to whichever region happens to supply the first review item

The right-rail journey and the attached Today action represent different concepts:

- **Today action:** what should be done now, according to planner priority.
- **Journey focus:** the Subregion currently carrying the learner's curriculum progression, or—after curriculum introduction is complete—the next incomplete Subregion in effective geography order.

A due review or consolidation action must not redefine the journey focus merely because one of its candidates happens to come from another Subregion.

Example:

```text
YOUR JOURNEY
Northern Europe
✓ Countries
● Capitals
○ Mastery
Next in journey: Add the capitals

TODAY
12 reviews are ready across multiple regions
[ Review 12 items ]
```

If the first review candidate belongs to Southern Europe, the journey must still remain Northern Europe when Northern Europe is the underlying curriculum focus.

#### Required derivation behavior

The journey focus remains **derived and non-persisted**.

Use existing Today/effective-order/readiness/progress truth rather than introducing a separate stored current-region concept. In particular:

1. derive the underlying curriculum recommendation independently of whether due reviews currently suppress Learning as the primary action;
2. while such a curriculum recommendation exists, its Subregion is the journey focus;
3. once there is no remaining Country/Capital Learning recommendation, use the first Subregion in effective order that still has incomplete core recall as the journey focus;
4. when the guided scope is fully complete, no journey focus is required unless the learner explicitly inspects a Subregion.

The exact helper/API shape is implementation-defined, but `action.candidates[0]` must not be the source of journey focus.

Transient map inspection remains separate: an explicitly inspected Subregion still supplies the displayed journey until the learner returns to the guided view.

### 2. Total due reviews and the bounded next review block are visibly distinct

Today already distinguishes total due work from the bounded review queue. The UI must express that distinction instead of presenting two different numbers as though they mean the same thing.

When total due count exceeds the bounded next block, use a hierarchy equivalent to:

```text
WHY REVIEW NOW
20 reviews due in total · 15 countries
4 first reviews · 2 recent mistakes

NEXT REVIEW
12 items
[ Review 12 items ]
```

The exact sentence may adapt to available scope information, but the meaning must remain explicit:

- `dueCount` / `dueCountryCount` = total outstanding due work in the current Home/Continent scope;
- `action.candidates.length` for a review action = the bounded block that will actually launch now.

Do not label both values simply as `N reviews ready` when the values differ.

When the total due count equals the bounded block size, avoid needless duplication. A single concise `N reviews ready` presentation is sufficient, with supporting reason text where useful.

Review-reason summaries continue to describe the total due set unless the existing source explicitly represents the bounded block.

Do not change `WORLD_COUNTRIES_TODAY_REVIEW_BLOCK_SIZE`, queue construction, interleaving, review priority, or candidate selection.

### 3. One-Set Learning plans do not say `Set 1`

Set numbering is useful only when the learner has multiple Sets to orient between.

For a Learning plan containing exactly one Set, suppress learner-visible `Set 1`, `Set 1 of 1`, and `Set 1 complete` ceremony across both Country Learning and Capital Learning.

Examples:

```text
Find the countries
3 countries
```

instead of:

```text
Find the countries
Set 1 · 3 countries
```

and:

```text
Recall the capitals
3 country–capital pairs
```

instead of:

```text
Recall the capitals
Set 1 · 3 pairs
```

At the one-Set checkpoint, use a neutral learner-facing completion label such as:

```text
Practice complete
You recalled all 3 countries in this practice.
Next: one final recall of the full learning scope.
```

rather than `Set 1 complete`.

For plans with two or more Sets, preserve truthful Set identity as secondary orientation, for example:

```text
Set 2 of 3 · 3 countries
```

or the equivalent existing compact form where the total Set count is already visible nearby.

This suppression applies to learner-facing headers, task/session context, checkpoint titles, and other visible Learning presentation. Internal Set indexes, state-machine phases, stage presentation, test IDs, and persisted behavior do not change.

### 4. Active Learning rail uses inline orientation, not a nested stage card

The walkthrough hierarchy corrected by 0062 remains as implemented. During active Find, Recall, Mix, readiness, and Final phases, the left rail should remain present but visually subordinate to the map/task.

Remove the current nested bordered/background stage card whose only purpose is to show the current Set/Mix/Final scope. Present the same truthful information as lightweight inline orientation above the learning order.

Examples:

```text
World / Europe / Northern Europe

Set 2 of 3 · 3 countries

LEARNING ORDER
...
```

```text
World / Europe / Northern Europe

Mix what you've learned · 6 countries introduced

LEARNING ORDER
...
```

```text
World / Europe / Northern Europe

Final recall · 10 countries

FULL LEARNING SCOPE
...
```

Do not add a new panel or replacement card. Reuse the existing `WorldCountriesPanel` rail shell and its existing stage/order derivation.

The active rail must still:

- identify the active geography;
- communicate Set/cumulative/full scope truth;
- show the full learning order with current/previous/upcoming or introduced semantics where applicable;
- remain read-only outside walkthrough;
- retain full-scope context during Final recall;
- avoid duplicating scheduler/task progress already presented by the shared map/task surface.

## Scope

- Derive a stable non-persisted Home journey focus independently of review/consolidation candidate ordering.
- Preserve transient inspected-Subregion behavior from 0062.
- Clarify total due review count versus bounded next review block in Home/Continent presentation.
- Suppress one-Set numbering across Country and Capital learner-facing Learning presentation.
- Use neutral one-Set checkpoint wording rather than `Set 1 complete`.
- Flatten the non-walkthrough Learning stage presentation inside `GuidedLearningRails` while retaining all current orientation semantics.
- Update focused tests and current-state architecture documentation for these refinements.

## Interaction and states

### Due review while curriculum Learning remains

The Today action is Review, but the journey remains focused on the underlying Country/Capital Learning Subregion. Review candidate geography does not move the journey card.

### Due review across multiple regions

The dock describes the bounded next block and may say it spans multiple regions. Supporting Home text may show the total due workload. Neither value is mislabeled as the other.

### Due review from one region

The dock may identify that review region for action clarity, but that action scope does not redefine the journey focus.

### Curriculum introduction complete, recall still incomplete

With no remaining Country/Capital Learning recommendation, journey focus falls to the first incomplete core-recall Subregion in effective geography order. This remains derived and can move naturally as recall reaches completion.

### Scope fully complete

Do not synthesize a fake guided region. Complete/caught-up behavior from 0062 remains authoritative. Explicit inspection may still show a local journey.

### One-Set Country Learning

Meet, Find, Recall, checkpoint, and Final recall remain the same flow. Learner-facing context uses the item count without `Set 1` wording.

### One-Set Capital Learning

Meet, Recall, checkpoint, and Final recall remain the same flow. Learner-facing context uses the pair count without `Set 1` wording.

### Multi-Set Learning

No regression: Set numbering remains available as useful secondary orientation.

### Active Learning rail

The existing rail remains mounted and accessible. Only the nested visual/card hierarchy is flattened; scope semantics and Learning order remain intact.

### Accessibility and keyboard behavior

Preserve current focus, keyboard, screen-reader, task-dock, map-selection, and rail behavior. Count distinctions and journey/action scope distinctions must be understandable from text/accessibility semantics and not depend on color or spatial placement alone.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and `src/features/world-countries/AGENTS.md`.
- Work only on `world-countries-learning-journey`; do not switch or merge to `main`.
- Today remains the owner of guided priority, review candidates/queues, Learning recommendations, consolidation, and completion handoff.
- Learning remains the owner of staged Set/Combined/Final flow mechanics.
- Journey focus is derived presentation/planning context only. **Do not persist a current Subregion, curriculum cursor, journey-step, or new UI state.**
- Do not derive journey focus from the first review/consolidation candidate.
- Reuse the existing effective Subregion order, Learning readiness, introduction/progress truth, and journey presentation rather than creating duplicate curriculum state.
- Preserve Today action priority: due review -> required Learning -> bounded consolidation -> complete/unavailable.
- Preserve the bounded review queue and its size.
- Do not change review scheduling, interleaving, proficiency/mastery, milestone writes, answer classification, dwell timing, map behavior, or persistence.
- Preserve 0062's separation between an explicitly inspected Subregion and the planner-derived guided/journey focus.
- Do not add new layout primitives for fix 4; refine the existing Learning rail presentation.
- Keep internal Set mechanics intact. One-Set suppression is presentation only.

## Existing capabilities to reuse

- `src/features/world-countries/today/todayPlan.ts` - effective ordering, readiness/introduction/progress truth, Learning recommendation, due totals, bounded queues, and Today priority.
- `src/features/world-countries/today/WorldCountriesToday.tsx` - Home journey selection, inspected Subregion state, action labels/status, and task dock composition.
- `src/features/world-countries/today/GuidedHomeRails.tsx` - compact journey and supporting total-due/review-reason presentation.
- `src/features/world-countries/today/journeyPresentation.ts` - authoritative derived Subregion journey/mastery presentation.
- `src/features/world-countries/learning/stagedLearningPlan.ts` - Set count and active stage presentation; use it to distinguish one-Set and multi-Set plans.
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx` - Country headers, task/session context, checkpoint labels.
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx` - Capital headers, task/session context, checkpoint labels.
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx` - active rail stage/scope and order presentation.
- Existing focused tests beside these modules.

## Edge cases

- A due review queue begins in Southern Europe while the underlying curriculum recommendation is Northern Europe: journey remains Northern Europe; review action remains truthful about its own scope.
- A bounded review block contains multiple Subregions: do not select candidate zero as the journey focus.
- `dueCount > reviewQueue.length`: total and next-block counts are both visible only with unambiguous labels.
- `dueCount === reviewQueue.length`: avoid redundant duplicate counts.
- One Country or one country–capital pair in a one-Set plan uses correct singular wording and no `Set 1` label.
- A multi-Set plan still shows Set number/context and does not regress to ambiguous item counts.
- Combined/Mix remains cumulative and does not reintroduce current-Set semantics.
- Final recall remains full-scope and does not reintroduce Set semantics.
- Temporary proficiency scopes continue to avoid implying durable guided-journey changes.
- Explicitly inspected Subregions continue to override only the displayed journey, not Today action or derived guided focus.

## Out of scope

- Changing Today priority or recommendation ordering.
- Changing review block size, review scheduling, consolidation selection, or interleaving.
- Persisting a learner-selected/current curriculum region.
- Reworking the six-stage journey model or Countries/Capitals/Mastery projection.
- Redesigning Home, Play, Progress, completion, checkpoints, or Final recall beyond the four corrections above.
- New navigation, search, goals, streaks, telemetry, backend/account work, or map behavior.
- Broad palette/style normalization.
- Merging the branch to `main`.

## Acceptance criteria

- [ ] A due review or consolidation candidate from another Subregion cannot change the default Home journey merely by being first in the action queue.
- [ ] The default journey focus remains the underlying curriculum recommendation while Country/Capital Learning remains, even when due reviews temporarily own the Today action.
- [ ] When no Country/Capital Learning recommendation remains, the default journey focus derives from the first incomplete core-recall Subregion in effective order; fully complete scopes do not synthesize a fake focus.
- [ ] Journey focus remains derived/non-persisted and no new current-region/curriculum-cursor state is introduced.
- [ ] Explicit inspected-Subregion behavior from 0062 remains unchanged: inspection changes displayed journey only and does not change the planner action/focus authority.
- [ ] When `dueCount` is greater than the bounded review action size, supporting copy identifies the total as total outstanding work and the dock identifies its count as the next review block.
- [ ] When total due count equals the bounded block count, the UI avoids redundant/conflicting duplicate count presentation.
- [ ] Review reason and due-country information remain available without changing their source semantics.
- [ ] One-Set Country Learning does not expose `Set 1`, `Set 1 of 1`, or `Set 1 complete` in learner-visible headers, task/session context, or checkpoint presentation.
- [ ] One-Set Capital Learning has the same suppression and correct singular/plural pair wording.
- [ ] Multi-Set Country and Capital Learning retain truthful Set numbering as secondary orientation.
- [ ] Active non-walkthrough Learning no longer renders the Set/Mix/Final scope as a nested bordered/background stage card.
- [ ] The flattened active rail still communicates geography, scope, and full-order status correctly for Set, Mix, and Final phases.
- [ ] Walkthrough order authoring and mnemonic behavior from 0062 do not regress.
- [ ] Scheduler/task progress remains on the shared task/map surface and is not duplicated into the Learning rail.
- [ ] No planner priority, review queue, Learning state machine, evidence, mastery, milestone, map, answer-lifecycle, or persistence behavior changes as a side effect.
- [ ] Focused automated tests cover cross-region due review vs curriculum journey focus, total-vs-bounded review counts, one-Set/multi-Set presentation, and flattened Set/Mix/Final rail semantics.

## Source anchors

- `PRODUCT.md`
- `src/features/world-countries/AGENTS.md`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/changes/0062-world-countries-guided-ux-hierarchy-corrections.md`
- `src/features/world-countries/today/todayPlan.ts`
- `src/features/world-countries/today/todayPlan.test.ts`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/today/WorldCountriesToday.test.tsx`
- `src/features/world-countries/today/GuidedHomeRails.tsx`
- `src/features/world-countries/today/GuidedHomeRails.test.tsx`
- `src/features/world-countries/today/journeyPresentation.ts`
- `src/features/world-countries/learning/stagedLearningPlan.ts`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.test.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.test.tsx`
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
- `src/features/world-countries/learning/flows/GuidedLearningRails.test.tsx`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` only where needed to capture the implemented current-state contract:

- default Home journey focus is derived independently of review/consolidation candidate ordering and is not persisted;
- Today action scope and journey focus are separate concepts;
- total due review work and the bounded next review block are distinct presentation values;
- one-Set Learning suppresses meaningless Set numbering in learner-facing presentation;
- active Learning rails use lightweight inline orientation rather than nested stage-card presentation.

Do not document CSS classes, mock dimensions, or implementation helper names.

## Verification

Implemented on `world-countries-learning-journey`.

- Focused Vitest coverage passed for Today planning/composition, Home rails,
  staged plan presentation, Country Learning, Capital Learning, and active
  Learning rails: 7 files, 91 tests.
- World Countries feature slice passed: 115 files, 821 tests.
- Coverage includes curriculum focus staying in Northern Europe while due
  Southern Europe review owns Today priority, review blocks spanning regions,
  effective-order fallback focus, complete-scope null focus, total-vs-bounded
  due copy, one-Set Country/Capital wording, multi-Set context, and flattened
  active Set/Mix/Final rail presentation.
- `npm.cmd run lint` passed.
- `npx.cmd tsc --noEmit` reached only the unrelated existing
  `src/features/world-countries/drill/DrillSetup.test.tsx` generic `Map` error;
  no touched-file TypeScript errors remained.
- `git diff --check` passed.
- Browser/manual verification was not run, per repository instructions and
  the Change Spec's risk-proportionate validation guidance.
