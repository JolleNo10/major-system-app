# ADR 0009 — Subregion Memo country-learning workflow

* **Status:** Proposed
* **Date:** 2026-08-09
* **Builds on:** ADR 0007 — World Countries Memo workflow
* **Builds on:** ADR 0008 — Subregion identity, metadata, and country order
* **Refines:** ADR 0007's definition of initial Memo progress
* **Feature:** `src/features/world-countries/`
* **Goal:** rework the Subregion Memo experience into a focused initial-learning workflow that prepares a Subregion, teaches its countries and locations, verifies one complete clean recall, and records only the resulting durable learning fact.

---

# Context

The existing Subregion Memo workspace has accumulated several responsibilities in one screen.

It currently combines concerns such as:

```text
Subregion mnemonic
country ordering
Country–Capital cards
capital recall
Memo progress
map interaction
```

The intended role of Memo is now clearer.

Memo is not:

```text
long-term practice
mastery
spaced repetition
adaptive maintenance
Recite
```

Memo is the initial learning stage.

For a Subregion, the desired high-level learning path is:

```text
prepare the Subregion
        ↓
learn which countries are in it
        ↓
learn their locations
        ↓
recall all countries in the chosen order
        ↓
countries learned
        ↓
later: learn capitals
```

The country-learning workflow is substantial enough to implement and validate independently before designing the capital-learning phase.

This ADR therefore covers:

```text
Subregion overview
preparation
country-order review
Subregion mnemonic review
country walkthrough
random location learning
ordered blind country recall
countries-learned state
supporting architecture
```

Capital learning is intentionally deferred.

---

# Decision

Replace the current all-in-one Subregion Memo workspace with a focused workflow consisting of:

```text
SUBREGION OVERVIEW
        ↓
MEMORY PREVIEW
        ↓
COUNTRY WALKTHROUGH
        ↓
STAGE A — LOCATION RECALL
        ↓
STAGE B — ORDERED BLIND RECALL
        ↓
COUNTRIES LEARNED
```

The workflow has two different kinds of state:

```text
persistent domain state
```

and:

```text
temporary learning-session state
```

Only meaningful durable learning outcomes are persisted.

Temporary mechanics such as streaks, shuffle bags, current indices, and repair positions remain in memory and disappear when the learning session ends.

---

# 1. Purpose of the Subregion screen

The Subregion screen should answer:

> What should I do next to learn this Subregion?

It should not try to show every available control and every Country–Capital mnemonic simultaneously.

The default Subregion screen is an **overview and launch point**.

Its primary responsibilities are:

```text
show the focused Subregion map
show the user's learning order
show the Subregion mnemonic / memory aid
show whether countries are learned
offer the next learning action
```

Supporting detail may remain available but should not dominate the screen.

---

# 2. Subregion overview

Conceptually:

```text
Northern Europe

[ focused Subregion map ]


Learning order
Norway → Sweden → Denmark → Finland → Iceland → …
[ Edit order ]


Countries
Learn the countries and their locations.

[ Start learning countries ]


Capitals
Learn the capitals after the countries.
```

The exact presentation is a UI concern, but the information hierarchy is important.

## Primary

```text
Subregion
map
next learning action
```

## Secondary

```text
learning order
Subregion memory aid
countries learned status
```

## On demand

```text
order editor
full Country/Capital reference
detailed mnemonic editing
```

Do not render a large editable Country–Capital card for every country on the normal overview.

---

# 3. Preparation is supportive, not a mandatory stage

The user may prepare a Subregion using:

```text
custom country order
Subregion story
Subregion image
```

All are useful learning aids.

They are not prerequisites.

A user with:

```text
default order
no story
no image
```

must still be able to begin learning immediately.

Therefore do not model Preparation as something that must become:

```text
complete ✓
```

before learning can begin.

---

# 4. Country order remains Subregion metadata

ADR 0008 established that user-specific ordering belongs to:

```text
SubregionMetadata.countryOrder
```

This remains the single source of user-authored order.

Memo does not own another copy.

Recite must later consume the same effective order.

Conceptually:

```text
countries.ts
   +
SubregionMetadata.countryOrder
        ↓
effective Subregion order
        ↓
       Memo
```

The normal overview may show the order compactly:

```text
Norway → Sweden → Denmark → Finland → Iceland
```

Editing the order opens a dedicated editing state rather than permanently displaying drag/drop controls.

---

# 5. Entering country learning

Selecting:

```text
Start learning countries
```

does not immediately test the learner.

A new learner must first be shown the material.

The transition into learning is:

```text
Memory preview
      ↓
Study walkthrough
      ↓
Location recall
      ↓
Ordered recall
```

This makes Memo an actual learning workflow rather than a quiz presented without preparation.

---

# 6. Memory preview

Before the country walkthrough, display the Subregion's memory structure.

If a Subregion mnemonic exists, show:

```text
Subregion story
Subregion image
effective country order
```

Example:

```text
Northern Europe

Your memory aid

[ story ]

[ picture ]

Norway → Sweden → Denmark → Finland → Iceland

[ Start walkthrough ]
```

If no mnemonic exists, show the order without requiring mnemonic creation.

Example:

```text
Northern Europe

Norway → Sweden → Denmark → Finland → Iceland

You can add a story or picture later if useful.

[ Start walkthrough ]
```

The memory aid should not remain visible during blind recall where it would become an unintended answer clue.

---

# 7. Country walkthrough

The walkthrough is a non-scored study pass.

Walk countries in the effective Subregion order.

Example:

```text
1 / 5

NORWAY

[ map with Norway highlighted ]

Norway

[ Previous ] [ Next ]
```

Then:

```text
2 / 5

SWEDEN

[ Sweden highlighted ]
```

and so on.

The walkthrough should be:

```text
user-paced
not timed
not scored
freely navigable backwards/forwards
```

Its purpose is to establish:

```text
country name
+
shape
+
location
+
position in learning sequence
```

The user may review the walkthrough again before beginning Stage A.

---

# 8. Stage A — random location recall

After the walkthrough, transition to location learning.

The task is:

```text
Find Denmark

[ unlabeled map ]
```

The user answers by clicking a country.

This tests:

```text
country name → map location
```

Stage A does not follow the configured Subregion sequence.

The ordering must be randomized to prevent sequence cues.

---

# 9. Stage A uses balanced randomization

Do not use naive independent random selection.

Pure random selection may produce unhelpful runs such as:

```text
Norway
Norway
Sweden
Norway
Norway
```

Use controlled randomization based on a shuffle bag or equivalent mechanism.

Within a bag:

```text
each country appears once
```

before a new randomized bag is generated.

Avoid immediate repetition across bag boundaries where practical.

The learning engine should provide reasonably flat exposure while still presenting countries in unpredictable order.

---

# 10. Stage A clean target

Stage A requires a configurable number of consecutive correct answers.

Define a World Countries setting representing the minimum clean target:

```text
locationCleanTargetMinimum = X
```

The actual target is:

```ts
Math.max(
  countryCount,
  locationCleanTargetMinimum,
)
```

Example with:

```text
X = 10
```

results in:

```text
5 countries  → 10
8 countries  → 10
12 countries → 12
18 countries → 18
```

This guarantees that a large Subregion requires at least one Subregion-sized clean streak.

The exact default value is a product setting, not hard-coded learning-engine policy.

---

# 11. Stage A scoring behavior

Correct selection:

```text
cleanStreak += 1
```

Wrong selection:

```text
cleanStreak = 0
```

After a wrong answer:

1. clearly show the correct country/location;
2. allow the learner to register the correction;
3. continue with the randomized learning process.

Once:

```text
cleanStreak === locationCleanTarget
```

Stage A is complete.

Do not persist this streak.

It is temporary learning-session state.

---

# 12. Stage A → Stage B transition

Completing Stage A does not return the learner to the Subregion overview.

Continue directly within the active learning session.

Show a brief transition such as:

```text
Locations learned ✓

Now recall the countries in your learning order.

[ Continue ]
```

Then enter Stage B.

---

# 13. Stage B — ordered blind recall

Stage B uses the effective Subregion country order defined by ADR 0008.

Example:

```text
1 Norway
2 Sweden
3 Denmark
4 Finland
5 Iceland
```

The map highlights the first country without showing its name.

The learner types the country name.

Example:

```text
[ Norway highlighted on map ]

Which country is this?

[ __________________ ]
```

Correct:

```text
advance to next country
```

Then highlight Sweden, then Denmark, and so on.

This tests:

```text
map location/shape
+
sequence
→
country name
```

---

# 14. Stage B is sequential

Unlike Stage A, Stage B intentionally uses the configured order.

This order may have been chosen to support:

```text
geographic path
mnemonic story
memory journey
later recitation
```

The sequence is therefore meaningful.

Stage B begins at:

```text
#1
```

and normally progresses toward:

```text
#N
```

---

# 15. Stage B wrong-answer behavior

On a wrong answer:

1. mark the answer incorrect;
2. reveal the correct country name;
3. let the learner register the correction;
4. rewind two positions;
5. continue through the ordered sequence.

For an error at zero-based index `i`:

```ts
nextIndex = Math.max(0, i - 2)
```

Example:

```text
1 Norway   ✓
2 Sweden   ✓
3 Denmark  ✓
4 Finland  ✗
```

Reveal:

```text
Finland
```

Then rewind to:

```text
2 Sweden
```

and continue:

```text
Sweden
Denmark
Finland
Iceland
...
```

The rewind provides nearby repeated context rather than immediately retrying only the missed country.

---

# 16. Stage B repair mode

A repaired continuation after an error does **not** itself qualify as final learning completion.

After any Stage B error, the learner is considered to be in a repair/relearning phase.

They continue through the sequence according to the rewind rule.

After reaching the end, begin again at:

```text
#1
```

for another clean pass.

This creates a clear distinction between:

```text
repair traversal
```

and:

```text
final clean recall
```

---

# 17. Definition of “countries learned”

A Subregion's countries are learned only after one complete ordered recall:

```text
#1 → #N
```

with:

```text
zero errors
```

during that complete pass.

This is the durable domain-level learning achievement.

Examples that do **not** qualify:

```text
all countries clicked correctly at some point
```

```text
Stage A clean target reached
```

```text
reached #N after correcting earlier mistakes
```

```text
five consecutive correct answers spanning the end and start of the sequence
```

The clean recall must explicitly begin at country #1 and end at country #N.

---

# 18. Domain learning state stays minimal

Do not persist detailed Stage A or Stage B performance.

Persist only the durable result.

Conceptually:

```ts
interface SubregionLearningState {
  subregionId: SubregionId
  countriesLearnedAt?: number
}
```

This may later be extended when the capital-learning model is designed.

Do not persist now:

```text
location clean streak
shuffle bag contents
walkthrough index
ordered-recall current index
repair state
number of Stage B mistakes
number of walkthrough views
```

These are implementation/session mechanics rather than domain facts.

---

# 19. “Started” does not require dedicated persisted state

The UI may want to indicate:

```text
Not started
Started
Learned
```

but a dedicated:

```text
startedAt
```

field is not required for this implementation.

Where useful, “started” may be derived from existing meaningful state such as:

```text
custom Subregion metadata
Subregion mnemonic
other persistent Subregion learning information
```

or treated simply as an in-session UI state.

Do not introduce persistence solely to display a “started” badge.

---

# 20. Unfinished sessions are not persisted

If the user exits during:

```text
walkthrough
Stage A
Stage B
```

the current session state is discarded.

Re-entering country learning starts a new learning session.

Do not persist or restore:

```text
current question
clean streak
shuffle order
repair position
current phase
```

This keeps temporary learning mechanics out of the durable data model.

Session-resume persistence may be reconsidered later if real usage demonstrates a need.

---

# 21. World Countries answer matching

Typed World Countries answers need reusable answer matching outside the existing quiz component.

The existing place-name normalization/matching behavior should be extracted from quiz ownership into a World Countries learning/common capability.

It should be reusable by:

```text
Memo
Quiz
later Recite
```

without creating:

```text
Memo → Quiz
```

dependencies.

---

# 22. Basic matching always applies

All World Countries typed answer modes should continue to support reasonable normalization such as:

```text
case-insensitive matching
leading/trailing whitespace normalization
repeated whitespace normalization
punctuation normalization
accent/diacritic normalization where appropriate
known aliases
```

For example:

```text
norway
NORWAY
 Norway
```

should all match:

```text
Norway
```

without requiring fuzzy matching.

---

# 23. Fuzzy matching setting

