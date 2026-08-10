# ADR 0016 — Subregion Memo capital-learning workflow

> **Archived legacy change record.** This workflow specification is retained at
> its original path for history and stable links. It is not an architectural or
> delivery authority. Use current
> [World Countries](../architecture/features/WORLD_COUNTRIES.md) and
> [persistence](../architecture/PERSISTENCE.md) architecture, source, tests, and
> any named Change Spec. See the
> [classification ledger](LEGACY_CLASSIFICATION.md).

* **Status:** Accepted
* **Date:** 2026-08-10
* **Builds on:** ADR 0009 — Subregion Memo country-learning workflow
* **Builds on:** ADR 0011 — World Countries capability ownership correction
* **Feature:** `src/features/world-countries/`
* **Goal:** introduce Country–Capital learning in Subregion Memo as a distinct initial-learning workflow, while preserving clear ownership between canonical geography, mnemonic content, Memo completion state, and future per-item learning performance.

---

## Context

ADR 0009 established Subregion Memo as the initial-learning workflow for World Countries.

The implemented Country-learning path is conceptually:

```text
Subregion
    ↓
learn Countries
    ↓
learn their locations
    ↓
complete ordered Country recall
    ↓
Countries learned
```

Capital learning was intentionally deferred.

The next learning step is to teach the relationship:

```text
Country → Capital
```

For example:

```text
Norway → Oslo
Sweden → Stockholm
Denmark → Copenhagen
```

Before implementing this workflow, ownership and persistence must remain explicit.

The system needs to distinguish between:

```text
canonical geography facts
```

```text
optional mnemonic content
```

```text
initial Memo completion
```

and future:

```text
per-Country / per-skill learning performance
```

These concepts must not be collapsed into the same data model.

---

## Decision

Add **Capitals** as a sibling learning track to **Countries** within Subregion Memo.

Conceptually:

```text
Northern Europe

[ Subregion map ]

Countries
Learn the countries and their locations.
[ Start / Review countries ]

Capitals
Learn the capital for each country.
[ Start / Review capitals ]
```

The two workflows share the same canonical Countries but represent separate learning achievements.

```text
SUBREGION MEMO
│
├── Countries
│   ├── walkthrough
│   ├── location recall
│   └── ordered Country recall
│
└── Capitals
    ├── Country–Capital walkthrough
    └── Country → Capital recall
```

---

## 1. Country owns the canonical Capital fact

The canonical Country–Capital relationship remains part of `Country`.

Conceptually:

```ts
interface Country {
  id: CountryId
  country: string
  capital: string
  continent: Continent
  subregionId: SubregionId
  ...
}
```

For example:

```text
Country: Norway
Capital: Oslo
```

The Capital is a canonical fact about the Country.

It is not owned by:

```text
Subregion
Memo
a learning session
a mnemonic
learning progress
```

A Subregion determines which Countries participate in the current learning scope.

It must not maintain a duplicated Capital list.

Do not introduce structures such as:

```ts
interface Subregion {
  countries: CountryId[]
  capitals: string[]
}
```

Canonical Country–Capital data remains under:

```text
data/
```

---

## 2. `Country.capital` is the canonical answer taught by World Countries

The World Countries dataset is optimized for learning.

Some real-world Countries have more complicated capital arrangements involving concepts such as:

```text
constitutional capital
seat of government
administrative capital
legislative capital
judicial capital
multiple capitals
```

The primary:

```ts
capital: string
```

field means:

> the canonical Capital answer taught by World Countries for this Country.

Every Country included in Capital Memo must therefore have an answerable canonical Capital value under the World Countries answer-matching rules.

Capital learning must not silently skip Countries because their data is incomplete.

If a Country cannot be answered correctly using the canonical dataset, that is a data-quality issue and should be corrected in canonical World Countries data.

If required by actual Country data, narrowly scoped metadata may later be introduced, for example:

```ts
capitalAliases?: readonly string[]
capitalNote?: string
```

These fields may support accepted alternative answers or explanatory context without changing the primary learning relationship.

Do not introduce a separate `Capital` entity unless Capital later requires independent identity or behavior.

---

## 3. Capital learning is a separate learning flow

Do not append Capital-learning stages to `CountryLearningFlow`.

The Country-learning workflow teaches:

```text
Country identity
+
Country location
+
Country learning sequence
```

Capital learning teaches a different relationship:

