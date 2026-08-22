# Change Spec 0022 - Tiny-Country targets must work in real map-click tasks

- **Status:** Proposed corrective change
- **Date:** 2026-08-22
- **Issue:** None
- **Related ADRs:** None required
- **Corrects:** Change Spec 0021, specifically its Country-click acceptance/verification
- **Scope:** World Countries only

## Goal

Make the tiny/dot-Country usability behavior reliably present in the workflows where it matters most: **the user is answering by clicking a Country on the map**.

This is the primary requirement of the tiny-Country work. The change is not complete merely because `SvgMapController` can create a marker in isolation.

A completed implementation must prove the behavior through the actual shared production path from an active click-answer task to the rendered bundled SVG.

## Current problem

Change Spec 0021 established the correct ownership direction, but its implementation verification was incomplete.

Current production click-answer paths pass `onCountryClick` through the shared map stack, but the tests do not verify the resulting rendered SVG interaction:

- `DrillSession` tests mock `CountryLearningMap` and invoke the callback prop directly.
- `CountryLearningMap` tests mock `SvgMapView`.
- `SvgMapController` tests prove synthetic controller behavior in isolation.

Therefore no current test proves this critical chain:

```text
active click-answer workflow
  -> CountryLearningMap
  -> SvgMapView
  -> SvgMapController
  -> bundled SVG Country geometry
  -> visible tiny marker + forgiving hit target
  -> actual Country selection callback
```

The user-visible result is that tiny-Country augmentation can be green in unit tests while still be absent in Drill / Learn & Practise map-click tasks.

## Primary user-visible contract

### 1. Click-answer maps

Whenever the active task expects the user to answer by clicking a Country on the map:

- every eligible tiny/dot-like Country in the selectable scope has a visibly clearer marker;
- every eligible tiny/dot-like Country has a materially larger click target than its source SVG geometry;
- clicking that forgiving target selects exactly the same Country as clicking the source Country;
- this behavior is active **before the answer is known**;
- all eligible tiny Countries receive the same neutral usability treatment, so the correct answer is not leaked;
- hover styling is optional presentation and must not be required for click-target augmentation to exist;
- the behavior must survive the actual task zoom, map size, expanded/standard layout, and question transitions.

This contract takes priority over tiny-marker behavior on passive/overview maps.

### 2. Explicitly indicated tiny Countries

When the map intentionally indicates a Country, for example `Which country is this?` or correction feedback:

- an eligible tiny/dot Country is visibly enlarged for the full duration of the generic indicated/highlighted state;
- it returns to the normal tiny-marker size when that state clears or moves;
- label visibility remains controlled by the existing label/name state;
- hover may add restrained temporary emphasis, but is not the source of the persistent enlargement.

## Required production paths

The implementation is not complete until the behavior works through every current map-click answer path.

### Learn & Practise - Locate Countries

`WorldCountriesDrill.startPractice('locate-countries')`
-> `interaction: 'location-click'`
-> `DrillSession`
-> `CountryLearningMap.onCountryClick`
-> shared SVG map stack.

Before feedback, tiny selectable Countries must already have their neutral enlarged marker/hit area. The requested Country must not receive unique emphasis.

### Learn & Practise - Locate Capitals

`WorldCountriesDrill.startPractice('locate-capitals')`
-> `interaction: 'location-click'`
-> `DrillSession`
-> `CountryLearningMap.onCountryClick`
-> shared SVG map stack.

Same requirements as Locate Countries.

### Guided Learning - location practice

`SchedulerLocationPracticeStep`
-> `LearningMapSurface` presentation override
-> `CountryLearningMap.onCountryClick`
-> shared SVG map stack.

It must receive the same tiny-Country selection ergonomics without Learning-specific marker code.

### Drill / shared DrillSession map-click usage

Any active `DrillSession` using `interaction: 'location-click'` must receive the same behavior automatically.

Do not make tiny-Country behavior conditional on `activity === 'practice'`, a practice-mode ID, a Drill mode ID, or workflow name. The generic map interaction is the contract.

> Note: current `startDrill()` starts normal recall interaction; the common `DrillSession` nevertheless owns the location-click interaction used by the feature. Do not invent a separate Drill-only implementation.

## Architecture / clean-code requirement

The ownership from 0021 remains valid:

- `SvgMapController` owns tiny/dot geometry augmentation, marker rendering, forgiving hit geometry, and pointer resolution.
- `SvgMapView` owns the generic React-to-controller interaction contract.
- `CountryLearningMap` translates Country identity to SVG identity and remains workflow-neutral.
- Workflow components express only that Countries are selectable through their normal generic click callback/state.

### Explicit generic selection capability

Do not rely on incidental hover configuration to decide whether Country selection ergonomics are active.

The shared map stack must have one unambiguous generic concept equivalent to:

```text
Countries on this map are selectable by pointer
```

Prefer deriving this from the existing generic Country-click capability where possible. If an explicit shared map/controller state is needed, name it by generic interaction semantics (`selectable`, `countrySelection`, or equivalent), not by workflow semantics (`locateCountry`, `practice`, `correctTarget`, etc.).

Rules:

- No tiny-Country logic in `DrillSession`, `WorldCountriesDrill`, `SchedulerLocationPracticeStep`, Today, or Recite.
- No per-country production exceptions.
- No hard-coded microstate list.
- No second map component or click implementation.
- Clickability and hover appearance must not be accidentally coupled. A Country can be selectable even when hover highlight/name presentation is disabled.
- Hidden/non-selectable Countries must not retain ghost hit targets.

