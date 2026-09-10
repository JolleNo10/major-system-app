# Change Spec 0065 - World Countries learning momentum and progress payoff

- **Status:** Implemented
- **Date:** 2026-09-10
- **Issue:** None.
- **Related ADRs:** None. This change refines review batch size, guided Learning interaction, completion feedback, and derived Progress presentation inside the existing World Countries ownership model; it does not introduce a new durable architectural boundary or persistence model.
- **Current-state docs:** `docs/architecture/SYSTEM.md`, `docs/architecture/features/WORLD_COUNTRIES.md`

## Goal

Make World Countries feel faster and more rewarding to use without weakening its learning model. Review should arrive in small, repeatable eight-item blocks that the learner can continue until no scheduled work remains. Guided Learning should keep the established Meet → Find → Recall → Mix → Final recall pedagogy while removing avoidable transition friction. Completing Learning or Review should make the result perceptible without generic gamification, and Progress should explain what the learner has built in a clearer, more satisfying way using existing milestones and recall evidence.

## User-visible behavior

### 1. Review uses eight-item blocks and can be exhausted in one visit

Scheduled Review and weak-spot practice remain bounded, but the canonical Today block size changes from 12 to **8 items**.

When more than eight scheduled items are ready, the Review panel continues to distinguish the current block from the total ready population. For example:

```text
REVIEW READY
8 items
See what stuck.
[ Review 8 items ]

23 ready overall · 17 countries
```

Completing one block returns to the Home/Continent guided surface, refreshes evidence, and immediately exposes the next scheduler-derived Review block when work remains. There is no artificial cooldown, next-day requirement, one-block-per-visit gate, dismissal state, or delay before the learner may start the next block.

The learner is still choosing each block. Do not automatically chain into another Review session, because Change Spec 0064 intentionally keeps Review and Journey Learning as independent choices.

“Can exhaust all items” means the learner may continue taking fresh scheduler-derived blocks in the same visit until no scheduled Review remains. It does **not** remove the existing within-block delayed-retry behavior, change due calculation after a failed answer, or guarantee that repeatedly failed material becomes caught up.

When scheduled Review reaches zero, the existing Review-area fallback applies: weak-spot practice may be offered if eligible consolidation candidates exist; otherwise the panel becomes caught up.

### 2. Guided Learning keeps the pedagogy but removes avoidable transition friction

The learner-facing model remains:

**Countries:** Meet → Find → Recall → Mix → Final recall
**Capitals:** Meet → Recall → Mix → Final recall

Do not collapse these into a generic quiz or remove the existing scheduler-driven practice thresholds. The goal is to make transitions feel intentional rather than ceremonial.

#### One action should perform the action it names

A checkpoint CTA labelled `Start final recall` must start Final recall directly. It must not first open another screen whose primary action is also `Start final recall`.

The current staged state model may retain a final-gate state when it is useful for back-navigation or another legitimate entry path, but the normal forward path must not require two confirmations for the same transition.

The same rule applies generally: a learner should not encounter two consecutive transition surfaces that communicate the same completed state or ask for the same next action.

#### Keep meaningful checkpoints, remove duplicate narration

Checkpoints remain useful when the learning mode genuinely changes or the learner has a meaningful choice to continue versus practise more. In particular, Find → Recall and Set/Combined boundaries may retain a concise checkpoint.

A checkpoint should be one coherent surface:

```text
FIND COMPLETE
You found all 4 countries.
Next: recall their names from the map.

[ Keep practising ]   [ Continue to Recall ]
```

Do not repeat the same `Find complete`, `Practice complete`, `Mixed practice complete`, or `Final recall` message simultaneously in the page/context header and again in the checkpoint dock. Keep geographic/stage orientation available, but let the checkpoint own the completion message and next action.

For multi-Set Learning, preserve meaningful Set identity and cumulative Mix steps. For one-Set Learning, preserve the existing removal of `Set 1 of 1` ceremony.

Back, Skip, Exit, Keep practising, and mnemonic/order-authoring capabilities remain available according to their existing phase rules, but they remain secondary to the intended forward action.

### 3. Learning and Review completion make progress perceptible

Completion feedback should reinforce competence rather than add points, streaks, confetti, currencies, or artificial rewards.

#### Learning completion

Country and Capital Learning completion should clearly state the durable learning outcome before presenting the next Journey handoff.

Examples of the intended hierarchy:

```text
COUNTRIES LEARNED
Northern Europe countries learned ✓
You can now locate and recall all 8 countries.

Next: add the capitals to these countries.
[ Add the capitals ]
```