```text
Country
   ↓
Capital
```

Therefore model these conceptually as:

```text
CountryLearningFlow
```

and:

```text
CapitalLearningFlow
```

They are sibling Memo workflows operating within the same Subregion.

This allows the learner to review Countries without being forced through Capital learning, and vice versa.

---

## 4. The Subregion overview exposes both learning tracks

The normal Subregion overview should provide separate Countries and Capitals sections.

Before Capital learning:

```text
Countries
✓ Countries learned

[ Review countries ] [ Practice country recall ]


Capitals
Learn the capital for each country.

[ Start learning capitals ]
```

After Capital learning:

```text
Capitals
✓ Capitals learned

[ Review capitals ] [ Practice capital recall ]

`Review capitals` starts the walkthrough again. `Practice capital recall` is a
direct shortcut into a new shuffled recall session for learners who have
already completed Capital learning.
```

Do not recreate an all-in-one editable Country–Capital workspace on the normal Subregion overview.

Country–Capital mnemonic content and detailed reference information remain supporting material.

---

## 5. Countries-first is recommended, not required

> **Partially superseded by ADR 0020.** Countries Memo completion is now a
> prerequisite for all Capital Memo entry actions. ADR 0016's independent
> persisted completion facts and Capital-learning mechanics remain in force.

The intended learning sequence remains:

```text
Countries
    ↓
Capitals
```

If Countries have not yet been completed, the Capitals section may state:

```text
Recommended after learning the countries.
```

However, Capital learning must not be hard-disabled.

A user may already know the Countries independently of Memo.

Therefore:

```ts
countriesLearnedAt
```

is not an authorization prerequisite for starting Capital learning.

This means the persisted state may validly contain:

```text
Countries not learned
Capitals learned
```

even though this is not the recommended learning path.

The application guides the preferred sequence without enforcing it as a prerequisite.

---

## 6. Memo teaches Country → Capital recall

The Capital Memo completion direction is:

```text
Country → Capital
```

Example:

```text
Norway

What is the capital?

[ __________ ]
```

Expected answer:

```text
Oslo
```

The reverse relationship:

```text
Capital → Country
```

is a distinct recall skill.

It is not required for Subregion Capital Memo completion.

Reverse recall may later be introduced in:

```text
Drill
Recite
Maintenance
```

It must not be silently included in the definition of initial Capital learning.

---

## 7. Country–Capital mnemonic identity remains unchanged

The existing implementation uses:

```text
geo:country-capital:<CountryId>
```

as the Country–Capital mnemonic identity.

For example, the Norway ↔ Oslo mnemonic is attached to Norway's stable `CountryId`.

The mnemonic represents the relationship:

```text
Country ↔ Capital
```

rather than one particular recall direction.

Therefore the same mnemonic may later support:

```text
Norway → Oslo
```

and:

```text
Oslo → Norway
```

Do not create separate mnemonic identities for each recall direction.

Mnemonic content remains optional and does not itself indicate learning completion.

The `geo:country-capital:<CountryId>` identity currently exists in code but is not documented in the current-state World Countries architecture documentation.

When this ADR is implemented, that existing identity and its ownership under:

```text
mnemonics/
```

must be added to the current-state documentation.

---

## 8. Capital learning begins with a study walkthrough

Starting Capital learning must first present the material.

Traverse Countries in effective Subregion Country order.

Example:

```text
1 / 8

NORWAY
Oslo

[ Norway highlighted on map ]

[ optional Country–Capital mnemonic in the right rail ]

[ Previous ] [ Next ]
```

Then:

```text
2 / 8

SWEDEN
Stockholm
```

The walkthrough is:

```text
user-paced
not timed
not scored
freely navigable backwards/forwards
```

Its purpose is to establish:

```text
Country
+
location context
+
Capital
+
optional mnemonic
```

The map is supporting context.

Capital learning does not introduce another Country-location test.

---

## 9. Capital recall uses balanced randomization

After the walkthrough, enter active Country → Capital recall.

Example:

```text
Finland

What is the capital?

[ __________ ]
```

Country prompts should be randomized rather than follow the user-authored Country sequence.

Use the existing shuffle-bag capability or equivalent balanced randomization.

Within a full round:

```text
every Country appears exactly once
```

before another round begins.

This avoids sequence-based answer cues while also avoiding poor independent random behavior such as:

```text
Norway
Norway
Sweden
Norway
```

The effective Country order remains important for:

```text
study
mnemonic structure
walkthrough presentation
```

It is not used as an answer cue during Capital recall.

---

## 10. Capital answers use World Countries answer matching

Typed Capital answers use the reusable World Countries answer-matching capability.

Normal matching should continue to support appropriate normalization including:

```text
case
whitespace
punctuation
diacritics
explicit aliases
```

where applicable.

The existing World Countries fuzzy-answer setting also applies to Capital answers.

Do not introduce a separate Capital-specific fuzzy matching implementation.

Country and Capital prompts may have different accepted aliases, but they use the same underlying answer-matching capability.

---

## 11. Wrong answers enter temporary repair behavior

When an answer is incorrect:

1. mark the answer incorrect;
2. reveal the correct Capital;
3. show the Country–Capital mnemonic when available;
4. allow the learner to register the correction;
5. continue the learning process.

Example:

```text
Norway

Your answer:
Bergen

Correct:
Oslo

[ optional mnemonic ]
```

Once an error occurs, the current round is permanently non-qualifying.

The learner may continue through that round and temporary repair behavior may reintroduce missed Country–Capital relationships where useful.

Avoid unnecessary immediate repetition when other Countries are available.

For example, avoid:

```text
Norway → wrong
Norway → retry
Norway → retry
```

The exact short-term repair scheduling is temporary learning policy and is not part of the durable data model.

Capital completion can only occur during a **subsequent full shuffled round** that:

```text
starts from a fresh complete Country set
```

and:

```text
contains zero errors
```

---

## 12. Definition of "Capitals learned"

A Subregion's Capitals are learned after one complete recall round in which:

```text
every Country in the Subregion is presented exactly once
```

and:

```text
every Capital answer is correct
```

with:

```text
zero errors during that complete round
```

Conceptually:

```text
fresh shuffle of all Countries
        ↓
ask every Country once
        ↓
all Capital answers correct
        ↓
CAPITALS LEARNED
```

The qualifying round must itself cover the complete current Country set.

These do not qualify:

```text
every Capital answered correctly at some point
```

```text
all mistakes eventually repaired
```

```text
a streak that does not cover every Country
```

```text
correct answers spanning multiple rounds
```

```text
finishing the remainder of a round after an earlier error
```

After an error, only a later complete clean round can qualify.

This is an **initial-learning completion criterion**.

It is not a claim of long-term mastery.

---

## 13. Memo completion is owned by Subregion learning state

Memo persists only the durable fact that the Capital-learning workflow has been completed for the Subregion.

Extend:

```ts
interface SubregionLearningState {
  subregionId: SubregionId
  countriesLearnedAt?: number
}
```

to:

```ts
interface SubregionLearningState {
  subregionId: SubregionId
  countriesLearnedAt?: number
  capitalsLearnedAt?: number
}
```

Conceptually:

```text
Northern Europe
├── Countries learned
└── Capitals learned
```

`countriesLearnedAt` and `capitalsLearnedAt` are independent durable Memo achievements.

The individual Country–Capital relationship does not own a durable Memo `learned` flag.

---

## 14. Subregion learning persistence uses field-preserving updates

The existing Subregion learning store persists rows under:

```text
world-countries-subregion-learning
```

using the shared application storage helpers.

The existing implementation currently assumes one durable learning fact and replaces or removes the complete Subregion row when Country completion changes.

That behavior must change before adding Capital completion.

Once multiple learning facts exist, mutations must preserve unrelated fields.

Conceptually:

```text
mark Countries learned
→ update countriesLearnedAt only
→ preserve capitalsLearnedAt
```

```text
mark Capitals learned
→ update capitalsLearnedAt only
→ preserve countriesLearnedAt
```

```text
clear Countries learned
→ remove countriesLearnedAt only
→ preserve capitalsLearnedAt
```

```text
clear Capitals learned
→ remove capitalsLearnedAt only
→ preserve countriesLearnedAt
```

Do not replace the complete Subregion learning row when changing one learning dimension.

Expected operations are conceptually equivalent to:

```ts
markSubregionCountriesLearned(subregionId)
markSubregionCapitalsLearned(subregionId)

clearSubregionCountriesLearned(subregionId)
clearSubregionCapitalsLearned(subregionId)
```

Exact names may follow existing conventions.

