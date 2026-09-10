# Change Spec 0066 - World Countries region learning handoff and mastery separation

- **Status:** Implemented
- **Date:** 2026-09-10
- **Issue:** None.
- **Related ADRs:** None. This change refines learner-facing journey presentation and completion handoff inside the existing World Countries Today/Learning ownership model. It introduces no new persistence, ownership boundary, or cross-subsystem contract.
- **Current-state docs:** `docs/architecture/SYSTEM.md`, `docs/architecture/features/WORLD_COUNTRIES.md`

## Goal

Make completion of a Subregion feel like a meaningful learning achievement and a natural stopping point, while making the product model truthful: **Countries + Capitals complete the guided learning path for a region; Mastery is the longer-term result of later recall and Review, not a third curriculum gate that blocks progression.**

The existing Today planner already moves to the next incomplete Subregion once both Country and Capital layers are established. Preserve that behavior. This change improves how the transition is presented and removes the current visual implication that Mastery must be completed before the learner can move on.

## User-visible behavior

### 1. Separate “region learned” from “region mastered”

The learner-facing model becomes:

```text
Guided learning path
Countries  →  Capitals  →  Region learned

Long-term retention
Review / practice  →  Mastery
```

This is a presentation model over existing truth, not a new persisted journey state.

A region is **learned** when the existing Country and Capital learning layers are established for that Subregion. Existing non-persisted complete-recall fallbacks may satisfy those established-layer checks exactly as they do for Today planning; do not require a synthetic milestone when existing recall evidence already proves the material is known.

A region is **mastered** only when the existing core Country + Capital recall evidence satisfies the current recall-complete/mastery semantics. A Country/Capital Learning milestone must never be presented as recall mastery.

Learning progression must not wait for Mastery. Review and weak-spot practice can keep strengthening previously learned regions after the Journey has moved on.

### 2. Compact Journey presentation shows the learning path, with Mastery separate

The Home/Continent Journey panel must stop presenting this as one linear path:

```text
Countries
Capitals
Mastery
```

because it implies Mastery is the next curriculum step after Capitals.

Instead, the compact Journey surface should communicate the curriculum path as:

```text
YOUR JOURNEY · NORTHERN EUROPE

✓ Countries
● Capitals
○ Region learned

MASTERY
Builds through Review
```

Once both learning layers are established:

```text
YOUR JOURNEY · NORTHERN EUROPE

✓ Countries
✓ Capitals
✓ Region learned

MASTERY
Building through Review
```

and when recall is genuinely complete:

```text
MASTERY
✓ Mastered
```

Exact visual treatment should reuse the current compact Journey styling. Mastery should be visually related to the region but separated from the sequential learning path by hierarchy, spacing, label, or divider rather than drawn as the next numbered/linear step.

Before the region is learned, Mastery may use quiet explanatory copy such as `Builds through Review` / `Strengthens over time`; do not turn it into another action or gate.

### 3. Capital Learning completion becomes a region-completion moment

When guided Capital Learning successfully establishes the Capital layer and the just-completed Subregion is now learned, the completion surface should lead with the **region achievement**, not immediately reduce the result to the next Set in another region.

Example:

```text
REGION LEARNED
Northern Europe ✓

Countries   ✓
Capitals    ✓
Mastery     Building

You've learned the countries and capitals in Northern Europe.
Review will bring them back later so they stick.
```

The existing full-scope completion map remains visible. Do not recolor the whole region as mastered merely because Learning completed; map/progress color continues to come from existing recall evidence.

This completion is a natural session boundary. Do not automatically enter the next region.

### 4. Next-region handoff names the region, not the first Set

If the latest post-completion Today plan recommends Learning in a **different Subregion**, the region-completion surface should present that planner-authoritative Subregion as the next chapter.

Example:

```text
NEXT REGION
Western Europe

[ Start Western Europe ]   [ Back to Europe ]
```

At this boundary the primary CTA is **Start {Subregion}**, not `Learn 3 countries` or another Set-sized label. The region change is the meaningful information here.

When the learner chooses `Start Western Europe`, launch the existing planner-supplied Learning recommendation directly. Once that flow begins or Home is shown, ordinary task-level wording can return to the existing truthful Set/action language such as `Learn 3 countries · Western Europe`.

The completion component must not derive the next region itself from geography order. `WorldCountriesToday` already owns the latest planner recommendation and must remain authoritative.

### 5. Give the learner an explicit stopping action at a region boundary

Region completion should make continuing easy without making continuation mandatory.

When a different next Subregion is available:

- primary: `Start {next Subregion}`;
- secondary: return to the originating guided scope, e.g. `Back to Europe` or `Back to World`.

This explicit secondary action is important because finishing a region is a natural stopping point.

