# Change Spec 0025 - Correct tiny-Country pointer intent, multi-component selection, and hover feedback

- **Status:** Ready
- **Date:** 2026-08-22
- **Issue:** None.
- **Related ADRs:** [ADR 0031 - Separate answer-selection interaction points from representative learning anchors](../adr/0031-separate-selection-interaction-points-from-representative-learning-anchors.md)
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)
- **Supersedes:** [Change Spec 0024 - Correct tiny-Country anchor derivation and SVG coordinate handling](0024-correct-tiny-country-anchor-derivation-and-svg-coordinate-space.md) for answer-selection pointer precedence, multi-component interaction, and task-hover presentation.
- **Preserves from 0024:** task scoping, automatic simple-dot detection, SVG transform correctness, screen-space sizing, normal-map non-augmentation, and workflow/map ownership boundaries.

## Goal

Finish tiny-Country map-answer usability by replacing the remaining one-anchor/per-element hover model with one shared task-pointer interaction model that:

1. reliably gives microstates a forgiving hover/click region even when that region overlaps a larger Country;
2. gives distributed tiny/island Countries local assistance on every qualifying component instead of forcing hover to one representative point; and
3. visibly highlights the Country under the pointer with the standard hover color in Locate/map-answer exercises.

This is a corrective refactor of the shared map capability. Do not add Country-specific fixes in Drill, Learn & Practise, guided Learning, Today, or SVG assets.

## User-visible behavior

### Europe microstates

In a location-click exercise such as `Find Cyprus`, `Find Andorra`, or any equivalent active scope:

- Andorra, San Marino, Vatican City, Malta, and any other qualifying tiny candidate receive a materially forgiving pointer region.
- The learner does not need to place the cursor on the exact tiny source dot/path.
- Entering the forgiving region enlarges the tiny location reliably, not intermittently.
- The hovered Country is also shown with the task hover color.
- Clicking at the same location submits the same Country that is shown as hovered.
- The fact that another Country is the correct answer does not change hover/click assistance for these candidates.

A small bounded region around San Marino/Vatican may intentionally resolve to the microstate even though the underlying ordinary source geometry at that pixel is Italy. Outside that region, Italy remains normally selectable.

### Multi-component island Countries

In an Oceania location-click exercise such as `Find Micronesia`:

- every qualifying tiny geographic component of Micronesia that is a legitimate answer location can receive its own forgiving interaction region;
- hovering a component enlarges **that component/location**, not a different configured representative dot;
- moving to another Micronesia component moves the local size/ring feedback to that component;
- the Country is highlighted with hover color while any of its answer-selection components owns the pointer;
- clicking any assisted component/halo submits Micronesia;
- direct clicks on genuine Micronesia source geometry remain valid.

The same behavior applies generically to other distributed tiny Countries when their map geometry qualifies. Do not special-case Micronesia.

### Location-question target remains singular

For `Which country is this?` / correction-target presentation:

- a simple tiny Country may use its automatically derived single point;
- an ambiguous multi-component Country still uses the one explicit representative learning anchor selected for learning presentation;
- answer-selection interaction points do not cause all islands to enlarge persistently when the Country is the question target.

### Normal maps remain unchanged

World/Continent geography, setup, progress/mastery, navigation, and other non-answer maps:

- do not gain forgiving task halos;
- do not gain task-hover color behavior;
- do not show generated tiny markers merely because they are clickable.

## Scope

- Refactor answer-selection pointer resolution in the shared map layer.
- Represent answer-selection tiny assistance as zero-or-more interaction points per Country.
- Keep representative learning anchors separate and singular for task-target presentation.
- Correct microstate overlap precedence so the forgiving region can win over a neighboring/enclosing normal Country.
- Make task-pointer hover color a shared answer-selection behavior for all candidate Countries.
- Ensure hover marker location and click result are derived from the same task-pointer intent.
- Preserve SVG transform/resize/zoom correctness from Change Spec 0024.
- Update tests, ADR/current-state documentation, and historical spec status.

## Architecture constraints

Follow ADR 0031 and `docs/architecture/features/WORLD_COUNTRIES.md`.

### Map ownership

`src/features/world-countries/maps/` owns:

- source-geometry decomposition/analysis needed for interaction points;
- tiny/distributed eligibility;
- interaction-point identity and position;
- representative learning-anchor resolution;
- screen-space forgiving radii;
- pointer-intent resolution and overlap precedence;
- task-hover Country presentation;
- local tiny marker/ring presentation;
- click dispatch mapping back to one Country;
- cleanup, resize, zoom, and reduced-motion behavior.

Workflow owners declare only answer-selection Country IDs and/or the task target. They MUST NOT know which Countries are tiny, how many components they have, which point is hovered, or which representative anchor is used.

### Do not preserve one-target-per-Country as the answer-selection model

The current controller shape stores task assistance in a Country-keyed target model and hover state effectively as one Country ID. That cannot represent `Micronesia component A` versus `Micronesia component B`.

Refactor to an equivalent of:

```text
Country
  -> 0..N answer-selection interaction points

Task pointer intent
  -> Country + optional interaction-point identity

Country task target
  -> 0..1 representative learning anchor
```

Exact internal names/types are implementation detail. The capability to distinguish multiple local interaction points for one Country is required.

### Central pointer-intent resolver

Answer-selection hover and click must use one shared resolver based on pointer coordinates and current task candidates.

Do not depend on:

- which generated SVG element received `pointerenter` first;
- source-path DOM z-order;
- a transparent halo element being the event target;
- separate hover logic that can disagree with click resolution.

Generated halo/marker/ring elements are presentation/geometry aids. Prefer them to be non-authoritative for pointer identity (and `pointer-events: none` where compatible with the chosen implementation).

One pointer position must produce one deterministic task intent, and that same intent drives both hover presentation and click submission.

## Interaction-point derivation

### Simple compact Country

If the Country source representation is one compact unambiguous component:

- derive one interaction point automatically;
- no authored metadata is required;
- use the same source component for local hover enlargement and forgiving click radius.

### Distributed tiny Country

If the Country representation consists of multiple separated compact components and has no meaningful normal-scale component that makes the Country easy to select:

- derive one answer-selection interaction point for each qualifying compact component;
- each point maps to the same Country identity;
- each point gets its own bounded screen-space forgiving region;
- only the point currently owning task-pointer intent gets local marker/ring enlargement.

Do not use the Country's total bounding-box center.

Do not restrict answer selection to the authored representative learning anchor.

### Mainland / dominant-component Country

If a Country has a meaningful normal-scale component/mainland:

- direct source geometry remains the answer surface;
- do not create forgiving halos for every incidental tiny island/component;
- the existence of small detached geometry alone does not classify the Country as a distributed tiny Country.

The exact component-analysis algorithm is implementation detail, but it must be shared, deterministic for the loaded asset, and covered with bundled-map regression tests.

## Pointer precedence

The current `direct real source geometry wins before halo` rule is superseded because it makes embedded/adjacent microstates unusable.

For an answer-selection pointer position, resolve in this order:

1. **Exact assisted-component hit:** if the pointer is on real source geometry belonging to an assisted tiny component, resolve that Country/local interaction point.
2. **Tiny interaction regions:** among active interaction regions containing the pointer, choose the nearest interaction point. This may intentionally beat a different underlying normal Country such as Italy near San Marino/Vatican or Spain/France near Andorra.
3. **Ordinary source geometry:** if no active tiny interaction region owns the pointer, resolve the direct selectable source Country normally.
4. **No intent:** otherwise clear task hover / do not submit.

For overlapping tiny interaction regions:

- nearest point wins;
- ties use a deterministic stable identity rule;
- never rely on DOM insertion order.

The forgiving radius must remain bounded so the neighboring Country is only displaced in the intended local target region.

## Task-hover presentation

### All answer candidates

When the task-pointer resolver returns an answer candidate:

- apply the shared `hoverFill` / hover stroke presentation to that Country;
- do this even when generic `hoverHighlight=false` for ordinary map behavior;
- do not reveal the Country name unless the task's existing rules independently permit it;
- restore the Country's prior base/semantic/status presentation when task hover clears.

This applies to normal-size Countries as well as tiny Countries. Locate exercises should visibly communicate `this is the Country your click would select`.

### Tiny interaction point

When task intent includes a local tiny interaction point:

- enlarge only that point/location;
- optionally render the existing subtle ring/glow;
- keep visual size bounded and screen-space based;
- if the Country has multiple components, do not move the marker to the representative learning anchor.

### Consistency invariant

