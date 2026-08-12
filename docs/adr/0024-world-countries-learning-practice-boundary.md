# ADR 0024 - World Countries Learning and Practice boundary

- **Status:** Proposed
- **Date:** 2026-08-12

## Context

World Countries exposes Drill and a Learn & Practise purpose. Earlier
iterations reused Drill mode identity and Drill presentation for activities
that have different effects on durable learner state. In particular, guided
Learning can establish Subregion learning milestones, while Practice is meant
to provide repeatable rehearsal without changing durable progress.

Without an explicit boundary, a new Practice mode can accidentally become a
hidden Drill mode, write learning evidence, alter Drill preferences, or inherit
Drill-specific presentation. Conversely, separating every activity into a
fully independent implementation would duplicate recall and session mechanics
whose behavior is genuinely shared.

[Change Spec 0007](../changes/0007-world-countries-setup-and-drill-purpose.md)
applies this decision to the current World Countries workflow.

## Decision

World Countries distinguishes three activity semantics:

- **Drill** tests and strengthens recall. Drill modes have Drill-owned identity
  and may write atomic Drill evidence according to their defined semantics.
- **Learning** acquires a defined body of knowledge. A Learning mode may write
  only the durable learning milestone that it explicitly owns.
- **Practice** rehearses an existing skill. Practice is non-recording: a
  Practice mode must not write atomic learning attempts, learning milestones,
  Drill proficiency, Drill preferences, or any other durable progress state.

Learn & Practise remains one user-facing purpose, but its Learning modes and
Practice modes have explicit, separate mode identities. A mode available only
under Learn & Practise must not be represented as a hidden Drill mode. Future
Practice modes are subject to the same non-recording invariant.

Learning and Practice may share purpose-neutral mechanics such as answer
evaluation, map interaction, session progression, and transient result
calculation. Shared mechanics must not make Practice depend on Drill-specific
rails, headings, completion screens, actions, accessibility descriptions, or
other presentation contracts.

World Countries Learning Readiness is derived from the existing durable
Subregion learning milestones. The cumulative states are:

1. **Not learned**
2. **Countries learned**
3. **Countries + Capitals learned**

The existing `countriesLearnedAt` and `capitalsLearnedAt` fields remain the
durable source facts. A Capitals milestone may be recorded before the Countries
milestone, but the derived readiness remains **Not learned** until Countries is
learned; once both facts exist, readiness becomes **Countries + Capitals
learned**. This decision requires no persistence migration or identity change.

## Consequences

- Drill, Learning, and Practice modes cannot share one mode union merely for
  implementation convenience.
- Learning orchestration must make milestone writes explicit at the owning
  mode boundary.
- Practice sessions may retain transient answers, accuracy, progress, and
  results only for the lifetime of the active session.
- Reusable mechanics may need purpose-neutral interfaces so each activity can
  supply accurate presentation and exit behavior.
- Existing stored learning milestones remain valid, including a Capitals-only
  row, without adding another Learning Readiness state.
- Adding a future Practice mode does not require a new persistence decision
  unless its semantics cease to be Practice as defined here.

## Alternatives considered

### Treat Learning and Practice as Drill modes

Rejected because it obscures whether an activity writes Drill evidence or a
learning milestone and causes non-Drill activities to inherit Drill-specific
presentation and preferences.

### Let Practice record durable progress

Rejected because repeatable rehearsal would then be indistinguishable from
Drill or milestone-producing Learning. An activity that intentionally writes
durable evidence must be modeled as Drill or Learning rather than Practice.

### Duplicate all session mechanics by activity

Rejected because the semantic boundary concerns ownership, durable effects,
and presentation. It does not require separate implementations of identical
low-level recall mechanics.

### Add a Capitals-only Learning Readiness state

Rejected because Learning Readiness is cumulative: Countries is the foundation
and Countries + Capitals is the completed combined milestone. Preserving an
early Capitals fact without displaying a fourth state keeps that model intact.

## Current-state documentation impact

When implemented, update
[World Countries architecture](../architecture/features/WORLD_COUNTRIES.md) to
describe:

- the separate Drill, Learning, and Practice mode identities;
- the non-recording Practice invariant;
- the allowed milestone writes for Learning modes;
- purpose-neutral reuse without Drill presentation coupling; and
- Learning Readiness as the successor to Memo readiness terminology.