```text
CAPITALS LEARNED
Northern Europe capitals learned ✓
You've connected each country with its capital.

Next: continue your journey in Western Europe.
[ Continue ]
```

The existing full-scope completion map should remain visible and may be refined so the completed learning scope reads as a coherent result. Do not recolor or label material as recall-mastered merely because a Learning milestone was written. Learning milestones and recall proficiency remain distinct truths.

If the completion has no direct Journey handoff, the Back/Done action remains truthful and returns to the current guided scope.

#### Review completion

A completed Review block should produce a compact, non-blocking payoff when Home/Continent returns. Reuse the existing Review checkpoint result (`reviewed`, `correctFirstTry`, `recoveredOnRetry`, `stillNeedsWork`) rather than inventing a second scoring model.

The result belongs in the Review area and must not steal ownership from the Journey dock. An example when more Review remains:

```text
REVIEW READY
8 items
[ Review 8 items ]

Last review: 8 reviewed · 6 first try · 2 recovered
15 ready overall
```

An example when the completed block catches the learner up:

```text
REVIEWS CAUGHT UP
8 reviewed · 6 first try · 2 recovered
Nothing else is ready right now.
```

If `stillNeedsWork` is non-zero, it may be represented concisely and neutrally, for example `1 still needs work`. Do not turn the panel into a diagnostic report.

This completion result is transient presentation state only. It must not be persisted, affect scheduling, create a new daily/session model, or cause the Journey CTA to receive focus. Starting another Review/Journey activity or changing guided scope may clear the previous result.

Exiting a Review before completion must not fabricate a completed-block result.

After any completed activity, Home continues to derive map colors, Journey state, Review readiness, and Progress from the refreshed existing evidence/milestones. The payoff should make those changes easier to notice; it must not introduce a separate progress authority.

### 4. Progress becomes a useful learning-state view instead of a percentage list

`WorldCountriesProgressView` remains a derived supporting view. It should help the learner answer:

- How much of this scope is genuinely complete?
- Which areas are strong, developing, weak, or not yet practised?
- Where is each Subregion in the learning journey?

It must not become another scheduler/Home, and it must not introduce historical analytics, streaks, daily charts, or persisted snapshots.

#### Scope summary

Keep a strong top-level summary of core mastery for the current World or Continent scope. Reuse existing `WorldCountriesScopeProgress`, progress-state labels/colors, and the established finish-line semantics.

The summary should make completion feel concrete through counts and a compact visual distribution, rather than relying on one percentage alone.

#### World Progress: Continents

World Progress continues to summarize **Continents**, as required by current architecture.

Each Continent should communicate at least:

- Continent name;
- complete Countries / total Countries;
- a compact visual distribution of existing core states (`unpractised`, `weak`, `developing`, `strong`, `complete`), using the existing semantic palette;
- useful Subregion-level rollup such as mastered/complete regions versus total regions.

Prefer learner-oriented language such as `2 of 4 regions mastered` over implementation/readiness language such as `2 / 4 Subregions started` when existing evidence can derive the stronger statement truthfully.

Do not fabricate region mastery from a Learning milestone: use the existing recall-complete truth.

#### Continent Progress: Subregions

Continent Progress continues to summarize **Subregions**.

Each Subregion should communicate:

- Subregion name;
- complete Countries / total Countries;
- the same compact core-state distribution;
- current learner-facing Journey position derived from the existing six-stage journey presentation, for example `Add the capitals`, `Put it all together`, or `Master the region`;
- a clear completed state when the Subregion's core recall is complete.

The six-stage Journey derivation remains the authoritative richer presentation for Progress; do not duplicate or persist a second progress/journey model.

#### Progress rails

The Progress rails should support understanding rather than duplicate Home actions.

Use the existing layout semantics:

- left rail: geography/scope orientation and Back navigation;
- center: mastery summary and regional progress breakdown;
- right rail: concise explanation/legend of the progress states and finish line, plus a secondary route back to guided Home if useful.

Do not make the right rail a second `Review` / `Continue learning` action chooser. Those actions belong on Home under Change Spec 0064.

### 5. Visual and interaction tone

Preserve the current dark cartographic instrument aesthetic and established semantic colors:

- violet: guided Journey / primary forward Learning action;
- cyan: geography/information;
- green: achieved/ready/success where semantically correct;
- amber: difficulty/attention;
- red: error.

Progress-state visualizations must also have text/semantic labels; do not rely on color alone.

