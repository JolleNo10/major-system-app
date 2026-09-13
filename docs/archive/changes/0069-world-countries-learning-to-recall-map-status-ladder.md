# Change Spec 0069 - World Countries learning-to-recall map status ladder

- **Status:** Implemented
- **Date:** 2026-09-12
- **Issue:** None.
- **Related ADRs:** None. This refines learner-facing map presentation within the existing World Countries Learning/Recall ownership model; it does not add persistence, a new state authority, or a cross-feature contract.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`

## Goal

Replace the simultaneous Learning-edge + Recall-fill presentation introduced by Change Spec 0068 with a simpler **single visual status ladder**.

The map should read as a progression:

```text
Learning
Not learned
  -> Countries learned

then

Recall health
Early recall
  -> Weak
  -> Developing
  -> Strong
  -> Mastered
```

Learning states use **neutral pattern fills**. Recall-health states use **solid colors with no pattern**. A Country has one primary status treatment at a time.

The internal curriculum states remain:

```text
NOT_LEARNED
COUNTRIES_LEARNED
COUNTRIES_AND_CAPITALS_LEARNED
```

`COUNTRIES_AND_CAPITALS_LEARNED` is a curriculum milestone and handoff boundary,
not a separate learner-facing map-status rung.

This change replaces only the learner-facing map rendering model from Change Spec 0068. Preserve the established-layer fallback, historical `hasEverMastered` behavior, atomic mastery arithmetic, and lapse/recovery semantics already delivered there.

## User-visible behavior

### 1. One visual ladder, not simultaneous Learning and Recall channels

Do not show Learning achievement as a persistent outline/halo layered on top of Recall fill.

The normal learner-facing status vocabulary becomes:

| Status | Visual treatment | Meaning |
| --- | --- | --- |
| Not learned | neutral solid | Country learning has not yet been established |
| Countries learned | neutral diagonal pattern | Country/location layer is learned; Capitals are still pending |
| Early recall | dark burnt-orange solid | Learning is complete and retention is only beginning / not yet well established |
| Weak | amber-orange solid | recall is fragile or recent difficulty indicates reinforcement is needed |
| Developing | gold/yellow solid | recall is working but retention is still being established |
| Strong | light-green solid | recall is reliable but not yet Mastered |
| Mastered | deep-green solid | both core recall skills currently satisfy mastery |

Patterns belong only to Learning. Recall health is always a solid fill.

### 2. Learning pattern palette

Use one neutral visual family for both Learning states. The distinction comes from pattern geometry, not a second color vocabulary.

Canonical palette:

```text
Not learned / Learning base   #5A5E66
Learning pattern line         #3E3719
```

Pattern treatment:

```text
Countries learned
  -> diagonal warm-neutral stripes

```

Starting geometry:

- stripe width 1.8 px;
- pitch 11 px;
- line opacity 0.46;
- pattern should remain legible at Continent and World scale without becoming visually dominant;
- exact implementation may tune density slightly for real SVG scale, but keep the visual intent: a sparse diagonal.

Do not use cyan/blue for Learning. Cyan remains available for focus/selection and must not be confused with progress state.

### 3. Recall-health palette

Update the learner-facing Recall palette to a clearer warm-to-green progression:

```text
Early recall / internal unpractised   #916F5F
Weak                                  #C29161
Developing                            #C6AA55
Strong                                #769A70
Mastered                              #3A7F70
```

Keep internal type names where changing them would create unnecessary churn. In particular, the internal `unpractised` state may remain internal, but the learner-facing label should be **Early recall**.

The map and legend must use these colors consistently wherever the shared World Countries core-recall status palette is presented.

### 4. Learning-to-recall handoff

This is a presentation progression, not a new persisted state machine.

Use existing durable Learning milestones / established-layer fallback for Learning truth and existing retained recall evidence for Recall truth.

The intended learner experience is:

```text
Not learned
  -> Countries learned pattern
  -> Early recall solid
  -> Weak / Developing / Strong / Mastered solid
```

Do not persist a new per-Country `mapStatus`, `recallStarted`, or phase flag.

The implementation should derive the handoff from existing workflow context and evidence:

- while the learner is still in guided Learning, use the applicable Learning pattern state;
- after Countries are established, Capital Learning keeps the Countries-learned diagonal pattern through walkthrough, practice, mix, and final recall;
- when the Capital Learning milestone is completed, remove the Learning pattern and use the current Recall-health state;
- once the material is being presented as long-term retention rather than unfinished curriculum, use the current solid Recall-health state;
- on ordinary Home/Continent/Progress views of an already learned region, Recall health is the long-term status surface rather than a permanent Learning pattern;
- ordinary mistakes after Learning must only affect Recall health. They must never send a Country back into a Learning pattern.

Prefer existing Journey/completion context and current recall evidence over inventing another durable handoff marker.

`Early recall` is a Recall-health phase label for the internal `unpractised`
state. It is not a global rename: an untouched Country remains Not learned,
and a Countries-learned Country remains in its diagonal Learning state until
both Learning layers are established. Dedicated Learning Readiness surfaces,
including Learn & Practise and Drill's no-evidence fallback, use the same grey
base with a diagonal pattern only for Countries learned. They may retain
explicit text such as `Countries + Capitals learned` for the internal
curriculum milestone, but must not render it as a third map status.

If repository inspection reveals more than one reasonable existing seam for this handoff, choose the one that preserves the current ownership model and report the choice in the implementation summary.

### 5. Focus and transient interaction stay separate

Focus/selection is not part of the status ladder.

Preserve existing transient map interaction cues:

- current geographic focus / selection;
- hover;
- current task target;
- answer-selection feedback;
- muted/hidden geography.

Cyan/blue may remain the crisp focus/selection treatment.

A focused Country keeps its current pattern or solid status treatment underneath. The focus outline is temporary and visually distinct from progress.

### 6. Legend and explanatory copy

Replace the current two-channel legend:

```text
Recall / fill
Learning / edge
```

with a ladder-oriented presentation that makes the phase change obvious.

Conceptually:

```text
LEARNING
Not learned · Countries learned

