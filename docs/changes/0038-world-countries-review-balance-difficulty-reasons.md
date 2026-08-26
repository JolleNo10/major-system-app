# Change Spec 0038 - Balance Today review, adapt to repeated difficulty, and explain review reasons

- **Status:** Implemented
- **Date:** 2026-08-26
- **Issue:** None.
- **Related ADRs:** [ADR 0027 - Derive World Countries review due state and isolate Today orchestration](../adr/0027-world-countries-derived-review-and-today-orchestration.md)
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Improve World Countries Today review without introducing persisted SRS state or a generic scheduler.

The bounded review block should avoid avoidable clustering of the same Country, skill, or geography; the temporal schedule should distinguish an isolated lapse from repeated difficulty; and Today should make the reason for review understandable to the learner.

Keep the existing core-review scope, evidence boundaries, transient Today queue, and fixed review interval ladder.

## User-visible behavior

### A balanced 12-item review block

Today still reviews at most 12 initial due targets per review block.

Urgent material still wins. A lower-priority due target must never displace a higher-priority target merely to improve variety.

Within the same priority tier, Today should interleave the block so that, when alternatives exist:

- different Countries are preferred before a second skill for a Country is added;
- Location -> Country and Country -> Capital alternate rather than appearing in long runs;
- immediately repeated Subregions are avoided;
- the same Country's two core skills are separated rather than asked back-to-back.

Example when both skills are due for six Countries:

```text
Prefer:
Norway       Location -> Country
Sweden       Country -> Capital
Finland      Location -> Country
Denmark      Country -> Capital
Iceland      Location -> Country
Estonia      Country -> Capital
...
then later return to the second due skill for those Countries.

Avoid:
Norway       Location -> Country
Norway       Country -> Capital
Sweden       Location -> Country
Sweden       Country -> Capital
...
```

The selection is deterministic. Do not randomize Today.

### Isolated lapses and repeated difficulty

Keep the existing interval ladder:

```text
1 -> 3 -> 7 -> 14 -> 30 -> 60 days
```

A failure no longer blindly discards all earlier spacing progress.

Scheduling is derived from retained evidence by review day:

- A **clean recall day** has at least one successful `evidenceKind: "recall"` attempt and no failed attempt for that target on the same learner-local date.
- A **lapse day** is a learner-local date, after the target has established recall spacing, with one or more failed attempts.
- Multiple failures/retries on one learner-local date count as one lapse day for interval regression.
- A lapse is **isolated** when there is no earlier unresolved lapse, or at least two clean recall days occurred after the previous lapse.
- A lapse is **repeated difficulty** when another lapse occurs before two clean recall days have occurred after the previous lapse.

The spacing level uses the existing six intervals, indexed `0..5`.

For a target with established recall spacing:

- a clean recall day advances one level, capped at 5;
- an isolated lapse regresses one level, floored at 0;
- a repeated-difficulty lapse regresses two levels, floored at 0;
- a same-day successful recovery after a lapse does not also advance the level;
- after two clean recall days following the most recent lapse, the target is no longer classified as currently difficult.

The first successful typed-recall day establishes level 0 and therefore a 1-day next interval. Recognition/legacy success may still introduce a target but does not advance the spacing ladder.

Examples:

```text
Mature target at level 4 (30-day interval)
isolated lapse + same-day recovery
=> level 3
=> next review after 14 days

Target at level 3 (14-day interval)
lapse
=> level 2
clean recall
=> level 3, but difficulty is not yet cleared
another lapse before the second clean recall
=> repeated difficulty
=> level 1
=> next review after 3 days
```

If the latest retained attempt is failed, the target remains immediately due exactly as today.

Failure-only history still does not introduce a target.

### Explain why review is happening

Today should expose review rationale without turning the UI into an SRS dashboard.

On the Today home/status rail, when review is due, show a compact **Why today** summary derived from the due candidates. It should communicate useful categories such as:

- mistakes / mistake follow-ups;
- needs first typed recall;
- first review after Learning;
- ordinary spaced review.

If some mistake-related candidates are classified as repeated difficulty, surface that as a compact subset/detail rather than hiding it.

During an active Today review prompt, expose a concise **Why now** reason for the current target. Expected semantic labels are:

- `Repeated difficulty`
- `Recent mistake`
- `Mistake follow-up`
- `Needs first recall`
- `First review after learning`
- `Spaced review`

For ordinary scheduled review, overdue information may be appended when useful, for example:

```text
Why now
Spaced review · 3 days overdue
```

For a recovered difficult target:

```text
Why now
Repeated difficulty · shorter follow-up
```