Add a setting to the application's existing global Settings area.

The setting applies specifically to World Countries typed answers.

Conceptually:

```text
World Countries
  Fuzzy answer matching: On / Off
```

The setting may be stored with other global application settings, but must not affect:

```text
Pi
Major System
Cards
unrelated learning modes
```

In code, the setting may be represented as:

```ts
worldCountriesFuzzyAnswerMatching: boolean
```

or equivalent according to the existing settings model.

---

# 24. Fuzzy matching behavior

When enabled:

```text
basic normalized match
        ↓
not matched
        ↓
controlled fuzzy comparison
```

Examples that may be accepted:

```text
Noreway → Norway
Sweeden → Sweden
Portugla → Portugal
```

Do not apply a naive fixed edit-distance rule that makes similar country names unsafe.

The matcher should avoid accepting an answer when it is ambiguous with another valid country.

For example:

```text
Austria
Australia
```

must not become interchangeable because fuzzy matching is enabled.

Matching rules belong in pure World Countries logic with focused tests.

---

# 25. Location clean-target setting

Add another World Countries-specific option to the existing global Settings area:

```text
Country location clean recalls
```

Meaning:

> Minimum consecutive correct map-location answers required before Stage A is complete.

Conceptually stored as:

```ts
worldCountriesLocationCleanTargetMinimum: number
```

The learning engine receives the configured value and calculates:

```ts
Math.max(
  countryCount,
  configuredMinimum,
)
```

The learning engine must not directly read application settings.

---

# 26. Settings dependency direction

Correct:

```text
global Settings
      ↓
Memo React boundary
      ↓
CountryLearningConfig
      ↓
pure learning engines
```

Avoid:

```text
LocationRecallSession
      ↓
global settings singleton
```

This keeps learning logic deterministic and easy to test.

---

# 27. Focused learning UI

Once the user enters an active country-learning session, reduce the amount of visible UI.

The overview may contain:

```text
map
order
memory aid
status
supporting reference
```

The active learning screen should primarily contain:

```text
current instruction/question
map
answer control where relevant
current local progress
exit action
```

For example Stage A:

```text
Find Denmark

7 / 10 clean

[ map ]
```

Stage B:

```text
Ordered recall
3 / 10

[ highlighted country ]

Which country is this?

[ input ]
```

Do not permanently show the Subregion mnemonic during blind recall.

---

# 28. Architecture principles

The new workflow introduces enough behavior that it must not be implemented as additional state and handlers inside the existing `MemoWorkspace.tsx`.

Separate:

```text
domain data
persistent state
learning algorithms
workflow orchestration
map adapter
React presentation
```

Learning rules must be testable without rendering React or loading SVG assets.

---

# 29. Prefer pure session engines over classes

Mutable classes are appropriate where code owns external imperative resources.

Example:

```text
SvgMapController
```

owns:

```text
SVG DOM
listeners
styles
lifecycle
destroy()
```

Stage A and Stage B do not own external resources.

Therefore implement them as pure state-transition logic rather than mutable classes.

Conceptually:

```text
state + answer
      ↓
pure function
      ↓
new state + outcome
```

This gives deterministic unit tests and makes React a thin state holder.

---

# 30. Generic shuffle-bag utility

Introduce a small feature-local generic shuffle-bag abstraction for controlled randomization.

Conceptually:

```ts
ShuffleBagState<T>
```

with pure operations equivalent to:

```ts
createShuffleBag<T>(items, random)
drawShuffleBag<T>(state, items, random)
```

The utility must not know about Countries.

It can later support other World Countries learning tasks.

Inject or parameterize randomness sufficiently for deterministic tests.

Do not move it to application-wide `core/` merely because its implementation is generic.

Extract to `core/` only after another feature has a concrete need for the same abstraction.

---

# 31. Location recall engine

Introduce a pure Stage A engine.

Conceptually:

```ts
interface LocationRecallConfig {
  countryIds: readonly CountryId[]
  minimumCleanTarget: number
}

interface LocationRecallState {
  currentCountryId: CountryId
  cleanStreak: number
  target: number
  bag: ShuffleBagState<CountryId>
  completed: boolean
}
```

Operations should be equivalent to:

```ts
createLocationRecallSession(...)
submitLocationSelection(...)
```

