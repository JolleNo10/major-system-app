# Change Spec 0050 - Add World Countries Neighbours Quiz

- **Status:** Ready
- **Date:** 2026-08-29
- **Issue:** None.
- **Related ADRs:** `../adr/0032-model-world-countries-quiz-as-practice.md`
- **Related changes:** Change Spec 0048 integrated the top-level Capitals Quiz with Practice.
- **Current-state docs:** `../architecture/features/WORLD_COUNTRIES.md`
- **Repository / feature scope:** `JolleNo10/major-system-app` — World Countries / Countries only

## Goal

Add a second top-level Quiz type, **Neighbours**, where the learner recalls every
Country that shares a land border with a prompted Country. The map is the memory
surface: the target starts isolated, each correct neighbour is revealed in place,
and optional hints can expose the total count or surrounding unlabeled geography.

The change must extend the existing Practice-owned Quiz architecture rather than
create another Quiz package, evidence path, persistence model, or generic session
framework.

## User-visible behavior

### Quiz type

Quiz setup exposes a type choice with the currently implemented quiz and the new
mode:

```text
Capitals
Neighbours
```

Capitals keeps its existing behavior.

Neighbours copy should communicate the task directly, for example:

> Given a Country, name every Country that shares a land border with it.

The existing World-wide Subregion geography selector remains the setup scope.
The selected geography determines which Countries may become **target
questions**. It does **not** limit which Countries are valid neighbour answers.

### Eligible target Countries

A Country is eligible for a Neighbours question only when it has at least one
land-border neighbour in the current active World Countries population.

Question-count availability (`10`, `20`, `50`, `All`) is based on the eligible
target count for the selected geography and current active population, not the
raw selected Country count.

Changing Quiz type while setup is mounted re-normalizes the selected question
count using the existing question-count rules.

### Starting a run

At Start:

1. resolve the selected geography through the existing effective geography seam;
2. resolve the current active Country population from Settings;
3. derive each candidate target's effective land-border neighbours by filtering
   the canonical border graph to the active Country population;
4. remove targets with zero effective neighbours;
5. choose the requested unique randomized target Countries; and
6. snapshot the target order, Country records needed by the run, and each
   target's required neighbour IDs.

Later Settings/geography changes must not mutate an active run.

### Active question

A question is conceptually:

```text
Question 3 / 10

Name the countries that border Germany

                 [ MAP ]

[ Type a country __________________ ]

[ Show number ]  [ Reveal map ]

[ Reveal remaining ]
```

Use the **world map** for active Neighbours questions so cross-Continent and
transcontinental borders do not depend on the app's Continent assignment.

At the start of a target:

- the prompted Country is visible and highlighted;
- other canonical Country geometry is hidden from the recall surface;
- the viewport is fitted to the prompted Country **plus all required effective
  neighbours**, even while those neighbours are hidden;
- Country names, hover names, and map interaction are disabled.

The prompt text remains the source of the target Country name.

### Correct neighbour answer

The learner may enter required neighbours in any order.

When an entered Country resolves to an unrecalled required neighbour:

- accept exact or enabled controlled-fuzzy matching through the existing World
  Countries Country-name matching responsibility;
- mark that neighbour as found;
- reveal its geometry on the existing map;
- visually distinguish found geometry from the target and from neutral map
  context;
- clear and refocus the input immediately; and
- keep the same target active until every required neighbour is resolved.

Do not transition after each correct answer.

When all required neighbours were named, briefly show the completed map and
advance to the next target. The last target proceeds to results.

### Duplicate answer

Entering a neighbour already found shows concise feedback such as:

> Already found.

It must not alter score, reveal another answer, or break an otherwise perfect
target. Clear/refocus the input so recall can continue.

### Incorrect answer

If the input resolves to a Country that is not a required neighbour, or cannot
be resolved to one unambiguous Country:

- show concise transient feedback;
- reveal no new Country;
- keep the current target active;
- record an incorrect guess for the current target; and
- clear/refocus the input.

A wrong guess does not consume or resolve any required neighbour.

### Hint: Show number

`Show number` reveals the total required neighbour count for the current target.
Once used, it may present progress as:

```text
Neighbours found: 2 / 9
```

It does not reveal identities or change the score.

The hint state resets for every new target.

### Hint: Reveal map

`Reveal map` exposes the surrounding **unlabeled geographic context** in the
current fitted viewport while keeping:

- Country names hidden;
- hover names disabled;
- map interaction disabled;
- the target visually distinct; and
- already found neighbours visually distinct.

It must not specially identify which unrecalled visible shapes are required
neighbours. Non-neighbour Countries may therefore be visible in the local
context.

Using Reveal map does not change the score.

The hint state resets for every new target.

### Reveal remaining / give up

A learner must not be trapped on a target.

`Reveal remaining`:

- resolves every still-missing required neighbour as revealed/missed;
- shows those Countries on the map and exposes their names for review;
- records the target as imperfect; and
- provides an explicit Continue action to move on after review.

### Progress and score semantics

Neighbour recall is scored at both neighbour and target level.

Track at least:

- total required neighbours across the run;
- neighbours named by the learner;
- neighbours revealed by `Reveal remaining`;
- incorrect guesses; and
- perfect target Countries.

A target is **perfect** when every required neighbour was named and there were
no incorrect guesses for that target.

The following do not prevent perfection:

- Show number;
- Reveal map; or
- duplicate submissions of an already found neighbour.

A controlled-fuzzy accepted Country name counts as named/correct.

### Results

Results should emphasize the actual recall unit, for example:

```text
Neighbours named 48 / 55
Perfect countries 7 / 10
Wrong guesses 3
```

For imperfect targets, provide a compact review containing enough information
to understand what went wrong, including revealed/missed neighbours and wrong
Country guesses where applicable.

Actions remain consistent with Capitals Quiz:

- **Retry missed**
- **New quiz**
- **Change setup**

For Neighbours, `Retry missed` means retry every target Country that was not
perfect in the immediately completed run. Each such target appears once in a
reshuffled retry run, regardless of the configured 10/20/50 limit.

`New quiz` uses the currently configured setup and re-resolves the current live
active population.

`Change setup` returns to setup and retains the transient geography/type/count
choices after normalizing them against current data.

## Land-border semantics and canonical data

### Definition

For this feature a neighbour is another World Countries entity sharing an
international terrestrial or inland-boundary frontier with the target.

Count:

- ordinary land frontiers;
- river boundaries; and
- lake/inland-water boundaries that form the international frontier.

Do not count:

- maritime-only adjacency;
- proximity across a strait or sea;
- a bridge/causeway/tunnel across maritime water by itself; or
- an entity merely because it belongs to or is governed by a bordering
  sovereign state.

### Canonical graph

Add a feature-owned static land-border reference under `data/` using stable
`CountryId` values. Prefer one undirected unique pair per relationship and derive
adjacency from those pairs rather than authoring duplicate arrays on every
Country.

Use the reviewed `landBorders.ts` input supplied with this Change Spec. It
contains **315 unique undirected pairs** over the current canonical World
Countries entities.

The implementation must not perform runtime web/API lookups for border data.

### Active-population filtering — do not contract disabled entities

The canonical graph is high-resolution for World Countries entities. Effective
quiz neighbours are the canonical neighbours whose IDs are present in the
run's active Country population.

If an optional entity is disabled, remove that entity and its incident edges.
Do **not** transfer its territory, contract the graph, or synthesize edges
between its neighbours.

Required Kosovo example:

```text
Partially recognized sovereign states ON

Serbia ↔ Kosovo ↔ Albania
```

Relevant canonical edges include:

```text
RS ↔ XK
XK ↔ AL
XK ↔ ME
XK ↔ MK
```

When Kosovo is inactive:

```text
Serbia   [Kosovo neutral/not an answer]   Albania
```

Therefore:

- Serbia no longer requires Kosovo;
- Serbia does **not** gain Albania as a neighbour; and
- Albania does not gain Serbia through the disabled Kosovo entity.

Apply the same filter-not-transfer rule to every optional Country group,
including observer states, territories/dependencies, and special political
status entities.

### Non-app territories are not reassigned

A border belonging to a geographic entity not represented as a World Countries
Country is not reassigned to its sovereign state merely to preserve an edge.