RECALL HEALTH
Early recall · Weak · Developing · Strong · Mastered
```

Learning entries must show the actual pattern swatches, not only flat color chips.

Recall entries show solid swatches.

Accessible text must communicate the status without relying on color or pattern recognition.

### 7. Remove Learning edge/halo as the normal progress signal

The CS0068 cyan Learning edge/halo is no longer the learner-facing Learning progress treatment.

Stop supplying the Learning edge treatment from Home/Continent progress maps.

Do not remove generic map-outline support if it is still used by focus, selection, hover, tasks, or other workflows. Remove only Learning-specific edge/halo plumbing that becomes unused.

Current-state architecture documentation must no longer describe normal Home/Continent progress as simultaneous Recall fill + Learning edge.

## Scope

- Introduce the one-status-at-a-time Learning -> Recall visual ladder.
- Replace Learning outline/halo progress with neutral patterned fills.
- Use one neutral color family for both Learning patterns.
- Change learner-facing `Unpractised` copy to `Early recall`.
- Update the core Recall palette to burnt orange -> amber -> gold -> green -> deep green.
- Preserve current mastery/proficiency derivation and scheduler semantics.
- Preserve current established-layer and historical-mastery fallback semantics.
- Update the shared map legend and accessibility descriptions.
- Reuse/extend workflow-neutral SVG presentation to render patterns safely on real map geometry.
- Update current-state World Countries architecture documentation and focused tests.

## Interaction and states

### Not learned

- neutral solid fill;
- no Learning pattern;
- normal focus/hover treatment may layer on top.

### Countries learned

- neutral Learning base;
- diagonal warm-neutral pattern;
- Capitals remain an unfinished Journey step.

`COUNTRIES_AND_CAPITALS_LEARNED` remains an internal curriculum milestone. On
normal progress maps it hands off directly to the current Recall-health state.

### Early recall

- solid dark burnt orange;
- no pattern;
- learner-facing replacement for the old `Unpractised` label;
- represents the beginning of the retention phase, not unfinished Learning.

### Weak

- solid amber-orange;
- no pattern;
- current recall needs reinforcement.

### Developing

- solid gold/yellow;
- no pattern.

### Strong

- solid light green;
- no pattern.

### Mastered

- solid deep green;
- no pattern.

### Later lapse

Example:

```text
Mastered -> Strong
```

or further degradation according to current proficiency semantics.

The Country stays in Recall-health presentation. It does not return to a Learning pattern.

### Focused Country

Pattern or solid status remains intact. Add the existing crisp focus/selection treatment above it.

## Architecture constraints

- Follow `src/features/world-countries/AGENTS.md` and `docs/architecture/features/WORLD_COUNTRIES.md`.
- Work on `world-countries-learning-journey`; do not merge to `main`.
- `learning/` remains owner of Learning facts, recall evidence, proficiency, and review interpretation.
- `today/` remains owner of guided Journey/completion context.
- `maps/` remains workflow-neutral and should receive caller-owned semantic pattern/fill presentation rather than importing Learning state.
- Do not add new persistence, per-Country learned state, a map-status store, or a recall-phase cursor.
- Preserve Change Spec 0068's already-implemented:
  - historical `hasEverMastered` fallback;
  - non-regressing established Learning truth;
  - atomic core mastery percentage;
  - proportional lapse degradation and recovery semantics.
- Do not make pattern rendering modify canonical SVG assets.
- Pattern rendering must remain multipart-safe and restore correctly after transient hover/task styling.
- Prefer reuse or extension of current declarative map presentation over direct workflow-specific DOM mutation.

## Existing capabilities to reuse

- `src/features/world-countries/learning/learningReadiness.ts` — established Country/Capital Learning truth.
- `src/features/world-countries/learning/recallProgress.ts` — Country aggregate core recall state.
- `src/features/world-countries/learning/recallMastery.ts` — atomic proficiency and mastery.
- `src/features/world-countries/learning/progressPresentation.ts` — shared recall labels/colors.
- `src/features/world-countries/today/WorldCountriesToday.tsx` — Home/Continent status derivation and Journey context.
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx` and Capital Learning flow — active Learning/completion context.
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/geographyMapAdapter.ts`
- `src/features/world-countries/ui/WorldCountriesMapLegend.tsx`
- `src/features/world-countries/ui/WorldMasterySummary.tsx`

Reuse the current map presentation seams before adding a new abstraction. If a small generic pattern-fill seam is necessary, keep it workflow-neutral and semantic.

## Edge cases

- A learner who has completed Countries but not Capitals must retain the Countries-learned diagonal pattern even after an ordinary Country recall mistake; the Journey layer is still established.
- Finishing Capitals must never visually look like going backwards to Not learned.
- Once a learned region is in Recall-health presentation, a later lapse changes only the solid Recall color.
- Historical-mastery fallback may establish Learning without an explicit milestone; the same existing truth must be honored.
- Changed active Country membership continues to follow existing fingerprint/reconciliation semantics.
- Multipart Countries must show one coherent pattern across all authored parts.
- Tiny-Country assistance must not fabricate a different status from its semantic Country.
- Muted/hidden Countries preserve their current hierarchy; patterns must not defeat muting or visibility rules.
- Focus/selection must remain distinguishable from Learning patterns and Recall colors.
- Pattern swatches and map status remain understandable without color alone through text/accessibility copy.

## Out of scope

- Changing the mastery evidence requirement.
- Changing Review intervals, due logic, block sizing, or interleaving.
- Changing Country/Capital Learning pedagogy or milestone write points.
- Adding a user-facing Learning/Recall toggle.
- Adding new persistence or analytics.
- Broad map geometry/camera redesign.
- Changing unrelated Drill, Recite, Quiz, or Practice behavior.
- Merging to `main`.

## Acceptance criteria

- [x] Normal learner-facing map presentation follows one Learning -> Recall status ladder rather than simultaneous Learning edge + Recall fill.
- [x] Countries learned uses a neutral diagonal pattern.
- [x] `COUNTRIES_AND_CAPITALS_LEARNED` remains internal and is not a separate map rung.
- [x] Cyan/blue is no longer used as the Learning progress color.
- [x] Recall-health states use solid fills with no Learning pattern.
- [x] Learner-facing `Unpractised` is replaced by `Early recall`.
- [x] Recall palette uses the agreed dark-orange -> amber -> gold -> light-green -> deep-green progression.
- [x] A later recall mistake never sends an already learned Country back to a Learning pattern.
- [x] Focus/selection remains a separate transient treatment and can coexist with pattern or solid status.
- [x] Pattern rendering is multipart-safe, survives declarative rerenders, and restores after transient interaction.
- [x] Legend visually shows real Learning patterns and solid Recall swatches.
- [x] Existing mastery arithmetic, historical-learning fallback, lapse behavior, and Review semantics remain unchanged.
- [x] No new persisted learner state is introduced.
- [x] Current-state World Countries architecture documentation reflects the delivered ladder and no longer describes Learning edge/halo as the normal progress signal.

## Source anchors

- `src/features/world-countries/learning/learningReadiness.ts`
- `src/features/world-countries/learning/recallProgress.ts`
- `src/features/world-countries/learning/recallMastery.ts`
- `src/features/world-countries/learning/progressPresentation.ts`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/ui/WorldCountriesMapLegend.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/geographyMapAdapter.ts`