The engine owns:

```text
target calculation
balanced/random country selection
clean-streak updates
Stage A completion
```

It does not know:

```text
SVG IDs
React
global Settings
Subregion mnemonics
persistence
```

---

# 32. Ordered recall engine

Introduce a pure reusable ordered-recall engine.

Conceptually:

```ts
interface OrderedRecallConfig<TId> {
  order: readonly TId[]
  rewindOnError: number
}
```

State should represent enough to enforce:

```text
current position
repair vs clean-pass mode
completion
```

Operations should be equivalent to:

```ts
createOrderedRecallSession(...)
submitOrderedRecall(...)
```

The engine owns:

```text
advance on correct
rewind on wrong
repair traversal
restart from #1
clean-pass completion
```

It should not know that `TId` represents Country IDs.

Memo may instantiate it as:

```ts
OrderedRecallSession<CountryId>
```

This is a genuinely useful low-level abstraction.

---

# 33. Country-learning workflow orchestration

Stage A and Stage B engines do not decide the full Memo workflow.

Introduce a Country-specific workflow coordinator for:

```text
memory-preview
walkthrough
location-practice
ordered-recall
complete
```

Conceptually:

```ts
type CountryLearningPhase =
  | 'memory-preview'
  | 'walkthrough'
  | 'location-practice'
  | 'ordered-recall'
  | 'complete'
```

The coordinator owns:

```text
which phase is active
when the next phase begins
walkthrough position
creation of Stage A/B session state
final completion callback
```

It does not reimplement the internal rules of the Stage A/B engines.

---

# 34. Persistent Subregion learning state

Durable learning outcome should live outside the Memo presentation folder because it describes the Subregion learning domain.

Suggested structure:

```text
world-countries/
  learning/
    subregionLearningState.ts
    subregionLearningStore.ts
```

Conceptually:

```ts
markSubregionCountriesLearned(
  subregionId,
  learnedAt,
)

getSubregionLearningState(
  subregionId,
)
```

Memo writes the result.

Future Recite or overview screens may read it.

Memo does not own a separate private interpretation of “countries learned.”

---

# 35. Answer-matching ownership

The existing quiz-specific place-name matching has become useful to multiple World Countries workflows.

Move reusable normalization/matching behavior to an appropriate feature-level module.

Suggested:

```text
learning/answerMatching.ts
```

or another clearly shared World Countries location.

Desired dependency:

```text
               answerMatching
               ↙            ↘
            Memo             Quiz
```

Avoid:

```text
Memo → quiz/countryQuiz.ts
```

for generic answer-matching behavior.

---

# 36. Map abstraction

`SvgMapController` remains the generic imperative SVG controller.

It must not learn concepts such as:

```text
Memo
learning phase
Subregion
correct answer
clean streak
```

However, both navigation and learning now need similar React/controller lifecycle behavior.

Introduce, where useful, a declarative React adapter around `SvgMapController`.

Conceptually:

```text
SvgMapView
      ↓
SvgMapController
```

`SvgMapView` may own:

```text
controller creation/destruction
SVG loading
loading/error state
applying declarative SVG-ID state
country-click forwarding
```

Possible conceptual props:

```ts
interface SvgMapViewProps {
  svgUrl: string

  hoverableIds?: readonly string[]
  mutedIds?: readonly string[]
  highlightedIds?: readonly string[]
  namedIds?: readonly string[]
  zoomIds?: readonly string[]

  onCountryClick?: (svgId: string) => void
}
```

The exact API should follow the actual controller capabilities.

Do not embed Geography knowledge in `SvgMapView`.

---

# 37. Domain-to-SVG adapter boundary

Learning algorithms operate on:

```text
CountryId
```

The SVG controller operates on:

```text
SVG path IDs
```

These identities must remain separate.

Correct:

```text
LocationRecallSession
      ↓
CountryId
      ↓
CountryLearningMap
      ↓
countryMapIds adapter
      ↓
SvgMapView
      ↓
SVG IDs
```

The session engine must never receive or persist SVG IDs.

---

# 38. Suggested feature structure

The final exact structure may be adjusted during implementation, but target something close to:

```text
src/features/world-countries/
│
├── data/
│   ├── countries.ts
│   └── subregions.ts
│
├── common/
│   ├── SvgMapController.ts
│   ├── SvgMapView.tsx
│   ├── countryMapIds.ts
│   └── ...
│
├── subregions/
│   ├── subregionMetadata.ts
│   ├── subregionMetadataStore.ts
│   └── subregionMetadata.test.ts
│
├── learning/
│   ├── mastery.ts
│   ├── answerMatching.ts
│   ├── shuffleBag.ts
│   ├── locationRecallSession.ts
│   ├── orderedRecallSession.ts
│   ├── subregionLearningState.ts
│   ├── subregionLearningStore.ts
│   └── *.test.ts
│
├── mnemonics/
│   └── ...
│
├── memo/
│   ├── WorldCountriesMemo.tsx
│   │
│   ├── navigation/
│   │   └── MemoNavigationMap.tsx
│   │
│   └── subregion/
│       ├── SubregionMemoScreen.tsx
│       ├── SubregionOverview.tsx
│       │
│       ├── CountryLearningFlow.tsx
│       ├── countryLearningFlow.ts
│       │
│       ├── MemoryPreviewStep.tsx
│       ├── CountryWalkthroughStep.tsx
│       ├── LocationPracticeStep.tsx
│       ├── OrderedRecallStep.tsx
│       ├── CountryLearningComplete.tsx
│       │
│       ├── CountryLearningMap.tsx
│       ├── SubregionMemoryAid.tsx
│       ├── SubregionOrderSummary.tsx
│       ├── SubregionOrderEditor.tsx
│       └── CountryCapitalReference.tsx
│
├── quiz/
│   └── ...
│
└── index.ts
```

Do not create empty abstractions/files merely to match this diagram.

Use this as a dependency and readability target.

---

# 39. Dependency direction

Desired:

```text
                         data
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        subregions     learning    mnemonics
              │           │           │
              └───────────┼───────────┘
                          ▼
                         memo
                          │
                          ▼
                   React presentation
                          │
                          ▼
                Geography map adapter
                          │
                          ▼
                     SvgMapView
                          │
                          ▼
                 SvgMapController
```

Avoid a large component that directly owns:

```text
persistence
randomization
answer matching
country ordering
sequence repair
mnemonics
map DOM
learning completion
rendering
```

---

# 40. Subregion overview lifecycle

The overview should naturally change emphasis according to durable learning state.

## Not learned

```text
Countries
Not learned

[ Start learning countries ]
```

## Learned

```text
Countries
Learned ✓
```

The eventual capital-learning flow may then become the primary next action.

This ADR does not define its behavior.

---

# 41. Capital learning is intentionally deferred

The expected larger learning path remains:

```text
learn countries first
        ↓
learn capitals afterward
```

However, country learning is already a large independent change.

This ADR deliberately does not define:

```text
capital exposure
capital recall sequence
Country–Capital mnemonic timing
capital completion criteria
capital error/retry behavior
capital-specific progress persistence
```

The architecture must not prevent a later:

```text
CapitalLearningFlow
```

but must also not invent generic abstractions solely to guess its future design.

Use generic abstractions only where the current country-learning implementation genuinely justifies them.

---

# 42. Validation

Add focused tests for pure learning rules.

## Shuffle bag

Verify:

```text
all countries appear before reshuffle
deterministic injected randomness works
immediate repetition is avoided where intended
```

## Location recall

Verify:

```text
target = max(countryCount, configuredMinimum)
correct increments clean streak
wrong resets clean streak
wrong does not complete Stage A
target clean streak completes Stage A
selection remains balanced/randomized
```

## Ordered recall

Verify:

```text
starts at #1
correct advances
wrong reveals expected answer through outcome data
wrong rewinds two
rewind clamps to #1
wrong enters repair state
reaching #N in repair does not complete learning
repair eventually restarts at #1
clean #1 → #N pass completes
error during clean pass cancels that completion attempt
```

## Answer matching

Verify:

```text
case normalization
whitespace normalization
accent/punctuation normalization
aliases
fuzzy off
fuzzy on
reasonable misspellings
ambiguous close country names are rejected
```

## Persistent learning

Verify:

```text
completion stores countriesLearnedAt
temporary Stage A/B state is not persisted
Subregion order remains owned by SubregionMetadata
```

## Integration

Verify:

```text
overview → preview
preview → walkthrough
walkthrough → Stage A
Stage A complete → Stage B
Stage B clean pass → learned
learned state appears on overview
```

---

# Architectural constraints

1. Memo is initial learning, not mastery or long-term repetition.

2. Country learning is completed only by one clean full ordered recall from #1 through #N.

3. Stage A alone never marks the Subregion countries learned.

4. `SubregionMetadata.countryOrder` remains the owner of user-specific ordering.

5. Memo and Recite must not create separate country-order state.

6. Temporary learning-session state is not persisted.

7. Persist only durable learning facts.

8. `countriesLearnedAt` is Subregion learning-domain state, not React UI state.

9. Stage A uses balanced randomized country selection.

10. Stage A target is `max(countryCount, configured minimum)`.

11. A Stage A error resets the clean streak.

12. Stage B uses the effective Subregion order.

13. A Stage B error reveals the correction and rewinds two positions.

14. A repaired traversal cannot directly mark the Subregion learned.

15. Final completion requires a new clean #1 → #N pass.

16. World Countries fuzzy matching is configured in global Settings but applies only to World Countries.

17. Learning engines receive settings as configuration rather than importing the settings store.

18. Answer matching should not remain owned by the Quiz module once Memo also consumes it.

19. Learning rules should be pure/testable independently of React.

20. Do not use mutable classes for learning mechanics without an imperative-resource lifecycle.

21. `SvgMapController` remains framework- and Geography-domain-independent.

22. Learning engines operate on `CountryId`, never SVG path IDs.

23. SVG-ID translation remains an adapter responsibility.

24. The active learning UI should be intentionally sparse.

25. Subregion mnemonic content must not remain visible during blind recall as an answer clue.

26. Capital learning is out of scope for this ADR.

---

# Consequences

## Positive

The Subregion Memo screen gets a clear purpose.

Initial exposure and actual recall are separated.

The learner must demonstrate both:

```text
country name → location
```

and:

```text
location/sequence → country name
```

before the Subregion countries are considered learned.

The configured Subregion order gains practical use in both mnemonic learning and later Recite.

Learning algorithms become deterministic, testable code rather than React event-handler logic.

Temporary training mechanics do not pollute persistent domain state.

The map controller remains reusable and clean.

Capital learning can be designed independently after the country-learning experience has been validated.

## Cost

The existing Subregion Memo UI requires significant restructuring.

Several small feature-level learning modules are introduced.

The current quiz-owned answer matcher must become shared World Countries logic.

A reusable React adapter around `SvgMapController` may be justified to prevent navigation-map and learning-map lifecycle duplication.

The new workflow has more explicit state transitions than the current flat workspace.

---

# Non-goals

This ADR does not define:

* capital-learning mechanics;
* capital completion criteria;
* mastery;
* spaced repetition;
* Recite behavior;
* adaptive question scheduling;
* persistence of unfinished learning sessions;
* multiple alternative Subregion orders;
* automatic mnemonic generation;
* automatic country-order generation;
* timing-based walkthroughs;
* cloud synchronization;
* a generic application-wide learning framework;
* a generic application-wide shuffle utility without another concrete consumer.

---

# Summary

The new country-learning model is:

```text
SUBREGION OVERVIEW
        │
        ├── effective country order
        ├── Subregion mnemonic
        └── Start learning countries
                    │
                    ▼
             MEMORY PREVIEW
                    │
                    ▼
              WALKTHROUGH
             #1 → #N, study
                    │
                    ▼
          RANDOM LOCATION RECALL
           "Find country X"
                    │
          clean target reached
                    │
                    ▼
          ORDERED BLIND RECALL
          highlight #1 → type
          highlight #2 → type
                 ...
                    │
          wrong → reveal + back 2
                    │
          repair → restart at #1
                    │
                    ▼
          clean #1 → #N recall
                    │
                    ▼
          COUNTRIES LEARNED ✓
```

Persistent state remains intentionally small:

```text
SubregionMetadata
    └── user-specific countryOrder

SubregionLearningState
    └── countriesLearnedAt
```

Everything else in the learning session is temporary.

The governing principle is:

> **Memo should teach the Subregion once, verify one genuine clean recall, and then get out of the way of later Recite and mastery workflows.**
