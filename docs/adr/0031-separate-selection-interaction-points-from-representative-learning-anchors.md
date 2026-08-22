# ADR 0031 - Separate answer-selection interaction points from representative learning anchors

- **Status:** Accepted
- **Date:** 2026-08-22
- **Supersedes:** [ADR 0030 - Derive unambiguous tiny-Country anchors from map geometry](0030-derive-unambiguous-tiny-country-anchors-from-map-geometry.md)

## Context

ADR 0030 correctly established task-scoped tiny-Country assistance, automatic geometry-derived handling for simple tiny Countries, and strict SVG coordinate-space correctness. Browser verification exposed two remaining architectural defects.

First, answer-selection pointer intent is still resolved with ordinary source Country geometry ahead of the forgiving tiny-Country region. This makes microstates that lie inside or immediately beside larger Countries unreliable: a pointer near San Marino or Vatican City can resolve Italy, and a pointer near Andorra can resolve Spain or France, before the tiny assistance region is considered.

Second, the current task-assistance model effectively assumes one assistance anchor per Country. That is appropriate for a location-question learning peg, but not for answer selection. A distributed island Country such as Micronesia has several real tiny components. In a `Find Micronesia` task, hovering any real component must give local feedback at the component under the pointer; forcing every hover to one representative point is spatially false and unusable.

A third requirement is now explicit: while the map is an answer surface, the Country currently under task-pointer intent must receive visible hover color feedback. This applies to normal and tiny candidates and must not depend on generic navigation-map hover configuration.

The durable distinction is therefore between:

- **answer-selection interaction points**: zero, one, or many pointer-assistance locations used to make real Country geometry easy to select; and
- **representative learning anchor**: at most one intentional location used when the Country location itself is the question/correction target.

These concepts can coincide for a simple one-dot Country, but they are not the same abstraction.

## Decision

Tiny-Country task assistance remains owned by `src/features/world-countries/maps/` and remains activated only by explicit task semantics.

### 1. Answer-selection interaction points are geometry-derived and may be plural

For an answer-selection Country, the map layer derives a set of **interaction points** from the loaded source geography.

- A normal recognizable Country may have no extra interaction points; direct source geometry is sufficient.
- A simple tiny Country has one interaction point derived from its compact source component.
- A distributed tiny/island Country may have multiple interaction points, one for each qualifying compact geographic component.
- Every interaction point maps back to exactly one canonical Country/SVG Country identity.

Interaction points are runtime map geometry, not authored learning content and not Country-specific workflow configuration.

A Country with a meaningful normal-scale mainland/component MUST NOT gain forgiving halos for incidental tiny islands merely because those islands are separate subpaths. Multi-point assistance is for representations whose usable geography is itself composed of tiny/distributed components.

### 2. Representative learning anchors remain singular and serve task-target presentation

A **representative learning anchor** is used when the Country location itself is intentionally presented as the task target, for example `Which country is this?` or correction feedback.

- For a simple unambiguous tiny Country, the representative anchor may be derived automatically from the same compact component as its single interaction point.
- For an ambiguous/distributed Country, one explicit map-owned representative anchor is authoritative and may come from the geography authoring/editor decision.
- The representative anchor does not restrict which real components are usable in answer selection.

Therefore:

```text
answer-selection
  Country -> 0..N interaction points

location-question / correction target
  Country -> 0..1 representative learning anchor
```

The runtime must not use the representative learning anchor as the sole answer-selection hover/click point for a multi-component Country.

### 3. Pointer intent is resolved centrally; DOM hit ordering is not authoritative

While answer selection is active, hover and click intent MUST be resolved from pointer coordinates through one shared map-owned resolver. The result is conceptually:

```text
TaskPointerIntent {
  countryId
  interactionPointId?   // present when a local tiny assistance point owns the pointer
}
```

The exact type name is implementation detail. The state must preserve both Country identity and, when relevant, which local interaction point is under the pointer.

Generated halo/marker DOM elements MUST NOT be the authority for answer identity, and source-path DOM event ordering MUST NOT decide which Country wins. Visual assistance elements should not create a second independent pointer state machine.

Pointer resolution follows these semantics:

1. an exact hit on an assisted tiny source component may resolve directly to that component/Country;
2. otherwise, if the pointer lies within one or more active tiny interaction regions, the nearest interaction point wins, even when the underlying ordinary source geometry belongs to a neighboring/enclosing Country;
3. otherwise, ordinary direct source Country geometry wins;
4. overlapping interaction regions use nearest point plus a deterministic tie-break.

This deliberately allows a bounded microstate halo to take precedence over Italy/Spain/France near the microstate. Outside the forgiving region, the surrounding Country remains normally selectable.

### 4. Task hover is a first-class answer-selection presentation state

When answer selection is active, the resolved task-pointer Country receives visible hover presentation using the shared map hover color/stroke tokens.

- Task hover applies to all eligible answer candidates, not only tiny Countries.
- Task hover is independent of generic `hoverHighlight` / `hoverShowName` configuration used by ordinary maps.
- Task hover MUST NOT reveal Country names unless the existing task presentation independently allows names.
- Task hover temporarily overrides the Country's base/progress/status fill as needed to provide clear pointer feedback, then restores the previous presentation on leave.
- For a multi-component Country, Country hover color applies to the Country source geometry while only the local interaction point under the pointer receives size/ring emphasis.

Thus hovering one Micronesia dot can enlarge that dot while coloring Micronesia's source geometry as the active candidate.

### 5. One task-pointer state drives hover, marker, and click semantics

The map layer must not maintain unrelated hover states for:

- source-path answer hover;
- generated halo hover;
- multi-dot component hover; and
- answer-selection click resolution.

They must converge on the same task-pointer intent resolver/state so the Country colored on hover is the Country that would be submitted by a click at the same pointer position.

Generic navigation/status hover remains a separate capability for non-answer maps.

### 6. Coordinate-space invariants from ADR 0030 are preserved

All interaction points, representative anchors, screen-space hit radii, markers, and pointer-distance comparisons must use mathematically compatible SVG/client coordinate spaces. No map-specific coordinate offsets are allowed.

Automatic simple-dot derivation from ADR 0030 is preserved. Explicit map metadata remains necessary only for deliberate representative learning-anchor decisions where the location-question representation is ambiguous.

## Consequences

- Andorra, San Marino, Vatican City, Malta, and equivalent microstates can be reliably hovered/clicked even where their forgiving region overlaps a larger Country.
- The bounded tiny halo intentionally wins locally; Italy/Spain/France remain selectable immediately outside that radius.
- Micronesia and other distributed island Countries can expose multiple local answer-selection interaction points without duplicating Country identity or learning data.
- A single authored representative point can still be used consistently for `Which country is this?` without constraining answer-selection usability.
- Task hover color becomes consistent for normal and tiny Countries in Locate exercises.
- The controller/map layer needs a richer pointer-intent model than a single `taskHoveredCountryId` and a one-target-per-Country map.
- Generated assistance elements become presentation aids rather than independent event authorities, reducing DOM-order and overlap bugs.
- Workflow code remains ignorant of tiny geometry, component counts, coordinates, radii, and representative-anchor decisions.

## Alternatives considered

### Increase the existing halo radius

Rejected. The main Europe failure is pointer precedence, not insufficient radius. A larger halo that still loses to ordinary source geometry does not solve the problem and increases accidental overlap.

### Keep direct source Country geometry ahead of all halos

Rejected. It makes microstates embedded in or adjacent to a larger Country fundamentally difficult to select, defeating the purpose of the forgiving target.

### Add one authored answer-selection point for every island Country

Rejected. It repeats the one-anchor usability failure and turns runtime interaction geometry into a manual data-maintenance problem.

### Enlarge every component of a multi-dot Country simultaneously

Rejected. Hover feedback should be spatially local to the component under the pointer. Country-level color may identify the entity, but size emphasis follows the local interaction point.

### Reuse generic navigation hover configuration

Rejected. Locate/answer-selection hover is task affordance and must remain reliable even when generic `hoverHighlight` or name-hover settings are disabled.

## Current-state documentation impact

When implemented, update:

- `docs/architecture/features/WORLD_COUNTRIES.md` — replace the one-representative-assistance model with separate answer-selection interaction points and representative task-target anchors; document task-pointer precedence and task-hover color ownership.
- `docs/adr/0030-derive-unambiguous-tiny-country-anchors-from-map-geometry.md` — mark `Superseded` by ADR 0031.

## Confirmation

Add after implementation is verified in the browser against Europe and Oceania.
