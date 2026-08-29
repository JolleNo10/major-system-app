# ADR 0032 - Model World Countries Quiz as Practice

- **Status:** Accepted
- **Date:** 2026-08-29
- **Deciders:** Product owner / repository maintainer

## Context

World Countries currently distinguishes three activity semantics:

- **Drill** — recorded recall that may write atomic evidence;
- **Learning** — guided acquisition that may write its owned milestone;
- **Practice** — repeatable, non-recording rehearsal with only transient
  session/results state.

The product now needs a fourth **user-facing area** called **Quiz**, starting
with a finite randomized Country -> Capital quiz.

A Quiz run has the same durable-effect semantics as Practice:

- it rehearses an existing recall skill;
- it is finite;
- it may show score/accuracy/results;
- it must not write Drill evidence, Learning milestones, proficiency,
  preferences, review state, or another durable learner signal.

The repository already has a non-recording `Capitals` Practice mode. That path
already uses:

- Country -> Capital recall;
- random Country ordering;
- finite session progression;
- shared World Countries answer matching;
- shared typed-answer behavior;
- transient answer/result calculation.

Creating an independent `assessment/` session engine for Quiz would therefore
duplicate an existing semantic and mechanics stack. It would also contradict
the existing Practice boundary, which explicitly allows purpose-neutral session
and result mechanics to be shared while keeping presentation/workflow
semantics separate.

The current implementation still places several Practice-specific pieces under
`drill/`, including Practice presentation/results and shared finite recall
session mechanics. A second entry point for Practice is the point at which that
coupling should be reduced rather than copied.

## Decision

### 1. Quiz is a user-facing area, not a fourth learning semantic

World Countries may expose four top-level user-facing areas:

```text
Today
Drill
Recite
Quiz
```

But Quiz is governed by **Practice semantics**.

Do not introduce a new durable semantic named Assessment.

Do not create a new evidence, mastery, scheduling, or persistence category for
Quiz.

### 2. Introduce an explicit `practice/` capability

Add:

`src/features/world-countries/practice/`

as the owner of non-recording World Countries Practice behavior that is no
longer specific to the Drill entry point.

The new top-level Quiz is implemented through this Practice capability.

The existing Learn & Practise entry may continue to be orchestrated from the
Drill setup, but it must delegate non-recording Practice execution and
Practice-specific presentation/results to the Practice owner rather than
requiring Practice to remain a Drill presentation variant.

The exact migration boundary is implementation-defined, but after this change
`practice/` should own the semantics that are specifically non-recording
Practice, including the Quiz-specific finite run/results behavior.

### 3. Extract only genuinely purpose-neutral recall mechanics

Finite Country/skill session progression is not inherently Drill behavior.

If the current implementation keeps that algorithm in `drill/`, extract the
small purpose-neutral mechanics to an existing appropriate owner, preferably
under `learning/` alongside recall skills, answer matching, and pure session
mechanics.

A suitable conceptual seam is:

```text
learning/recallSession.ts
```

owning only mechanics equivalent to:

- unique Country membership;
- supplied Country order;
- supplied recall-skill sequence;
- current Country/skill step;
- step advancement;
- completion.

It must not own:

- Drill evidence;
- Practice/Quiz scoring policy;
- Drill mode identity;
- rails/panels;
- persistence;
- map presentation;
- retry-missed policy.

Recorded Drill and non-recording Practice may both consume this pure seam.

Do not introduce a generic application-wide state-machine framework.

### 4. Do not duplicate geography setup

Quiz setup consumes the existing World Countries geography architecture:

- `geography/subregionScope.ts`;
- current effective geography metadata/order;
- the feature-owned geography revision signal;
- `ui/GeographySelectionRail.tsx`;
- `maps/GeographyOverviewMap.tsx`.

Do not create a Quiz/Practice-specific parallel geography selection model.

If implementation would otherwise copy a non-trivial block of live,
purpose-neutral geography derivation from another workflow, extract a narrow
read/derivation seam under `geography/` and migrate the existing caller in the
same change.

Do not create a large configurable setup component that owns workflow behavior.

### 5. Keep presentation semantics separate

Shared low-level mechanics do not mean Drill and Practice share presentation.

Recorded Drill keeps Drill-specific:

- evidence behavior;
- mnemonic assistance semantics;
- Drill rails;
- Drill results/actions;
- Drill mode/purpose presentation.

Practice keeps Practice-specific:

- non-recording messaging;
- Practice/Quiz results;
- Practice actions;
- map-backed Practice presentation where applicable;
- text-only Quiz presentation where specified.

A shared session primitive must not force Quiz to render Drill rails, Drill
results, or a map.

### 6. No durable Quiz state in this decision

Quiz setup/session/results are transient.

A future requirement for:

- Quiz history;
- personal bests;
- achievements;
- Quiz-derived review;
- Quiz-derived mastery;

requires a separate persistence/evidence decision.

## Consequences

- The product gains a fourth top-level area without inventing a fourth learner
  state semantic.
- The first Quiz reuses and improves the existing Practice architecture rather
  than creating a parallel assessment stack.
- Existing Capitals Practice and Quiz share purpose-neutral finite recall
  mechanics.
- `drill/` becomes less responsible for non-recording Practice-specific
  behavior.
- `practice/` becomes the explicit home for reusable non-recording Practice
  behavior and the top-level Quiz surface.
- `learning/`, `geography/`, and `ui/` remain the owners of their existing
  purpose-neutral capabilities.
- The removed `quiz/` package remains removed; user-facing Quiz does not imply a
  `world-countries/quiz/` implementation directory.

## Alternatives considered

### Add `assessment/` as a fourth semantic owner

Rejected. The requested v1 Quiz has the same durable-effect semantics as
Practice and duplicates the existing Capitals Practice capability.

### Implement Quiz directly on `drillSessionState.ts`

Rejected. That would make a top-level non-recording Practice surface depend on
Drill-owned internals and preserve the coupling the Practice boundary was meant
to avoid.

### Copy the existing Capitals Practice session into a new Quiz engine

Rejected. The existing Practice already proves the mechanics are reusable.
Duplicating progression, matching, randomization, and results would be additive
architecture rather than integration.

### Move all setup/workflow behavior into one configurable component

Rejected. Shared geography semantics/presentation should remain reusable, while
workflow state and transitions remain with their owning coordinator.

## Current-state documentation impact

When implemented, update:

- `docs/architecture/features/WORLD_COUNTRIES.md`

to distinguish:

1. user-facing areas: Today / Drill / Recite / Quiz; and
2. activity semantics: Drill / Learning / Practice.

Document `practice/` ownership, Quiz-as-Practice semantics, shared finite recall
mechanics, and the non-recording invariant.

No new persistence architecture is introduced.

## Implementation confirmation

Confirmed implemented on 2026-08-29. The World Countries shell now exposes
Quiz as a fourth user-facing area while retaining Drill, Learning, and Practice
as the only activity semantics. `practice/` owns the non-recording Quiz and
existing Practice presenters, and both recorded Drill and Practice consume the
purpose-neutral `learning/recallSession.ts` cursor. Quiz setup, runs, results,
and retries remain transient and do not write learner state.