`Learn again` must not displace the stopping action on this guided region-boundary completion. If the existing completion component still needs restart access for consistency or direct/non-Today flows, keep it available only as a quieter tertiary action or preserve it in those non-guided contexts. Do not remove direct Learn & Practise restart behavior as a side effect.

### 6. Country completion remains a same-region continuation

Country Learning completion is not region completion. If the post-milestone planner recommends Capital Learning for the same Subregion, preserve the current direct handoff:

```text
COUNTRIES LEARNED
Northern Europe countries learned ✓

Next: add the capitals to these countries.
[ Add the capitals ]
```

Do not insert a fake `Region learned` checkpoint between Countries and Capitals.

The learner may still leave through the existing completion/navigation contract.

### 7. Home moves the active Journey to the next curriculum region immediately

After the learner leaves a completed region, Home/Continent should continue to derive its guided Journey focus from the existing planner.

If Northern Europe is learned and Western Europe is the next recommendation:

```text
YOUR JOURNEY · WESTERN EUROPE
Countries   Current
Capitals    Upcoming
Region learned   Upcoming

MASTERY
Builds through Review
```

The map dock continues to own the actionable task:

```text
CONTINUE YOUR JOURNEY
Learn 3 countries · Western Europe
[ Continue learning ]
```

Do not persist a “current region” cursor merely to remember the completed region. Review queues must not choose Journey focus.

### 8. Inspecting a learned previous region remains useful

A learner may inspect Northern Europe after the Journey has moved to Western Europe. The inspected-region Journey panel should truthfully show:

```text
Countries       Complete
Capitals        Complete
Region learned  Complete

Mastery
Building through Review
```

or `Mastered` when existing recall evidence supports it.

Preserve the existing inspected-vs-guided distinction: inspecting a region must not change the planner-authoritative Journey focus.

### 9. Progress distinguishes learning completion from mastery

`WorldCountriesProgressView` should align with the same model.

For a Subregion whose Country and Capital layers are established but recall is still developing, do not label the sequential Journey position as `Put it all together` / `Master the region` in a way that implies unfinished curriculum.

Prefer a two-part result such as:

```text
Journey · Region learned
Mastery · Building
```

and when core recall is complete:

```text
Journey · Region learned
Mastery · Mastered
```

Before both layers are established, Progress can continue to show the current learner-facing curriculum step (`Meet the countries`, `Recall the countries`, `Add the capitals`, etc.).

The richer existing recall distribution remains available and continues to be the truth behind Mastery. Do not create a second mastery score or persisted region status.

### 10. End-of-scope behavior stays truthful

If Capital Learning completes a region and there is no next curriculum recommendation in the current World/Continent scope:

- celebrate the just-completed region as learned;
- do not invent another region;
- do not call the scope mastered unless existing recall evidence supports it;
- use the existing return action to the current guided scope;
- Review remains independently available on Home when scheduler truth says so.

If all regions are learned but some are not mastered, the product should read as **learning complete / mastery still developing**, not as unfinished curriculum and not as fully mastered.

## Scope

- Refine the learner-facing Journey presentation so Countries + Capitals lead to a derived `Region learned` outcome while Mastery is presented separately as long-term recall strength.
- Reuse existing Country/Capital established-layer and core-recall-complete truth; add only presentation fields/helpers needed to express the distinction cleanly.
- Update the compact Home/Continent Journey panel to show `Countries → Capitals → Region learned` with separate Mastery status.
- Refine guided Capital Learning completion into a region-completion checkpoint when the just-completed Subregion is now learned.
- When the post-completion planner recommends a different Subregion, use `Start {Subregion}` as the primary region-boundary action and launch the existing recommendation.
- Add an explicit guided return/stopping action on region-boundary completion without breaking restart behavior in direct/non-Today Learning.
- Keep Country → same-Subregion Capital handoff direct and unchanged in concept.
- Align Progress Subregion presentation with `Region learned` versus `Mastery` semantics.
- Update focused tests and current-state World Countries architecture documentation.

## Interaction and states

### Country Learning completes, Capitals remain

- Achievement: Countries learned.
- Same Subregion remains active.
- Primary guided handoff: Add the capitals.
- No region-completion framing yet.

### Capital Learning completes, another Subregion is next

- Achievement: Region learned.
- Completion stays on the completed Subregion long enough to communicate the result.
- Mastery is shown separately as Building or Mastered from existing recall truth.
- Primary: `Start {next Subregion}`.
- Secondary: `Back to {originating scope}`.
- No auto-start.

### Capital Learning completes, next recommendation is in another Continent

Use the actual next Subregion label from the planner. Include Continent context only where needed for clarity; do not derive or hard-code ordering in the completion component.

### Capital Learning completes, no curriculum recommendation remains