Examples required by the reviewed input:

- French Guiana does not create `FR ↔ BR` or `FR ↔ SR`;
- excluded Western Sahara does not create `MA ↔ MR`;
- Gibraltar does not become a UK neighbour edge for Spain.

Spain ↔ Morocco remains a direct edge because Spanish territory at
Ceuta/Melilla directly meets Morocco and those Spanish territories are not a
separate Country entity in this feature.

### Tartupaluk / Hans Island

Do not add `CA ↔ GL` in this change. Although Canada, Denmark, and Greenland
signed a 2022 agreement that would create a land boundary on Tartupaluk/Hans
Island, the reviewed current official material did not establish that the treaty
had entered into force. Treat this as a future data-review item rather than
speculating in the quiz dataset.

## Scope

### 1. Add Neighbours to the existing Quiz coordinator

Extend the implemented `practice/WorldCountriesQuiz.tsx` flow rather than
creating a new top-level activity or `quiz/` package.

Setup should own transient Quiz type selection and route to the appropriate
session/results behavior.

Do not change the existing Capitals Quiz semantics except where a narrow
refactor is needed to support two Quiz types cleanly.

### 2. Add canonical border data and query helpers

Add the reviewed border pair data under `src/features/world-countries/data/`
or the closest equivalent data owner established by the current repository.

Provide a narrow query seam equivalent to:

```ts
getLandBorderNeighbourIds(countryId)
getEffectiveLandBorderNeighbourIds(countryId, activeCountryIds)
hasEffectiveLandBorderNeighbours(countryId, activeCountryIds)
```

Exact names are implementation-defined.

Keep canonical facts separate from workflow state.

### 3. Add a Neighbours Practice/Quiz run model

Neighbours is a multi-answer prompt and should have Practice-owned transient run
state appropriate to that interaction.

Snapshot at launch at least:

- randomized unique target Country IDs;
- Country records needed for matching/presentation;
- required effective neighbour IDs per target; and
- configured question count/type metadata needed to finish the run.

Do not persist this state.

### 4. Do not distort single-answer recall abstractions

The existing `WorldCountriesTypedAnswer` lifecycle is designed for one prompt →
one resolved answer → transition. Neighbours requires multiple accepted answers
without leaving the prompt.

Do **not** force Neighbours through that component by adding complicated
multi-answer mode branches that weaken its existing contract.

Similarly, do not add a fake evidence/recall skill solely to make the existing
Country/skill cursor fit this Quiz.

A small Practice-owned Neighbours session coordinator is appropriate because it
owns the genuinely different multi-answer interaction. Reuse lower-level
Country-name normalization/matching and map presentation responsibilities.

### 5. Reuse/extend Country-name matching

Neighbour entry must use the existing `learning/answerMatching.ts` Country-name
normalization, aliases, and controlled fuzzy semantics.

If the new workflow needs to resolve one free-text value to a unique Country
from a candidate population, add a narrow reusable resolver in that existing
answer-matching responsibility rather than reimplementing normalization/fuzzy
logic under `practice/`.

Ambiguous matches must not be accepted as an arbitrary Country.

### 6. Extend generic map zoom rather than add Quiz map logic

`GeographyOverviewMap` already owns workflow-neutral visibility/highlighting and
translates canonical Country IDs to SVG IDs.

Add a generic caller-controlled explicit Country zoom input, equivalent to:

```ts
zoomCountryIds?: readonly CountryId[]
```

When supplied, it should resolve those Countries through the existing map
adapter and use them as the map's explicit zoom/fitting set even when some are
hidden.

The prop must remain workflow-neutral; do not add Neighbours-specific concepts
to `maps/`.

Neighbours uses the world map and supplies:

- target highlight;
- found-neighbour colors/highlights;
- hidden Country IDs before geographic assistance;
- explicit target + required-neighbour zoom IDs; and
- non-interactive/no-name presentation.

### 7. Preserve neutral optional geography on map assistance

The active population controls **answers**, not whether excluded canonical
entities cease to exist geographically.

When Reveal map is used, optional canonical entities that are disabled in
Settings may appear as neutral unlabeled geography. They must never become
required answers and must not be visually merged into another Country.

