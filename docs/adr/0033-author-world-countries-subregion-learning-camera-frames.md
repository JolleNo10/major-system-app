# ADR 0033 - Author World Countries learning camera frames by Subregion

- **Status:** Accepted
- **Date:** 2026-09-08
- **Deciders:** Product owner / repository maintainer

## Context

World Countries has several map-backed learning and recall experiences. Some need a stable geographic context for the current Subregion; others intentionally need a task-specific camera such as a local border neighbourhood or an isolated Country shape.

The current map boundary exposes several partially overlapping zoom mechanisms, and recent Recite work added target-dependent adaptive framing based on Country geometry, Subregion geometry, target size, sparsity, representative anchors, and thresholds. Repeated browser verification showed contradictory failures: large Countries could dominate the viewport, tiny or distributed Countries could become effectively invisible, and sparse island regions could produce unusable empty-ocean frames.

Those failures are not specific to Recite or Random ordering. They expose a broader ownership problem: workflow/order state is being allowed to choose or derive camera algorithms even when the product intent is simply “show this Subregion as a stable learning context.” Geometry can answer where Country shapes are, but it cannot reliably infer the pedagogically useful frame the product wants learners to see repeatedly.

World Countries already has stable `SubregionId` identity and authoritative regional map definitions. The map layer also already owns map-specific representative learning anchors, synthetic dots, SVG identity translation, coordinate-space correctness, and genuinely geometric local cameras. A stable Subregion learning frame therefore belongs in `maps/`, not in Recite, Drill, Today, Practice, Learning, or another workflow.

This decision complements ADR 0031. ADR 0031 continues to own answer-selection interaction points and representative learning anchors. ADR 0033 decides the source of truth and caller contract for stable learning cameras.

## Decision

### Authored Subregion learning frames are a shared map capability

`src/features/world-countries/maps/` owns an authored learning-frame registry keyed by stable `SubregionId` and the authoritative map definition used for that Subregion.

Each current Subregion has one deliberate map-coordinate frame representing the geographic context learners should see when an active task is operating in that Subregion.

The frame is independent of:

- workflow (`Today`, `Drill`, `Recite`, `Practice`, `Learning`, `Quiz`);
- sequencing (`ordered`, `random`, retry order, etc.);
- answer kind (`Country` or `Capital`);
- task-target color or status;
- the current Country's shape, size, or component count.

Changing the current target within one Subregion therefore does not change the learning camera.

### Workflows express camera intent, not camera algorithms

The common World Countries map boundary exposes one semantic camera intent at a time. Workflows must not combine independent optional zoom props and rely on precedence by accident.

The caller-facing intent must distinguish at least these semantic cases:

```text
default / overview
  -> map's normal geographic view

subregion learning frame
  -> authored frame for SubregionId

explicit Country fit
  -> deliberate geometry fit requested by the task

target-local neighbourhood
  -> task-specific local geometric relationship
```

Exact type names are implementation detail, but the boundary should make these intents mutually understandable and avoid workflow-specific `adaptive` flags or raw map-coordinate values.

Country IDs and Subregion IDs remain the caller-facing identities. Raw SVG IDs and viewBox coordinates remain below the map boundary.

### Camera intent follows task semantics, not workflow names

A stable Subregion learning frame is the default camera for an active World Countries learning/recall task when:

- the task has a current Subregion; and
- the learning objective benefits from repeated regional context; and
- the task does not define a stronger camera semantic.

This rule is general. For example, Recite `Visible`, `Reveal as you go`, and `Random` use the same Subregion frame for the same target Subregion. Random ordering changes prompt order, not camera policy.

Other active map-backed Today, Drill, Learning, Practice, and Quiz surfaces use the same capability when their semantic camera is stable Subregion context.

Setup, navigation, overview, progress, and authoring maps do not automatically inherit learning frames merely because a Subregion is selected or hovered; they keep their own default/explicit presentation semantics.

### Explicit task cameras remain stronger and separate

A task-specific camera takes precedence when the camera itself is part of the task semantics.

Examples include:

- Neighbours Quiz: target-local neighbourhood showing locally relevant border context;
- Country for Shape: explicit fit/isolation of the questioned Country shape;
- another future task that deliberately requests a specific Country geometry fit.

These are not implemented through the authored Subregion learning-frame registry and must not use it as a hidden fallback.

### Target presentation remains independent from camera framing

Task-target presentation continues to use the map-owned model from ADR 0031:

- normal Country geometry where sufficient;
- automatically derived compact representative targets where unambiguous;
- explicit map-owned representative learning anchors for ambiguous/distributed geography;
- map-owned synthetic dots where source geography needs deliberate task presentation.

The learning camera does not derive from those target representations, and target assistance does not redefine the learning frame.

The durable separation is:

```text
camera
  task semantic -> camera intent
  Subregion learning intent -> authored Subregion frame

target
  Country -> real geometry / representative anchor / synthetic point
```

### Missing frame data fails broad and predictable

All current Subregions must have validated frame coverage.

If a learning frame nevertheless cannot resolve at runtime, the resilient fallback is the complete authoritative regional map. The runtime must not fall back to target-size, sparse-region, nearest-component, or other adaptive Country-camera heuristics.

### Remove obsolete adaptive camera machinery

After relevant callers migrate to semantic camera intents, inspect all remaining callers before cleanup.

Delete adaptive target-size/sparsity/dominance machinery, flags, thresholds, helper graphs, compatibility branches, and tests when they no longer support a legitimate camera semantic.

Retain purpose-specific capabilities that still have real callers, including:

- generic explicit Country fitting;
- target-local neighbourhood framing;
- task assistance / representative anchors / synthetic dots;
- aspect fitting and stable physical map layout;
- batched map presentation updates.

