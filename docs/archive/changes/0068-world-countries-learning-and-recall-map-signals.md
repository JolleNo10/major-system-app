# Change Spec 0068 - World Countries learning and recall map signals

- **Status:** Implemented
- **Date:** 2026-09-12
- **Issue:** None.
- **Related ADRs:** None. This change refines learner-facing progress semantics and extends the existing workflow-neutral map presentation; it does not introduce a new persistence authority, ownership boundary, or cross-subsystem contract.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`, `docs/architecture/PERSISTENCE.md`, `docs/architecture/SYSTEM.md`

## Goal

Make the World Countries map communicate two different kinds of progress at the same time without a toggle: **fill shows current recall/mastery strength, while the Country edge shows stable Learning achievement**. A later recall mistake may weaken mastery and bring an item back into Review, but it must not make previously established Country/Capital Learning look unlearned.

The learner-facing model is:

```text
Learning achievement (stable)
Not learned -> Countries learned -> Countries + Capitals learned

Recall strength (dynamic)
Unpractised -> Weak -> Developing -> Strong -> Mastered

Review
Uses retained evidence to decide what needs reinforcement and when.
```

These are different views over existing Learning milestones and recall evidence. Do not create a second progress authority.

## User-visible behavior

### 1. One map, two simultaneous dimensions

Do not add a Learning/Recall toggle.

The normal Home/Continent progress map must encode both dimensions at once:

- **Country fill = current recall/mastery strength.**
- **Country border / edge treatment = Learning achievement.**

The fill remains the visually dominant signal because recall changes over time. The edge is a persistent achievement signal and must remain visible without overwhelming the fill.

### 2. Recall is encoded by fill

Use the existing recall progression as the learner-facing fill vocabulary:

```text
Unpractised
Weak
Developing
Strong
Mastered
```

The existing aggregate core state may retain internal names such as `complete` if changing the type would add churn, but the learner-facing terminal label is **Mastered**, not `Complete`.

For a Country, core recall remains the aggregate of the two canonical core skills:

- Location -> Country
- Country -> Capital

The Country fill must reflect the weaker current core skill rather than averaging away a weakness. A Country is visually Mastered only when both core skills currently satisfy mastery.

### 3. Learning is encoded by border / glow

Learning achievement uses the existing whole-Subregion established-layer truth and is cumulative for the active membership:

```text
Not learned
  -> no Learning accent beyond the normal map boundary

Countries learned
  -> clear, persistent Learning accent outline

Countries + Capitals learned
  -> the same Learning accent outline plus a subtle second-level treatment,
     preferably a restrained halo/glow or equivalent edge reinforcement
```

Use the same Learning accent family for the two learned states. Do not introduce unrelated competing colors for Countries versus Capitals; distinguish the second level through treatment/intensity.

The fully learned state must not make large parts of the World map visually noisy. The halo/glow should be restrained enough that a mostly learned world remains readable.

If the existing generic SVG outline layer can represent the required per-Country edge cleanly, reuse or extend it. If it cannot, extend the workflow-neutral map presentation seam rather than adding Today-specific direct SVG mutation.

### 4. Learning achievement is monotonic with respect to ordinary mistakes

A wrong answer in Review, Drill, or another evidence-recording recall workflow must not remove the Learning edge.

Example, before a lapse:

```text
Kazakhstan
fill: Mastered
edge: Countries + Capitals learned
```

After the learner misses `Where is Kazakhstan?`:

```text
Kazakhstan
fill: Strong (or the appropriate degraded current recall state)
edge: Countries + Capitals learned
Review: due / elevated according to scheduler truth
```

The Country/Capital Learning achievement stays established. Only current recall strength and Review scheduling change.

This applies both to durable Learning milestones and to the existing historical-recall established-layer fallback. A later failure must not reopen a Learning layer that historical mastery has already established for display/planning.

Country-set membership reconciliation keeps its existing semantics: changing the active membership may legitimately change whether a Subregion milestone applies to that population. Ordinary mistakes do not.

### 5. “I learned all countries” is a derived achievement, not another flag

The conceptual World-level achievement is derived from existing current active Subregion truth:

- **All Countries learned** when every active Subregion has its Country layer established.
- **All Countries + Capitals learned** when every active Subregion has both layers established.

Do not add a persisted `allCountriesLearned`, `worldLearned`, per-Country learned flag, or a second Learning store merely to render the map.

This spec does not require a new World-level celebration screen; it establishes the progress semantics that such presentation can derive from later.

### 6. Path from Learning to Mastery

Learning completion and mastery are deliberately not the same finish line.

A newly learned Country may still have little or no retained independent recall evidence. The expected progression is conceptually:

```text
Learning completed
    |
    v