Prefer using the complete canonical Country population for geographic context
while keeping the snapshotted active population authoritative for neighbour
answers.

### 8. Results and retry stay Practice-owned

Do not write Drill evidence, Learning milestones, proficiency, review state,
Quiz history, or preferences from Neighbours.

Neighbour-specific result/retry derivation belongs under `practice/`. Reuse
current Capitals result presentation only where the data shapes genuinely fit;
do not force unrelated one-answer-per-Country records into the multi-answer
model.

## Interaction and states

Neighbours has transient setup, active, reveal-review, and results states.

Per target, maintain transient state for:

- found neighbour IDs;
- revealed neighbour IDs;
- incorrect guesses;
- Show number used;
- Reveal map used; and
- active/reveal-review completion state.

Input should auto-focus on target entry and refocus after every submission.
Keyboard Enter submits the current Country text through the ordinary form
semantics.

Map load failure must not corrupt run state. The typed Neighbours quiz may
continue with its prompt/input/hints even if the map cannot render; map-dependent
hints may be unavailable with concise fallback messaging.

## Architecture constraints

Follow `docs/architecture/features/WORLD_COUNTRIES.md` and ADR 0032.

Specifically:

- Quiz remains a user-facing area with **Practice semantics**;
- `practice/` owns Quiz orchestration/results;
- no `src/features/world-countries/quiz/` package;
- no durable Quiz/evidence state;
- canonical geopolitical facts belong in `data/`;
- Country IDs are canonical and SVG IDs remain a `maps/` translation concern;
- map visibility/zoom remains generic caller-controlled presentation;
- the selected Subregions remain the existing shared World-wide setup scope;
- do not introduce a parallel geography model; and
- do not introduce a generic application-wide multi-answer/session framework.

This change does **not** require a new ADR. It extends the architecture already
established by ADR 0032 and the current World Countries ownership document.

## Existing capabilities to reuse

- `practice/WorldCountriesQuiz.tsx` — current top-level Quiz setup/orchestration.
- `practice/practiceRun.ts` — existing Capitals run/count/randomization patterns;
  reuse narrow generic pieces where they fit instead of forcing Neighbours into
  the Capitals answer shape.
- `learning/answerMatching.ts` — Country normalization, aliases, controlled fuzzy
  matching.
- `geography/subregionScope.ts` and current geography read seam — target setup
  scope/effective ordering.
- `WorldCountriesPopulationContext` / `geography/countrySet.ts` — active Country
  population policy.
- `maps/GeographyOverviewMap.tsx` and `geographyMapAdapter.ts` — world map,
  canonical Country-to-SVG translation, hidden/highlighted Country presentation.
- `ui/WorldCountriesActivity.tsx` / map activity primitives — reuse if they fit
  the active map-centered presentation without adding mode-specific branches to
  shared UI.

## Edge cases

- A selected Country with zero effective neighbours is not a target candidate.
- If filtering optional entities removes a target's last neighbour, that target
  becomes ineligible for a newly started run.
- Active runs use their snapshot even if Settings change mid-run.
- A neighbour may belong to a Subregion/Continent not selected in setup; it is
  still required if active.
- Cross-Continent edges must work on the world map (for example Russia ↔ North
  Korea/China/Kazakhstan, Türkiye ↔ Bulgaria/Greece, Egypt ↔ Israel/Palestine,
  Indonesia ↔ Papua New Guinea).
- Enclaves/exclaves that form real borders count according to the canonical
  pair data (for example Azerbaijan ↔ Türkiye, Russia ↔ Poland/Lithuania,
  Spain ↔ Morocco).
- Duplicate neighbour submissions do not lower score.
- Incorrect guesses never reveal a required answer.
- Show number and Reveal map can be used in either order and are one-question
  assistance state only.
- Reveal remaining with zero unresolved neighbours is unavailable.
- A perfect retry hides Retry missed just like the current Capitals flow.

## Out of scope

