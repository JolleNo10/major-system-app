# ADR 0027 - Derive World Countries review due state and isolate Today orchestration

- **Status:** Accepted
- **Date:** 2026-08-19
- **Deciders:** Product owner

## Context

World Countries already retains atomic answer evidence for:

- Location → Country;
- Country → Capital;
- Capital → Country.

Atomic proficiency and Country mastery are derived from retained evidence.
Learning separately retains applicable per-Subregion completion milestones for
Countries and Capitals.

The existing `maintenance/` workflow does not implement temporal spaced review.
It selects attempted-but-incomplete Countries. That is a proficiency filter, not
a due schedule: incomplete material can remain a candidate indefinitely, while
Mastered material never becomes due because time passed.

The product now needs a system-directed **Today / Continue learning** workflow
that can answer "what should I do now?", reinforce learned material at useful
intervals, and direct the learner toward the next unintroduced core knowledge.

## Decision

### Review due state is derived, not independently persisted

World Countries review timing is a derived feature-local learning policy.

Authoritative durable inputs are:

- retained raw World Countries atomic attempts in the existing
  `world-countries:<skill>:<CountryId>` namespace; and
- applicable active-membership Subregion Learning milestones for targets with
  no attempt history.

Do not persist `nextReviewAt`, SRS stage/ease, Today plans, active Today queues,
retry state, or "done today" state.

### Review scheduling derives from raw attempt history

The existing aggregate `RecallProgress` does not retain enough per-attempt
sequence, `evidenceKind`, and `localDate` detail to reconstruct temporal review.

`learning/` owns the World Countries raw-attempt access seam. `today/` consumes
that seam and must not read `core/scoring/attemptStore` directly.

Existing aggregate progress remains authoritative for proficiency/mastery.

### Today v1 maintains core recall only

The Today maintenance pool contains only:

```text
location-to-country
country-to-capital
```

Use the existing `WORLD_COUNTRIES_CORE_RECALL_SKILLS`.

`capital-to-country` remains additional knowledge available manually and cannot
block Today progression or the primary World goal.

### Introduction is distinct from proficiency/mastery

For Today planning, a core target is introduced when either:

1. its applicable valid Learning milestone covers it; or
2. retained history contains at least one successful attempt, whether recall,
   recognition, or legacy/unknown evidence.

Failure-only history does not introduce the target.

Introducedness is a planner projection only. It does not modify Learning
Readiness, milestones, proficiency, mastery, Country completeness, or map
status.

### Learning milestones seed first review without synthetic evidence

When a core target has no attempt history:

- valid `countriesLearnedAt` introduces and seeds `location-to-country`;
- valid `capitalsLearnedAt` introduces and seeds `country-to-capital`.

The seeded target becomes due after 24 elapsed hours from the milestone
timestamp.

Once attempt history exists, attempt-based scheduling replaces the milestone
seed.

### Due state and proficiency remain separate

A Mastered target may be due. Time passing never demotes proficiency. Review
answers are ordinary atomic evidence and may change proficiency under existing
rules.

### `today/` owns Today orchestration

Introduce:

```text
src/features/world-countries/today/
```

`today/` owns Today plan orchestration, queue snapshotting, due-review session
behavior, Today setup/checkpoint/loading/empty states, and transition to the next
Learning action.

Pure evidence projections remain in `learning/`: raw history, introducedness,
and review scheduling.

`today/` may consume `learning/`, `learning/flows/`, `geography/`, `maps/`, and
feature-local `ui/`, but not `drill/` or `recite/` internals.

Replace the current `maintenance/` workflow rather than keeping a compatibility
wrapper.

### Workflow-neutral World mastery presentation moves out of Drill

World mastery derivation remains in `learning/scopeProgress.ts`.

Because Drill and Today display the same summary, re-home the workflow-neutral
summary component from `drill/` to feature-local `ui/`. Do not duplicate it and
do not create a Today → Drill dependency.

### Recording boundaries

Every answered Today review prompt writes ordinary atomic evidence with:

```text
evidenceKind: "recall"
```

Today does not write Learning milestones directly. Existing Country/Capital
Learning flows remain the owners of Final Recall and milestone writes.

Recite remains isolated.

### Today plans and queues are transient snapshots

Today re-derives on entry/refresh. Starting review snapshots the concrete queue.
Leaving discards queue/cursor/retry state; already answered attempts remain
durable evidence.

### Temporal scheduling stays feature-local

Do not create a generic SRS abstraction or move the interval policy into
`core/scoring` in this change.

## Consequences

- No second persisted schedule can drift from learning evidence.
- Mastered knowledge returns naturally for maintenance.
- Completed Learning enters review without fabricated attempts.
- Recognition/legacy success requires explicit recall before gaining spacing.
- Failure-only material is directed toward Learning rather than endless review.
- Optional Capital → Country practice cannot block core World progression.
- Today remains independent of Drill and Recite.
- Reusing World mastery does not require sibling-workflow imports.

## Alternatives considered

- Persist `nextReviewAt` / SRS state — rejected as duplicate state.
- Reuse Maintenance incomplete selection — rejected as non-temporal.
- Derive from aggregate `RecallProgress` only — rejected; insufficient detail.
- Treat every attempt as introduction — rejected; first-ever failure is not
  evidence of learning.
- Require Learning milestones for introduction — rejected; successful manual
  Drill can establish knowledge.
- Include Capital → Country — rejected from Today v1 because it is additional.
- Make Today a Drill mode — rejected; Today orchestrates review plus Learning.
- Keep `maintenance/` owner — rejected; Today is broader than maintenance.
- Synthetic attempts on Learning completion — rejected; milestone != answer.
- Shared core SRS — rejected until a concrete cross-feature contract exists.

## Current-state documentation impact

When implemented, update:

- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/architecture/PERSISTENCE.md`

No `CORE.md` change is required unless a shared core contract changes.

## Confirmation

Add only after implementation is verified:

Implemented and verified against the repository on 2026-08-19.