## Documentation impact

- Add this Change Spec at `docs/changes/0069-world-countries-learning-to-recall-map-status-ladder.md`.
- Update `docs/architecture/features/WORLD_COUNTRIES.md` so current-state documentation describes the status ladder, patterned Learning states, solid Recall-health states, and the removal of Learning edge/halo as the normal progress signal.
- Do not rewrite Change Spec 0068 as if it never existed; it remains the historical delivery record for the underlying mastery/fallback work that this spec retains.

## Verification

Implemented on 2026-09-12 on `world-countries-learning-journey`.

Evidence: focused Vitest coverage for `SvgMapController`, `GeographyOverviewMap`,
`geographyMapAdapter`, `CountryLearningFlow`, `CapitalLearningFlow`,
`WorldCountriesToday`, `WorldCountriesProgressView`, Drill setup/presentation,
`WorldCountriesDrill`, Learning Readiness, and `progressPresentation`. The original CS0069 delivery
and prior correction remain covered; this simplified-ladder correction adds
coverage for the two-entry Learning legend, no-pattern Capital completion,
Capital Learning continuity, gated Early recall, Progress distribution, and
Drill readiness fallback. Final focused run: 13 test files, 247 tests passed.
`npm run typecheck` remains non-zero because the environment lacks Node.js test
type declarations for unrelated settings, architecture, and practice tests; it
reported no diagnostics in the changed World Countries modules. No browser or
dev-server verification was used.

Use focused, risk-proportionate automated validation around:

- recall/progress presentation labels and palette;
- map pattern adaptation/rendering;
- Home/Continent status resolution;
- legend/accessibility output;
- preservation of current focus/selection interaction;
- regression coverage for multipart Countries and declarative rerender restoration.

Do not start a dev server or require browser/manual verification unless explicitly requested.