At any pointer position during answer selection:

> The Country shown with task hover color MUST be the Country that a click at that same position would submit.

This invariant is mandatory and should be directly tested.

## Representative learning anchors

The explicit map-owned representative data currently used for Micronesia remains useful, but its responsibility changes/clarifies:

- it is the persistent **learning/task-target** peg for an ambiguous multi-component Country;
- it is not the only answer-selection interaction point;
- it must not override local pointer-component feedback during `Find Country` exercises.

Consider renaming types/files from generic `LearningAnchor` terminology if needed to make this distinction obvious to future agents. A rename is encouraged when it reduces the risk of interaction points and representative anchors being conflated again, but exact naming is implementation detail.

## Coordinate space, resize, and zoom

Preserve ADR 0030 / Change Spec 0024 coordinate correctness:

- all component points and representative anchors must be converted to the coordinate space used for rendering/hit testing;
- pointer-distance comparisons use one common coordinate space;
- interaction radius and visible marker size are stable screen-space usability sizes;
- transformed Oceania groups must remain aligned;
- resize, standard/expanded mode, responsive layout, and zoom/viewBox changes recompute screen positions/radii without remounting the task.

No map-specific transform constants or hand-tuned coordinate offsets.

## Cleanup requirements

This change is not complete if it adds another branch while retaining conflicting pointer models.

Required cleanup outcomes:

- remove or refactor the assumption that one `TaskLearningTarget` / Country-keyed target is sufficient for answer-selection assistance;
- replace `taskHoveredCountryId`-only state where necessary with state that can identify the local interaction point;
- remove direct-source-first pointer precedence for active tiny interaction regions;
- eliminate duplicate hover resolution between source-path listeners and generated halo listeners;
- ensure generated assistance layers do not independently decide answer identity;
- keep generic navigation hover separate from task-answer hover;
- retain one Country answer callback per click;
- remove stale tests/comments/docs describing `one representative halo for Micronesia during answer selection` as correct behavior;
- do not reintroduce per-Country allowlists or workflow-specific geometry branches.

Prefer one coherent task-pointer resolver/state machine over event-handler patches on individual SVG nodes.

## Edge cases

- **San Marino / Vatican City inside Italy's visual area:** their local halos must be usable and must beat Italy only within the bounded forgiving region.
- **Andorra between larger Countries:** the Andorra region must be reliable and not intermittently resolve Spain/France.
- **Malta near neighboring/sea geometry:** hover/click remains stable across the full forgiving region.
- **Two tiny Countries with overlapping halos:** nearest interaction point wins; exact assisted source component wins first.
- **Micronesia / Marshall Islands / other distributed tiny representations:** hovering one component enlarges that component, not a remote representative.
- **Multiple components of the same Country with overlapping halos:** nearest local component drives marker location; click result remains the same Country.
- **Normal Country with tiny islands:** no accidental halo cloud around minor islands when a dominant normal-scale component exists.
- **Task target + answer selection during feedback:** persistent representative target may coexist with answer state without replacing local pointer intent or producing duplicate markers/callbacks.
- **Hidden/out-of-scope Country:** no interaction point may make it answerable.
- **Pointer leave / candidate scope change / next question:** clear task-pointer color and local marker immediately.

## Out of scope

- Changing question generation, scoring, answer correctness, or progress rules.
- Changing normal-map hover/navigation behavior.
- Changing the expanded/focus layout.
- Editing bundled SVG geography to make microstates larger.
- Replacing the existing geography anchor editor.
- Showing Country names on Locate hover.

## Acceptance criteria

### Europe browser behavior

- [ ] In a real Europe Location -> Country exercise, Andorra can be hovered reliably through its forgiving region; it does not work only intermittently.
- [ ] San Marino can be hovered reliably even where ordinary underlying geometry would otherwise resolve Italy.
- [ ] Vatican City can be hovered reliably even where ordinary underlying geometry would otherwise resolve Italy.
- [ ] Malta's forgiving region behaves consistently and does not require exact-pixel placement.
- [ ] Hovering each of the above visibly enlarges the local tiny location.
- [ ] Hovering each of the above applies the task hover color to that Country.
- [ ] Clicking the same point submits the Country currently shown as hovered.
- [ ] Italy/Spain/France remain selectable immediately outside the bounded microstate assistance region.

### Multi-component browser behavior