The reason should remain available in expanded/fullscreen Today review presentation through the existing shared task/context presentation rather than existing only in a rail that disappears.

Do not show internal priority tiers, spacing-level numbers, algorithm names, raw timestamps, or persisted-state terminology to the learner.

## Scope

- Replace the simple `sortedDueCandidates.slice(0, 12)` review-block selection with deterministic, priority-preserving interleaving.
- Derive a spacing level and current difficulty classification from raw retained target history.
- Preserve the six existing interval values.
- Preserve immediate due behavior for a latest failure.
- Preserve introduction rules and milestone-seeded first review behavior.
- Add semantic review-reason classification for Today presentation.
- Add aggregate review-reason counts to the Today home/status presentation.
- Add current-target review rationale to active Today review presentation.
- Keep retry insertion behavior transient and compatible with the interleaved initial block.
- Update World Countries current-state documentation.
- Add focused unit/integration coverage.

## Interaction and states

### Today plan derivation

`buildWorldCountriesTodayPlan` still derives all due candidates first.

Candidate priority tiers retain their existing meaning:

1. latest failure;
2. introduced but missing successful typed recall;
3. scheduled/overdue review.

Interleaving applies only inside the currently eligible priority tier. It must not pull a tier-2 or tier-3 target ahead of a tier-1 target when tier 1 alone can fill the block.

The planner should expose:

- all `dueCandidates` in urgency order for counts/status;
- an interleaved bounded `reviewQueue` for the next review block;
- derived aggregate reason counts for Today presentation, or enough semantic data for `today/` to derive them without rereading evidence.

### Initial review block interleaving

Use the existing sorted candidate order as the stable base rank.

For each priority tier being consumed:

1. Prefer candidates for Countries not yet represented in the current selection round.
2. Among valid alternatives, prefer a skill different from the previously selected skill.
3. Then prefer a Subregion different from the previously selected Subregion.
4. Use original candidate rank as the final deterministic tie-break.
5. When no unseen Country remains in that tier, start another Country-selection round and allow the second due skill for previously represented Countries.

This creates diversity without inventing randomness or weakening urgency.

Do not guarantee impossible variety. If only one skill, Country, or Subregion is available, use it.

### Retry prompts

The existing delayed Today retry remains a queue-local behavior.

Do not count a retry as another initial block slot. Keep the existing delayed retry separation behavior unless implementation review finds a direct regression caused by the new interleaving.

The interleaved initial queue is snapshotted when review starts. Do not dynamically reorder it as answers are recorded.

### Temporal schedule derivation

Keep temporal scheduling in `learning/reviewSchedule.ts`.

Do not persist:

- spacing level;
- difficulty classification;
- failure counters;
- next due date;
- review reason.

All are projections of retained attempts plus the existing optional Learning milestone.

Only valid learner-local dates can advance/regress the interval ladder. Preserve the existing defensive behavior for malformed/missing `localDate`.

A failed latest attempt without a usable local date may still make the target immediately due through the existing timestamp/order semantics, but must not fabricate a dated lapse for interval-level derivation.

### Review reason presentation

Keep raw scheduling semantics in `learning/`.

User-facing reason classification/copy belongs in Today/UI presentation, not in generic scoring/core.

A suitable Today semantic classifier can derive the visible reason from:

- `schedule.reason`;
- `schedule.difficulty`;
- whether attempt history exists / `latestAttemptAt`;
- `overdueDays`.

Suggested precedence for the active prompt:

1. current `repeated` difficulty;
2. `latest-failure`;
3. current isolated `lapse` follow-up;
4. `missing-recall-success`;
5. scheduled with no prior attempt -> first review after learning;
6. ordinary scheduled review.

The Today home summary may group these into fewer display buckets, but repeated difficulty must remain discoverable.

### Loading/error/caught-up behavior

No change to evidence loading, load failure, caught-up, or no-active-Countries behavior.

Reason UI renders only when retained evidence/plan data is ready.

## Architecture constraints

- Follow [ADR 0027](../adr/0027-world-countries-derived-review-and-today-orchestration.md).
- Review due state, spacing level, and difficulty remain derived from raw World Countries atomic evidence.
- Do not add persisted SRS/ease/stage/difficulty state.
- Do not add a generic SRS abstraction under `core/`.
- Keep temporal scheduling feature-local in `learning/`.
- Keep Today orchestration/interleaving in `today/`.
- Today must not import `drill/` or `recite/` internals.
- Recite remains completely isolated from review evidence.
- Do not change proficiency/mastery derivation. Due state and mastery remain separate.
- Do not expand Today core maintenance beyond `location-to-country` and `country-to-capital`.
- Do not make latency part of review scheduling.
- Preserve the fixed review interval constants unless a concrete defect requires a separately reviewed change.
- No new ADR is required: this refines the feature-local derived scheduling and Today queue policy already established by ADR 0027.

