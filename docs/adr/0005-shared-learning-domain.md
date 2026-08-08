# ADR 0005 — Shared learning model for reusable scoring, mastery, scheduling, and study workflows

* **Status:** Proposed
* **Date:** 2026-08-08
* **Builds on:** existing `core/scoring`, Pi learning workflows, and World Countries feature
* **Goal:** allow Pi, Countries/Capitals, Major System, cards, and future memorization domains to reuse learning mechanics without forcing them into the same domain model

## Context

The application now contains multiple memorization domains with similar learning mechanics but different content structures.

Pi currently has mature functionality for:

* per-answer attempts;
* timing and accuracy;
* weak-item statistics;
* whole-segment evaluation;
* session/run statistics;
* memorization progress;
* mastery-like segment status;
* maintenance scheduling;
* question selection;
* spaced repetition.

The World Countries feature has a different and richer content hierarchy:

```text
World
  Continent
    Subregion
      Country
        capital
```

For example:

```text
Europe
  Northern Europe
    Norway
      capital: Oslo
```

There is an intuitive similarity between learning Pi and learning countries/capitals because both involve learning atomic facts inside larger groups.

However, the geography model must **not** be forced into Pi's structural model.

In particular, do **not** model:

```text
Country  ≈ Pi pair
Capital  ≈ Pi digit
```

This is the wrong abstraction.

A capital is not an independently learned child item underneath a country.

Instead:

```text
Norway ↔ Oslo
```

is one domain fact or relationship.

That relationship can generate different recall directions:

```text
Norway → Oslo
Oslo → Norway
```

These are the independently scored learning items.

Similarly, Pi pair position 42 is a domain fact that can generate a recall item such as:

```text
pair position 42 → expected pair
```

The commonality therefore exists in the **learning layer**, not in the domain hierarchy.

---

# Decision

Separate the application into three conceptual layers:

```text
┌───────────────────────────────────────────────┐
│                FEATURE DOMAIN                 │
│                                               │
│ Pi                            Geography       │
│ PiPair                        Country         │
│ PiSegment                     Capital         │
│                               Subregion       │
│                               Continent       │
│                               World           │
└──────────────────────┬────────────────────────┘
                       │ adapters expose
                       ▼
┌───────────────────────────────────────────────┐
│               LEARNING DOMAIN                 │
│                                               │
│ RecallItem                                    │
│ LearningScope                                 │
│ Attempt                                       │
│ ItemProgress                                  │
│ ScopeProgress                                 │
│ LearningRun                                   │
│ MasteryPolicy                                 │
│ Scheduler                                     │
│ Maintenance                                   │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│            PERSISTENCE / SCORING              │
│                                               │
│ IndexedDB attempts                            │
│ localStorage metadata                         │
│ timing/scoring algorithms                     │
│ SM-2                                          │
└───────────────────────────────────────────────┘
```

Feature domains remain explicit.

Generic learning code must not know what a country, capital, Pi pair, continent, or subregion is.

---

# Core principle

The reusable abstraction is:

> A user recalls atomic items inside selectable learning scopes. Attempts provide evidence about those items. Item evidence produces mastery/progress. Scopes aggregate progress from their items. A scheduler chooses which item should be recalled next.

The common concepts are therefore:

```text
RecallItem
LearningScope
Attempt
Progress
Mastery
Scheduler
Maintenance
```

not:

```text
Country = PiPair
Capital = PiDigit
```

---

# Correct conceptual mapping

The useful comparison between Pi and Geography is:

```text
Pi domain                         Geography domain

Pi pair position                 Country–Capital relationship
pair #42 = "37"                  Norway ↔ Oslo

Recall item                      Recall item
recall pair #42                  Norway → Oslo
                                 Oslo → Norway

Pi segment                       Learning scope
10 Pi pairs                      Northern Europe country/capital items

Pi range / full Pi               Larger learning scope
many Pi segments                 Europe / World
```

