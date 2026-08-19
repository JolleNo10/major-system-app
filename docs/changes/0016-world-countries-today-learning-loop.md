# Change Spec 0016 - World Countries Today learning loop

- **Status:** Implemented
- **Date:** 2026-08-19
- **Issue:** None.
- **Related ADRs:** [ADR 0027](../adr/0027-world-countries-derived-review-and-today-orchestration.md)
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md), [Core](../architecture/CORE.md), [Persistence](../architecture/PERSISTENCE.md)

## Goal

Make World Countries answer **"what should I do now?"**.

Add a map-centered **Today / Continue learning** workflow that:

1. runs genuinely due review of introduced core knowledge;
2. prioritizes due review before introducing more core material;
3. recommends the next whole-Subregion Countries or Capitals Learning flow for
   core knowledge that is still unintroduced;
4. returns to a refreshed Today plan after each review block or Learning run.

Do not add XP, streaks, achievements, daily challenges, or multiplayer.

## User-visible behavior

### Navigation

Replace the separate `Due review` action with:

```text
[ Today ] [ Drill ] [ Recite ]
```

Today is the default activity.

### Today setup

Keep the World map dominant.

Show the existing World mastery summary plus Today information:

```text
TODAY

7 core reviews due · 5 Countries
Next after review: Learn Countries · Central Asia

[ Continue learning ]
```

When no review is due:

```text
TODAY

All reviews caught up
Next: Learn Capitals · Northern Europe

[ Continue learning ]
```

When caught up:

```text
TODAY

All caught up
No core review is due and no new guided Learning remains.

[ Drill ] [ Recite ]
```

Mastery keeps its current meaning/colors; do not recolor it as due state.

### Primary action

1. due introduced core targets -> start review block;
2. otherwise unintroduced core knowledge -> launch next Learning;
3. otherwise caught-up state.

If backlog remains after a review block, `Continue review` remains primary.

## Evidence snapshot

Today scheduling requires raw attempt history.

Add/extend a World Countries `learning/` seam that:

- loads raw attempts for requested active Country IDs and skills;
- constructs/filters stable World Countries target IDs internally;
- preserves `at`, `ok`, `ms`, `evidenceKind`, `localDate`;
- exposes deterministic per-target history;
- keeps existing `loadWorldCountriesRecallProgress` compatible.

`today/` must not import `core/scoring/attemptStore`.

Where practical, derive Today World mastery from the same evidence snapshot.

## Core scope

Today v1 schedules only the existing
`WORLD_COUNTRIES_CORE_RECALL_SKILLS`:

- `location-to-country`
- `country-to-capital`

Do not include `capital-to-country` in counts, queues, or backlog gating.

## Introduced vs unintroduced

A core target is introduced when either:

- an applicable valid Learning milestone covers it; or
- history contains at least one successful attempt.

A target with only failed attempts and no applicable milestone is unintroduced.

Milestone coverage:

| Skill | Milestone |
| --- | --- |
| `location-to-country` | `countriesLearnedAt` |
| `country-to-capital` | `capitalsLearnedAt` |

Successful recall, recognition, or legacy evidence introduces the target.
Recognition/legacy evidence does not postpone review by itself.

Introducedness is planner-only.

## Review block

Snapshot at most **12 initially due core atomic targets**.

Today review is typed free recall only.

| Skill | Prompt | Response |
| --- | --- | --- |
| `location-to-country` | highlight location without Country name | typed Country |
| `country-to-capital` | Country name | typed Capital |

Use existing map and answer matching seams.

Correct first response:
- record ordinary `recall` success;
- resolve target for block;
- advance.

Incorrect first response:
- record ordinary `recall` failure;
- show corrective feedback;
- allow at most one delayed retry only if at least two other prompts intervene;
- otherwise leave target unresolved for future Today;
- never immediately repeat it.

Delayed retry:
- correct -> record success, resolve;
- incorrect -> record failure, leave unresolved;
- Skip for now -> leave unresolved without fabricating another attempt.

The queue and retry state are transient snapshots.

### Checkpoint

Example:

```text
12 reviewed
9 correct first try
2 recovered on retry
1 still needs work
18 core reviews still due

[ Continue review ]
```

No separate result persistence.

## Next Learning recommendation

When no review is due, evaluate Subregions in effective geographic order.

For each Subregion:

1. if any active Country has unintroduced `location-to-country`, recommend
   **Learn Countries** for the whole Subregion;
2. else if any active Country has unintroduced `country-to-capital`, recommend
   **Learn Capitals**;
3. else continue.

Important:

- introduced-but-weak material is maintained by review;
- failure-only/unintroduced material is taught through Learning;
- successful manual Drill knowledge is not unnecessarily re-taught;
- Learning remains whole-Subregion because milestone ownership is whole-
  Subregion.

## Launching Learning

Delegate to the existing `CountryLearningFlow` / `CapitalLearningFlow`.

Preserve:

- effective Country order;
- New items per set;
- scheduler settings;
- Set/Combined staging;
- Final Recall;
- milestone ownership;
- mnemonic/order authoring;
- map/task-dock behavior;
- current **Practice progress** in the Learning right rail.

Use existing `onDone`, `onExit`, and `doneLabel` seams for Today return behavior.

Today does not write milestones.

## First review after Learning

For a core target with no attempt history:

- `countriesLearnedAt` seeds Location → Country review at milestone + 24h;
- `capitalsLearnedAt` seeds Country → Capital review at milestone + 24h.

Use existing active-membership fingerprint applicability.

Once any attempt exists, use attempt-based scheduling instead.

Do not create synthetic attempts.

## Attempt-based due policy

Accept explicit supplied clock/date inputs for deterministic tests.

### Eligibility

Attempt-backed core target enters review only if history contains at least one
success.

Failure-only history is unintroduced unless an applicable milestone introduced
the target.

### Failure precedence

Sort by `at`, stable for equal timestamps.

If the latest attempt is failure on introduced material -> due immediately.

### Qualifying scheduling success

Only:

```text
ok === true
evidenceKind === "recall"
valid localDate
```

advances spacing.

Recognition or legacy success introduces but does not postpone review.

Multiple qualifying successes on one `YYYY-MM-DD` date count once.

If introduced attempt-backed material has no qualifying recall success after the
latest failure -> due now.

### Interval ladder

| Distinct qualifying recall dates after latest failure | Next due |
| ---: | ---: |
| 1 | +1 local calendar day |
| 2 | +3 local calendar days |
| 3 | +7 local calendar days |
| 4 | +14 local calendar days |
| 5 | +30 local calendar days |
| 6+ | +60 local calendar days |

Use calendar-day arithmetic, not millisecond approximations.

Mastered + due is valid; due state does not demote proficiency.

## Queue priority

Build all due core candidates, take max 12.

Priority:

1. latest attempt failure;
2. introduced attempt-backed target with no qualifying recall success;
3. milestone-seeded or interval-scheduled overdue target.

Within:
- tier 1: older latest failure first;
- tier 2: older latest attempt first;
- tier 3: most overdue first.

Tie-break by:
1. effective geographic order;
2. `WORLD_COUNTRIES_CORE_RECALL_SKILLS` order.

## Loading/failure/empty states

While evidence loads:
- preserve Today/map layout;
- show neutral loading;
- never display false `0 due`;
- do not build from partial evidence.

On evidence load failure:
- show Review status unavailable;
- do not claim caught up;
- disable Today review start;
- keep Drill/Recite available;
- do not rewrite evidence.

No active Countries:
- show 0 Countries active;
- no due work;
- no next Learning;
- no enabled Continue learning;
- do not report World mastered.

## Map, keyboard, accessibility

- Keep map mounted across compatible review prompts.
- Location recall must hide the Country answer before feedback.
- Do not show historical progress treatments that reveal answers during recall.
- Reuse existing safe keyboard conventions.
- Native input submit remains native.
- Due/progress information must be textual, not color-only.
- Feedback uses accessible status semantics.
- Focus follows existing task-dock conventions.

## Scope

- Add Today and make it default.
- Remove Maintenance/Due review entry and owner.
- Add raw history access under `learning/`.
- Add introducedness derivation.
- Add core temporal due derivation and deterministic queueing.
- Add milestone seeded first review.
- Add bounded review blocks and delayed retry.
- Record Today answers via existing atomic recall evidence.
- Add checkpoint/backlog continuation.
- Add next-Learning recommendation.
- Delegate to existing Learning flows.
- Re-home workflow-neutral World mastery summary from `drill/` to `ui/`.
- Preserve Change Spec 0015 Learning Practice progress.
- Update current-state architecture/persistence docs.
- Add focused tests/regressions.

## Architecture constraints

Follow ADR 0027.

- no Today -> Drill/Recite imports;
- no Today -> core attemptStore import;
- raw evidence / introducedness / review timing belong under feature learning;
- no review schedule persistence;
- no IndexedDB version change;
- no persisted Today plan/queue/retry state;
- no synthetic Learning attempts;
- Learning flow remains milestone owner;
- Recite remains isolated;
- use only existing core skill constant;
- inactive Countries excluded but history retained;
- introducedness must not mutate Learning Readiness;
- reuse `learning/scopeProgress.ts`;
- move/reuse WorldMasterySummary through feature-local `ui/`;
- preserve current Learning Practice progress;
- do not replace Change Spec 0009's in-session scheduler.

## Edge cases

- one Country may contribute two due core targets;
- Mastered + due;
- first-ever failed Drill attempt with no milestone is unintroduced;
- recognition-only success is introduced but due immediately;
- legacy success is introduced but due immediately;
- recall success without valid localDate is introduced but cannot postpone review;
- prior success followed by failure is introduced and due immediately;
- same-day failure then successful retry => one qualifying date => +1 day;
- repeated same-day qualifying successes count once;
- valid milestone introduces/seeds no-attempt target;
- inapplicable old milestone does not;
- >12 due leaves backlog;
- near-end failure with insufficient intervening prompts gets no same-block retry;
- partial Subregion introduction still launches whole existing Learning flow;
- successful attempts across all Location targets prevent Learn Countries
  recommendation even without Countries milestone;
