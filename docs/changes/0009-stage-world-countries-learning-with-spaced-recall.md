# Change Spec 0009 - Stage World Countries Learning with spaced recall

* **Status:** Implemented
* **Date:** 2026-08-13
* **Issue:** None.
* **Related ADRs:** [ADR 0019 - World Countries Recall Mastery, Core Completion, and Progress](../adr/0019-world-countries-recall-mastery-core-completion-progress.md), [ADR 0024 - World Countries Learning and Practice boundary](../adr/0024-world-countries-learning-practice-boundary.md)
* **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md), [Core](../architecture/CORE.md)

## Goal

Make Learn Countries and Learn Capitals easier to acquire by introducing
bounded groups of new items, requiring spaced successful recall before
suggesting progression, periodically consolidating everything introduced so
far, and retaining an explicit whole-Subregion Final recall as the only
Learning completion gate.

Both Learning paths use one coherent user-facing vocabulary and keep all
intermediate journey and scheduler state ephemeral.

## User-visible behavior

### New items per set

World Countries Settings adds a persisted New items per set preference:

~~~text
New items per set
[ 3 ] [ 4 ] [ 5 ] [ All ]
~~~

3 is the default. The value is a maximum, not a promise that every Set has
exactly that many items. The preference applies to Learn Countries and Learn
Capitals and is snapshotted when a multi-Subregion Learning run starts. A
change made while a run is active applies on the next run.

The same snapshotted maximum is applied independently to each Subregion in a
multi-Subregion run. The effective Country order remains owned by geography/.

For a numeric maximum m and n active ordered items:

1. If n <= m, create one Set containing all items.
2. Otherwise, choose the minimum number of Sets k = ceil(n / m).
3. Set the minimum allowed Set size to ceil(m / 2).
4. In effective order, fill each Set with the largest size that leaves every
   remaining Set between that minimum and m.

This preserves order, never exceeds the selected maximum, and avoids a
one-item tail. Examples:

~~~text
Maximum 3: 4 -> 2+2, 7 -> 3+2+2, 9 -> 3+3+3, 10 -> 3+3+2+2
Maximum 4: 6 -> 4+2, 7 -> 4+3
Maximum 5: 6 -> 3+3, 7 -> 4+3, 8 -> 5+3, 11 -> 5+3+3
All:       any non-empty scope -> one Set
~~~

An empty active Subregion keeps the existing unavailable behavior and does not
enter Learning.

### Shared Learning vocabulary

Learn Countries and Learn Capitals use these user-facing terms:

* Learn Countries / Learn Capitals: the overall Learning activity.
* Set: the current group of newly introduced items.
* Step: an instructional step inside a new Set.
* Practice: repeated recall/reinforcement inside a Set.
* Combined practice: cumulative Practice across all introduced items.
* Ready: a session-only indication that the current scheduler scope met its
  spaced-recall threshold.
* Final recall: explicit whole-Subregion qualification.
* Learned: persisted whole-Subregion Learning completion only.

Do not use mastered as World Countries UI terminology for temporary scheduler
state. Do not present Phase, round, ordered recall, or shuffled round as
competing progression vocabulary.

The instructional labels are:

~~~text
Learn countries
Set 1
Step 1 - Review
Step 2 - Locate
Step 3 - Practice
~~~

~~~text
Learn capitals
Set 1
Step 1 - Review
Step 2 - Practice
~~~

Country Final recall may describe its ordered mechanic as supporting text.
Capital Final recall may describe its Country-order mechanic as supporting
text. These descriptions do not become separate workflow stage names.

### Introduction Sets

Each Country Set uses:

1. The existing Country review/walkthrough, scoped to the active Set.
2. A map-location Step scoped to the active Set.
3. Typed Country-name Practice scoped to the active Set.

The map-location Step uses the shared round scheduler with Country IDs as its
keys. It has a fresh scheduler state, uses actual answer latency internally,
and has a non-limiting speed threshold. A correct map selection is an
unhinted answer; wrong selections use the scheduler's normal regression and
spacing behavior.

When the location scheduler reaches its threshold, show a local Location
Ready state and require an explicit Continue to Practice action. It may also
offer Keep practising and Back. Location Ready does not make the whole Set
Ready.