The important distinction is that a learning scope does not have to correspond one-to-one with a domain entity.

A scope is simply a set of recall items selected for learning or reporting.

---

# 1. Distinguish domain facts from recall items

A domain object is not necessarily the thing that receives scoring.

For geography:

```ts
interface Country {
  id: string
  country: string
  capital: string
  continent: ContinentId
  subregion: SubregionId
}
```

Example domain fact:

```text
Norway ↔ Oslo
```

This remains one geography record.

It can produce two independently scored recall items:

```text
Norway → Oslo
Oslo → Norway
```

These may have different learning histories.

For example, a user may quickly recall:

```text
Norway → Oslo
```

but struggle with:

```text
Oslo → Norway
```

Therefore attempts must target a `RecallItem`, not `Country` or `Capital` directly.

Suggested IDs:

```text
geo:capital:NO:country-to-capital
geo:capital:NO:capital-to-country
```

For Pi:

```text
pi:pair:42
```

may represent recalling the pair at Pi pair position 42.

---

# 2. Introduce `RecallItem`

A recall item is the smallest independently scored unit.

Suggested contract:

```ts
export type RecallItemId = string

export interface RecallItem {
  id: RecallItemId
}
```

The learning engine does not need to know the prompt or expected answer.

Feature code owns that.

For example, Geography may expose:

```ts
{
  id: 'geo:capital:NO:country-to-capital'
}
```

while Geography knows:

```text
prompt = Norway
answer = Oslo
```

Pi may expose:

```ts
{
  id: 'pi:pair:42'
}
```

while Pi knows:

```text
prompt = pair position 42
answer = corresponding two digits
```

---

# 3. Attempts become domain-neutral evidence

The generic attempt shape is:

```ts
interface Attempt {
  at: number
  ok: boolean
  ms: number
}
```

The generic API should operate on `RecallItemId`:

```ts
recordAttempt(itemId, attempt)

getAttempts(itemId)

getAllAttempts()
```

The learning API must not require:

```ts
Direction
num
```

Those are Major System domain concepts.

Existing APIs may remain as compatibility wrappers during migration.

For example:

```ts
addAttempt(dir, num, attempt)
```

may internally translate the existing domain identity into a generic recall-item key.

No immediate storage migration is required simply to introduce the abstraction.

---

# 4. Introduce `LearningScope`

A learning scope is a selectable or reportable set of recall items.

Suggested contract:

```ts
export type LearningScopeId = string

export interface LearningScope {
  id: LearningScopeId
  itemIds: readonly RecallItemId[]
}
```

Examples:

```text
pi:segment:4

geo:subregion:northern-europe

geo:continent:europe

geo:world
```

A scope does not contain copies of item scores.

It references the recall items whose progress it aggregates.

---

# 5. Do not replace feature hierarchies with a generic tree

Do **not** introduce a generic recursive application domain such as:

```ts
interface LearningNode {
  children: LearningNode[]
}
```

and then attempt to model everything through it.

Geography should explicitly remain:

```text
World
  Continent
    Subregion
      Country
        capital
```

Pi should explicitly remain:

```text
Pi
  PiSegment
    PiPair
```

These are different domains.

Feature adapters derive learning scopes from those domains.

Example Geography helpers:

```ts
getWorldScope(direction)

getContinentScope(
  continentId,
  direction,
)

getSubregionScope(
  subregionId,
  direction,
)
```

Example Pi helpers:

```ts
getPiSegmentScope(segmentIndex)

getPiRangeScope(
  startSegment,
  endSegment,
)
```

This keeps domain meaning inside each feature.

---

# 6. Country and Capital are not separate learning hierarchy levels

This is an explicit architectural rule.

Do not represent geography learning as:

```text
World
  Continent
    Subregion
      Country
        Capital
```

where both Country and Capital are independently scored hierarchy levels.

The domain data may naturally contain:

```ts
{
  country: 'Norway',
  capital: 'Oslo'
}
```