If, after clearing a field, a Subregion row contains no remaining durable state, the empty row may be removed.

---

## 15. Memo does not persist per-Country Capital learning state

Do not add durable Memo records such as:

```text
Norway → Oslo learned
Sweden → Stockholm learned
```

Do not persist Memo fields such as:

```text
Capital correct counts
Capital incorrect counts
Capital streaks
per-Country Capital learnedAt
mastery percentages
review intervals
ease scores
```

Memo answers the coarse question:

> Has the learner completed initial Capital learning for this Subregion?

That is represented only by:

```ts
capitalsLearnedAt
```

Temporary session evidence remains temporary.

---

## 16. Future per-item learning performance is a separate concern

Later Drill, Recite, and Maintenance functionality will likely need individual learning performance.

For example:

```text
Norway → Oslo        strong
Sweden → Stockholm   weak
Finland → Helsinki   weak
```

This must not be stored on canonical `Country` data and must not be added to `SubregionLearningState`.

Future performance should instead be keyed by stable Country identity and the specific recall skill or direction.

Conceptually:

```ts
type CountryLearningTarget =
  | {
      countryId: CountryId
      skill: 'country-to-capital'
    }
  | {
      countryId: CountryId
      skill: 'capital-to-country'
    }
  | {
      countryId: CountryId
      skill: 'country-to-location'
    }
  | {
      countryId: CountryId
      skill: 'location-to-country'
    }
```

The exact future schema, scoring algorithm, persistence format, and target identifier are intentionally not decided by this ADR.

The important ownership boundary is:

```text
SubregionLearningState
→ coarse Memo completion
```

```text
future per-target performance
→ Drill / Recite / Maintenance learning evidence
```

Future learning-performance identity must remain separate from mnemonic identity.

In particular:

```text
geo:country-capital:<CountryId>
```

identifies Country–Capital **mnemonic content**.

It must not be reused as a Drill, Recite, Maintenance, mastery, or progress key.

Existing progress-style identifiers such as:

```text
geo:capital:<id>:country-to-capital
```

represent a different conceptual namespace from:

```text
geo:country-capital:<CountryId>
```

This ADR does not standardize the future progress namespace.

It only establishes that mnemonic identity and learning-performance identity are separate concepts.

---

## 17. Recite does not automatically imply persisted mastery

Recite may initially operate as a complete recall session without creating permanent per-Country mastery records.

For example:

```text
47 / 50 correct
```

may be a valid session result without changing durable per-item learning state.

If later Recite results should contribute to:

```text
weak-item detection
maintenance scheduling
long-term proficiency
```

they may feed the same future per-target performance model used by Drill and Maintenance.

That future behavior is outside this ADR.

---

## 18. Country order is reused, not duplicated

Capital walkthrough uses the existing effective Subregion Country order.

Do not introduce:

```text
capitalOrder
```

or:

```ts
SubregionMetadata.capitalOrder
```

The existing hierarchy remains:

```text
canonical Country membership
        +
SubregionMetadata.countryOrder
        ↓
effective Country order
```

Capital walkthrough consumes that order.

Capital recall creates a temporary randomized order from the same Country set.

The random order is session state and is not persisted.

---

## 19. Changing Country order does not invalidate Capital completion

Country order affects learning sequence.

It does not affect Country–Capital identity.

For example:

```text
Norway → Oslo
Sweden → Stockholm
```

remains true whether the user's learning order is:

```text
Norway → Sweden
```

or:

```text
Sweden → Norway
```

Therefore editing:

```ts
SubregionMetadata.countryOrder
```

does not clear:

```ts
countriesLearnedAt
```

or:

```ts
capitalsLearnedAt
```

solely because the order changed.

---

## 20. Canonical Subregion membership changes require uniform completion handling

Subregion completion describes learning over the complete canonical Country membership of that Subregion.

If canonical membership changes because a Country is:

```text
added
removed
reclassified
```

then a historical completion timestamp may no longer describe the current Country set.

For example:

```text
Northern Europe learned
        ↓
new Country becomes part of Northern Europe
        ↓
old completion no longer proves
the current full set was learned
```

This issue applies uniformly to both:

```ts
countriesLearnedAt
```

and:

```ts
capitalsLearnedAt
```

Do not introduce different invalidation semantics for Countries and Capitals unless a later architectural decision provides a specific reason.