- successful attempts across all Capital targets prevent Learn Capitals
  recommendation even without Capitals milestone;
- inactive evidence retained but excluded;
- exit keeps answered attempts, discards queue;
- display-name changes do not change target identity;
- attempt calendar arithmetic handles month/year/DST boundaries;
- Today-launched Learning retains right-rail Practice progress.

## Out of scope

- Today review of Capital → Country;
- multiplayer/sockets;
- XP/levels/badges/streaks;
- Daily World Challenge;
- confusion-pair modeling;
- notifications/background scheduling;
- FSRS/SM-2/configurable intervals;
- persisted Today sessions;
- persisted partial Learning Sets;
- new recall skills;
- mastery/map palette changes;
- Recite review evidence;
- Knowledge Frontier visualization;
- generic cross-feature SRS.

## Acceptance criteria

- [x] World Countries defaults to Today with Drill and Recite available.
- [x] Maintenance/Due review is removed as a second path.
- [x] Today keeps World map dominant and reuses existing mastery semantics.
- [x] World mastery summary is reused without Today importing Drill.
- [x] No false 0 due while loading.
- [x] Today uses raw attempt history.
- [x] Today imports neither Drill/Recite internals nor core attemptStore.
- [x] No schedule persistence or DB version change.
- [x] Today counts/queues only core skills.
- [x] Countries milestone introduces/seeds Location review after 24h.
- [x] Capitals milestone introduces/seeds Capital review after 24h.
- [x] Any successful attempt introduces its core target.
- [x] Failure-only history without milestone is unintroduced and excluded from review.
- [x] Recognition/legacy success is introduced but due immediately.
- [x] Latest failure on introduced material is due immediately.
- [x] Only recall success with valid localDate advances intervals.
- [x] Intervals are 1,3,7,14,30,60 local calendar days.
- [x] Same-date successes count once.
- [x] Due does not demote mastery.
- [x] Review block max is 12 initial targets.
- [x] Queue ordering is deterministic.
- [x] Location review is typed and answer-hidden pre-feedback.
- [x] Capital review reuses typed answer matching.
- [x] Today answers record ordinary recall evidence.
- [x] Incorrect prompt never immediately repeats.
- [x] Retry requires two intervening prompts and max one retry.
- [x] Unresolved work remains future due without blocking block completion.
- [x] Remaining backlog exposes Continue review.
- [x] New Learning is not primary while due core review remains.
- [x] Recommendation follows effective geography and Countries-before-Capitals.
- [x] Successful manual evidence prevents unnecessary Learning recommendation.
- [x] Today delegates to whole-Subregion existing Learning flows.
- [x] Today-launched Learning preserves current Practice progress.
- [x] Today does not write milestones.
- [x] Learning done/exit returns to freshly derived Today.
- [x] Inactive Countries excluded without deleting history.
- [x] Load failure does not claim caught up.
- [x] Existing Drill/Learning/Recite/mastery/map/Country-set behavior regresses only where explicitly intended.
- [x] WORLD_COUNTRIES.md and PERSISTENCE.md are updated.
- [x] Focused tests and typecheck pass.

## Source anchors

Existing:

- `src/features/world-countries/WorldCountries.tsx`
- `src/features/world-countries/learning/recallTargets.ts`
- `src/features/world-countries/learning/recallProgress.ts`
- `src/features/world-countries/learning/recallMastery.ts`
- `src/features/world-countries/learning/scopeProgress.ts`
- `src/features/world-countries/learning/subregionLearningStore.ts`
- `src/features/world-countries/learning/answerMatching.ts`
- `src/features/world-countries/learning/learningPracticeProgress.ts`
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/drill/WorldMasterySummary.tsx`
- `src/features/world-countries/maintenance/WorldCountriesMaintenance.tsx`
- `src/features/world-countries/maintenance/maintenanceCandidates.ts`
- `src/features/world-countries/geography/`
- `src/features/world-countries/maps/`
- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/ui/TaskDock.tsx`

Expected seams; exact filenames may vary:

- `src/features/world-countries/learning/recallHistory.ts`
- `src/features/world-countries/learning/reviewSchedule.ts`
- `src/features/world-countries/learning/todayIntroduction.ts`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/today/TodayReviewSession.tsx`
- `src/features/world-countries/today/todayPlan.ts`
- `src/features/world-countries/ui/WorldMasterySummary.tsx`

## Documentation impact

Update:

- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/architecture/PERSISTENCE.md`

Update `src/features/world-countries/AGENTS.md` only if Today needs a materially
different routing/start-point instruction.

## Verification

Complete when implemented:

- `npx vitest run src/features/world-countries`
- `npm run typecheck`
- manual Today -> review backlog -> Learning -> Today loop
