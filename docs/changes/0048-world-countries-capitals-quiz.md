# Change Spec 0048 - Integrate World Countries Capitals Quiz with Practice

- **Status:** Implemented
- **Date:** 2026-08-29
- **Issue:** None.
- **Related ADRs:** `../adr/0032-model-world-countries-quiz-as-practice.md`
- **Related changes:** Change Spec 0043 reduced Drill coordinator
  responsibilities. Change Spec 0045 established the shared World-wide
  Subregion scope and Geography selection rail. Change Spec 0046 established
  lint/CI guardrails. Change Spec 0047 established feature-owned reactive
  refresh signals.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`
- **Repository / feature scope:** `JolleNo10/major-system-app` — World Countries / Countries only

## Goal

Add a top-level **Quiz** area with a finite randomized **Capitals** quiz while
strengthening the existing architecture rather than layering a second recall
implementation on top of the current Capitals Practice path.

The delivered design must:

1. model Quiz as **non-recording Practice semantics**;
2. reuse/refactor the existing finite Practice/recall mechanics;
3. remove avoidable Practice -> Drill presentation/mechanics coupling where the
   new second entry point proves the behavior is reusable;
4. reuse the shared World-wide geography setup seams from Change Spec 0045;
5. keep Quiz setup/session/results fully transient.

## Architectural outcome

The target is conceptually:

```text
WorldCountries shell
  Today
  Drill
  Recite
  Quiz
    -> practice/ Quiz orchestration

drill/
  recorded Drill ownership
  Learn & Practise setup integration
  delegates non-recording Practice execution

practice/
  non-recording Practice ownership
  existing Practice presentation/results as appropriate
  Capitals Quiz orchestration/results/retry

learning/
  recall skills
  answer matching
  purpose-neutral finite recall session mechanics

geography/
  World-wide Subregion scope
  live effective geography derivation

ui/
  GeographySelectionRail
  typed-answer lifecycle
  shared presentation primitives
```

Exact file names may vary.

Do not solve the feature as:

```text
existing Capitals Practice engine
+
new independent Quiz engine
```

## User-visible behavior

### World Countries navigation

The activity header becomes:

```text
[ Today ] [ Drill ] [ Recite ] [ Quiz ]
```

Today remains default.

Quiz is a separate user-facing destination even though its durable-effect
semantics are Practice.

Switching away from Quiz discards its transient setup/session/results.

### Quiz setup

The initial Quiz type is:

**Capitals**

Task copy:

> Given a Country, type its Capital.

Do not show disabled placeholders for future Quiz types.

Quiz setup reuses the existing shared World-wide Geography selector.

The initial selection is all currently active Subregions.

The learner may then select any World-wide combination of Subregions across one
or more Continents.

Setup presentation follows the existing World Countries setup pattern:

- left rail: `GeographySelectionRail`;
- center: `GeographyOverviewMap`;
- right rail: Quiz controls.

World-level map activation opens a Continent.
Continent-level map activation toggles that Country's Subregion.

Opening a Continent is navigation only and must not mutate selection.

The rail remains the authoritative selection surface.

### Question count

Quiz controls expose:

```text
10
20
50
All
```

A numeric value is disabled when the resolved scope contains fewer Countries.

Default:

1. 20 when possible;
2. otherwise 10 when possible;
3. otherwise All.

If Geography/Settings changes make the current numeric choice invalid while
setup is mounted, normalize it using the same rule.

Start requires:

- a non-empty normalized Geography selection;
- a valid question-count choice.

Setup map readiness must **not** gate Start because the active Quiz is
text-only.

### Starting a Quiz

Resolve Country membership through the shared Subregion scope/effective
geography seam, then create a randomized finite Practice run.

Rules:

- each selected Country can appear at most once;
- 10/20/50 selects that many unique Countries from the resolved scope;
- All uses the complete resolved scope once;
- question order is randomized;
- authored geography order does not become Quiz question order;
- the active run snapshots the Country records/IDs required to finish;
- later Settings/geography changes do not mutate an active run.

### Active Quiz

Version 1 is text-only.

Do not render:

- setup map;
- active map;
- mnemonic;
- Subregion/Continent hints;
- Drill rails;
- Practice learning-readiness map;
- Previous/Back question navigation.

Example:

```text
Question 7 / 20