The implementation must use the established World Countries persistence/migration approach to ensure historical completion is not silently interpreted as completion of newly added canonical members.

The exact invalidation or migration mechanism may be implementation-specific, but the invariant is:

> a Subregion-level completion fact must describe the current canonical learning set, not an obsolete membership set.

---

## 21. Unfinished Capital sessions are temporary

If the learner exits during:

```text
Capital walkthrough
Capital recall
repair
```

discard active session state.

Do not persist:

```text
current Country
current round
shuffle bag
answers
mistakes
repair queue
walkthrough position
```

Re-entering Capital learning starts a new session.

Session resume may be considered separately if real usage establishes a need.

---

## 22. Capability ownership

Follow the existing World Countries architecture.

Canonical Country–Capital data:

```text
data/
```

Pure Capital-learning state and transitions:

```text
learning/
```

Reusable answer matching and balanced-randomization/session mechanics:

```text
learning/
```

Durable Subregion Memo completion:

```text
learning/
```

Memo orchestration and presentation:

```text
memo/
```

Country–Capital mnemonic identity and persistence adapters:

```text
mnemonics/
```

Map implementation:

```text
maps/
```

Do not place:

```text
canonical Capital data in Memo
learning persistence in UI components
Capital learning logic in Drill
Drill dependencies on Memo internals
user learning state on Country
```

Capabilities shared across workflows must remain outside workflow-specific ownership.

---

## 23. Conceptual implementation shape

Exact file names may follow local naming conventions, but the expected separation is approximately:

```text
learning/
    capitalLearningFlow.ts
    subregionLearningState.ts
    subregionLearningStore.ts
    existing answer matching
    existing shuffle-bag/session mechanics

memo/subregion/
    CapitalLearningFlow.tsx
    CapitalWalkthroughStep.tsx
    CapitalRecallStep.tsx
    CapitalLearningComplete.tsx
```

`SubregionMemoScreen` may orchestrate which sibling workflow is active:

```text
overview
country learning
capital learning
```

It should not itself implement Capital-learning state transitions.

Pure learning rules belong under:

```text
learning/
```

while Memo owns UI orchestration.

---

## 24. Completion presentation

After a qualifying clean Capital round, show a completion state.

Example:

```text
Capitals learned ✓

You recalled the capital for every country
in Northern Europe.

[ Done ]
[ Review again ]
```

Completion records:

```ts
capitalsLearnedAt = Date.now()
```

through the World Countries Subregion learning store.

Returning to the Subregion overview should then reflect the durable completion state:

```text
Capitals
✓ Capitals learned

[ Review capitals ] [ Practice capital recall ]
```

Reviewing Capitals does not clear or replace the existing completion timestamp merely because a new review session is started.

A later successful completion may update the timestamp if that is consistent with the existing Country-review semantics.

---

## Alternatives considered

### Extend `CountryLearningFlow`

Rejected.

Country learning and Capital learning are separate user goals and separate durable learning achievements.

Appending Capital stages would make one increasingly large state machine and unnecessarily couple Country review to Capital review.

---

### Store Capital data on Subregion

Rejected.

Capital is a canonical fact about Country.

Subregion defines learning scope only.

Duplicating Country–Capital information at Subregion level would create unnecessary synchronization risk.

---

### Create a separate Capital entity

Rejected for current requirements.

`CountryId` provides sufficient stable identity for the Country–Capital relationship.

A Capital entity may be introduced later only if Capital requires independent domain identity or behavior.

---

### Require Country → Capital and Capital → Country for Memo completion

Rejected.

These are separate retrieval skills.

Memo initially teaches:

```text
Country → Capital
```

Reverse recall belongs naturally in later deliberate-practice workflows.

---

### Persist individual Capital learning state during Memo

Rejected.

Per-item evidence belongs to future Drill, Recite, and Maintenance performance tracking, not coarse Memo completion.

---

### Put user learning state on `Country`

Rejected.

`Country` is canonical geography data.

User-specific learning state belongs under the World Countries learning capability.

---

### Reuse the mnemonic ID as a learning-progress ID

Rejected.

Mnemonic identity and learning-performance identity represent different concepts and have different lifecycles.

```text
geo:country-capital:<CountryId>
```

must remain mnemonic identity only.

---

### Hard-require Countries completion before Capitals

Rejected.

Countries-first remains the recommended sequence, but Memo completion state does not determine what the learner is allowed to study.

---