Prefer compact information density and visible competence over decorative gamification. Do not add celebration animation that delays the next action.

## Scope

- Change the canonical Today Review/practice block size from 12 to 8 and align helper defaults, tests, copy, and current-state documentation that encode the old block size.
- Preserve immediate repeatability: after a completed Review block and evidence refresh, another scheduler-derived block can be started immediately while Review remains ready.
- Preserve current Review interleaving, urgency tiers, reason classification, retry mechanics, and due scheduling.
- Reduce redundant guided Learning transition ceremony while preserving Meet/Find/Recall/Mix/Final pedagogy and scheduler thresholds.
- Ensure `Start final recall` on the normal forward path starts Final recall without a second same-purpose confirmation.
- Consolidate checkpoint narration so one transition surface owns completion + next-action copy.
- Refine Country and Capital Learning completion presentation using existing milestone truth and direct Journey handoffs.
- Surface a compact transient completed-Review result on return to Home/Continent without blocking the next Review block or Journey action.
- Redesign `WorldCountriesProgressView` around existing scope progress, progress-state palette, Subregion learning state, and journey presentation.
- Update focused tests and current-state architecture documentation.

## Interaction and states

### More than eight reviews ready

Example: 23 scheduled items are ready.

- Home offers `Review 8 items`.
- Supporting copy identifies 23 as the overall ready population.
- Completing the block returns to Home and refreshes scheduler truth.
- If scheduled work remains, the next block is immediately available.
- The learner may instead choose Continue Learning.
- There is no cooldown or same-day gate.

### Eight or fewer reviews ready

The Review CTA matches the actual bounded queue size. Avoid repeating the same count unnecessarily in supporting text when total ready equals the current block.

### Review block completes with more scheduled work remaining

Show the next Review opportunity as primary content of the Review panel and the just-completed block result as compact secondary feedback. Do not automatically start the next block.

### Review block completes and catches up

Show `Reviews caught up` plus concise completed-block feedback. If weak-spot practice is available, it may appear as the existing quieter fallback beneath/after the caught-up result. Journey Learning remains independently available.

### Review is exited early

Refresh evidence as required by current write behavior, but do not show a fake `8 reviewed` completion result unless the block actually completed.

### One-Set Country Learning

The learner sees Meet → Find → Recall → Final recall with meaningful transitions and no `Set 1` ceremony. If the Recall-complete checkpoint says `Start final recall`, that action starts Final recall directly.

### Multi-Set Country Learning

Preserve Set identity and cumulative Mix. A Set/Combined checkpoint may pause to summarize success and offer Keep practising versus the next distinct stage. The learner should never click through two consecutive surfaces that both say `Start final recall`.

### Capital Learning

Apply the same transition principles while preserving its intentional lack of a separate Find phase.

### Learning completion with a Journey handoff

The completion surface first communicates what was learned, then clearly presents the next Journey continuation. Direct Country → Capital and later Subregion-to-Subregion handoffs remain planner-authoritative.

### Learning completion without a Journey handoff

The completion surface remains satisfying and truthful, then returns to the current World/Continent guided surface. Review availability must not hijack the completion handoff.

### World Progress

Display World mastery plus Continent cards/rows with core-state distribution and meaningful region-level completion rollup. Do not show Subregion cards directly at World level.

### Continent Progress

Display Continent progress plus Subregion cards/rows with core-state distribution and Journey position. Do not surface unrelated Continents.

### Loading / empty / error

Preserve stable layout and current error handling. Progress and Review must not render fabricated derived states while evidence is unavailable. Zero-country scopes remain truthful and non-actionable.

### Accessibility and keyboard behavior

- Preserve typed-answer focus and existing keyboard flow.
- Forward Learning checkpoints retain a clear primary action and Enter behavior where currently supported.
- Removing duplicate transition surfaces must not remove an accessible way to go Back, Keep practising, Skip, or Exit where those actions are currently valid.
- Review completion feedback must not auto-focus `Continue learning`; preserve the CS0064 follow-up focus behavior.
- Progress distributions require accessible text equivalents and cannot rely on color alone.

## Architecture constraints