Country Practice uses the shared scheduler to select a Country ID and asks the
learner to type that Country's name. It has a fresh scheduler state separate
from map location. When every Country in the active Set reaches the scheduler
threshold, the Set becomes Ready.

Each Capital Set uses:

1. The existing Capital review/walkthrough, scoped to the active Set.
2. Typed Country-to-Capital Practice selected by the shared scheduler.

Capital Practice has a fresh scheduler state and uses the existing answer
matching behavior. It reaches Set Ready when every active Country reaches the
scheduler threshold.

Set Ready never auto-advances. The learner chooses the next plan action,
continues practising, or goes back. If an earlier Step was skipped, a later
Practice Step may still qualify the Set; the skipped Step itself is never
reported as Ready.

### Spaced-recall scheduling

Reuse core/scoring/roundScheduler.ts; do not introduce a World Countries
scheduling algorithm.

For every World Countries Learning scheduler scope, a level advances only when
the answer is correct, unhinted, and sufficiently spaced from the previous
advancing recall.

Recall speed must not gate readiness. Configure the scheduler from the World
Countries caller with a non-limiting speed override while preserving the
existing weighted selection, spacing, anti-repeat, balance, regression, and
progress behavior. Record actual answer latency internally. Do not change
global scheduler constants or existing consumers.

The existing scheduler threshold equivalent to internal level 2 is the Ready
threshold. Do not expose its internal level names in World Countries UI.

There is no new hint/reveal path in staged Learning. Existing feedback is not a
hint and does not advance scheduler state by itself.

### Combined practice

Combined practice has no walkthrough or re-teaching requirement.

For Learn Countries, Combined practice is typed Country-name Practice only. It
does not repeat map-location prompts.

For Learn Capitals, Combined practice is typed Country-to-Capital Practice.

Each Combined practice:

* contains all items introduced so far;
* starts a fresh scheduler state;
* does not inherit Ready levels from any earlier Set or Combined practice; and
* uses actual answer latency with the same non-limiting speed configuration.

For a plan with more than one introduction Set, the normal path is:

* Set 1, then the next Set;
* after the second and each later non-final Set, Combined practice over all
  items introduced so far before the next Set; and
* after the final Set, a required full-scope Combined practice before Final
  recall.

For 9 items at maximum 3, the exact path is:

~~~text
Set 1: 3
Set 2: 3
Combined practice: 6
Set 3: 3
Combined practice: 9
Final recall
~~~

For 7 items at maximum 3, the batching rule produces:

~~~text
Set 1: 3
Set 2: 2
Combined practice: 5
Set 3: 2
Combined practice: 7
Final recall
~~~

On the normal path, the required full-scope Combined practice starts after an
explicit Practise all N action when the final Set is Ready. It does not
auto-start. If the final Set is skipped, Skip advances directly to that
full-scope Combined practice stage without making the Set Ready.

If the active scope fits in one Set, there is no duplicate full-scope Combined
practice; the Set Ready state leads directly to the Final recall gate.

When a Combined practice scope becomes Ready, show the next plan action,
Keep practising, and Back as appropriate. Skipping a Combined practice
advances to the next planned stage without making the scope Ready.

### Final recall

After all Sets and any required full-scope Combined practice are traversed,
show an explicit Final recall gate.

On the normal Ready path, the gate offers:

~~~text
Ready for Final recall

[ Final recall ]
[ Keep practising ]
[ Back ]
~~~

If the final Combined practice was skipped, the gate must not claim that the
scope is Ready. It offers only Final recall and Back.

Final recall is mandatory for completion and cannot be skipped.

Learn Countries Final recall uses the existing ordered-recall qualification
over the complete effective Country order, including its current
repair/rewind behavior.

Learn Capitals Final recall uses an ordered Country-to-Capital qualification
over the complete effective Country order, using the generic ordered-recall
repair behavior.

Only successful Final recall calls the owning
markSubregionCountriesLearned or markSubregionCapitalsLearned seam. A
successful Final recall enters the existing Learning completion outcome.

Back from active Final recall returns to the Final recall gate without
qualifying it. Re-entering Final recall starts a fresh ordered qualification
session.

### Back and Skip

