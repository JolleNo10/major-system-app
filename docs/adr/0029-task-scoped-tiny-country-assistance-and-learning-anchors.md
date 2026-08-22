# ADR 0029 - Tiny-Country assistance is task-scoped and uses map-specific learning anchors

- **Status:** Superseded
- **Date:** 2026-08-22
- **Superseded by:** [ADR 0030 - Derive unambiguous tiny-Country anchors from map geometry](0030-derive-unambiguous-tiny-country-anchors-from-map-geometry.md)

## Context

World Countries needs extra usability for Countries that are effectively tiny dots at the scale used by a learning map. Two distinct tasks need that assistance:

- map-answer tasks, where the learner must click a Country location; and
- location-question tasks, where the map intentionally presents a Country location and asks the learner to identify it.

The first implementation attached tiny-Country augmentation to generic SVG geometry, then later to generic selectability/highlight state. That is structurally incorrect. Ordinary World/Continent geography maps are selectable for navigation and setup, and generic highlight state is also used for progress/status presentation. Neither semantic means that the map is currently an answer surface or that a Country is the location question.

The geometry-only model also fails for Countries represented by several separated tiny components. A bounding-box center is not a meaningful learning location for a Country such as Micronesia. The product needs one intentional representative point for such Countries, while preserving all real source geometry for geographic identity and direct clicks.

## Decision

Tiny-Country assistance remains owned by `src/features/world-countries/maps/`, but it is activated only by explicit **map-task semantics**.

The shared map boundary distinguishes at least these concepts:

- **ordinary map interaction** — navigation, setup selection, progress/status hover, and other non-question map use;
- **answer selection** — the map is the learner's answer surface and a set of Countries are valid click candidates;
- **task target** — a Country location is intentionally being shown as the subject of the current question or correction.

Generic `onCountryClick`, selectable IDs, hoverable IDs, generic highlighted IDs, semantic progress colors, or the mere presence of a tiny source path MUST NOT activate tiny-Country assistance.

Workflows may declare answer-selection candidates and/or a task-target Country through the common map adapter. They do not decide whether a Country is tiny, where its interaction anchor is, how large the hit area is, or how the marker animates.

### Learning-anchor source of truth

The runtime uses **map-specific Country learning-anchor metadata** owned by `maps/`.

The identity of an anchor is scoped by:

- stable map definition identity; and
- canonical `CountryId`.

The runtime data must be able to represent at least:

- a confirmed single-dot Country whose usable anchor can be resolved from its compact source geometry; and
- a multi-dot Country with one explicitly selected representative anchor.

The authoring/editor workflow may generate this metadata, but runtime code must depend on a stable map-owned data contract rather than editor UI state or the editor's raw export format. An adapter/generation step may translate editor output into the runtime contract.

For a multi-dot Country, the selected representative anchor is authoritative for tiny-Country assistance. The controller must not use the center of the Country's total bounding box and must not create one enlarged target per geographic component.

Map-anchor data must retain enough source identity to detect a stale decision after a bundled SVG asset changes. A stale or unresolved explicit anchor must fail validation rather than silently choosing a different dot.

### Geographic geometry remains authoritative

The source SVG Country geometry remains authoritative for:

- Country/SVG discovery and identity;
- ordinary semantic fill/stroke presentation;
- geographic bounds and zoom calculations; and
- direct pointer hits on real Country geometry.

Learning anchors are an interaction/presentation aid only. They do not replace Country geography.

For a multi-dot Country in an answer-selection task, directly clicking any real component of the Country still selects that Country. Only the selected learning anchor receives the enlarged invisible hit target and hover marker.

For a multi-dot Country used as a task target, only the selected learning anchor receives tiny-target emphasis; the other components are not enlarged merely because they belong to the same Country.

## Consequences

- Ordinary World/Continent maps render the original SVG geography. They do not gain enlarged tiny markers or forgiving tiny hit areas merely because they support Country clicks.
- Answer-selection tasks can reuse one shared forgiving-hit/hover capability across Drill, Learn & Practise, and guided Learning without workflow-specific geometry code.
- Location-question tasks can reuse one shared persistent target-emphasis capability across Today, Drill, and other map-backed recall without reusing generic progress/highlight semantics.
- Generic click eligibility (`selectable`) remains useful but is no longer overloaded as a task-assistance signal.
- Generic highlight state remains useful for normal semantic map styling but is no longer overloaded as proof that a Country is the active learning target.
- Multi-dot Countries have one stable learning peg per map asset rather than a runtime heuristic.
- Replacing a bundled map asset may require re-validating or re-authoring affected learning anchors.
- The runtime remains workflow-agnostic: it understands answer-selection candidates, task targets, and map anchors, not Drill/Today/Practice mode names.

## Alternatives considered

### Infer assistance from generic selectability

Rejected. Overview/setup maps are also selectable, which caused unwanted enlarged dots on normal maps.

### Infer assistance from generic highlight state

Rejected. Highlighting is also used for status/progress and can affect the whole geographic path. It does not mean the Country is a location question.

### Detect every tiny Country only from runtime bounding boxes

Rejected as the source of truth. It cannot correctly represent separated multi-dot Countries, and threshold changes can silently change product behavior. Geometry may resolve/validate a confirmed single-dot anchor but does not decide the learning representation.

### Put tiny-Country flags and coordinates in Drill/Learning/Today

Rejected. It duplicates map knowledge and creates workflow-specific implementations of the same geographic interaction capability.

### Modify the SVG assets to make tiny Countries permanently larger

Rejected. It corrupts ordinary geographic presentation and would make normal maps show the same unwanted enlargement that motivated this correction.

## Current-state documentation impact

When implemented, update:

- `docs/architecture/features/WORLD_COUNTRIES.md` — replace the current rule that generic selectable/highlighted maps inherit tiny-Country augmentation with the explicit task-assistance and map-specific learning-anchor contract.

## Confirmation

Add after implementation is verified.