- Follow `docs/architecture/SYSTEM.md`, `docs/architecture/features/WORLD_COUNTRIES.md`, and `src/features/world-countries/AGENTS.md`.
- Work only on `world-countries-learning-journey`; do not switch or merge to `main`.
- No ADR is required unless repository inspection reveals that implementation genuinely needs a new durable ownership, persistence, or cross-subsystem contract. If so, stop and report the deviation rather than inventing one silently.
- `today/` remains owner of Review planning, bounded Review/consolidation queues, guided Home composition, and Progress orchestration.
- `learning/flows/` and existing staged flow state machines remain owner of Country/Capital Learning phases and completion surfaces.
- Reuse the existing `WORLD_COUNTRIES_TODAY_REVIEW_BLOCK_SIZE` as the canonical Today block-size seam. Align any feature-local defaults/hard-coded assumptions with the new value instead of introducing another size constant.
- The Review-size change is a batching/presentation policy only. Preserve the `1, 3, 7, 14, 30, 60` spacing ladder, due calculation, priority tiers, candidate ranking, interleaving semantics, review reasons, attempt writes, and delayed retry behavior.
- Do not persist a current Review block, review completion summary, “reviewed today” flag, cooldown, daily gate, Journey cursor, or Progress snapshot.
- Reuse the existing Review checkpoint result for transient completion feedback. Do not add a second Review scoring model.
- Preserve CS0064's independent `curriculumRecommendation` and `reviewOpportunity`; Review must not regain priority over/hide Journey Learning.
- Preserve the CS0064 follow-up focus ownership: completing Review may return focus to another Review action, but must not use Review completion state to focus the Journey CTA.
- Preserve staged Set sizing and the scheduler-driven readiness thresholds. Pacing work may remove presentation/transition duplication, but it must not weaken the learning requirement.
- If normal forward flow bypasses a duplicate Final gate, retain only the state/mechanism still required for legitimate Back/resume paths; refactor rather than copy state or create a parallel flow.
- Reuse `WorldCountriesScopeProgress`, `deriveWorldCountriesJourneyPresentation`, `WORLD_COUNTRIES_PROGRESS_LABELS`, and existing progress colors for the Progress redesign. Do not add an analytics/progress store.
- Learning milestones and recall proficiency remain semantically distinct. Never render a Learning milestone as mastered recall unless existing evidence says so.
- Reuse `WorldCountriesPanel`, PageLayout rails, `MapSurface` / `TaskDock`, and existing map/learning surfaces. Do not introduce a new global layout or design-system layer for this work.

## Existing capabilities to reuse