Show Region learned and return to the originating guided scope. Do not fabricate a next action. If recall is incomplete, Mastery remains Building even though curriculum learning is complete.

### Previously learned region is inspected

Show learning path complete and separate Mastery status. Inspection does not alter guided focus or Review scope.

### Region already known through recall fallback

If existing complete recall causes both learning layers to be considered established without explicit milestones, learner-facing status may truthfully show Region learned and Mastered. Do not write synthetic milestones merely for presentation.

### Temporary / direct Learn & Practise flows

Preserve current caller-owned semantics. A temporary non-recording scope must not claim durable Region learned. Direct Learn & Practise must not import Today next-region logic. Its existing progression/restart behavior remains intact unless a small shared completion-action presentation extension is needed.

### Accessibility / responsive behavior

- `Region learned` and `Mastery` must be available as text, not only icon/color.
- Completion action hierarchy must remain keyboard accessible.
- Enter-primary behavior should activate the true primary action.
- When no next region exists, Enter must not execute a hidden/fabricated continuation.
- Preserve rail/drawer behavior on smaller layouts; do not make the Mastery separation depend on desktop-only positioning.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md`, `docs/architecture/SYSTEM.md`, and `src/features/world-countries/AGENTS.md`.
- Work only on `world-countries-learning-journey`; do not switch or merge to `main`.
- `today/` remains owner of planner-derived Journey focus and guided next-region selection.
- `learning/flows/` remains owner of the active Country/Capital Learning session and completion presentation.
- Completion components must not import `todayPlan` or geography ordering to decide the next region; receive a parent-provided handoff derived from the latest plan.
- Reuse existing `isWorldCountriesCountryLayerEstablished`, `isWorldCountriesCapitalLayerEstablished`, existing Subregion learning milestones, and core recall/mastery derivations. Do not add a persisted `regionLearned`, `masteryBuilding`, current-region cursor, or completion record.
- Preserve the distinction between durable Learning milestones and recall proficiency.
- Preserve CS0064 Review/Journey independence and CS0065 eight-item repeatable Review behavior.
- Preserve the CS0065 follow-up behavior if it has landed by implementation time: ready-state navigation consistency, scope-only completion context, truthful Review/practice completion labels, and one-Set copy cleanup must not be reverted.
- Prefer extending/refining `WorldCountriesJourneyPresentation` and the existing completion handoff contract over creating parallel journey or region-status models.
- `WorldCountriesProgressView` remains a derived supporting view, not a curriculum planner or scheduler.
- No new backend/network behavior or persistence.

## Existing capabilities to reuse

- `src/features/world-countries/today/todayPlan.ts` — existing independent curriculum recommendation and planner-authoritative next Subregion.
- `src/features/world-countries/today/WorldCountriesToday.tsx` — current guided Learning run, post-milestone plan refresh/handoff, Home Journey focus, and return scope.
- `src/features/world-countries/today/journeyPresentation.ts` — existing derived learner-facing Journey truth; refine this rather than creating another region-state model.
- `src/features/world-countries/today/GuidedHomeRails.tsx` — compact Journey presentation and inspected-vs-guided distinction.
- `src/features/world-countries/today/WorldCountriesProgressView.tsx` — current Subregion Journey + recall presentation.
- `src/features/world-countries/learning/learningReadiness.ts` — established-layer and recall fallback semantics.
- `src/features/world-countries/learning/subregionLearningState.ts` / store — durable Country/Capital Learning milestones.
- `src/features/world-countries/learning/scopeProgress.ts` and recall progress/mastery derivations — existing mastery truth.
- `src/features/world-countries/learning/flows/LearningComplete.tsx` — shared completion action/status surface.
- `src/features/world-countries/learning/flows/CountryLearningComplete.tsx` — Country-layer completion.
- `src/features/world-countries/learning/flows/CapitalLearningComplete.tsx` — Capital-layer completion and the natural region-learning boundary.
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx` / `CapitalLearningFlow.tsx` — active Learning ownership and milestone writes.

## Edge cases

- One-country Subregion: same semantics; no special reduced definition of Region learned.
- Country layer established through complete-recall fallback but Capital layer not established: Capitals remain the curriculum step.
- Both layers established through complete recall with no milestones: Region learned + Mastered is truthful; do not write milestones.
- Region learned but core recall weak/developing: Journey complete for that region, Mastery Building.
- Region learned with due Review: Review remains independent and must not block next-region Learning.
- Completion occurs while a Review opportunity also exists: region completion handoff remains about the curriculum boundary; returning Home exposes Review independently.
- Next recommendation is in the same Subregion because a transient/stale render has not observed the milestone yet: do not fabricate `Start {same region}`. Wait for/reuse the valid post-milestone recommendation contract already established by guided completion.
- Last Subregion in a Continent-scoped view: do not jump outside the scope unless the current Today scope actually supplies such a recommendation.
- Last curriculum Subregion in World scope: no next-region CTA; return to World with learning-complete-but-not-necessarily-mastered semantics.
- Learner inspects a completed region while guided focus is elsewhere: completed region presentation must not steal focus or replace the map dock's guided action.
- Direct Learn & Practise multi-Subregion run: preserve caller-defined progression rather than substituting Today `Start next region` behavior.