Unpractised / Developing recall
    |
    v
Strong
    |
    v
Mastered
```

Preserve the existing explicit free-recall mastery qualification unless repository inspection proves a small shared refactor is needed for consistency: mastery requires qualifying successful explicit recall on at least two distinct learner-local dates. Recognition-only, legacy/unknown interaction success, or repeated same-day answers must not become new mastery evidence.

Do not introduce a new 30/60-day mastery definition in this change. Review spacing and mastery qualification remain distinct concepts, but their response to a lapse must no longer contradict each other visually.

### 7. A lapse degrades recall; it does not erase knowledge history

The current implementation treats a latest failure as `Weak` regardless of prior strength. That is too destructive for the map and conflicts with the scheduler, which already treats an isolated lapse as a limited regression.

Refine current proficiency so an isolated lapse degrades strength proportionally instead of erasing all visible strength.

Required learner-facing behavior:

```text
Mastered + isolated wrong answer -> Strong
Strong + further/repeated difficulty -> Developing
Developing + further/repeated difficulty -> Weak
Weak + failure -> Weak
```

The exact derivation must remain deterministic from retained evidence; do not persist a separate proficiency state machine.

Prefer reuse of the existing Review lapse/spacing interpretation, or extraction of a small shared pure helper, over implementing two unrelated definitions of “isolated” and “repeated” failure. Do not make Review scheduling depend on UI colors.

An immediate or delayed same-session retry may mark the item recovered for the session, but must not instantly restore `Mastered`. Re-entering Mastered still requires the existing qualifying post-lapse mastery evidence.

A lapse affects only the atomic skill that was answered incorrectly. Missing Location -> Country must not directly degrade Country -> Capital evidence, and vice versa. The Country fill may nevertheless change because the aggregate displays the weaker core skill.

### 8. Mastery percentage reflects atomic core mastery, not only perfect Countries

The current headline percentage can fall from 100% to 80% in a five-Country region when one of ten core skills loses mastery, because it is based on fully complete Countries.

Change the learner-facing mastery percentage to represent **currently mastered atomic core skills / total active atomic core skills**.

For five Countries there are ten core skill targets. If nine remain mastered, show approximately:

```text
Core mastery  9 / 10  90%
4 / 5 Countries fully mastered
```

Keep the fully mastered Country count as useful stricter context, but do not present `completeCountries / totalCountries` as the only Mastery percentage.

Do not create a separately persisted mastery score. Extend the existing derived scope progress model as needed.

### 9. Legend explains the two visual channels without a mode switch

The map legend must communicate both dimensions compactly.

Conceptually:

```text
RECALL / fill
Unpractised · Weak · Developing · Strong · Mastered

