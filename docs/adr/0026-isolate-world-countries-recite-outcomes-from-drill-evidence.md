# ADR 0026 - Isolate World Countries Recite outcomes from Drill evidence

- **Status:** Accepted
- **Date:** 2026-08-15
- **Deciders:** Product owner

## Context

World Countries already treats `recite/` and `drill/` as sibling workflow owners.
Drill evidence represents atomic recall proficiency and feeds Weak, Developing,
Strong, Mastered, and Complete progress.

Recite now needs durable per-mode map status, but it measures a different thing:
whether the learner can traverse the authored geographic sequence cleanly.
Using Drill attempts as Recite evidence would make sequence traversal alter Drill
proficiency and would conflate two different meanings of progress.

Recite also needs a "Reveal as you go" map mode. The ability to hide arbitrary
Countries is reusable map presentation behavior, while the decision about which
Countries are hidden belongs to Recite.

## Decision

### Ownership and dependency

`src/features/world-countries/recite/` owns:

- Recite mode definitions;
- Recite setup/session/result state;
- Recite outcome semantics;
- Recite persistence;
- translation from Recite outcomes to caller-supplied map presentation.

Recite consumes public World Countries geography, learning answer-matching, map,
and feature-local UI seams. It must not import `drill/` internals.

`maps/` may add a workflow-neutral capability for callers to hide Country
geometries and labels. The map layer does not interpret Recite modes, progress,
or outcomes.

### Evidence isolation

Recite does **not** write the shared atomic Drill attempt IDs in the
`world-countries:<skill>:<CountryId>` namespace.

Recite answers therefore do not change:

- Drill proficiency;
- Weak / Developing / Strong / Mastered / Complete state;
- Learning Readiness;
- Subregion Learning milestones;
- Maintenance eligibility derived from Drill evidence.

### Recite outcome model

Recite has three durable outcomes for a Country within a Recite mode:

- `recalled` - every required prompt for that Country was correct on its first
  submission and no answer was revealed;
- `recovered` - no answer was revealed, but at least one required prompt needed
  one or more incorrect submissions before the learner supplied the correct
  answer;
- `revealed` - at least one required prompt used the explicit Reveal/Skip action.

Absence of persisted Recite outcome means `unrecited`.

For `countries-capitals`, the persisted Country outcome is the worst outcome of
the Country-name and Capital prompts using:

```text
recalled < recovered < revealed
```

The other Recite modes have one required prompt per Country.

### Persistence contract

Recite owns a small versioned localStorage record under the World Countries
feature namespace. The intended key is:

```text
world-countries-recite-progress
```

The record stores only the latest completed Recite outcome per:

```text
(ReciteMode, CountryId)
```

plus the completion timestamp required to identify that latest outcome.

Do not persist:

- a flattened geographic order;
- active-session cursor/input/retry state;
- an unbounded Recite run history;
- duplicate Country/Capital reference data.

A completed Recite run updates the latest outcome for every Country in that run.
Abandoning or leaving an incomplete run writes no Recite progress.

Country identity is the existing stable `CountryId`. Mode identity is the
feature-owned Recite mode ID. Effective order remains derived from `geography/`
at session construction.

### Sequence source of truth

Recite never owns geographic order.

When a session starts, Recite snapshots its concrete Country sequence from the
current effective geography order:

```text
selected Subregions in effective Continent order
  -> Countries in each Subregion's effective Country order
```

An active session is not changed by later authoring or population changes.

## Consequences

- Recite can show meaningful durable status without contaminating Drill mastery.
- Drill and Recite remain independently evolvable sibling workflows.
- Recite status is intentionally "latest completed traversal outcome", not a
  second mastery algorithm.
- Incomplete Recite runs cannot partially overwrite the setup status map.
- The initial persistence model does not support historical streaks, best times,
  or run-history analytics. Those require a later explicit change if needed.
- `maps/` gains only generic hide/show presentation capability; Recite semantics
  remain feature-local.

## Alternatives considered

### Reuse Drill atomic attempts

Rejected. Recite traversal would change Drill proficiency and make sequence
practice indistinguishable from scheduled item recall.

### Persist full Recite run history

Rejected for the initial capability. Current product behavior needs the latest
per-mode Country status, not analytics, streaks, or historical run inspection.

### Keep all Recite status transient

Rejected. The requested mode-specific setup coloring must survive navigation and
browser restarts.

### Implement hidden Countries only inside Recite DOM/CSS

Rejected. Country visibility is SVG map presentation behavior. A generic
caller-controlled hidden-ID capability keeps SVG manipulation in the existing
map owner without teaching the map about Recite.

## Current-state documentation impact

When implemented, update:

- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/architecture/PERSISTENCE.md`

Record Recite ownership, its isolated latest-outcome persistence, effective-order
snapshotting, and the workflow-neutral map hidden-Country capability.

## Confirmation

Add only after implementation has been verified:

Implemented and verified against the repository on 2026-08-15.
