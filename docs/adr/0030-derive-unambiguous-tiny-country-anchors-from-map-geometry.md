# ADR 0030 - Derive unambiguous tiny-Country anchors from map geometry

- **Status:** Accepted
- **Date:** 2026-08-22
- **Supersedes:** [ADR 0029 - Tiny-Country assistance is task-scoped and uses map-specific learning anchors](0029-task-scoped-tiny-country-assistance-and-learning-anchors.md)

## Context

ADR 0029 correctly separated learning-task assistance from ordinary map interaction, but made map-authored learning-anchor metadata the runtime source of truth for both simple one-dot Countries and ambiguous multi-dot Countries.

That creates an unnecessary manual allowlist. In the current Europe map, Andorra has metadata while equally simple tiny Countries such as San Marino and Vatican City do not, so identical map geometry receives inconsistent hover/click assistance. It also makes future simple-dot coverage depend on remembering to author records rather than on the shared map capability.

A second defect exposed by the implementation is coordinate ownership. Country paths may live inside transformed SVG groups, while generated assistance elements may live at the root SVG. Map-local points cannot be copied into a different SVG coordinate space without applying the relevant transforms.

The durable distinction is not "metadata Country versus non-metadata Country". It is:

- **unambiguous compact geometry**, where the map can derive one stable learning point safely; versus
- **ambiguous/distributed geometry**, where a human-authored representative learning point is required.

## Decision

Tiny-Country assistance remains **task-scoped** and owned by `src/features/world-countries/maps/`.

The explicit task semantics from ADR 0029 remain authoritative:

- ordinary map interaction does not activate tiny-Country assistance;
- answer-selection tasks may activate forgiving tiny hit targets for eligible candidates; and
- a task target may activate persistent tiny-target emphasis.

### Anchor source of truth

For an **unambiguous compact Country representation**, the map layer MUST derive the assistance anchor automatically from the loaded SVG geometry. No per-Country authored record is required merely to confirm that a simple tiny dot/path is eligible.

Automatic eligibility and anchor derivation MUST be geometry-driven and map-owned. It MUST NOT be implemented as a hard-coded list of Andorra, San Marino, Vatican City, Nauru, or any other Countries in workflow/UI code.

Eligibility must be stable for the loaded map asset and must not flicker as the user resizes, expands, or zooms the map. Screen-space sizing may change with presentation, but whether source geometry is an unambiguous compact representation is derived from the source map representation rather than from the current question target.

For **ambiguous or materially distributed geometry** (for example, a Country represented by several separated island dots), automatic bounding-box-center or "pick a component" heuristics are not authoritative. The map-owned runtime metadata contains one explicit representative anchor selected through authoring/editor data or an equivalent deliberate map decision.

Therefore the runtime model is:

```text
unambiguous compact geometry
  -> automatic map-derived anchor

ambiguous/distributed geometry
  -> explicit map-authored representative anchor
```

Explicit metadata is an override/decision for ambiguity, not an allowlist for all tiny Countries.

### Coordinate-space invariant

Every generated assistance hit target, marker, ring, pointer-distance calculation, and task-target position MUST be evaluated in a coordinate space that is mathematically consistent with the Country geometry it represents.

Implementations may either:

- place generated elements under an SVG ancestor that shares the Country geometry's transform space; or
- transform anchor points between source and overlay coordinate systems using the SVG transformation matrices.

Copying a Country-local `getBBox()`/authored point directly into a root-level overlay when the Country lives under a transformed ancestor is forbidden.

Likewise, overlap/nearest-target resolution MUST compare points in one common coordinate space (for example, all in root SVG space or all in screen/client space).

### Hover semantics

In an answer-selection task, every eligible tiny candidate in the active candidate set receives the same forgiving hover/click behavior. The current correct answer MUST NOT influence which candidate gets assistance before feedback.

Task-assistance hover is independent of generic map hover styling (`hoverHighlight`, `hoverShowName`, progress/status hover, etc.).

For an explicit multi-dot representative:

- the representative anchor owns the forgiving halo and assistance marker;
- direct clicks on any real Country geometry still select that Country when selectable;
- hovering a non-representative real component MUST NOT cause the assistance marker to jump to the representative anchor.

## Consequences

- Andorra, San Marino, Vatican City, and other equivalent simple tiny geometries receive consistent assistance without adding per-Country records.
- New simple tiny geometries gain the shared behavior automatically when they satisfy the map-owned compact/unambiguous rules.
- Authored metadata becomes smaller and more meaningful: it records deliberate ambiguity resolution rather than confirmations of obvious geometry.
- Multi-dot Countries still have one intentional learning peg and do not fall back to total bounding-box centers.
- SVG transforms become an explicit correctness boundary for generated interaction/presentation layers.
- Task scoping from ADR 0029 is preserved: normal geography/navigation/progress maps still do not gain quiz-only tiny-target augmentation.
- The source SVG remains authoritative geography; assistance is an interaction/presentation aid only.

## Alternatives considered

### Add San Marino, Vatican City, and every missing dot Country to the metadata list

Rejected. This preserves the manual allowlist failure and guarantees more omissions as assets evolve.

### Detect every Country only from a total bounding box

Rejected. Distributed multi-dot Countries can have misleading centers and large Countries with small islands can be misclassified.

### Keep root-overlay coordinates and tune Oceania values manually

Rejected. The defect is SVG coordinate-space ownership, not bad Oceania constants. Manual coordinate correction would fail on other transformed assets and future asset changes.

### Enable assistance only for the current answer

Rejected. It leaks the answer in map-click tasks. Assistance eligibility is based on the active candidate set and map geometry, not answer correctness.

## Current-state documentation impact

When implemented, update:

- `docs/architecture/features/WORLD_COUNTRIES.md` — document automatic derivation for unambiguous compact geometry, explicit anchors only for ambiguous/distributed representations, task scoping, and SVG coordinate-space invariants.
- `docs/adr/0029-task-scoped-tiny-country-assistance-and-learning-anchors.md` — mark `Superseded` by ADR 0030.

## Confirmation

Add after implementation is verified.