but the learning unit is the recall relationship.

Correct:

```text
Geography domain:

Norway
  capital = Oslo
```

then:

```text
Learning model:

Norway → Oslo
Oslo → Norway
```

Incorrect:

```text
Country item
  └── Capital item
```

There is no "Capital mastery" underneath "Country mastery".

There is recall mastery for each configured direction.

---

# 7. Persist atomic evidence; derive hierarchical progress

Normal question attempts should be stored against atomic recall items.

Example:

```text
geo:capital:NO:country-to-capital
  ✓
  ✗
  ✓
  ✓
```

Norway happens to belong to:

```text
Northern Europe
Europe
World
```

but answering Norway → Oslo should **not** create:

```text
Norway attempt
Northern Europe attempt
Europe attempt
World attempt
```

That would duplicate truth.

Instead:

```text
atomic attempt history
        ↓
item progress
        ↓
subregion progress
        ↓
continent progress
        ↓
world progress
```

Higher-level progress is derived from the recall items included in each scope.

---

# 8. Introduce `ItemProgress`

Attempts are historical evidence.

Most application logic should consume derived progress.

Suggested shape:

```ts
export interface ItemProgress {
  itemId: RecallItemId

  attempts: number
  correct: number
  wrong: number

  recentCorrect: number
  consecutiveCorrect: number

  lastAttemptAt: number | null
  medianMs: number | null

  mastered: boolean
}
```

Exact fields may be adjusted based on existing scoring functions.

Avoid persisting fields that can cheaply and reliably be derived unless they are required for scheduling or performance.

---

# 9. Mastery is policy

Mastery belongs in the shared learning layer.

It must not be embedded independently in:

```text
Country
PiPair
PiSegment
Subregion
```

Suggested abstraction:

```ts
interface MasteryPolicy {
  isMastered(progress: ItemProgress): boolean
}
```

An initial rule may remain simple:

```text
two qualifying successful recalls → mastered
```

but the implementation should allow future refinement based on:

* errors;
* recall spacing;
* age of evidence;
* latency;
* maintenance performance;
* recent successful recalls.

Feature code should not duplicate mastery formulas.

---

# 10. Scope progress is derived aggregation

Suggested shape:

```ts
export interface ScopeProgress {
  scopeId: LearningScopeId

  totalItems: number
  seenItems: number
  masteredItems: number

  masteryRatio: number
  mastered: boolean
}
```

Example:

```text
Northern Europe

8 required recall items
7 mastered

87.5% mastery
```

A simple initial mastery rule for a complete scope may be:

```ts
scope.mastered =
  scope.totalItems > 0 &&
  scope.masteredItems === scope.totalItems
```

The same aggregation logic can support:

```text
Pi segment
Northern Europe
Europe
World
```

even though these have unrelated domain structures.

---

# 11. Directional mastery must remain independent

A Country–Capital domain relationship can generate multiple recall items.

Example:

```text
Norway ↔ Oslo
```

produces:

```text
geo:capital:NO:country-to-capital

geo:capital:NO:capital-to-country
```

Their attempt histories must remain independent.

A user may therefore have:

```text
Norway → Oslo
mastered

Oslo → Norway
learning
```

A learning scope chooses which direction or directions it contains.

For example, Country → Capital mode may create Northern Europe from:

```text
NO country-to-capital
SE country-to-capital
DK country-to-capital
...
```

A future bidirectional mastery scope may contain both directions.

Do not silently merge opposite-direction attempts.

---

# 12. Generic question scheduling

The scheduler should operate on recall items.

Conceptually:

```ts
selectNextItem({
  candidates,
  progress,
  recentHistory,
  now,
})
```

The scheduler's goals are:

1. keep exposure reasonably balanced across the selected scope;
2. prioritize items that still need mastery evidence;
3. avoid excessive immediate repetition;
4. prevent a scope from becoming stuck because one unfinished item is rarely selected;
5. give weaker items more exposure without repeatedly hammering the same item.