Back returns to the preceding Learning Step or plan stage in the mounted
journey. Ordinary previously visited introduction and Combined stages retain
their in-memory snapshots where practical. Back is disabled on the earliest
Learning screen. Existing Exit behavior remains available.

Skip is a Next action, not a large jump. It advances to exactly the next Step
or plan stage that would have followed successful completion of the current
one:

* Skip Review -> Locate or Practice.
* Skip Locate -> Country Practice.
* Skip Set Practice -> the next Set or Combined practice.
* Skip Combined practice -> the next Set or Final recall.
* Skip final full-scope Combined practice -> Final recall.

Skip must never:

* mark the skipped scope Ready;
* fabricate scheduler progress;
* write a Country or Capital Learning milestone; or
* write Drill evidence or Practice progress.

Skipping an earlier Step or scope does not block later stages from qualifying.
The learner must still successfully complete Final recall before Learned is
written. Final recall has no Skip action.

### Interruption and restart

Intermediate Learning journey state is not persisted. Do not persist:

* the current Set;
* completed or Ready Sets;
* Combined practice completion;
* scheduler round state;
* the current Learning Step;
* gate position; or
* Final recall state.

The persisted New items per set preference is the only new durable state. If
Learning is unmounted or interrupted before successful Final recall, the next
session starts from the beginning using the current setting.

The existing whole-Subregion countriesLearnedAt and capitalsLearnedAt behavior
remains the durable Learning state.

## Scope

* Add persisted New items per set with 3, 4, 5, and All; default 3.
* Partition effective ordered Subregion membership with the agreed capped
  balancing algorithm.
* Apply the same snapshotted maximum independently to each Subregion in a
  multi-Subregion run.
* Scope Country and Capital instructional presentation to the active Set.
* Use fresh shared scheduler scopes for Country location, Country Practice,
  Capital Practice, and every Combined practice.
* Disable scheduler speed qualification only through World Countries caller
  configuration.
* Add cumulative Combined practice at the defined progression points,
  including required full-scope consolidation after the final Set when there
  is more than one Set.
* Add explicit Ready actions and stage-local Continue behavior.
* Make Final recall ordered for both Countries and Capitals.
* Add Back and one-step-at-a-time Skip navigation without journey persistence.
* Remove the configurable World Countries location clean-target parameter;
  location readiness is scheduler-based.
* Standardize the user-facing Learning vocabulary.
* Keep durable Learning completion per Subregion and Learning mode unchanged.
* Update current-state World Countries architecture after implementation.

No Learning-journey persistence migration or resume record is expected.
Existing persisted settings with the removed location-target field are ignored;
the canonical settings shape is written on subsequent settings saves.

## Architecture constraints

Follow [ADR 0024](../adr/0024-world-countries-learning-practice-boundary.md),
[ADR 0019](../adr/0019-world-countries-recall-mastery-core-completion-progress.md),
the current [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md),
and [Core architecture](../architecture/CORE.md).

Change-specific constraints:

* learning/flows/ owns Learning orchestration, Set planning, scheduler scopes,
  temporary Ready state, navigation, and milestone trigger placement.
* geography/ remains the owner of effective Country order and membership.
* core/scoring/roundScheduler.ts remains the shared scheduling owner.
* Do not change global scheduler constants or PAO/Major behavior.
* Scheduler state is ephemeral and feature-local. It must not be written to
  the World Countries learning store, generic attempt store, Drill evidence,
  or localStorage.
* The persisted batch-size preference belongs to application Settings, not to
  Learning journey state.
* The scheduler's internal level naming is implementation detail; UI exposes
  Ready, not mastered.
* Existing Country ordered recall remains the Country Final recall owner.
* Capital Final recall must use ordered Country-to-Capital qualification and
  must not use the former shuffled clean-round qualification.
* Learning may reuse purpose-neutral mechanics but must not import Drill
  internals.
* Practice/Drill semantics and evidence remain unchanged.
* markSubregionCountriesLearned and markSubregionCapitalsLearned remain
  reachable only from successful whole-scope Final recall.
* Do not add a resumable Learning-journey schema or compatibility wrapper.
* Internal state-machine names such as phase may remain when accurate; avoid
  broad mechanical renaming unrelated to behavior or user-facing vocabulary.