### Persist active Capital-learning sessions

Rejected for this implementation.

Walkthrough position, shuffle state, repair queues, and current answers are temporary workflow mechanics rather than durable domain facts.

---

## Consequences

### Positive

The existing Country model remains canonical and simple.

The existing Country–Capital mnemonic identity remains valid.

Countries and Capitals become clear sibling Memo activities.

Memo learning state stays intentionally coarse.

Capital completion integrates naturally with the existing Subregion learning store.

The existing answer matcher and balanced-randomization mechanics can be reused.

Future per-item performance can evolve independently.

Different recall directions can later be measured independently.

Drill, Recite, and Maintenance can share future learning evidence without depending on Memo internals.

Mnemonic identity remains clearly separate from performance identity.

### Negative

`SubregionLearningState` now contains multiple independent completion dimensions.

The learning store must change from whole-row replacement semantics to field-preserving updates.

Structural changes to canonical Subregion membership require explicit treatment of existing completion state.

The Subregion Memo screen must orchestrate multiple sibling learning workflows.

A separate per-target performance model will eventually be needed when Drill and Maintenance require weak-item tracking or long-term learning evidence.

A user can intentionally reach:

```text
Capitals learned
Countries not learned
```

because the recommended sequence is not hard-gated.

---

## Documentation impact

As part of implementing this accepted ADR, update:

```text
docs/architecture/features/WORLD_COUNTRIES.md
```

to describe:

```text
CapitalLearningFlow ownership
Country → Capital Memo semantics
Country.capital canonical ownership
Subregion countriesLearnedAt / capitalsLearnedAt
separation between Memo completion and future per-target performance
```

Also document the existing Country–Capital mnemonic identity:

```text
geo:country-capital:<CountryId>
```

and explicitly identify:

```text
mnemonics/
```

as its capability owner.

Because persisted Subregion learning state changes, review and update:

```text
docs/architecture/PERSISTENCE.md
```

to describe:

```text
world-countries-subregion-learning
countriesLearnedAt
capitalsLearnedAt
field-preserving updates
relevant invalidation/migration behavior
```

Tests and invariants should reflect that:

```text
canonical Country data
Memo completion
mnemonic identity
future per-target performance
```

remain separate concepts.

The ADR records the rationale for the decision.

Current-state architecture documentation remains authoritative for the implemented system.

---

## Out of scope

This ADR does not define:

```text
Capital → Country Memo completion
long-term Capital mastery
per-Country mastery scores
spaced repetition
Maintenance scheduling
Drill scoring
Recite scoring
weak-item algorithms
future per-target persistence schema
future performance-key namespace
session resume
Continent-level Capital Recite
World-level Capital Recite
a separate Capital entity
a complete geopolitical model of capital-city roles
```

---

## Implementation acceptance criteria

The ADR is implemented when all of the following are true:

1. The Subregion overview exposes a Capitals learning action alongside Countries.
2. Capital learning is implemented as a sibling workflow rather than appended to `CountryLearningFlow`.
3. The walkthrough presents every Country and its canonical Capital in effective Country order.
4. Active recall tests `Country → Capital`.
5. Recall uses balanced randomized complete rounds.
6. An incorrect answer permanently disqualifies the current round from completion.
7. Completion occurs only after a subsequent full zero-error round covering every current Country exactly once.
8. Completing Capital Memo persists `capitalsLearnedAt` on `SubregionLearningState`.
9. Country and Capital completion mutations preserve each other's persisted fields.
10. Clearing one completion fact does not remove the other.
11. No per-Country Memo mastery state is persisted.
12. Country–Capital mnemonic identity remains `geo:country-capital:<CountryId>`.
13. Mnemonic identity is not reused as learning-progress identity.
14. Existing World Countries answer matching and fuzzy-answer behavior are reused.
15. Effective Country order is reused for walkthrough presentation; no `capitalOrder` is introduced.
16. Country-order changes do not invalidate completion.
17. Canonical membership changes apply consistent completion-validity handling to both Countries and Capitals.
18. Current-state architecture and persistence documentation are updated.
19. Relevant pure learning, persistence, and UI behavior is covered by focused tests.
20. Implementation is verified against this ADR before adding a `Confirmation` section.

## Confirmation

Implemented and verified against the repository on 2026-08-10.

Verification completed with:

```text
npx vitest run
npx tsc -b
npx vite build
```