Do not keep a second dormant “smart learning camera” alongside authored learning frames.

### Frame data is map-owned and validated

The learning-frame registry must be testable for at least:

- exactly one effective frame for every current `SubregionId`;
- correct authoritative map applicability;
- finite positive bounds;
- valid bounds in the referenced map coordinate system;
- no duplicate Subregion records;
- no workflow-specific or Country-specific frame identity.

The authored rectangle is the semantic camera intent. Existing aspect-fit behavior may expand it to the actual map slot without changing its intended center/context, and camera changes must not resize the physical map surface.

“Validated authored frame” has two distinct meanings and must not be reduced to a structural registry check. An authored Subregion learning frame is a deliberate learning composition, not simply a structurally valid rectangle.

Structural validation establishes that the registry has complete current Subregion coverage, uses the correct authoritative map, contains finite positive bounds, and keeps those bounds inside the source coordinate system. Learning-frame quality is a separate product concern: the composition should give ordinary compact Countries a comfortable interior safe zone, avoid letting large or distributed geography distort the view, and provide useful surrounding spatial context.

For ordinary compact Countries in a Subregion, the authored frame should keep the Country fully visible with a comfortable interior margin. A normal Country must not touch or cross a viewport edge, or be placed at an extreme edge merely because the rectangle technically contains it. Poland in Central Europe and Serbia in the Balkans are representative examples of this invariant.

Huge, transcontinental, highly distributed, or otherwise frame-distorting Countries are an explicit exception to a naive whole-geometry containment rule. The Eastern Europe frame may show the geographically useful western portion of Russia while composing Romania, Moldova, Ukraine, Belarus, and their surrounding context well. The learning frame is a pedagogical window, not the union of every Country bound.

Sparse and island geography may need a broader composition than a compact continental target. Micronesia, Polynesia, Melanesia, and Australia & New Zealand should keep targets legible while showing enough surrounding geography for spatial memory, avoiding both an isolated tight crop and a tiny target lost in empty ocean.

## Consequences

- A learner sees the same geographic frame for the same Subregion across applicable active World Countries activities, strengthening spatial memory.
- Recite order/assistance modes stop owning camera behavior; ordered and random presentation differ only where their learning semantics actually differ.
- Camera behavior becomes reviewable and finite: one frame per Subregion instead of an unbounded combination of Countries, target geometry, viewport size, and runtime heuristics.
- Tiny and distributed Countries remain legible through target assistance without forcing the camera to infer a learning scale.
- Setup/overview maps remain free to optimize for navigation and selection instead of being coupled to learning presentation.
- Genuine geometry-dependent tasks such as Neighbours keep their dedicated local camera.
- The public World Countries map boundary becomes clearer by expressing one semantic camera intent rather than several overlapping optional zoom mechanisms.
- `SvgMapController` can lose adaptive learning-camera complexity once caller inspection proves it is obsolete.
- Adding or materially changing a Subregion or regional map asset requires reviewing its authored learning frame.

## Alternatives considered

### Keep tuning target-dependent adaptive framing

Rejected. Multiple iterations combining sparsity detection, target fill thresholds, dominance limits, component selection, representative anchors, and aspect fitting still produced contradictory over- and under-zoom failures. The runtime geometry cannot infer the desired teaching context reliably.

### Make authored frames a Recite Random feature

Rejected. Camera policy is not a sequencing feature. The same Subregion should have the same stable learning context in ordered Recite and in other map-backed learning/recall workflows with the same semantic need.

### Author a frame per Country

Rejected. It increases maintenance, causes neighbouring prompts to move the camera, and works against repeated spatial context.

### Always show the entire Continent/regional map

Rejected as the normal learning experience because many Subregions become unnecessarily broad. It remains the safe fallback for missing frame data.

### Infer every Subregion frame at runtime from its Country bounds

Rejected as the source of truth. It is stable per Subregion but still fails badly for sparse/distributed island regions and turns a product framing decision back into geometry heuristics. Geometry may help author or validate values, but committed frame metadata is authoritative.

### Use one World map for all learning tasks

Rejected. Regional map assets are authoritative and contain map-specific geometry and assistance decisions that are not reliably represented by the World asset.

## Current-state documentation impact

When implemented, update:

- `docs/architecture/features/WORLD_COUNTRIES.md`

Document that `maps/` owns authored Subregion learning frames and the semantic camera-intent boundary; applicable active learning/recall workflows reuse those frames independent of ordering/answer kind; setup/overview surfaces retain their own camera semantics; and explicit task-local cameras such as Neighbours and Country for Shape remain separate capabilities.

## Confirmation

Verified 2026-09-08 for the architectural implementation. It adds one structurally validated authored frame for every current `SubregionId`, routes active learning/recall callers through the shared semantic camera-intent contract, preserves explicit fit and target-neighbourhood cameras, and removes the obsolete adaptive learning-camera path. The original delivery evidence established structural registry correctness and caller/camera behavior; it did not visually validate every authored frame composition in a browser or through manual frame inspection.

Evidence: the World Countries suite passed with 113 files and 701 tests; focused camera, registry, Recite, and caller tests passed with 161 tests; focused learning-flow and Today tests passed with 18 tests; lint passed; and `git diff --check` passed. Typecheck reached only an unrelated error in the untouched `src/features/world-countries/drill/DrillSetup.test.tsx` test fixture. Browser/manual frame-composition validation was not performed at that delivery.

The calibration follow-up verified the authored data with the focused World Countries map suite (13 files, 151 tests), including safe-zone regressions for Poland, Serbia, Moldova, Ukraine, and Belarus and Oceania composition guards. It did not include browser/manual inspection because no already-running browser surface was available.