## Existing capabilities to reuse

- `src/features/world-countries/learning/reviewSchedule.ts`
  - Existing pure temporal scheduler and interval constants.
  - Extend this projection rather than creating a second difficulty/SRS owner.

- `src/features/world-countries/learning/recallHistory.ts`
  - Existing retained raw-attempt access seam.
  - Continue using it as the authoritative temporal evidence source.

- `src/features/world-countries/today/todayPlan.ts`
  - Existing due-candidate ranking and 12-item block owner.
  - Add the deterministic interleaving selection here or in a small pure `today/` helper.

- `src/features/world-countries/today/reviewQueue.ts`
  - Existing transient initial/retry queue.
  - Preserve delayed retry semantics and do not duplicate difficulty logic here.

- `src/features/world-countries/today/TodayRails.tsx`
  - Existing Today status and active review rail presentation.
  - Reuse it for `Why today` and `Why now` presentation.

- `src/features/world-countries/today/TodayReviewSession.tsx`
  - Existing active candidate/prompt owner and shared activity-task composition.
  - Supply the current semantic reason to rail/task context without changing evidence recording.

- `src/features/world-countries/ui/WorldCountriesActivity.tsx`
  - Existing shared task/context seam used by expanded Today review.
  - Reuse existing semantic context capacity; do not add a Today-specific fullscreen UI branch unless the current seam cannot represent the reason.

## Edge cases

- More than 12 tier-1 failures: the block contains only tier-1 candidates; interleave within tier 1.
- Fewer than 12 tier-1 candidates: consume all tier 1, then apply the same rules to tier 2, then tier 3 until full.
- Twelve or more distinct Countries due in the same tier: do not spend two initial slots on the same Country while an unseen Country in that tier is available.
- Only one Country has two due skills: both may appear; do not invent filler or lower-priority displacement.
- Only one skill is due: no forced alternation.
- Only one Subregion is due: no forced geographic alternation.
- Same Country has both core skills at equal urgency: separate them as much as feasible.
- A Today retry inserted after an incorrect answer does not mutate the original initial-block composition.
- Multiple failed attempts on one learner-local date cause at most one lapse regression.
- Failed initial answer plus successful same-day delayed retry causes one lapse regression and no same-day advancement.
- One isolated lapse on a mature item regresses one interval level rather than resetting to level 0.
- A second lapse before two clean recall days regresses two levels.
- Two clean recall days after a lapse clear current difficulty classification.
- A later lapse after difficulty was cleared is isolated again.
- Failure-only material remains not introduced.
- Recognition-only success remains introduced but due for first typed recall.
- Milestone-only material still first becomes due after the existing 24 elapsed hours.
- Invalid/missing `localDate` never advances/regresses a dated spacing level.
- The latest failed attempt remains immediately due even when the item was previously mature.
- Existing Drill writes continue to contribute ordinary atomic evidence; no Drill-specific difficulty path is added.
- Recite outcomes never affect difficulty or Today reasons.
- Empty/caught-up Today does not render meaningless reason counts.

## Out of scope

- Relearning/repair flows for persistent leeches.
- Changing the 12-item block size.
- Allowing new Learning while review debt remains.
- FSRS, SM-2, ease factors, desired retention, probabilistic memory models, or generic SRS infrastructure.
- Latency/speed-based scheduling.
- Persisted difficulty, streak, lapse count, or Today queue state.
- Changing Drill session selection or result UI.
- Changing Recite evidence isolation.
- Adding Capital -> Country to Today.
- Changing mastery/proficiency thresholds or map progress colors.
- Changing the shared answer matcher or alias behavior.

## Acceptance criteria

### Balanced block

- [ ] Today still exposes at most 12 initial review candidates per block.
- [ ] A lower priority tier never displaces a higher priority tier solely for interleaving.
- [ ] With 12+ distinct Countries due in the active tier, the 12-item initial block contains 12 distinct Countries.
- [ ] When both core skills are due for the same Countries, second skills are deferred until unseen Countries in the active tier are exhausted.
- [ ] Skill alternation is preferred when an eligible alternative exists.
- [ ] Immediate Subregion repetition is avoided when an equally eligible alternative exists.
- [ ] Selection is deterministic for identical input.
- [ ] Existing urgency ordering remains the final tie-break when diversity preferences do not distinguish candidates.
- [ ] Existing delayed retry behavior still works and does not count against the 12 initial slots.