- Maritime neighbours.
- Distance/nearest-Country quizzes.
- Capital/flag/shape hints inside Neighbours.
- Persistent Quiz history, achievements, streaks, or mastery effects.
- Automatic border inference from SVG geometry.
- Runtime REST Countries/GeoNames/other network dependencies.
- Editing the map assets solely to encode border relationships.
- Adding Country entities absent from the current World Countries canonical set.
- Automatically updating borders from external sources.

## Acceptance criteria

- [ ] Quiz setup exposes Capitals and Neighbours without changing Capitals behavior.
- [ ] Neighbours uses the existing World-wide Subregion selection to choose target
      candidates while required answers may fall outside the selected geography.
- [ ] Question-count options are based on effective eligible target count.
- [ ] The delivered canonical border graph uses the supplied 315-pair reviewed
      input, contains no self-edges/duplicates, and references only canonical
      World Countries IDs.
- [ ] Effective neighbours are canonical edges filtered to the active Country
      population; disabled entities are never contracted or reassigned.
- [ ] With Kosovo active, Serbia requires Kosovo and does not require Albania;
      Kosovo requires Albania, Montenegro, North Macedonia, and Serbia.
- [ ] With Kosovo inactive, Serbia does not require Kosovo **and does not gain
      Albania**.
- [ ] Palestine/Vatican/other optional entities follow the same active-population
      filtering rule.
- [ ] Spain ↔ Morocco is represented; France does not gain Brazil/Suriname from
      French Guiana; Morocco does not gain Mauritania through Western Sahara;
      Canada ↔ Greenland is absent in this data revision.
- [ ] Neighbours snapshots randomized unique targets and required effective
      neighbours at launch.
- [ ] Each correct Country answer reveals that Country on the map without
      transitioning away from the target.
- [ ] Exact aliases and enabled controlled-fuzzy Country matching use the shared
      answer-matching responsibility.
- [ ] Duplicate answers show feedback without score penalty.
- [ ] Incorrect Country guesses reveal nothing, are recorded for the target, and
      leave the prompt active.
- [ ] Show number reveals only the count/progress and does not change score.
- [ ] Reveal map shows unlabeled non-interactive local geography without
      identifying unrecalled neighbours and does not change score.
- [ ] Reveal remaining exposes all unresolved answers for review and lets the
      learner continue explicitly.
- [ ] The world map explicitly fits target + required neighbours even when the
      neighbour geometry is hidden.
- [ ] Disabled optional Country geometry may remain neutral on Reveal map but is
      never an answer and is never merged into another Country.
- [ ] Results report neighbour recall, perfect targets, and incorrect guesses;
      Retry missed retries each imperfect target once in reshuffled order.
- [ ] Neighbours creates no evidence, milestones, proficiency, preferences,
      scheduling state, or persistent Quiz history.
- [ ] No Neighbours-specific concept is added to `maps/`, no `quiz/` package is
      created, and `WorldCountriesTypedAnswer` is not weakened into a
      multi-answer mega-component.
- [ ] Existing Capitals Quiz tests remain green.
- [ ] Relevant data, map, matching, run, UI, and retry behavior is covered by
      focused tests.
- [ ] `npx vitest run src/features/world-countries` passes.
- [ ] `npm run typecheck` passes.

## Source anchors

- `src/features/world-countries/practice/WorldCountriesQuiz.tsx`
- `src/features/world-countries/practice/CapitalQuizSession.tsx`
- `src/features/world-countries/practice/QuizResults.tsx`
- `src/features/world-countries/practice/practiceRun.ts`
- `src/features/world-countries/learning/answerMatching.ts`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/maps/geographyMapAdapter.ts`
- `src/features/world-countries/data/countries.ts`
- `src/features/world-countries/data/countryClassification.ts`
- `src/features/world-countries/geography/countrySet.ts`
- `src/features/world-countries/geography/subregionScope.ts`
- `src/features/world-countries/WorldCountries.tsx`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` in the same implementation
so current-state documentation no longer describes Quiz as Capitals-only and
records the canonical land-border data/effective active-population filtering
responsibility at the appropriate level.

Do not create a new ADR unless implementation discovers a genuinely new durable
architectural decision that cannot conform to the existing ADR/current-state
constraints. Report that deviation instead of silently inventing a new design.

## Verification

Complete this section when setting the status to `Implemented`.
