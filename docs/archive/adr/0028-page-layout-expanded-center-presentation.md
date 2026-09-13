# ADR 0028 - PageLayout owns an optional expanded-center presentation

- **Status:** Accepted
- **Date:** 2026-08-22
- **Refines:** [ADR 0001](0001-page-layout-panel-pattern.md), [ADR 0014](0014-semantic-page-rail-ownership.md)

## Context

`PageLayout` is the application-wide authority for center width, centering, rails, and responsive rail drawers. Its current geometry intentionally fixes the center at 42rem / 672px at `xl+`, regardless of whether rails exist.

That invariant prevents layout drift, but it also prevents a focal task from deliberately using otherwise-unused viewport space. Map-centered tasks are the first concrete case: when a learner chooses to focus on the map, the useful behavior is to suppress contextual/supporting rails and let the same center task surface grow within the browser window.

Implementing this inside individual features or workflows would recreate the width-ownership problem ADR 0001 removed. The layout capability therefore needs one app-owned presentation contract while remaining ignorant of feature semantics.

## Decision

`PageLayout` remains the **single authority** for page-level width, centering, rail placement, rail drawers, and layout-header width.

Add one generic, transient PageLayout presentation mode with two semantic states:

- **standard** — current behavior; the center remains 42rem / 672px at `xl+`, rails use the existing symmetric gutters, and existing drawer behavior remains unchanged;
- **expanded-center** — the center may use the available viewport width, PageLayout suppresses both rails and their drawer/toggle presentation, and any PageLayout header follows the expanded center geometry.

The exact API naming is implementation detail. The contract must have one semantic mode switch, not independent flags such as `wide`, `hideLeftRail`, `hideRightRail`, `fullscreen`, or feature-specific variants.

A feature requests the presentation through the existing app-owned PageLayout integration boundary. The request is scoped to the mounted view/capability and is automatically cleared when its owner unmounts. Expanded presentation is transient UI state and is not persisted as an application setting.

`PageLayout` must remain workflow-ignorant. It must not know about World Countries, maps, Drill, Today, Learning, Recite, recall, quiz state, or answer modes. Feature code decides whether the user has requested expanded presentation; PageLayout only renders the requested geometry.

Expanded-center is **not browser fullscreen**. It does not use the Fullscreen API and does not hide browser chrome or unrelated application chrome. It only changes the PageLayout-owned body geometry.

For World Countries, the feature-local common `MapSurface` is the owner of the user-facing expand/collapse experience and map-task sizing. Individual Today, Drill, Practice, Learning, and Recite workflow components must not implement their own page expansion, rail suppression, viewport-width breakout, or duplicate expand controls.

ADR 0001's 42rem center remains the invariant for **standard presentation**, rather than an invariant that forbids an explicit PageLayout-owned expanded presentation.

## Consequences

- There is still one width/centering owner; expanded views do not reintroduce feature-level breakout CSS.
- Rails remain semantically owned by features, but PageLayout may temporarily suppress their presentation when the user explicitly enters expanded-center mode. The feature does not need to republish empty rails.
- Existing standard layouts remain unchanged unless expanded-center is requested.
- The app-owned PageLayout integration seam gains one additional presentation capability; this does not move feature semantics into `src/app/`.
- Any feature may reuse expanded-center later, but reuse must go through the same PageLayout contract rather than creating another wide-layout mechanism.
- World Countries can implement expansion once in `MapSurface`; workflow owners continue to provide only their existing context, map, feedback, and dock content.
- Tests must protect cleanup on unmount, standard-mode regression behavior, rail/drawer suppression while expanded, and restoration when collapsed.

## Alternatives considered

### Hide rails inside each World Countries workflow and widen each center locally

Rejected. It duplicates presentation state and CSS across Today, Drill, Practice, Learning, and Recite, and creates multiple page-width owners.

### Add a World-Countries-specific wide layout to PageLayout

Rejected. `PageLayout` must remain feature- and workflow-agnostic.

### Reintroduce a generic `wide` boolean on modes or App

Rejected. Mode-level width was part of the pre-ADR-0001 ownership conflict and cannot express transient expansion within a mounted workflow.

### Use the browser Fullscreen API

Rejected. The required experience is an expanded application layout inside the existing browser window, not browser fullscreen. Fullscreen lifecycle and permission/state handling would add complexity without solving the layout-ownership problem.

### Permanently widen PageLayout and remove the 42rem standard center

Rejected. The fixed standard center remains useful for cross-mode alignment and ordinary reading/task density. Expansion is explicit and transient.

## Current-state documentation impact

When implemented, update:

- `docs/architecture/SYSTEM.md` — describe PageLayout's standard and expanded-center presentation contract instead of describing it only as fixed-center.
- `docs/architecture/features/WORLD_COUNTRIES.md` — replace the rule that PageLayout geometry remains unchanged with the shared `MapSurface` -> PageLayout expanded-presentation boundary and prohibit workflow-local expansion implementations.

## Confirmation

Implemented and verified against the repository on 2026-08-22.
