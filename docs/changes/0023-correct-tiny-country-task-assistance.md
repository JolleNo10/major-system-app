# Change Spec 0023 - Correct tiny-Country assistance to task-only behavior

- **Status:** Ready
- **Date:** 2026-08-22
- **Issue:** None.
- **Related ADRs:** [ADR 0029 - Tiny-Country assistance is task-scoped and uses map-specific learning anchors](../adr/0029-task-scoped-tiny-country-assistance-and-learning-anchors.md)
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)
- **Supersedes:** [Change Spec 0021](0021-complete-shared-tiny-country-map-interaction.md)
- **Corrects:** tiny-Country behavior from [Change Spec 0020](0020-world-countries-expanded-map-and-tiny-country-targets.md). Expanded-map behavior from 0020 is unchanged.

## Goal

Replace the current global/selectability-driven tiny-Country augmentation with one shared, task-scoped capability that does exactly two things:

1. in a map-answer exercise, give tiny Country candidates a forgiving invisible click target and enlarge only the hovered candidate marker; and
2. when a tiny Country location is intentionally the subject of a question or correction, keep that one learning anchor visibly enlarged for the duration of the target state.

Ordinary World/Continent geography, setup, mastery/progress, navigation, and other non-question maps must render their original SVG Country geometry with **no tiny-Country augmentation**.

This is a corrective implementation and cleanup, not another additive patch on the existing `tinyTargets` behavior.

## Why the current implementation is wrong

The current implementation contains two coupled assumptions that must be removed rather than worked around:

- `SvgMapController.render()` synchronizes tiny targets from source geometry regardless of whether the map is a learning task. Generated markers can therefore appear on normal maps.
- generic selectability is treated as sufficient reason to enable forgiving tiny targets. `GeographyOverviewMap` is intentionally selectable for navigation/setup, so this makes ordinary maps inherit quiz-only behavior.

There is a third practical defect in click exercises: pointer hover on the generated tiny target currently routes through generic hover presentation. `CountryLearningMap` may have `hoverHighlight=false` during location-click practice, so the controller can discard the pointer hover state and the tiny dot does not visibly grow even though the generated hit element exists. Task-assistance hover must not depend on generic map hover styling being enabled.

The completed design must therefore separate:

```text
generic map interaction
  - hoverable
  - selectable
  - highlighted/status colors

from

learning-task assistance
  - answer-selection candidates
  - active task target
  - map-specific learning anchors
```

## User-visible behavior

### 1. Ordinary maps: no augmentation

The following are examples of maps that MUST NOT receive tiny-Country markers or enlarged tiny hit areas merely because they support pointer interaction:

- World Geography setup;
- Continent Geography setup;
- World mastery/progress maps;
- Subregion/Country scope-selection maps;
- order-authoring/overview maps;
- any `GeographyOverviewMap` used for navigation or ordinary selection;
- any other normal map that has `onCountryClick`, selectable IDs, hoverable IDs, highlighted IDs, or semantic Country colors but is not explicitly acting as a learning answer/target surface.

For these maps:

- the source SVG is the visible Country representation;
- tiny Countries remain their original size;
- no generated tiny marker/ring is visible;
- no forgiving tiny halo is active;
- existing normal hover, navigation, selection, progress color, and group-outline behavior remains unchanged.

**Regression example:** the normal World mastery/geography map must not show enlarged circular replacements around small European Countries simply because the map is clickable.

### 2. Map-answer exercise: invisible forgiving target + hover growth

Examples:

- Drill / Practice: `Find Nauru`;
- Learn & Practise: `Locate Countries`;
- Learn & Practise: `Locate Capitals`;
- guided Learning location practice.

Before the learner answers:

- the correct answer receives **no special visible treatment**;
- all eligible tiny candidate Countries use the same task-assistance rules so the correct answer is not leaked;
- original source geometry remains visible at its normal size;
- each eligible tiny candidate has a larger **invisible** interaction target centered on its resolved learning anchor;
- the invisible interaction target is materially easier to hit than the original dot;
- entering that invisible target visibly enlarges **that candidate's learning anchor**;
- leaving the target returns the visual marker to the original/non-assisted appearance;
- no Country name is revealed by the tiny hover assistance unless the task's existing name rules independently allow it;
- clicking inside the forgiving target submits exactly the same Country as clicking its real SVG geometry;
- one activation produces one answer callback.

For non-tiny Countries, answer selection continues to use the source geometry without an artificial Country-sized halo.

Target tuning guidance:

- use roughly a **24 px minimum pointer diameter** as a starting desktop target;
- use roughly a **10-12 px visible hover marker diameter** as a starting point;
- tune dense island clusters conservatively rather than increasing every halo indiscriminately.

These are rendered usability targets, not persisted settings.

### 3. Location-question target: persistent visible learning anchor

Examples:

- Today Location -> Country: `Which country is this?`;
- Drill Location -> Country recall: `Which country is this?`;
- equivalent guided/future recall where the map location itself is the question;
- correction/feedback after a Locate answer when the expected Country is intentionally shown.

If the task target uses tiny-Country assistance:

- its learning anchor is visibly enlarged for the full target state;
- enlargement does not depend on pointer hover;
- the target returns to ordinary source presentation when the task target clears or changes;
- the existing answer/name-disclosure rules remain authoritative;
- the enlarged marker does not reveal a Country name by itself;
- reduced-motion keeps the persistent enlarged state but removes nonessential transition animation.

This persistent target emphasis is **not** activated merely because a Country is generically highlighted for progress, status, setup, review decoration, or navigation.

### 4. Click-answer feedback

After a click answer resolves, the workflow may intentionally identify the expected Country as the task target.

When that happens:

- a tiny expected Country receives the same persistent target emphasis as `Which country is this?`;
- the task's existing feedback/name behavior decides whether its Country name is shown;
- the answer-selection halos may remain active or be disabled according to the existing answered-state interaction, but they must not create stale hover markers during transition to the next question.

## Learning-anchor behavior

Tiny-Country assistance operates on a **learning anchor**, not on the entire Country bounding box.

The runtime anchor data is map-specific and keyed by stable map definition + canonical Country identity as constrained by ADR 0029.

### Confirmed single-dot Country

For a Country whose map representation is one confirmed compact dot/component:

- the map-owned metadata identifies it as eligible for tiny-Country assistance;
- the runtime may resolve the anchor from that compact source geometry;
- the invisible click target and visible task marker are centered on that dot;
- ordinary maps still do not use the assistance merely because the Country is classified as single-dot.

Examples include Nauru/Andorra-like representations where the asset contains one compact learning location.

### Multi-dot Country

For a Country represented by several separated tiny components, such as Micronesia:

- map-owned metadata records **one explicitly selected representative learning anchor**;
- do not use the center of the Country's total `getBBox()`;
- do not create a forgiving halo for every island/component;
- do not enlarge every component together;
- direct clicks on any actual source geometry belonging to the Country still answer that Country in an answer-selection task;
- only the selected representative anchor receives the larger invisible hit target;
- only the selected representative anchor grows on task hover;
- only the selected representative anchor receives persistent task-target emphasis;
- the other Country components remain ordinary source geography.

This makes a multi-dot Country behave like a one-dot Country from the learner's perspective while preserving its real geography.

### Large/mainland Country with small islands

A Country is not tiny merely because some of its geometry contains small islands.

Countries with a meaningful mainland or otherwise recognizable normal-scale source geometry must continue to use that source geometry. Do not create tiny assistance for their minor islands unless map-owned authoring data intentionally classifies a specific map representation as requiring a learning anchor.

### Map-specific decisions

The same Country may need different anchor data on the World map and a Continent map because the SVG assets and component layout can differ.

Do not assume an anchor coordinate or component selected for one map asset is valid for another.

## Map-anchor data contract

Implementation must introduce or consume one map-owned runtime contract for Country learning anchors. Exact type/file naming is implementation detail, but the contract must satisfy these rules:

- key by stable `MemoMapDefinition.id` (or equivalent stable map identity) + canonical `CountryId`;
- distinguish a confirmed single-dot representation from an explicitly selected multi-dot representative anchor, or otherwise preserve equivalent provenance;
- identify the source Country/SVG representation sufficiently to validate that the decision still applies;
- for explicit representative anchors, contain enough map-local information to resolve the chosen point deterministically;
- retain enough source identity/version/fingerprint information to detect stale anchor decisions when an SVG asset is replaced or materially changed;
- be static map/reference data, not user learning progress and not browser persistence;
- remain owned by `maps/`, not `drill/`, `today/`, `learning/flows/`, or `ui/`;
- be consumable from editor output through an adapter/generation step without coupling runtime code to the editor UI or forcing the editor's raw export format to become the runtime format.

Runtime geometry thresholds must **not** remain the authoritative mechanism for deciding which Countries receive assistance. Geometry may resolve or validate a Country already classified by map-owned metadata.

If the current editor/export work is not yet committed, implementation may introduce the runtime contract and adapter boundary first, but this Change Spec MUST NOT be marked `Implemented` until the required real single-dot and multi-dot representative data used by acceptance verification is available and validated. Do not guess the Micronesia representative dot in production data.

## Task-assistance API contract

The common map stack must expose explicit task semantics. Exact names are implementation detail; the contract is not.

At minimum the common map presentation must be able to express:

- **answer-selection candidates** — Country IDs that the learner may choose on the map; and
- **task target** — the Country location intentionally being presented as the current question/correction target.

These signals are orthogonal and may compose during feedback.

Examples:

```text
Find Nauru, before answer
  answer-selection = current candidate scope
  task-target = none

Which country is this? (Nauru)
  answer-selection = none
  task-target = Nauru

Locate Countries, after wrong answer
  answer-selection = existing answered-state policy
  task-target = expected Country

Normal World Geography map
  answer-selection = none
  task-target = none
  generic onCountryClick may still exist for navigation
```

The implementation MUST NOT derive these semantics from:

- `onCountryClick` being non-null;
- generic `selectableIds`;
- generic `hoverableIds`;
- generic `highlightedIds`;
- progress/status colors;
- map level (`world`/`continent`);
- Drill/Today/Learning component names.

Workflow components declare only the current task semantics. Country-to-SVG translation and learning-anchor resolution remain in the map adapters/layer.

## Shared architecture and ownership

### `maps/`

Owns:

- runtime learning-anchor metadata and validation;
- Country/map -> learning-anchor resolution;
- answer-selection tiny hit geometry;
- task-assistance pointer resolution and overlap behavior;
- hover-only marker growth for answer-selection;
- persistent marker emphasis for a task target;
- rendered screen-space sizing across zoom/resize/expanded presentation;
- reduced-motion behavior;
- cleanup of generated interaction/presentation elements.

`SvgMapController` must remain ignorant of Drill, Today, Practice, Learning, Recite, skill names, correct answers, and Country domain semantics beyond the generic SVG/task data supplied to it.

### `CountryLearningMap`

Owns the Country-domain -> SVG/map adapter boundary for learning-task maps.

It may translate generic task semantics from canonical Country IDs into the SVG/map-level representation required by `SvgMapView`/controller. It must not contain per-Country size thresholds, hard-coded tiny Country lists, or pixel geometry logic.

### `SvgMapView`

Remains the declarative React lifecycle adapter.

It may carry generic task-assistance state to the controller, independently from existing generic hover/select/highlight state.

### Workflow owners

Today, Drill, Learn & Practise, and guided Learning may say only:

- which Countries are answer candidates for this map task; and/or
- which Country is the current task target.

They MUST NOT:

- check whether a Country is tiny;
- know anchor coordinates;
- create SVG circles/halos;
- special-case Nauru, Andorra, Micronesia, Monaco, Vatican City, or any other Country;
- calculate click radius;
- duplicate hover/target marker animation.

### `GeographyOverviewMap`