- [ ] In a real Oceania `Find Micronesia` exercise, more than one genuine Micronesia dot/component can independently trigger local enlargement.
- [ ] Hovering Micronesia component A enlarges component A; it does not enlarge the configured representative component B.
- [ ] Moving to component B moves local enlargement to B.
- [ ] Any assisted Micronesia component maps to the same Micronesia answer.
- [ ] Micronesia receives task hover color while any of its components owns pointer intent.
- [ ] Equivalent distributed tiny Countries receive the shared behavior through geometry analysis, not Country-name branches.
- [ ] `Which country is this?` for an ambiguous multi-component Country still uses one representative learning anchor rather than enlarging all components.

### Shared hover behavior

- [ ] In a Locate/map-answer task, hovering a normal-size answer candidate applies task hover color even if generic `hoverHighlight=false`.
- [ ] No Country name is revealed solely because task hover is active.
- [ ] Task hover color clears/restores prior presentation on pointer leave.
- [ ] The task-hover Country and click-submitted Country are always identical for the same pointer coordinates.

### Architecture/regression

- [ ] Answer-selection supports 0..N interaction points per Country.
- [ ] Representative learning anchor is separate from answer-selection interaction points.
- [ ] Pointer intent is resolved centrally and is not determined by DOM event target/z-order.
- [ ] No workflow/UI hard-coded tiny-Country or island-Country list is introduced.
- [ ] Normal geography/setup/progress maps remain free of task-only halos/markers/task-hover color.
- [ ] Transformed Oceania alignment remains correct.
- [ ] Resize, expanded mode, and zoom preserve pointer/marker alignment and screen-space sizing.
- [ ] One click produces one answer callback.
- [ ] Hidden/out-of-scope Countries cannot be selected through a stale interaction point.
- [ ] Reduced-motion behavior remains respected.
- [ ] Generated task state/listeners/elements clean up on scope change, reload, next question, and destroy.

### Tests and verification gate

- [ ] Controller tests reproduce the Italy/San Marino-or-Vatican precedence case: pointer inside the microstate halo but over a different source Country resolves the microstate.
- [ ] Controller tests cover two interaction points mapping to the same Country and verify local hover-point identity changes while Country ID remains constant.
- [ ] Tests assert hover Country == click Country for identical pointer coordinates.
- [ ] Bundled Europe regression covers Andorra plus at least San Marino and Vatican City.
- [ ] Bundled Oceania regression covers multiple Micronesia components (or equivalent real distributed Country geometry), not only the representative anchor.
- [ ] Workflow integration still crosses the real map stack rather than mocking away `SvgMapController` for the core regression.
- [ ] `npx vitest run src/features/world-countries` passes.
- [ ] `npm run typecheck` passes.
- [ ] Manual browser verification for the exact Europe and Oceania cases above is completed before this Change Spec may be marked `Implemented`.

## Source anchors

- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/SvgMapController.test.ts`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/CountryLearningMap.tsx`
- `src/features/world-countries/maps/learningAnchors.ts`
- `src/features/world-countries/maps/learningAnchors.test.ts`
- `src/features/world-countries/maps/WorldCountriesMapClick.integration.test.tsx` (or current real-stack integration test)
- `src/features/world-countries/maps/assets/MapChart_Map_Europe.svg`
- `src/features/world-countries/maps/assets/MapChart_Map_Oceania.svg`
- `src/features/world-countries/drill/DrillSession.tsx`
- `docs/architecture/features/WORLD_COUNTRIES.md`

Use repository discovery if filenames have moved. Stay inside World Countries plus direct dependencies.

## Documentation impact

During implementation:

- add ADR 0031;
- mark ADR 0030 `Superseded` by ADR 0031;
- update `docs/architecture/features/WORLD_COUNTRIES.md` to document:
  - 0..N answer-selection interaction points;
  - 0..1 representative learning anchor;
  - central pointer intent;
  - microstate halo precedence over overlapping ordinary source geometry;
  - task-hover color as answer-selection presentation;
- mark Change Spec 0024 `Superseded` by 0025;
- remove current-state wording that says one representative halo is the correct Micronesia answer-selection behavior.

## Verification

Complete only after browser verification.

- Implemented and verified on YYYY-MM-DD.
- Evidence must include automated tests plus manual Europe and Oceania checks from the acceptance criteria.