The scheduler returns a `RecallItemId`.

Feature code converts that ID into the actual question.

Therefore the scheduler can operate on:

```text
pi:pair:41
pi:pair:42
pi:pair:43
```

or:

```text
geo:capital:NO:country-to-capital
geo:capital:SE:country-to-capital
geo:capital:DK:country-to-capital
```

without knowing which domain it is processing.

---

# 13. Separate scheduling from mastery

These are separate questions:

```text
Is this item mastered?
```

and:

```text
How likely should this item be selected next?
```

Do not combine them into one algorithm.

Suggested modules:

```text
mastery.ts
scheduler.ts
```

Mastery determines learning state.

Scheduling may consider:

* mastery state;
* total exposures;
* recent question history;
* time since last exposure;
* weak-item weighting;
* anti-repeat constraints;
* unfinished-item weighting.

This allows scheduler behavior to evolve independently from mastery semantics.

---

# 14. Learning runs are separate from attempts

One quiz execution produces many atomic attempts.

It may also produce one run summary.

Suggested generic concept:

```ts
export interface LearningRun {
  at: number
  scopeId: LearningScopeId

  itemCount: number
  correctCount: number

  durationMs: number
  accuracy: number
}
```

Feature-specific metadata remains feature-specific.

Pi:

```ts
interface PiRunMeta {
  anchor: number
  reach: number
}
```

Geography:

```ts
interface GeographyRunMeta {
  direction:
    | 'country-to-capital'
    | 'capital-to-country'

  continentId?: string
  subregionId?: string
}
```

Do not put Pi concepts such as `anchor` or `reach` into the generic run abstraction.

---

# 15. Whole-scope attempts are different from atomic attempts

Pi currently has useful whole-segment evidence where one try represents successfully reciting every pair in a complete Pi segment.

That concept is distinct from item mastery.

There are two meaningful measurements:

```text
Atomic mastery:
"How well do I know each recall item?"

Whole-scope performance:
"Can I successfully complete this entire scope in one run?"
```

A future generic abstraction may support:

```ts
interface ScopeAttempt {
  scopeId: LearningScopeId
  at: number
  ok: boolean
}
```

but only workflows that genuinely test the complete scope should create these.

A single answer:

```text
Norway → Oslo
```

must not generate:

```text
Northern Europe scope attempt
Europe scope attempt
World scope attempt
```

Pi may retain existing `piseg:` semantics during migration.

---

# 16. Study / Memo state is independent from mastery

"Has been studied" and "currently demonstrates mastery" are different facts.

The generic model should preserve this distinction.

Suggested concept:

```ts
export interface StudyState {
  scopeId: LearningScopeId
  studyCompletedAt: number | null
}
```

Example:

```text
Northern Europe

Study completed: yes
Mastered items: 6 / 8
Current state: practising
```

This supports a shared broad lifecycle:

```text
Study / Memo
      ↓
Recall / Practice
      ↓
Master
      ↓
Maintain
```

while letting each feature provide completely different study content.

Pi may display:

```text
digits
Major System words
story
```

Countries may display:

```text
country
capital
map
mnemonic
```

The workflow can be similar without forcing the content models to be similar.

---

# 17. Do not generalize Pi stories yet

Pi's:

* story text;
* story images;
* word highlighting;
* mistake-story review;

should remain Pi-specific.

If Countries later develops a real mnemonic-story workflow, introduce a reusable mnemonic-content abstraction based on those two actual use cases.

Do not move `piStories` into `core` as part of this ADR.

---

# 18. Maintenance should use learning identities

SM-2 and due scheduling should eventually work with:

```text
RecallItemId
```

and/or:

```text
LearningScopeId
```

rather than Pi segment numbers.

The reusable mechanism is:

```text
learning identity
current schedule
review result
        ↓
SM-2 / scheduling policy
        ↓
next due date
```

The feature decides what is maintained.