## Existing capabilities to reuse

* src/core/scoring/roundScheduler.ts for all temporary scheduler scopes.
* src/core/scoring/scoring.ts for unchanged scheduler constants.
* src/features/world-countries/learning/flows/CountryLearningFlow.tsx for
  Country orchestration and milestone ownership.
* src/features/world-countries/learning/stagedCountryLearningFlow.ts and
  stagedLearningPlan.ts for pure Country transitions and plan construction.
* src/features/world-countries/learning/flows/CapitalLearningFlow.tsx for
  Capital orchestration and completion reporting.
* src/features/world-countries/learning/stagedCapitalLearningFlow.ts for
  Capital walkthrough and recall mechanics.
* src/features/world-countries/learning/schedulerLearningSession.ts for the
  feature-local adapter around the shared scheduler.
* src/features/world-countries/learning/orderedRecallSession.ts for ordered
  Country and Capital Final recall.
* src/features/world-countries/learning/capitalLearningCompletion.ts for the
  one-time Capital milestone reporting seam.
* src/features/world-countries/learning/subregionLearningStore.ts for the
  unchanged durable whole-Subregion milestone store.
* src/features/world-countries/learning/flows/GuidedLearningRails.tsx for
  stable Learning context and navigation controls.

The obsolete fixed-target location session may be removed or replaced once no
Learning consumer depends on it.

## Edge cases

* Empty active membership preserves existing unavailable behavior.
* One active item creates one scheduler key and must not deadlock.
* A scope smaller than the selected maximum creates one Set.
* All creates one Set and still requires explicit Final recall.
* Numeric batching never exceeds the selected maximum and never creates a
  one-item tail when multiple Sets are required.
* A wrong answer after an item becomes Ready may regress it; Ready is always
  derived from current scheduler state.
* A correct but too-soon answer does not advance the scheduler.
* A slow but correct unhinted answer may advance.
* A skipped earlier Step remains unqualified, but a later qualifying Step may
  still make the current Set or Combined scope Ready.
* Skipped items remain included in later cumulative Combined practice with
  fresh zero-progress scheduler state.
* Skipped final consolidation leads to Final recall without Ready wording.
* Back into ordinary previously visited stages may show retained ephemeral
  state; Back from Final recall re-enters a fresh final qualification.
* A Country or Capital order edit made before a new journey affects new
  partitioning through the existing effective-order seam.
* Active membership changes between sessions continue to use existing
  membership/fingerprint behavior.

## Out of scope

* Persisting or resuming intermediate Learning journey or scheduler state.
* New durable per-Set or per-item Learning facts.
* Changing the shared scheduler algorithm, constants, PAO behavior, Major
  behavior, or global speed policy.
* Changing Drill evidence, Drill proficiency, Maintenance, or Recite.
* Changing effective geography order or Country membership behavior.
* Arbitrary numeric batch-size input; only 3, 4, 5, and All are exposed.
* Redesigning the World Countries map, rails, or generic PageLayout.
* Broad internal renaming unrelated to Learning presentation.

## Acceptance criteria

* [x] Settings exposes persisted New items per set with 3, 4, 5, and All; the
  default is 3.
* [x] The setting is snapshotted for a mounted multi-Subregion run and applies
  consistently to each Subregion.
* [x] Numeric batching follows the exact capped balancing algorithm and
  preserves effective item order.
* [x] Representative batching includes 4 @ 3 -> 2+2, 7 @ 3 -> 3+2+2,
  6 @ 4 -> 4+2, and 11 @ 5 -> 5+3+3.
* [x] All creates one Set and does not treat Set readiness as Learned.
* [x] Country instructional presentation is scoped to the active Set.
* [x] Country location uses a fresh shared scheduler scope with map answers.
* [x] Country Practice uses a separate fresh scheduler scope with typed
  Country-name answers.
* [x] Capital Practice uses a fresh shared scheduler scope with typed
  Country-to-Capital answers.
* [x] Combined Country practice uses typed Country-name recall only.
* [x] Combined Capital practice uses typed Country-to-Capital recall.
* [x] All World Countries scheduler scopes accept slow correct unhinted answers
  when sufficiently spaced, while actual latency is still recorded.