### Difficulty-aware scheduling

- [ ] `WORLD_COUNTRIES_REVIEW_INTERVAL_DAYS` remains `[1, 3, 7, 14, 30, 60]`.
- [ ] First successful typed-recall day establishes level 0 / a 1-day interval.
- [ ] Clean recall days advance one spacing level, capped at the 60-day level.
- [ ] An isolated lapse regresses one level, floored at level 0.
- [ ] A repeated-difficulty lapse before two clean recall days regresses two levels, floored at level 0.
- [ ] Multiple failures/retries on one local date apply at most one lapse regression.
- [ ] Same-day recovery after a lapse does not also advance spacing.
- [ ] Two clean recall days after the latest lapse clear current difficulty classification.
- [ ] A lapse after difficulty has cleared is treated as isolated again.
- [ ] Latest failed attempt remains immediately due.
- [ ] Failure-only history remains not introduced.
- [ ] Recognition/legacy success still requires successful typed recall before spacing advances.
- [ ] Milestone-only scheduling retains the existing first-due-after-24-hours behavior.
- [ ] Missing/invalid local dates do not fabricate spacing advancement or lapse-day regression.
- [ ] Scheduling remains a pure derivation; no new durable review state is written.

### Review reasons

- [ ] Today home shows a concise `Why today` summary whenever due reviews exist.
- [ ] The summary distinguishes mistake-related review, first typed recall, and scheduled review in understandable language.
- [ ] Repeated difficulty is visible when present rather than collapsed invisibly into generic scheduled review.
- [ ] Active Today review exposes a concise `Why now` semantic reason for the current target.
- [ ] `Why now` can distinguish repeated difficulty, recent mistake, mistake follow-up, first recall, first review after learning, and spaced review.
- [ ] Scheduled review may show overdue days without exposing internal scheduler mechanics.
- [ ] The reason remains available in expanded/fullscreen Today review through the existing shared task/context presentation.
- [ ] No learner-facing UI exposes numeric priority tier, spacing level, raw timestamps, or internal SRS terminology.

### Regression and documentation

- [ ] Today still records every answered review prompt as ordinary `evidenceKind: "recall"` atomic evidence.
- [ ] Recite remains isolated and does not influence Today scheduling/difficulty.
- [ ] Capital -> Country remains excluded from Today core review.
- [ ] Proficiency/mastery behavior is unchanged.
- [ ] Tests cover interleaving, isolated lapse, repeated lapse, same-day retry, two-clean-day recovery, and visible review-reason classification.
- [ ] `docs/architecture/features/WORLD_COUNTRIES.md` is updated to describe balanced Today review blocks, derived difficulty-aware interval regression, and review-reason presentation.
- [ ] No persistence documentation change is required unless implementation accidentally introduces durable state; if durable state is proposed, stop and re-evaluate against ADR 0027 instead.

## Source anchors

- `src/features/world-countries/learning/reviewSchedule.ts`
- `src/features/world-countries/learning/reviewSchedule.test.ts`
- `src/features/world-countries/learning/recallHistory.ts`
- `src/features/world-countries/today/todayPlan.ts`
- `src/features/world-countries/today/todayPlan.test.ts`
- `src/features/world-countries/today/reviewQueue.ts`
- `src/features/world-countries/today/TodayReviewSession.tsx`
- `src/features/world-countries/today/TodayRails.tsx`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/ui/WorldCountriesActivity.tsx`
- `docs/adr/0027-world-countries-derived-review-and-today-orchestration.md`
- `docs/architecture/features/WORLD_COUNTRIES.md`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` so current-state guidance explicitly states:

- Today selects a bounded, deterministic, urgency-preserving interleaved review block rather than simply taking geographically sorted due targets;
- the fixed interval ladder is derived from raw evidence with mild regression for an isolated lapse and stronger regression for repeated difficulty;
- difficulty is not persisted and clears after two clean recall days;
- Today exposes learner-facing rationale for why due review is being shown.

ADR 0027 remains valid and does not require amendment.

## Verification

Complete this section when setting the status to `Implemented`.

- Implemented and verified on 2026-08-26.
- Evidence: focused review-schedule, Today interleaving/plan, retry-queue, reason-classifier, rail, active-session, and expanded-context tests; the World Countries suite (97 files, 461 tests); and typecheck. The environment had no connected browser for the requested hands-on visual pass, so standard/expanded presentation was verified through the jsdom interaction tests instead; those cover the Today home summary, standard active review rail, and expanded shared task context.