LEARNING / edge
Not learned · Countries learned · Countries + Capitals learned
```

Exact layout can adapt to existing map/rail space. Do not add a toggle simply to explain the legend.

Learning state must be available as text/accessibility semantics, not only border/glow. Country accessible descriptions should expose both current recall state and Learning achievement where the map surface already provides semantic Country descriptions.

### 10. Interaction styling takes precedence without destroying progress cues

Persistent Learning edge treatment must coexist with existing map interactions:

- hover;
- current task highlight;
- answer-selection cues;
- named/selected Country treatment;
- muted and hidden geography;
- multipart Countries and map-owned tiny-Country assistance.

Task/hover feedback must remain immediately legible. It may temporarily render above or override the visible Learning stroke, but it must not mutate or lose the underlying Learning achievement; when the transient interaction ends, the correct Learning edge returns.

Recall fill should likewise remain the base state and return after temporary task/hover fills.

## Scope

- Keep fill as the shared dynamic recall/mastery signal on normal World Countries progress maps.
- Add a persistent per-Country Learning edge treatment based on existing established Country/Capital layer truth.
- Make the learner-facing terminal recall label `Mastered` rather than `Complete`.
- Refine current proficiency after failures so an isolated lapse degrades proportionally rather than collapsing immediately to Weak.
- Keep Learning establishment stable across later mistakes, including the historical-mastery planning/display fallback already present in `learningReadiness.ts`.
- Extend scope progress so the primary Mastery percentage is atomic core-skill mastery while preserving fully mastered Country counts.
- Update the map legend/accessibility descriptions to explain fill versus edge.
- Reuse/extend workflow-neutral SVG map presentation for edge/halo rendering and preserve active interaction precedence.
- Update focused tests and current-state World Countries architecture documentation.

## Interaction and states

### Not learned + no recall evidence

- Fill: Unpractised.
- Edge: ordinary map boundary only.

### Countries learned, Capitals not learned

- Fill: whatever current core recall evidence supports.
- Edge: Learning outline.
- A weak/unpractised fill is valid and means “learned in the curriculum, not yet strongly retained.”

### Countries + Capitals learned

- Fill: whatever current core recall evidence supports.
- Edge: Learning outline plus restrained second-level halo/reinforcement.

### Previously Mastered Country gets one answer wrong

- Learning edge: unchanged.
- Wrong atomic skill: records a lapse and becomes Review-relevant according to scheduler truth.
- Recall fill: drops only enough to represent the lapse; a previously Mastered Country should normally become Strong after one isolated miss, not Weak.
- Other atomic core skill: unchanged.
- Mastery percentage: drops according to lost atomic mastery, e.g. 10/10 -> 9/10 rather than 5/5 -> 4/5 as the sole percentage.

### Same-session retry succeeds

- Session may report recovered-on-retry.
- Learning edge remains unchanged.
- Review history retains the lapse.
- Mastered is not restored solely by the immediate retry.

### Repeated difficulty

- Recall proficiency may step down further through Developing and Weak.
- Scheduler may shorten spacing further according to existing rules.
- Learning edge remains unchanged.

### Later spaced recovery

- Successful explicit recall rebuilds current proficiency.
- Mastered returns only when the existing post-lapse mastery evidence requirement is met.
- Learning edge did not change during the recovery cycle.

### Hover / task highlight over a learned Country

- Transient interaction remains more visually salient than the persistent Learning edge.
- After interaction ends, recall fill + correct Learning edge are restored.

## Architecture constraints

- Follow `src/features/world-countries/AGENTS.md`, `docs/architecture/features/WORLD_COUNTRIES.md`, and applicable map/UI architecture.
- Work only on `world-countries-learning-journey`; do not merge to `main`.
- `learning/` remains owner of recall proficiency, review scheduling inputs, and durable Subregion Learning facts.
- `today/` remains a consumer/planner/presentation owner; it must not become a second mastery or Learning store.
- `maps/` remains workflow-neutral. Add/extend generic presentation data for Country edge/halo styling rather than importing Learning/Today state into `SvgMapController`.
- Reuse existing `isWorldCountriesCountryLayerEstablished` / `isWorldCountriesCapitalLayerEstablished` semantics for learner-facing established-layer truth. Do not make ordinary failures clear milestones or established fallback state.
- Preserve `hasEverMastered` as historical evidence used by established-layer fallback; current proficiency may change after later failures without changing that historical fact.
- Do not add a persisted proficiency state, learned-per-Country cache, mastery score, or new localStorage/IndexedDB key.
- Keep raw World Countries attempt history as the evidence source and keep Review scheduling derived from retained evidence.
- Prefer a shared pure interpretation of lapse severity between proficiency and Review where practical. Avoid coupling scheduler decisions to presentation colors.
- Preserve existing Country membership fingerprint behavior for durable Subregion Learning milestones.
- Keep temporary task/hover styling distinct from persistent progress styling.

## Existing capabilities to reuse

- `src/features/world-countries/learning/recallMastery.ts` — atomic proficiency, current mastery, historical mastery qualification.
- `src/features/world-countries/learning/recallProgress.ts` — Country aggregate core recall state.
- `src/features/world-countries/learning/reviewSchedule.ts` — existing lapse/repeated-difficulty and spacing interpretation.
- `src/features/world-countries/learning/learningReadiness.ts` — durable and historical-fallback established-layer truth.
- `src/features/world-countries/learning/subregionLearningState.ts` and store/persistence — existing durable Country/Capital milestones and membership behavior.
- `src/features/world-countries/learning/progressPresentation.ts` — shared recall labels/colors/legend.
- `src/features/world-countries/learning/scopeProgress.ts` — derived scope progress/mastery summary model.
- `src/features/world-countries/learning/useWorldCountriesCountryColors.ts` — existing recall fill derivation.
- `src/features/world-countries/learning/CountryLearningMap.tsx` — Country-to-SVG adapter and caller-owned map progress data.
- `src/features/world-countries/maps/SvgMapView.tsx` / `SvgMapController.ts` — workflow-neutral declarative fill, stroke, outline and interaction presentation.
- `src/features/world-countries/ui/WorldCountriesMapLegend.tsx` — current map recall legend.
- `src/features/world-countries/ui/WorldMasterySummary.tsx` — current scope mastery headline.
- `src/features/world-countries/today/WorldCountriesToday.tsx`, `GuidedHomeRails.tsx`, `WorldCountriesProgressView.tsx`, and `journeyPresentation.ts` — guided map, Journey, mastery, and accessible presentation consumers.

## Edge cases

- A learner can have Countries learned with Unpractised or Developing recall. This is valid and should be visually understandable.
- A learner can have Countries + Capitals learned while one or more recall targets are Weak. The Learning edge remains fully learned.
- A Subregion established only through historical mastery fallback must not become visually unlearned after a later lapse.
- If active Country membership changes and the existing fingerprint rules hide a milestone for the new population, the edge follows that reconciled truth; do not make it permanently sticky across a changed curriculum population.
- One-country Subregions use the same rules.
- Multipart Countries must receive one coherent Learning edge across all authored paths.
- Tiny-Country task assistance and synthetic dots must not incorrectly imply a Learning state that differs from their source Country.
- Muted Countries outside the current scope should remain contextually muted; do not let a bright Learning halo defeat the mute hierarchy.
- Hidden Countries remain hidden regardless of Learning state.
- Recognition success does not qualify new mastery or historical mastery fallback.
- Same-day repeated success does not create the second distinct date needed for Mastered.
- A wrong-kind typed answer that is intentionally not recorded as an incorrect recall attempt must not degrade proficiency merely because feedback was shown.

## Out of scope

- Adding a Learning/Recall map toggle.
- New gamification, XP, badges, streaks, or celebration systems.
- New persisted World/Subregion/Country progress flags.
- Changing Country/Capital Learning pedagogy, Set sizing, milestone write points, or membership fingerprint rules.
- Replacing the existing fixed Review interval ladder or changing Review block sizing/interleaving.
- Introducing a 30/60-day mastery requirement or a new long-term retention algorithm in this change.
- Broad redesign of Drill, Recite, Quiz, Practice, Settings, navigation, camera framing, or map geography.
- Merging the feature branch to `main`.

## Acceptance criteria

- [x] Normal World Countries progress maps show current recall/mastery using Country fill and Learning achievement using a persistent edge treatment; no Learning/Recall toggle is added.
- [x] Learner-facing recall states are `Unpractised`, `Weak`, `Developing`, `Strong`, `Mastered`; the core endpoint is no longer presented as `Complete`.
- [x] Not learned, Countries learned, and Countries + Capitals learned are visually distinguishable through edge treatment without replacing recall fill.
- [x] Countries + Capitals learned uses a restrained second-level edge treatment (for example outline + subtle halo) that remains readable at large learned scope.
- [x] Learning edge derives from existing established-layer truth and does not regress after an ordinary wrong recall answer.
- [x] A Subregion established through historical mastery fallback remains established for presentation/planning after a later failure.
- [x] An isolated miss on a previously Mastered atomic skill degrades current proficiency proportionally so the Country normally becomes Strong rather than immediately Weak.
- [x] Repeated difficulty can degrade proficiency further, while unrelated core skills remain unchanged.
- [x] Same-session retry/recovery does not instantly restore Mastered; existing qualifying post-lapse mastery evidence is still required.
- [x] Review due/priority behavior continues to come from the existing scheduler and retained evidence; Learning state does not suppress due Review.
- [x] Primary Mastery percentage is derived from currently mastered atomic core skills / total active atomic core skills.
- [x] Fully mastered Country count remains available as stricter supporting context.
- [x] The map legend explains both `fill = recall` and `edge = learning` without a mode switch.
- [x] Accessible Country/map status includes both Learning achievement and current recall state where progress semantics are exposed.
- [x] Hover, task highlight, answer-selection, muted/hidden state, multipart Countries, and tiny-Country assistance remain visually and behaviorally correct with the new persistent edge layer.
- [x] No new persistence key, per-Country learned cache, persisted mastery score, or second progress authority is introduced.
- [x] Focused automated tests cover proficiency lapse behavior, established-layer non-regression, scope mastery arithmetic, map edge presentation, legend semantics, and transient interaction restoration.
- [x] `docs/architecture/features/WORLD_COUNTRIES.md` is updated to describe fill=recall, edge=Learning, and the resulting lapse semantics after implementation.

## Source anchors

- `src/features/world-countries/learning/recallMastery.ts`
- `src/features/world-countries/learning/recallProgress.ts`
- `src/features/world-countries/learning/reviewSchedule.ts`
- `src/features/world-countries/learning/learningReadiness.ts`
- `src/features/world-countries/learning/progressPresentation.ts`
- `src/features/world-countries/learning/scopeProgress.ts`
- `src/features/world-countries/learning/useWorldCountriesCountryColors.ts`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/ui/WorldCountriesMapLegend.tsx`
- `src/features/world-countries/ui/WorldMasterySummary.tsx`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/today/GuidedHomeRails.tsx`
- `src/features/world-countries/today/WorldCountriesProgressView.tsx`
- `src/features/world-countries/today/journeyPresentation.ts`

## Documentation impact

- Add this Change Spec at `docs/changes/0068-world-countries-learning-and-recall-map-signals.md`.
- Update `docs/architecture/features/WORLD_COUNTRIES.md` in the implementation so current-state documentation describes the delivered fill/edge semantics, Mastery arithmetic, and lapse behavior.
- No ADR is required unless implementation discovers that the change cannot be delivered without a new durable ownership/persistence contract; if so, stop and report the architectural deviation rather than silently inventing one.

## Verification

Evidence for the implemented change:

- `npx.cmd vitest run src/features/world-countries/learning/recallProgress.test.ts src/features/world-countries/learning/reviewSchedule.test.ts src/features/world-countries/learning/learningReadiness.test.ts src/features/world-countries/learning/scopeProgress.test.ts src/features/world-countries/learning/progressPresentation.test.ts src/features/world-countries/maps/SvgMapController.test.ts src/features/world-countries/maps/GeographyOverviewMap.test.tsx src/features/world-countries/today/WorldCountriesProgressView.test.tsx src/features/world-countries/today/GuidedHomeRails.test.tsx src/features/world-countries/today/WorldCountriesToday.test.tsx` — 10 files, 195 tests passed.
- `npx.cmd vitest run src/features/world-countries/drill/DrillSetup.test.tsx` — 29 tests passed after updating the shared mastery-summary assertions.
- `npm.cmd test` — full repository suite passed: 150 files, 1100 tests.
- `npm.cmd run typecheck` — changed files typecheck cleanly, but the command exits on an unrelated pre-existing error at `src/features/world-countries/drill/DrillSetup.test.tsx:301` (`Map<any, any>` is not assignable to `Map<string, never>`); this line is unchanged from `HEAD`.
- `git diff --check` — passed.
- Browser/manual verification was not run, consistent with the repository workflow; focused and full automated coverage was sufficient for this change.