* [x] Correct too-soon answers do not advance Ready state.
* [x] Wrong answers preserve shared scheduler regression and spacing behavior.
* [x] Location Ready requires explicit Continue and does not itself make the
  whole Country Set Ready.
* [x] A later qualifying Practice scope may make a Set Ready after an earlier
  Step was skipped.
* [x] Every Set and Combined scheduler scope starts fresh.
* [x] Combined practice contains every item introduced so far.
* [x] For multiple Sets, full-scope Combined practice is required after the
  final Set before the normal Final recall gate.
* [x] A one-Set journey goes directly from Set Ready to the Final recall gate.
* [x] Progression actions do not auto-advance.
* [x] Final recall is ordered for both Country names and Capitals in effective
  Country order.
* [x] Final recall cannot be skipped; only successful Final recall writes the
  owned durable Learning milestone.
* [x] Back from active Final recall returns to its gate, and re-entry starts a
  fresh Final recall session.
* [x] Skip advances only to the next planned Step or scope and never fabricates
  Ready, milestone writes, Drill evidence, or Practice progress.
* [x] After skipped final consolidation, the gate does not claim Ready and
  offers only Final recall and Back.
* [x] The old configurable location-target setting and its UI are removed.
* [x] Intermediate Set, scheduler, navigation, and Final recall state is lost
  after unmount/interruption.
* [x] User-facing headings use Learn, Set, Step, Practice, Combined practice,
  Ready, Final recall, and Learned without exposing mastered, Phase, or
  shuffled round as progression terms.
* [x] Existing Subregion Learning persistence schema remains unchanged except
  for the new Settings preference; no journey-resume migration is introduced.
* [x] Existing PAO/Major scheduler behavior and global scoring constants remain
  unchanged.
* [x] World Countries tests cover batching, progression, fresh scheduler
  scopes, location scheduling, latency independence, Back/Skip, interruption
  reset, terminology, and final-only milestone writes.
* [x] npx vitest run src/features/world-countries src/core/scoring/roundScheduler.test.ts,
  npx tsc -b, and npx vite build pass.
* [x] docs/architecture/features/WORLD_COUNTRIES.md documents the implemented
  staged Learning journey and its final-recall completion boundary.

Verification evidence: `npx.cmd vitest run --no-cache` (88 files, 400 tests),
`npx.cmd tsc -b`, and `npx.cmd vite build` pass on 2026-08-13. The build emits
only the existing large-chunk warning.

## Source anchors

* src/features/world-countries/learning/flows/CountryLearningFlow.tsx
* src/features/world-countries/learning/stagedCountryLearningFlow.ts
* src/features/world-countries/learning/flows/CapitalLearningFlow.tsx
* src/features/world-countries/learning/stagedCapitalLearningFlow.ts
* src/features/world-countries/learning/stagedLearningPlan.ts
* src/features/world-countries/learning/schedulerLearningSession.ts
* src/features/world-countries/learning/flows/GuidedLearningRails.tsx
* src/features/world-countries/learning/orderedRecallSession.ts
* src/features/world-countries/learning/subregionLearningStore.ts
* src/core/scoring/roundScheduler.ts
* src/app/settings/settings.ts
* src/app/settings/SettingsOverlay.tsx

## Documentation impact

On implementation, update
docs/architecture/features/WORLD_COUNTRIES.md so current state explicitly
documents:

* persisted maximum Set sizing and deterministic partitioning;
* the common Country/Capital Learning vocabulary;
* scheduler-backed map location and temporary Practice readiness;
* World Countries Learning's non-limiting latency configuration;
* cumulative Combined practice with fresh scheduler state;
* Back/Skip and non-persisted intermediate journey state;
* ordered Final recall for both Learning modes; and
* the invariant that only successful Final recall writes the owned durable
  Learning milestone.

No ADR is required for this change because it applies the existing Learning
ownership boundary and shared-scoring reuse rules. Do not rewrite historical
ADRs or implemented Change Specs.

## Verification

Complete this section when setting the status to Implemented.

* Implemented and verified on YYYY-MM-DD.
* Evidence: tests, build, or a concise manual verification record.