Must remain a normal geography/navigation map.

Generic `interactive`, `onCountryClick`, `selectableIds`, progress colors, highlighted Country IDs, and hover groups remain supported, but `GeographyOverviewMap` MUST NOT opt into learning-task tiny assistance unless a future explicit product requirement changes its role through a separate Change Spec.

## Cleanup of the incorrect implementation

This change must simplify the existing implementation rather than preserve incompatible behavior behind more conditions.

Required cleanup outcomes:

- remove the unconditional relationship between ordinary controller rendering and creation of visible tiny markers;
- stop using generic `isSelectable()`/click-handler presence as the activation condition for tiny-Country assistance;
- stop using generic `highlighted` membership as the sole proof that a tiny Country is the active learning target;
- keep generic `selectableCountries` only if it is still useful for ordinary click eligibility; it must no longer imply tiny assistance;
- keep generic hover presentation independent from task-assistance hover;
- answer-selection hover growth must work even when `hoverHighlight=false` and `hoverShowName=false` for the ordinary map layer;
- when task assistance becomes inactive, remove/disable all generated halos, markers, rings, and task-only pointer state immediately;
- do not retain old geometry-threshold behavior as a fallback that can silently reactivate augmentation on normal maps;
- remove dead constants, stale tests, and comments that describe the superseded global/selectable model.

Prefer one coherent task-assistance layer/state machine in `SvgMapController` rather than separate ad-hoc marker systems for selection and target emphasis.

## Interaction and states

### Answer-selection rest

- source Country geometry is unchanged;
- forgiving tiny hit area is invisible;
- no generated rest marker makes a tiny Country look larger than the asset;
- task-assistance hover state is null.

### Answer-selection hover

- pointer entering the forgiving area resolves the intended candidate;
- only that candidate's learning anchor grows visibly;
- a subtle ring/glow is allowed;
- existing source geometry remains intact beneath the marker;
- pointer leave removes the temporary marker/ring and returns to rest;
- task-assistance hover state must not require generic hover styling to be enabled.

### Task target

- if the target has tiny assistance metadata, its learning anchor remains enlarged;
- if the target is not tiny/anchor-assisted, preserve the existing normal Country-target presentation for recognizable geometry;
- changing target cleans up the old anchor before/while rendering the new one;
- clearing target removes task-only emphasis.

### Target + answer-selection

During correction/feedback the same Country may be both in the candidate set and the task target.

- persistent target size is the base state;
- pointer hover may add only bounded extra emphasis;
- pointer leave returns to persistent target size, not to an invisible/rest marker;
- no duplicate SVG elements or duplicate answer callbacks.

### Reduced motion

- no continuous pulse;
- no required motion for understanding state;
- answer-selection hover may switch size without animated interpolation;
- task-target marker remains statically enlarged.

## Pointer and overlap rules

Resolve pointer intent in this order:

1. a direct hit on real selectable Country source geometry wins;
2. otherwise, among overlapping eligible learning-anchor halos, the nearest anchor wins deterministically;
3. ties use a deterministic stable rule rather than DOM insertion accident.

Additional requirements:

- a tiny halo must not make a neighboring normal Country unreachable;
- a multi-dot Country receives only one halo at its configured learning anchor;
- clicking any actual multi-dot source component remains a valid direct selection of that Country;
- hidden/non-answerable Countries have no active task halo;
- task assistance must respect the caller's candidate set and cannot make an out-of-scope Country selectable;
- one pointer activation dispatches one Country callback.

## Scale, resize, and zoom

When task assistance is active, its usable sizes are screen-space behavior, not raw SVG-user-unit behavior.

Recompute as necessary after:

- initial map load;
- map/container resize;
- standard <-> expanded MapSurface presentation;
- responsive viewport changes;
- `setZoomArea`/reset zoom/viewBox changes.

Do not remount the SVG merely to resize task assistance.

When task assistance is inactive, avoid maintaining unnecessary generated target geometry just to support ordinary maps.

## Anchor validation and stale data