## Out of scope

- Changing Country/Capital learning requirements, staged pedagogy, Set sizing, scheduler thresholds, Final recall, or milestone write rules.
- Changing Review spacing, due calculation, block size, interleaving, weak-spot selection, retries, or evidence writes.
- Persisting region completion, current Journey region, Mastery status, or completion-screen state.
- Choosing a next region based on adaptive difficulty or learner recommendation algorithms; continue using existing effective curriculum order.
- Redesigning first-run onboarding, Play, Drill, Recite, Quiz, Settings, or global navigation.
- New gamification, XP, badges, streaks, confetti, or daily goals.
- Broad map styling/geometry/camera changes.
- Historical mastery analytics or progress-over-time charts.
- Merging the feature branch to `main`.

## Acceptance criteria

- [ ] Learner-facing compact Journey no longer presents Mastery as the third linear curriculum step after Capitals.
- [ ] The compact learning path truthfully communicates Countries, Capitals, and Region learned, with Mastery displayed separately.
- [ ] `Region learned` derives from existing established-layer truth; no new persisted region-completion state is introduced.
- [ ] `Mastered` is shown only when existing core recall evidence supports current mastery/complete semantics.
- [ ] Region learned with incomplete recall is presented as Mastery Building/strengthening rather than as unfinished curriculum.
- [ ] Country Learning completion still hands directly to same-Subregion Capital Learning when that is the planner recommendation.
- [ ] Guided Capital Learning completion presents the just-completed Subregion as Region learned before offering a different next Subregion.
- [ ] A different next Subregion is named from the latest planner recommendation and uses `Start {Subregion}` as the region-boundary primary action.
- [ ] Starting the next region launches the existing planner-supplied recommendation; completion code does not reconstruct geography/order/membership.
- [ ] Region-boundary completion has an explicit secondary return/stopping action to the originating guided scope.
- [ ] The next region never auto-starts.
- [ ] `Learn again` does not displace the stopping action on guided region-boundary completion, while direct/non-Today restart behavior remains available.
- [ ] After returning Home, guided Journey focus moves to the planner's next curriculum Subregion without a persisted cursor.
- [ ] Inspecting a previously learned region shows Region learned plus truthful Mastery state without changing guided focus.
- [ ] Continent Progress distinguishes `Journey · Region learned` from separate Mastery Building/Mastered state once both learning layers are established.
- [ ] World/Continent scope completion does not claim mastery when only curriculum Learning is complete.
- [ ] Review remains independent and can strengthen learned regions after Journey progression has moved on.
- [ ] Accessibility and keyboard-primary semantics remain correct for completion and Journey states.
- [ ] Current-state World Countries documentation is updated to reflect learning-path completion versus long-term Mastery.

## Source anchors

- `docs/architecture/SYSTEM.md`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `src/features/world-countries/AGENTS.md`
- `src/features/world-countries/today/todayPlan.ts`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/today/journeyPresentation.ts`
- `src/features/world-countries/today/GuidedHomeRails.tsx`
- `src/features/world-countries/today/WorldCountriesProgressView.tsx`
- `src/features/world-countries/learning/learningReadiness.ts`
- `src/features/world-countries/learning/flows/LearningComplete.tsx`
- `src/features/world-countries/learning/flows/CountryLearningComplete.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningComplete.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` in the same implementation so current-state documentation states that:

- Country + Capital layer establishment completes the guided Learning path for a Subregion and allows curriculum progression to the next Subregion;
- recall Mastery is a separate longer-term outcome that can continue developing through Review/practice and never blocks the next curriculum Subregion;
- Home's compact Journey projection presents Countries / Capitals / Region learned with Mastery as a separate recall status;
- guided Capital completion may present a region-learning boundary and use the latest Today recommendation for the next Subregion;
- Progress distinguishes region-learning completion from recall Mastery.

Do not document transient component state or introduce a new persisted domain concept for `Region learned`.

## Verification

- Focused Today and Learning completion/flow tests: 11 files passed, 102 tests passed.
- World Countries feature slice: 115 files passed, 841 tests passed.
- ESLint passed for all touched TypeScript/TSX files.
- `npm run typecheck` remains blocked only by the unrelated existing
  `src/features/world-countries/drill/DrillSetup.test.tsx` `Map<any, any>` type
  error; no Drill code was changed.
- No development server or browser/manual verification was run, per task
  instructions.