## Tiny/dot eligibility

Keep eligibility geometry-derived, but optimize it for the actual usability problem: Countries represented by very small or dot-like source geometry.

The implementation must not silently remove the augmented marker merely because a particular workflow's zoom/layout causes a threshold boundary to fluctuate.

Required properties:

- rendered hit area remains useful in screen space;
- a source Country that is represented as a dot/small marker remains predictably augmented through ordinary task zoom/resize changes;
- augmentation does not flicker on/off during normal question/layout transitions;
- source path remains authoritative for Country identity and geographic zoom bounds;
- generated marker/hit geometry does not affect map bounds.

The agent may refine the 0021 screen-space algorithm if that is the cause of the real workflow failure. Preserve the intended approximate usability targets unless real-map validation shows they need tuning:

- roughly 24 px minimum pointer diameter;
- roughly 6-8 px neutral visible diameter;
- roughly 10-12 px when explicitly highlighted/indicated.

## Mandatory reproduction before fixing

Before changing behavior, reproduce the failure using the **actual production component stack** and a bundled map asset.

Use at least one real European microstate/dot Country from the bundled Europe SVG as a representative fixture. Tests may name a representative Country; production logic may not.

Record in the implementation notes/tests which layer was responsible for the failure. Do not assume the controller-only implementation is correct merely because its synthetic tests pass.

## Verification strategy

### A. Real integration test: Locate Countries

Add a test that does **not** mock `CountryLearningMap`, `SvgMapView`, or `SvgMapController` between the workflow and the SVG.

The test must:

1. mount the actual click-answer presentation used by Locate Countries;
2. use a bundled SVG or a production-faithful map fixture containing a tiny Country;
3. reach the pre-answer state;
4. assert the tiny Country has the shared visible marker and forgiving hit target;
5. activate the forgiving hit target;
6. assert the workflow receives the selected Country and evaluates/records the answer through its normal path;
7. assert one activation produces one selection.

### B. Real integration test: Locate Capitals

Repeat the important path for Locate Capitals. It may share test harness/helpers with Locate Countries, but it must prove that the Capital prompt's map click reaches the same tiny-Country capability.

### C. Guided Learning location practice

Add coverage through `LearningMapSurface` + `SchedulerLocationPracticeStep` without mocking away the shared map stack. Prove the same tiny hit target selects the Country.

### D. Highlighted/indicated state

Through a real `CountryLearningMap` integration, prove a tiny Country:

- is normal tiny-marker size before generic highlight;
- becomes persistently larger while highlighted;
- returns to normal when highlight clears/moves.

### E. Controller unit tests remain

Retain focused controller tests for sizing, resize/zoom, overlap, hidden state, reduced motion, and pointer resolution. They are necessary but **not sufficient** acceptance evidence.

## Acceptance criteria

### Main acceptance - must all be demonstrated

- [ ] Learn & Practise -> **Locate Countries** visibly enlarges eligible tiny/dot Countries and gives them forgiving click targets before answer.
- [ ] Learn & Practise -> **Locate Capitals** does the same.
- [ ] Guided Learning location practice does the same.
- [ ] Any shared `DrillSession` location-click task inherits the behavior without mode-specific tiny-Country code.
- [ ] Clicking an augmented tiny Country through each applicable real task path submits that Country through the existing answer workflow.
- [ ] The correct Country is not specially emphasized before answer in locate tasks.
- [ ] On feedback, an expected tiny Country that becomes generically highlighted is visibly larger for the duration of feedback and then returns to rest state.

### Shared implementation

- [ ] There is still one tiny-Country implementation in the shared map/controller layer.
- [ ] Workflow components contain no marker sizing, hit-radius, Country-ID, or tiny-geometry logic.
- [ ] Country selection ergonomics do not depend on hover highlight/name settings being enabled.
- [ ] Hidden/non-selectable Countries have no active forgiving target.
- [ ] The same production behavior works at standard and expanded map sizes and after the task's normal zoom is applied.

### Regression

- [ ] Existing Country/SVG ID translation remains unchanged.
- [ ] Existing map zoom/bounds remain based on source geography only.
- [ ] Existing ordinary Country clicks continue to work.
- [ ] Existing highlighted/name/color/hidden semantics remain intact.
- [ ] Existing overlap resolution still prevents a tiny halo from stealing a direct neighboring Country hit.
- [ ] `npx vitest run src/features/world-countries` passes.
- [ ] `npm run typecheck` passes.

## Test-quality gate

Do **not** mark this Change Spec implemented based only on:

- direct calls to a mocked `onCountryClick` prop;
- `CountryLearningMap` mocked to a `<div>`;
- `SvgMapView` mocked out;
- synthetic `SvgMapController` tests alone.

At least the three user-critical click paths above must have evidence that crosses the real map integration boundary.

## Source anchors

- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/drill/DrillSession.test.tsx`
- `src/features/world-countries/learning/flows/SchedulerLocationPracticeStep.tsx`
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/learning/CountryLearningMap.test.ts`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/SvgMapController.test.ts`
- `src/features/world-countries/maps/assets/MapChart_Map_Europe_names.svg`

## Documentation impact

No ADR.

After implementation, update the World Countries current-state architecture only if needed to make this invariant explicit:

> Pointer-selectable World Countries maps inherit geometry-derived tiny-Country marker and forgiving-hit behavior from the shared map stack; workflow owners do not implement or opt into per-mode tiny-Country behavior.

Change Spec 0021 remains historical evidence of the first correction. This spec records the missing real-workflow requirement and verification gate.