Bundled anchor data must be validated against bundled map definitions/assets.

Validation must catch at least:

- unknown map ID;
- unknown Country ID;
- unresolved source Country/SVG ID;
- duplicate records for the same map + Country identity;
- invalid/non-finite anchor coordinates;
- explicit anchor coordinates outside the applicable map/viewBox or otherwise clearly invalid;
- source identity/version mismatch when the data contract carries an asset fingerprint/version.

For a stale explicit multi-dot anchor:

- do not silently use total Country `getBBox()` center;
- do not silently select the first/nearest component;
- fail the repository validation/test so the map decision can be re-confirmed.

## Existing capabilities to reuse

- `src/features/world-countries/maps/SvgMapController.ts` — single imperative owner for SVG discovery, rendering, zoom, pointer routing, and generated map layers.
- `src/features/world-countries/maps/SvgMapView.tsx` — declarative controller lifecycle boundary.
- `src/features/world-countries/learning/CountryLearningMap.tsx` — shared Country-domain learning map adapter used by Today, Drill/Practice, and guided Learning.
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx` — persistent guided-Learning map host and dynamic presentation override seam.
- `src/features/world-countries/drill/DrillSession.tsx` — common Drill/Practice location-click task owner; it should only declare task semantics.
- `src/features/world-countries/learning/flows/SchedulerLocationPracticeStep.tsx` — guided location-click task; it should only declare task semantics through `LearningMapSurface`.
- `src/features/world-countries/today/TodayReviewSession.tsx` — Location -> Country target task; it should declare a task target rather than depending on generic highlight to trigger tiny assistance.
- `src/features/world-countries/maps/mapDefinitions.ts` — stable map identities used to scope map-specific learning-anchor data.
- the map-anchor editor/export work — use an adapter/generation boundary where available; do not couple runtime to editor UI state.

## Edge cases

### Micronesia / separated multi-dot Country

Given an explicit representative anchor selected for the active map asset:

- `Find Micronesia`: every real Micronesian source component remains directly clickable, but only the representative anchor has the forgiving halo; hovering that halo enlarges only that anchor;
- `Which country is this?`: only the representative anchor receives persistent tiny-target emphasis; other Micronesian components remain ordinary geography;
- ordinary World/Oceania maps: no Micronesia component is enlarged by this capability.

### Tiny Countries near one another

- overlapping halos resolve by direct geometry first, then nearest anchor;
- hover must not make multiple markers bloom at once;
- leaving one halo and entering another updates one assistance-hover state rather than stacking markers.

### Country with meaningful mainland plus tiny islands

No tiny assistance is inferred from the small islands. Normal source geometry remains the interaction target unless map-owned anchor metadata explicitly classifies that map representation for assistance.

### Country rendered differently across assets

World and Continent maps may have different anchor records. A valid anchor for one must not be reused by coordinate coincidence on another.

### Question transition

When moving from Nauru to another Country:

- remove Nauru's task marker immediately;
- update candidate/target assistance without reloading the SVG;
- no stale halo may submit the previous answer.

### Hidden or muted Country

- hidden wins: no source interaction and no task assistance;
- muted styling does not itself disable task assistance if the Country remains a valid answer candidate;
- ordinary semantic colors do not activate assistance.

### No valid anchor metadata

For a Country that requires explicit multi-dot representation but has no valid configured anchor:

- direct source geometry may remain usable for answer selection according to normal click eligibility;
- do not invent a representative point at runtime;
- repository validation must prevent required production coverage from being considered complete.

## Out of scope

- Editing/redrawing bundled SVG geography to make small Countries permanently larger.
- Enlarging tiny Countries on normal Geography/mastery/progress/setup maps.
- Changing Country membership, Country IDs, Capital data, scoring, scheduling, proficiency, or evidence.
- Touch redesign of all map interaction beyond the shared minimum target behavior required here.
- Showing labels/callouts for every microstate.
- Continuous pulse/beacon animation.
- Changing expanded-map behavior from Change Spec 0020.
- Finalizing the raw editor export schema if that work is still evolving; only the stable runtime adapter contract is required here.

## Acceptance criteria

### Architecture / cleanup

- [ ] ADR 0029 is implemented as the map ownership/source-of-truth contract.
- [ ] `WORLD_COUNTRIES.md` no longer states that generic selectable/highlighted maps automatically inherit tiny-Country augmentation.
- [ ] Generic `selectableIds` remains only click eligibility and does not activate tiny assistance.
- [ ] Generic highlighted/progress state does not activate tiny assistance.
- [ ] No Today/Drill/Practice/Learning component contains Country-specific tiny geometry, pixel radius, anchor coordinates, or tiny-Country lists.
- [ ] The old unconditional/global tiny-target rendering path is removed or transformed into the explicit task-assistance path; there is not a second legacy implementation left active.
- [ ] Task-assistance hover state is independent of generic `hoverHighlight`/`hoverShowName` state.

### Normal-map regression

- [ ] A clickable `GeographyOverviewMap` with tiny Countries creates no task-only enlarged marker or forgiving halo when no task assistance is requested.
- [ ] World mastery/progress/setup geography renders tiny Countries at original SVG size.
- [ ] Continent setup/navigation maps render tiny Countries at original SVG size.
- [ ] Existing navigation clicks, selection, hover groups, progress colors, hidden Countries, and group outlines continue to work.

### Click exercises

- [ ] Learn & Practise `Locate Countries` explicitly requests answer-selection task semantics through the common map seam.
- [ ] Learn & Practise `Locate Capitals` uses the same answer-selection seam.
- [ ] Drill location-click uses the same seam where applicable.
- [ ] Guided Learning location practice uses the same seam through `LearningMapSurface`.
- [ ] Before answer, the expected tiny Country has no unique visible emphasis relative to other tiny candidates.
- [ ] A tiny candidate has a materially larger invisible pointer target than its source dot.
- [ ] Entering that target visibly enlarges the candidate anchor even when ordinary map hover highlighting is disabled.
- [ ] Pointer leave restores the non-assisted/rest appearance.
- [ ] Clicking inside the halo but outside source geometry submits the candidate exactly once.
- [ ] Normal-size Country candidates remain selectable through source geometry without generated large halos.

### Location-question target

- [ ] Today `Which country is this?` explicitly declares the Country as a task target.
- [ ] Drill `Which country is this?`/Location -> Country recall declares the same generic task-target semantic rather than relying on generic highlight to trigger tiny behavior.
- [ ] A tiny task target stays visibly enlarged for the full question state.
- [ ] Clearing/changing the task target restores the previous Country and emphasizes only the new target.
- [ ] Country names remain governed by existing disclosure rules.
- [ ] A Country that is merely highlighted for normal status/progress does not receive task-target enlargement.

### Learning-anchor data

- [ ] Runtime learning-anchor data is owned under `maps/` and keyed by stable map identity + Country identity.
- [ ] The data contract represents confirmed single-dot and explicitly selected multi-dot cases (or semantically equivalent forms).
- [ ] Runtime code does not use a source-dimension threshold as the authoritative classification of assistance-worthy Countries.
- [ ] Bundled data validation rejects unknown/stale/invalid records rather than silently selecting another anchor.
- [ ] The runtime contract can be produced from editor/export decisions through an adapter/generation step without importing editor UI code into the map runtime.

### Multi-dot Country

- [ ] A representative multi-dot test case uses one explicit learning anchor rather than total Country bbox center.
- [ ] Answer-selection gives that Country exactly one forgiving halo.
- [ ] Direct clicks on other real source components of the same Country still select the Country.
- [ ] Hovering the halo enlarges only the representative anchor.
- [ ] Task-target emphasis enlarges only the representative anchor, not every component.
- [ ] Normal maps enlarge none of the Country's components.
- [ ] Before marking `Implemented`, verify a real configured multi-dot Country (Micronesia when its editor decision is available) against the bundled map asset.

### Scale / lifecycle

- [ ] Halo and marker usability remain approximately screen-space stable across map resize, zoom/viewBox changes, and expanded/standard MapSurface presentation.
- [ ] Task state changes update assistance without remounting/reloading the SVG.
- [ ] Clearing task assistance removes/disables generated task elements and stale pointer state.
- [ ] Hidden Countries have no active halo/target marker.
- [ ] Reduced-motion preserves static usability and target emphasis without required animation.

### Pointer resolution

- [ ] Direct real Country geometry wins over an overlapping halo.
- [ ] Overlapping halos resolve deterministically to the nearest eligible anchor.
- [ ] One pointer activation yields one Country callback.
- [ ] Out-of-scope/non-candidate Countries cannot become selectable through a halo.

### Real workflow regression tests

Tests must cross the real shared stack rather than replacing the map with a dummy component for the behaviors below.

- [ ] real Drill/Practice -> `CountryLearningMap` -> `SvgMapView` -> controller path verifies a tiny Locate Country candidate;
- [ ] real Locate Capitals path verifies the same common answer-selection capability;
- [ ] real guided Learning location-practice path verifies the same capability;
- [ ] real Today or Drill Location -> Country path verifies persistent task-target emphasis;
- [ ] real clickable `GeographyOverviewMap` path verifies **absence** of tiny augmentation;
- [ ] a representative multi-dot anchor test verifies one-anchor behavior.

Synthetic controller tests remain useful for geometry/overlap math but are insufficient by themselves.

### Manual browser verification gate

Do not mark this Change Spec `Implemented` based on unit/integration tests alone. Record direct browser verification of these cases in `## Verification`:

1. **Oceania / Locate Countries / Find Nauru**
   - Nauru is original-sized before hover;
   - pointer can enter a forgiving area larger than the dot;
   - Nauru visibly grows while hovered;
   - clicking within that forgiving area answers Nauru.
2. **Location -> Country / Nauru**
   - when the prompt is `Which country is this?`, Nauru remains visibly enlarged until the question changes.
3. **Normal World/Continent geography/mastery map**
   - small Countries are not replaced/enlarged by task-assistance markers.
4. **Configured multi-dot Country**
   - only the chosen representative anchor grows/receives the halo;
   - other components remain ordinary geography.

A concise verification note is sufficient; screenshots are optional but useful if the implementation agent can capture them.

## Source anchors

- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/SvgMapController.test.ts`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.test.tsx`
- `src/features/world-countries/maps/WorldCountriesMapClick.integration.test.tsx`
- `src/features/world-countries/maps/mapDefinitions.ts`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/learning/CountryLearningMap.test.ts`
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx`
- `src/features/world-countries/learning/flows/SchedulerLocationPracticeStep.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/drill/DrillSession.test.tsx`
- `src/features/world-countries/today/TodayReviewSession.tsx`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/changes/0020-world-countries-expanded-map-and-tiny-country-targets.md`
- `docs/changes/0021-complete-shared-tiny-country-map-interaction.md`

## Documentation cleanup

Implementation must leave the repository documentation unambiguous:

1. Update `docs/architecture/features/WORLD_COUNTRIES.md` to the ADR 0029 current-state contract.
2. Set Change Spec 0021 status to `Superseded` and link Change Spec 0023 as its replacement. Preserve its historical verification text rather than rewriting history.
3. Keep Change Spec 0020 at its existing historical status because its expanded-map work remains valid, but add a concise metadata/note that its tiny-Country behavior is corrected by Change Spec 0023.
4. Do not add another ADR for workflow-specific cases; ADR 0029 is the shared architectural decision.
5. Remove/update code comments and test comments that describe generic selectable maps as inheriting tiny-Country augmentation.

## Verification

Complete this section only when all automated and manual acceptance gates are satisfied.

Required automated validation:

- nearest focused map/controller/task tests;
- real workflow/map integration tests described above;
- `npx vitest run src/features/world-countries`;
- `npm run typecheck`.

Required manual browser verification is listed in the acceptance criteria and must be recorded here before changing status to `Implemented`.