What is the capital of Kyrgyzstan?

[ Type the capital __________________ ]

17 correct

[ Don't know ]
```

The Country name is the cue.

The answer input auto-focuses for each new question.

### Answer semantics

Use existing Country -> Capital recall matching:

- canonical `Country.capital`;
- `capitalAliases`;
- normalization;
- controlled fuzzy matching;
- current Settings fuzzy preference;
- `WorldCountriesTypedAnswer`;
- `capital` answer kind.

Scoring:

```text
exact      -> correct
fuzzy      -> correct
incorrect  -> missed
revealed   -> missed
```

Fuzzy remains correct and follows the existing shared fuzzy remediation
lifecycle.

Incorrect:

- record one miss;
- show the canonical Capital;
- use the normal correction lifecycle;
- advance;
- do not immediately retry the same Country.

**Don't know**:

- use the shared reveal behavior;
- record a revealed/missed outcome;
- show the canonical Capital;
- advance after correction feedback.

No answer/evidence from Quiz is durable.

### Results

After the last question show:

```text
17 / 20
85%

Correct 17
Missed 3
```

When misses exist, show only missed Countries in original Quiz order:

```text
Kyrgyzstan   Bishkek   Your answer: Biskek
Micronesia   Palikir   Didn't know
Burundi      Gitega    Your answer: Bujumbura
```

Actions:

- **Retry missed**
- **New quiz**
- **Change setup**

`Retry missed` appears only with misses.

### Retry missed

Retry missed creates another transient Practice run using exactly the immediately
completed run's missed Country IDs.

Rules:

- each missed Country once;
- reshuffled;
- ignores original 10/20/50 limit;
- may be repeated after another imperfect retry;
- perfect result hides Retry missed.

### New quiz

New quiz uses the currently configured Geography scope and question-count
choice, not the retry subset.

Re-resolve the current active population before creating the new normal run.

### Change setup

Return to setup, clear run/results, and retain the transient Geography selection
after normalizing it against the current active population.

## Scope

### 1. Add Quiz to the shell

Update `WorldCountries.tsx` to expose four user-facing areas.

Do not add Quiz to `WorldCountriesDrillMode`.

Do not create `src/features/world-countries/quiz/`.

Quiz should enter through the Practice capability, for example:

`src/features/world-countries/practice/WorldCountriesQuiz.tsx`

Equivalent naming is acceptable.

### 2. Establish/strengthen explicit Practice ownership

Add:

`src/features/world-countries/practice/`

for non-recording Practice-specific behavior that now has more than one
user-facing entry point.

Before adding Quiz-specific session mechanics, inspect the existing Practice
path in:

- `WorldCountriesDrill.tsx`;
- `DrillSession.tsx`;
- `PracticeSessionRails.tsx`;
- `PracticeResults.tsx`;
- `PracticeResultsRails.tsx`;
- `learning/learnPracticeModes.ts`.

Move/extract Practice-specific ownership where needed so Quiz does not depend on
private Drill presentation/state.

At minimum, after implementation:

- Quiz must not import from `drill/`;
- existing Capitals Practice and Quiz must not maintain separate finite recall
  progression algorithms;
- Practice-specific presentation/results should no longer require a new top-level
  Practice consumer to route through Drill presentation.

Prefer migrating the existing non-recording Practice presentation/results into
`practice/` when doing so directly removes the coupling required for Quiz.

Do not perform unrelated Drill cleanup.

### 3. Extract purpose-neutral finite recall mechanics instead of copying them

The current finite session mechanics in `drillSessionState.ts` include behavior
that is generic to a Country/skill sequence.

Extract the genuinely purpose-neutral subset to an appropriate existing owner,
preferably under `learning/`, where current architecture already places recall
skills, answer matching, and pure session mechanics.

A reasonable API is equivalent to:

```ts
interface WorldCountriesRecallSessionState {
  countryIds: readonly CountryId[]
  countryOrder: readonly CountryId[]
  skills: readonly WorldCountriesRecallSkill[]
  countryIndex: number
  stepIndex: number
  phase: 'active' | 'complete'
}

createRecallSession(...)
getCurrentRecallStep(...)
advanceRecallStep(...)
getRecallSessionTotalSteps(...)
```

Exact naming is flexible.

Constraints:

- no Drill mode in the generic type;
- no evidence writes;
- no Practice score policy;
- no rails/presentation;
- no persistence;
- no map state.

Migrate recorded Drill and existing non-recording Practice callers as necessary
so there is one low-level progression algorithm.

A small Drill-owned adapter may preserve Drill mode compatibility.

Do not create another equivalent progression implementation under `practice/`
or Quiz.

### 4. Keep Practice answer/result semantics Practice-owned

Quiz needs richer transient answer outcomes than a Drill-only `correct` boolean:

```ts
type PracticeRecallOutcome =
  | 'exact'
  | 'fuzzy'
  | 'incorrect'
  | 'revealed'
```

A Practice-owned answer record may include:

```ts
interface PracticeRecallAnswer {
  countryId: CountryId
  skill: WorldCountriesRecallSkill
  outcome: PracticeRecallOutcome
  submittedAnswer?: string
}
```

Equivalent shape is acceptable.

Practice owns transient score/miss/retry derivation.

Where current `drillResultSummary.ts` contains calculations that are genuinely
purpose-neutral and needed by both recorded Drill and Practice, extract only
those calculations to an appropriate shared World Countries recall seam and
migrate both callers.

Do not make Practice import `DrillAnswerRecord` merely to reuse result helpers.

### 5. Preserve existing Learn & Practise behavior while decoupling ownership

Existing non-recording Practice modes remain:

- Locate Countries;
- Locate Capitals;
- Capitals.

Their user-visible behavior should remain unchanged by the architectural
extraction.

`WorldCountriesDrill` may continue to own the Learn & Practise setup choice and
phase transition, but Practice execution/presentation should be delegated to
the Practice capability.

Do not change:

- current Practice map interactions;
- current Practice random ordering;
- current transient accuracy/results;
- current no-evidence invariant;
- current exit/run-again behavior except for internal delegation needed by the
  refactor.

This is a migration, not a redesign of existing Practice.

### 6. Do not let recorded Drill presentation remain the generic Practice host

Current `DrillSession.tsx` branches on `activity === 'practice'`.

The implementation should reduce this coupling rather than add another branch
for Quiz.

Acceptable approaches include:

- extracting a purpose-neutral recall interaction component and giving Drill
  and Practice separate thin presenters; or
- extracting Practice-specific presentation into `practice/` while retaining a
  small shared lower-level task interaction seam.

The target is that Quiz does not need:

```text
activity="quiz"
```

added to `DrillSession`.

Do not grow `DrillSession` into a Drill/Practice/Quiz mega-component.

### 7. Reuse the shared World-wide geography model

Quiz setup uses:

- `geography/subregionScope.ts`;
- stable `SubregionId`;
- the shell-provided active Country population;
- current effective geography metadata/order;
- `useWorldCountriesGeographyRevision()`;
- `GeographySelectionRail`;
- `GeographyOverviewMap`.

Do not create:

- `quizScope.ts`;
- `assessmentScope.ts`;
- a parallel World/Continent/Subregion type;
- Quiz-owned geography persistence.

### 8. Avoid copying live geography derivation

The current Recite/Drill setup paths already derive live metadata/order.

If implementing Quiz would copy a substantial block equivalent to:

```text
subscribe geography revision
read world/continent/subregion metadata
derive world order
derive open-Continent Subregions
normalize selected Subregion scope
derive selected Countries/count/label
```

extract a narrow feature-local geography **read/derivation** seam and migrate
the existing compatible caller(s) in the same change.

Keep workflow-owned state outside that seam:

- selected Subregion IDs;
- setup navigation Continent;
- phase;
- Quiz count;
- Drill purpose/proficiency;
- Recite mode/assistance.

Do not create a large configurable setup coordinator.

### 9. Reuse typed-answer behavior

Quiz uses `WorldCountriesTypedAnswer`.

Because Quiz has no active `MapSurface`, render its child-provided
`feedbackOverlay` inline.

Do not duplicate:

- focus/reset;
- blank prevention;
- fuzzy remediation;
- feedback timers;
- transition protection.

Quiz supplies Practice-owned scoring/transition semantics.

### 10. Run snapshot

At Start snapshot:

- resolved selected Country records;
- randomized selected Country IDs;
- selected question count for that run.

Active session must not depend on live Settings/geography membership after
launch.

A later normal New quiz re-resolves current live setup state.

### 11. No persistence/evidence

Quiz and Practice extraction must not add or alter durable state.

Quiz must not write:

- atomic recall attempts;
- Drill preferences;
- Drill proficiency;
- Learning milestones;
- Learning Readiness;
- Today queue/review state;
- Recite outcomes;
- Maintenance state;
- localStorage Quiz history.

## Architectural guardrails

The implementation must satisfy all of the following.

### No fourth semantic

Architecture documentation must describe Quiz as **Practice semantics**.

Do not add an `Assessment` durable semantic category.

### No parallel session engine

There must not be both:

```text
drill finite recall progression
practice/quiz finite recall progression
```

implementing the same Country/skill stepping independently.

### No Practice -> Drill dependency for Quiz

`practice/WorldCountriesQuiz*` must not import `drill/*`.

### No mega component

Do not turn DrillSession, GeographySelectionRail, or a new component into a
large mode-switched Drill/Practice/Quiz framework.

### Refactor when the second consumer proves reuse

When Quiz needs an algorithm currently owned by Drill but semantically neutral,
extract it to the existing appropriate owner and migrate the current caller.

Do not copy first and leave consolidation for later.

### Preserve bounded scope

Do not use this feature as authorization to refactor unrelated Learning,
Recite, Today, map-controller, persistence, or app architecture.

## Suggested responsibility split

One acceptable result is:

```text
learning/
  recallSession.ts             # pure Country/skill progression
  recallAnswerMatching.ts      # existing

practice/
  practiceModes.ts             # non-recording Practice identity
  practiceRun.ts               # Practice random subset/run/result semantics
  PracticeSession.tsx          # existing map-backed Practice
  PracticeResults.tsx
  WorldCountriesQuiz.tsx       # top-level Quiz coordinator
  CapitalsQuizSession.tsx      # text-only Quiz presentation
  QuizResults.tsx

drill/
  WorldCountriesDrill.tsx      # recorded Drill + setup/Learn & Practise orchestration
  DrillSession.tsx             # recorded Drill presentation
  DrillResults.tsx
```

This is guidance, not a mandatory filename layout.

Prefer fewer files when responsibilities remain clear.

## Tests

### Shared recall mechanics

Protect the extracted purpose-neutral session behavior:

- unique Countries;
- supplied order;
- supplied skills;
- Country/skill stepping;
- completion;
- no workflow-specific side effects.

Existing Drill tests must remain green after migration.

### Existing Practice regression

Prove existing Practice still:

- uses random Country ordering;
- remains non-recording;
- supports all three existing modes;
- preserves map interaction where applicable;
- produces its current transient results;
- Run again/change setup still work.

### Quiz scope/count

Cover:

- initial all-active-World selection;
- multi-Continent Subregion selection;
- navigation does not change selection;
- active-population normalization;
- 20 -> 10 -> All default rule;
- invalid numeric options;
- empty scope.

Do not duplicate exhaustive tests already owned by
`geography/subregionScope.test.ts`.

### Quiz run/results

Cover:

- 10/20/50 subset uniqueness;
- All includes each Country once;
- random question order;
- exact/fuzzy correct;
- incorrect/revealed missed;
- submitted miss text;
- miss order;
- Retry missed exact membership;
- repeated retry;
- perfect retry;
- New quiz uses configured scope, not retry subset;
- run snapshot survives active-population changes.

### Shell

Update shell tests for:

- four tabs;
- Today default;
- Quiz navigation;
- leaving/re-entering Quiz discards transient state.

### Architecture/dependency

Add/adjust focused tests so a future Quiz implementation cannot import private
`drill/` modules as its session engine.

The repository-wide dependency guardrail need not learn every World Countries
subfolder unless that is the smallest reliable enforcement. A focused
feature-local architecture test is acceptable.

## Acceptance criteria

- [x] World Countries exposes Today, Drill, Recite, and Quiz; Today remains
  default.
- [x] Quiz is documented and implemented as Practice semantics, not a fourth
  Assessment semantic.
- [x] No `world-countries/quiz/` directory is created.
- [x] No standalone `assessment/` semantic/package is introduced for v1 Quiz.
- [x] A `practice/` capability owns the new Quiz and the non-recording
  Practice-specific behavior needed by more than one entry point.
- [x] Quiz does not import private `drill/` implementation.
- [x] Existing Capitals Practice and Quiz do not maintain independent finite
  Country/skill progression algorithms.
- [x] Purpose-neutral finite recall progression currently trapped in Drill is
  extracted/migrated rather than copied where necessary.
- [x] Existing Learn & Practise Practice behavior remains user-visible
  compatible.
- [x] `DrillSession` is not extended with a new Quiz activity branch or turned
  into a Drill/Practice/Quiz mega-component.
- [x] Quiz setup consumes `WorldCountriesSubregionScope` and
  `GeographySelectionRail`.
- [x] Quiz setup may span multiple Continents and initially selects the current
  active World.
- [x] Quiz setup does not read/write Drill preferences.
- [x] Quiz Start is not blocked by setup-map readiness.
- [x] Quiz supports 10, 20, 50, and All with specified validation/defaults.
- [x] Active Quiz is text-only.
- [x] Question membership/order is snapshotted and randomized with no duplicate
  Country IDs.
- [x] Country -> Capital answers use existing matching, aliases, fuzzy policy,
  and typed-answer lifecycle.
- [x] Exact/fuzzy score correct; incorrect/revealed score missed.
- [x] Results show score/accuracy and miss-only review.
- [x] Retry missed contains exactly the current run's misses once each.
- [x] New quiz uses the configured scope/count, not retry membership.
- [x] Quiz writes no durable learner state or preferences.
- [x] Settings/geography changes do not mutate an active Quiz run.
- [x] Existing Drill, Practice, Recite, Today, and Learning behavior remains
  green.
- [x] `npm run lint` passes.
- [x] `npx vitest run src/features/world-countries` passes.
- [x] `npm run typecheck` passes.
- [x] `git diff --check` passes.
- [x] `docs/architecture/features/WORLD_COUNTRIES.md` reflects the new
  integrated ownership model.

## Source anchors

- `src/features/world-countries/WorldCountries.tsx`
- `src/features/world-countries/WorldCountries.test.tsx`
- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/drill/drillSessionState.ts`
- `src/features/world-countries/drill/drillSessionLaunch.ts`
- `src/features/world-countries/drill/drillOrder.ts`
- `src/features/world-countries/drill/PracticeSessionRails.tsx`
- `src/features/world-countries/drill/PracticeResults.tsx`
- `src/features/world-countries/drill/PracticeResultsRails.tsx`
- `src/features/world-countries/drill/drillResultSummary.ts`
- `src/features/world-countries/learning/learnPracticeModes.ts`
- `src/features/world-countries/learning/recallAnswerMatching.ts`
- `src/features/world-countries/geography/subregionScope.ts`
- `src/features/world-countries/geography/geographyRefresh.ts`
- `src/features/world-countries/ui/GeographySelectionRail.tsx`
- `src/features/world-countries/ui/WorldCountriesTypedAnswer.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md`.

Required current-state statements:

- four user-facing areas: Today, Drill, Recite, Quiz;
- three activity semantics remain Drill, Learning, Practice;
- Quiz is a Practice-semantic top-level experience;
- `practice/` owns reusable non-recording Practice behavior/Quiz;
- Drill may orchestrate Learn & Practise setup but does not own generic
  non-recording Practice mechanics/presentation needed by multiple entry points;
- purpose-neutral finite recall mechanics are shared from their appropriate
  owner;
- shared geography scope/selection remains under geography/ui;
- Quiz is transient and non-recording.

Do not rewrite historical Change Specs.

## Verification

Complete when status becomes `Implemented`.

- Implemented and verified on 2026-08-29.
- Evidence:
  - focused shared-recall/Practice/Quiz tests and existing Practice regression tests;
  - `npm run lint`;
  - `npx vitest run src/features/world-countries` (107 files, 551 tests);
  - `npm run typecheck`;
  - `git diff --check`;
  - browser smoke verification was attempted, but no browser backend was
    available in the execution environment.