- `src/features/world-countries/today/todayPlan.ts` — canonical Today Review block constant, scheduler-derived Review opportunity, due totals, curriculum recommendation, and Journey focus.
- `src/features/world-countries/today/reviewInterleaving.ts` — deterministic urgency-preserving bounded queue selection.
- `src/features/world-countries/today/reviewQueue.ts` — in-block initial/retry flow and Review completion counters.
- `src/features/world-countries/today/TodayReviewSession.tsx` — active typed Review/practice session and existing completion checkpoint result.
- `src/features/world-countries/today/GuidedHomeRails.tsx` — independent Review panel and CS0064 post-Review focus target.
- `src/features/world-countries/today/WorldCountriesToday.tsx` — evidence refresh, activity launching/completion, transient Home composition, and Progress entry.
- `src/features/world-countries/learning/stagedLearningPlan.ts` — Set/Combined/Final planning and learner-facing stage labels.
- `src/features/world-countries/learning/stagedCountryLearningFlow.ts` and `stagedCapitalLearningFlow.ts` — current Learning phase ownership.
- `src/features/world-countries/learning/flows/StagedLearningReadyStep.tsx` — shared checkpoint presentation.
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx` and `CapitalLearningFlow.tsx` — orchestration of learner-facing transitions.
- `src/features/world-countries/learning/flows/LearningComplete.tsx`, `CountryLearningComplete.tsx`, and `CapitalLearningComplete.tsx` — existing completion and Journey-handoff presentation.
- `src/features/world-countries/learning/flows/learningMapPresentation.ts` — existing full-scope completion map presentation.
- `src/features/world-countries/today/WorldCountriesProgressView.tsx` — derived Progress surface to refine.
- `src/features/world-countries/today/journeyPresentation.ts` — authoritative learner-facing six-stage Journey derivation for supporting Progress.
- `src/features/world-countries/learning/scopeProgress.ts` — aggregate scope progress and state counts.
- `src/features/world-countries/learning/progressPresentation.ts` — canonical progress labels, colors, and finish-line explanation.
- `src/features/world-countries/ui/WorldMasterySummary.tsx` — existing top-level mastery summary; reuse or deliberately extend without duplicating progress truth.

## Edge cases

- 1–7 items ready: block contains exactly the ready items; no fabricated eight-item target.
- Exactly 8 ready: one eight-item block, without redundant overall count copy.
- 9+ ready: current CTA is at most 8; overall count remains truthful.
- 17 ready: learner can complete 8, then another scheduler-derived block immediately, and continue again without a cooldown; newly recorded failures may legitimately remain/re-enter due work according to existing scheduler truth.
- Review candidates span multiple Subregions or both core skills: preserve current interleaving and scope presentation.
- Review block contains an incorrect item eligible for delayed retry: retain the existing delayed retry insertion; the eight-item limit applies to initial candidates, not necessarily final prompt count after retries.
- Due Review and weak-spot candidates coexist: scheduled Review still wins inside the Review area.
- Review finishes with remaining due work and Journey Learning available: both choices remain visible; Review result feedback must not make Review a prerequisite or auto-focus Journey.
- One-Set Learning reaches Final recall: no duplicate Final-recall confirmation.
- Multi-Set Learning reaches an intermediate cumulative Mix: preserve the meaningful Mix checkpoint and later Set.
- Learner chooses Keep practising at a checkpoint: existing scheduler state resumes as today.
- Learner backs out of Final recall: any retained final-gate/back state remains coherent and does not skip learning requirements.
- Re-running a durable Learning scope already established: completion copy must remain truthful and must not fabricate a new mastery event.
- Temporary/non-recording Learning scope: preserve its existing statement that the run does not change guided region progress; do not show durable Journey payoff copy.
- A Subregion has Learning milestones but weak/developing recall: Progress must show the learning Journey state and recall state separately rather than implying mastery.
- A Subregion reaches core recall completion without a recent Learning run: Progress must still show it as complete/mastered from evidence.
- Zero-country scope and unavailable evidence remain non-fabricated.

## Out of scope

- Changing the spaced-review ladder, urgency tiers, review reason model, due calculation, failure regression, or interleaving strategy.
- Removing or redesigning within-block delayed retries.
- Automatically chaining Review blocks without returning learner choice.
- Daily goals, streaks, XP, badges, points, currencies, confetti, notifications, or habit mechanics.
- Changing staged Learning Set size configuration or scheduler mastery/readiness thresholds.
- Removing the Meet/Find/Recall/Mix/Final pedagogical model.
- Redesigning mnemonic authoring, Country order authoring, map geometry, camera rules, typed-answer feedback, fuzzy matching, or dwell timing.
- Making Progress an editable curriculum planner or Review launcher.
- Historical analytics, charts over time, study-duration tracking, telemetry, or a new persistence model.
- Redesigning Play, Recite, Drill, Quiz, Settings, or global navigation.
- New backend/network behavior.
- Merging the branch to `main`.

## Acceptance criteria

- [ ] `WORLD_COUNTRIES_TODAY_REVIEW_BLOCK_SIZE` is 8 and all Today Review/consolidation bounded-queue behavior, relevant defaults, tests, copy, and architecture documentation agree with that value.
- [ ] When more than 8 scheduled items are ready, the Review CTA launches at most 8 initial candidates and total-ready support copy remains clearly distinct.
- [ ] After a completed Review block, evidence refresh can expose another Review block immediately in the same visit; there is no cooldown/day/session gate.
- [ ] Review blocks do not auto-chain; Journey Learning remains independently selectable between blocks.
- [ ] Existing due scheduling, priority tiers, candidate ranking/interleaving, delayed retry, answer evidence, and weak-spot fallback semantics are unchanged except for the bounded initial-candidate count.
- [ ] The normal forward Learning path never requires two consecutive `Start final recall` confirmations.
- [ ] Meet/Find/Recall/Mix/Final pedagogy, Set sizing, scheduler thresholds, Keep practising behavior, and durable milestone writes remain intact.
- [ ] Checkpoint/completion states do not duplicate the same completion/next-action narration in both the center context/header and checkpoint dock.
- [ ] Country and Capital durable Learning completion clearly communicates the learned outcome before any direct Journey handoff and does not mislabel Learning completion as recall mastery.
- [ ] A completed Review block can show a compact transient result derived from the existing Review checkpoint counters without blocking the next Review or Journey action.
- [ ] Early Review exit does not show a fabricated completed-block result.
- [ ] Review completion feedback does not cause `Continue learning` to receive focus; existing CS0064 Review-focus behavior is preserved.
- [ ] Home/Continent still refreshes scheduler truth, map progress, and Journey state from existing evidence/milestones after activities; no parallel progress state is introduced.
- [ ] World Progress summarizes Continents, not Subregions, and each Continent presents complete/total Countries plus a compact accessible distribution of existing core progress states and a truthful region-level completion rollup.
- [ ] Continent Progress summarizes Subregions and each Subregion presents complete/total Countries, an accessible core-state distribution, and learner-facing Journey position derived from the existing journey presentation.
- [ ] Progress no longer exposes implementation-shaped readiness strings as its primary learner explanation when an existing Journey/progress derivation can express the same state more clearly.
- [ ] Progress rails explain scope/progress semantics and navigation without duplicating Home's Review/Continue action chooser.
- [ ] Progress, Journey, Review, and Learning continue to derive from existing evidence and milestones; no new persisted analytics, Journey, Review-session, or progress state is added.
- [ ] Focused automated tests cover eight-item batching/repeatability, final-recall transition de-duplication, checkpoint presentation, Learning completion semantics, transient Review completion feedback, and World/Continent Progress hierarchy.

## Source anchors

- `docs/architecture/SYSTEM.md`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/changes/0064-world-countries-independent-review-and-journey-actions.md`
- `src/features/world-countries/AGENTS.md`
- `src/features/world-countries/today/todayPlan.ts`
- `src/features/world-countries/today/reviewInterleaving.ts`
- `src/features/world-countries/today/reviewQueue.ts`
- `src/features/world-countries/today/TodayReviewSession.tsx`
- `src/features/world-countries/today/GuidedHomeRails.tsx`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/today/WorldCountriesProgressView.tsx`
- `src/features/world-countries/today/journeyPresentation.ts`
- `src/features/world-countries/learning/stagedLearningPlan.ts`
- `src/features/world-countries/learning/stagedCountryLearningFlow.ts`
- `src/features/world-countries/learning/stagedCapitalLearningFlow.ts`
- `src/features/world-countries/learning/flows/StagedLearningReadyStep.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/flows/LearningComplete.tsx`
- `src/features/world-countries/learning/flows/CountryLearningComplete.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningComplete.tsx`
- `src/features/world-countries/learning/flows/learningMapPresentation.ts`
- `src/features/world-countries/learning/scopeProgress.ts`
- `src/features/world-countries/learning/progressPresentation.ts`
- `src/features/world-countries/ui/WorldMasterySummary.tsx`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` in the same implementation so current-state documentation reflects the delivered behavior:

- Today snapshots at most **8** initial candidates into each Review/consolidation block rather than 12.
- Review may be repeated immediately as successive scheduler-derived blocks while due work remains; there is no one-block-per-day/visit gate and blocks do not auto-chain.
- Guided Learning retains the existing staged pedagogy while the normal forward path avoids duplicate transition/final-recall confirmations.
- Learning/Review completion presentation is transient and derives outcomes from existing milestones/evidence rather than introducing another progress authority.
- World Progress still summarizes Continents and Continent Progress still summarizes Subregions, with richer presentation derived from current scope progress and the existing Journey model.

Do not document transient component implementation details or create a new architecture concept for the UX refinements.

## Verification

Verification evidence:

- Focused Today/Learning/Progress checks: `npx.cmd vitest run src/features/world-countries/today/todayPlan.test.ts src/features/world-countries/today/reviewInterleaving.test.ts src/features/world-countries/today/GuidedHomeRails.test.tsx src/features/world-countries/today/WorldCountriesToday.test.tsx src/features/world-countries/today/TodayReviewSession.test.tsx src/features/world-countries/today/WorldCountriesProgressView.test.tsx src/features/world-countries/learning/stagedCountryLearningFlow.test.ts src/features/world-countries/learning/stagedCapitalLearningFlow.test.ts src/features/world-countries/learning/flows/CountryLearningFlow.test.tsx src/features/world-countries/learning/flows/CapitalLearningFlow.test.tsx src/features/world-countries/learning/flows/GuidedLearningRails.test.tsx src/features/world-countries/learning/flows/StagedLearningReadyStep.test.tsx` — 12 files, 102 tests passed.
- World Countries feature slice: `npx.cmd vitest run src/features/world-countries` — 115 files, 829 tests passed.
- `npm.cmd run lint` — passed.
- `git diff --check` — passed; Git reported only existing CRLF-to-LF warnings for touched files.
- `npm.cmd run typecheck` — remains blocked only by the unrelated existing `src/features/world-countries/drill/DrillSetup.test.tsx:301` `Map<any, any>` versus `Map<string, never>` error.
- Browser/manual verification was not run, per the spec.