Examples:

```text
Pi:
whole segment

Countries:
individual Country → Capital recall items
or possibly a complete Subregion workflow
```

The generic maintenance system must therefore not assume:

```text
maintenance item = Pi segment
```

---

# Proposed package structure

Do not begin with a large repository-wide move.

Introduce the learning API first.

Target conceptual structure:

```text
src/core/
  learning/
    types.ts
    attempts.ts
    itemProgress.ts
    mastery.ts
    scopeProgress.ts
    scheduler.ts
    studyState.ts
    sessions.ts

  scoring/
    scoring.ts
    sm2.ts
    typingSpeed.ts
    timing helpers
    other pure algorithms
```

Existing persistence such as:

```text
core/scoring/attemptStore.ts
core/scoring/itemStore.ts
```

may stay physically where they are initially.

For example:

```text
core/learning/attempts.ts
```

may first become a domain-neutral facade around the existing attempt store.

Prefer incremental extraction over broad renaming and moving.

---

# Feature adapters

## Pi

Pi remains responsible for:

```text
PI_PAIRS
pair positions
10-pair segments
segment coordinate math
full-recitation reach
from-start records
stories
anchor mode
Pi-specific UI
```

Pi may expose:

```ts
function piPairItemId(
  position: number,
): RecallItemId {
  return `pi:pair:${position}`
}
```

and:

```ts
function getPiSegmentScope(
  segment: number,
): LearningScope {
  return {
    id: `pi:segment:${segment}`,
    itemIds: ...
  }
}
```

Pi's domain structure remains Pi-specific.

---

## World Countries

Geography remains responsible for:

```text
World
Continent
Subregion
Country
Capital property
aliases
answer matching
question direction
maps
geographic filters
```

Example domain record:

```ts
{
  id: 'NO',
  country: 'Norway',
  capital: 'Oslo',
  continent: 'Europe',
  subregion: 'Northern Europe',
}
```

It adapts this into learning items.

Example:

```ts
function countryToCapitalItemId(
  countryId: string,
): RecallItemId {
  return `geo:capital:${countryId}:country-to-capital`
}
```

and:

```ts
function capitalToCountryItemId(
  countryId: string,
): RecallItemId {
  return `geo:capital:${countryId}:capital-to-country`
}
```

Scopes are derived from geography:

```ts
getWorldScope(direction)

getContinentScope(
  continentId,
  direction,
)

getSubregionScope(
  subregionId,
  direction,
)
```

The geography dataset remains the source of truth.

---

# Example

Dataset:

```text
Europe
  Northern Europe
    Norway
      capital: Oslo

    Sweden
      capital: Stockholm

    Denmark
      capital: Copenhagen
```

Country → Capital mode creates three recall items:

```text
geo:capital:NO:country-to-capital

geo:capital:SE:country-to-capital

geo:capital:DK:country-to-capital
```

The user answers:

```text
Norway → Oslo          ✓
Sweden → Stockholm     ✓
Denmark → Copenhagen   ✗
```

Three atomic attempts are recorded.

The learning layer derives:

```text
Norway → Oslo
mastered

Sweden → Stockholm
mastered

Denmark → Copenhagen
learning
```

Then the Northern Europe scope derives:

```text
2 / 3 mastered
66.7%
```

Europe aggregates all required European recall items.

World aggregates all required world recall items.

No duplicate Europe or World attempts are necessary.

If the user later switches direction:

```text
Oslo → Norway
Stockholm → Sweden
Copenhagen → Denmark
```

these use separate recall IDs and separate progress histories.

---

# Migration strategy

The refactor must be incremental.

Do **not** rewrite Pi and Countries simultaneously.

## Phase 1 — Introduce learning identities and generic attempt API

Create:

```text
RecallItemId
LearningScopeId
LearningScope
```

Add generic attempt APIs accepting `RecallItemId`.

Keep existing APIs operational through wrappers.

Requirements:

* no user-visible behavior change;
* no Pi data loss;
* no broad storage migration.

---

## Phase 2 — Extract progress and mastery

Introduce:

```text
ItemProgress
MasteryPolicy
ScopeProgress
```

Add focused unit tests.

Where practical, validate the new calculations using existing attempt data.

Do not broadly rewrite Pi UI during this phase.

---

## Phase 3 — Extract generic scheduler

Expose next-item selection through a domain-neutral API.

Input:

```text
RecallItemId[]
progress
recent history
```

Add tests/simulations for:

* 10 items;
* 20 items;
* 50 items;
* all answers correct;
* mixed weak/mastered items;
* anti-repeat behavior;
* unfinished-straggler behavior.

When all items perform equally, exposure should remain reasonably flat.

---

## Phase 4 — Integrate Countries first

Countries becomes the second real consumer.

Add:

* persistent Country/Capital attempts;
* stable recall IDs;
* scope generation;
* shared mastery;
* shared scheduler;
* derived progress.

Expose progress at:

```text
Country–Capital recall item
Subregion
Continent
World
```

Do not create separate persisted scores for each geographic hierarchy level.

---

## Phase 5 — Reuse Study / Memo lifecycle

After persistent Country scoring works, extract only the workflow concepts that have two real consumers.

Common lifecycle:

```text
Study
Recall
Practice
Master
Maintain
```

Keep study presentation feature-specific.

Possible shared state:

```text
studyCompletedAt
```

Do not attempt to unify Pi stories and Geography presentation.

---

## Phase 6 — Migrate Pi incrementally

Once the shared model is proven by Countries, migrate Pi where doing so actually reduces duplication.

Candidates:

* pair attempt identity;
* item progress;
* mastery;
* scheduler;
* scope aggregation;
* generic run fields;
* maintenance primitives.

Keep Pi-specific behavior:

* whole-segment `piseg:` evidence;
* flawless compatibility logic;
* fixed 10-pair segmentation;
* from-start record;
* `reach`;
* anchor pacing;
* Pi stories.

Existing persisted data must remain readable.

Prefer adapters and compatibility readers over destructive migration.

---

# Persistence rules

## Atomic attempts

A shared attempt store may contain namespaces such as:

```text
pi:pair:42

geo:capital:NO:country-to-capital

geo:capital:NO:capital-to-country

major:number:42:encode
```

Keys must be stable.

Changing a display label must not change persisted identity.

For Geography, prefer stable IDs such as country codes rather than display names.

---

## Derived data

Prefer deriving:

```text
correct count
wrong count
mastered state
mastered item count
subregion progress
continent progress
world progress
```

from underlying evidence.

Persist only what is required for:

* scheduling;
* explicit Study/Memo milestones;
* historical runs;
* maintenance;
* backwards compatibility.

Avoid multiple persisted sources of truth.

---

# Naming rules

Use the following terminology consistently.

## `Attempt`

One answer to one recall item.

Example:

```text
Norway → Oslo ✓
```

## `RecallItem`

One independently scored recall direction.

Examples:

```text
Norway → Oslo

Oslo → Norway

Pi pair #42
```

## `LearningScope`

A set of recall items used for selection or aggregation.

Examples:

```text
Northern Europe

Europe

World

Pi segment 4
```

## `ScopeAttempt`

Optional evidence that an entire scope was successfully completed as one unit.

Example:

```text
complete Pi segment recited flawlessly
```

## `LearningRun`

One quiz/practice execution containing multiple attempts.

## `ItemProgress`

Derived learning state for one `RecallItem`.

## `ScopeProgress`

Derived aggregate progress for a `LearningScope`.

## `StudyState`

Explicit workflow state such as completion of a Study/Memo step.

These terms should replace ambiguous new usages of:

```text
item
try
attempt
session
segment mastery
```

when shared APIs are introduced.

---

# Non-goals

This ADR does **not** require:

* making Country equivalent to PiPair;
* making Capital equivalent to PiDigit;
* adding Capital as a scored hierarchy level below Country;
* converting all features in one change;
* replacing Geography with a generic tree;
* replacing Pi's segment model;
* deleting existing `piseg:` data;
* migrating every storage key;
* making Pi and Countries use identical UI;
* generalizing Pi stories;
* adding backend synchronization;
* finalizing the perfect mastery algorithm before establishing the architecture.

---

# Architectural constraints

1. `core/learning` must not import from `features/pi`.

2. `core/learning` must not import from `features/world-countries`.

3. Feature domains may import from `core/learning`.

4. Feature adapters translate domain records into recall IDs and scopes.

5. `Country` and `Capital` remain geography concepts, not generic learning hierarchy nodes.

6. A Country–Capital relationship may produce one or more `RecallItem`s.

7. Opposite recall directions have independent attempt histories.

8. A `LearningScope` contains recall-item identities, not feature objects.

9. Higher-level Geography progress is derived from included recall items.

10. Existing Pi persistence must remain readable.

11. Avoid broad file moves until shared APIs are proven.

12. Add tests around pure learning logic before major UI changes.

---

# Expected dependency direction

Correct:

```text
features/pi
      │
      ▼
core/learning
      │
      ▼
core/scoring / storage
```

and:

```text
features/world-countries
      │
      ▼
core/learning
      │
      ▼
core/scoring / storage
```

Incorrect:

```text
core/learning
      │
      ▼
features/pi
```

Incorrect:

```text
world-countries
      │
      ▼
pi/shared/piStats
```

Incorrect:

```text
Geography hierarchy
      │
      ▼
Country
      │
      ▼
Capital
      │
      ▼
generic learning hierarchy
```

Reuse happens through shared learning abstractions, not through Pi internals or structural imitation.

---

# Acceptance criteria

The architecture is successful when:

1. A Country → Capital answer can record a persistent attempt through the shared domain-neutral learning API.

2. `Norway → Oslo` and `Oslo → Norway` maintain independent histories and mastery.

3. `Capital` is not introduced as a separate scored child level underneath `Country`.

4. Northern Europe progress is derived from its configured recall items.

5. Europe progress is derived from European recall items.

6. World progress is derived from all configured world recall items.

7. No separate persisted World/Continent/Subregion score is required for normal question attempts.

8. A Pi segment can be represented as a `LearningScope` without changing Pi's domain representation.

9. Generic scheduling operates on both Pi recall IDs and Geography recall IDs without feature checks.

10. Existing Pi data and behavior continue to work during migration.

11. `core/learning` contains no Pi or Geography concepts.

12. Tests cover item mastery, scope aggregation, directional independence, and scheduler fairness independently of React.

13. Future features such as cards or Major System words can expose recall items and scopes without introducing another independent scoring architecture.

---

# Implementation guidance for Codex

Treat this ADR as an architectural direction, not permission for a large speculative rewrite.

Before editing:

1. inspect existing `core/scoring`;
2. inspect Pi's attempt/session/progress/maintenance flows;
3. inspect the World Countries dataset and quiz;
4. identify the smallest contracts required for the next migration phase.

Implement incrementally.

Prefer:

```text
shared contract
      ↓
compatibility adapter
      ↓
unit tests
      ↓
Countries as second consumer
      ↓
selective Pi migration
```

over:

```text
genericize Pi
      ↓
force Geography into Pi's shape
      ↓
rewrite everything
```

When Pi and Geography differ structurally, preserve those differences.

The target is **not**:

```text
Country = PiPair
Capital = PiDigit
```

The target is:

```text
PiPair recall
        \
         → RecallItem → shared learning mechanics

Country ↔ Capital
        /
```

and:

```text
PiSegment
      \
       → LearningScope → shared aggregation/scheduling

Subregion / Continent / World
      /
```

The goal is to make the **learning mechanics reusable while keeping each feature's domain model correct**.
