# ADR 0022 - Derive World Countries learning sets from entity classification

* **Status:** Accepted
* **Date:** 2026-08-11

## Context

World Countries currently treats its canonical Country dataset as the learning population.

The feature needs to represent a broader set of geopolitical entities while allowing the learner's primary Country set to vary.

An entity's geopolitical classification describes what the entity is. Whether it participates in the learner's active Country set is product policy. These concerns must remain separate.

## Decision

Canonical geopolitical classification is owned by `src/features/world-countries/data/` and keyed by stable `CountryId`.

Classification describes factual entity attributes and relationships independently of learning policy. It must not contain derived policy fields such as `countsTowardWorldMastery` or `includedInPrimaryList`.

World Countries owns one country-set resolver in `geography/`. The resolver derives the active learning population from canonical entity classification and user-selected inclusion policy.

Memo, Drill, Recite, Maintenance, and progress consume the resolved population. Workflow modules must not independently interpret geopolitical classification to determine membership.

User-selected inclusion policy is persisted through the existing app Settings capability. Persisted policy contains category selection, not a flattened list of Country IDs.

Stable Country identity and atomic learning-evidence identity are independent of country-set selection. Changing the active set changes scope, not entity or learning-evidence identity.

## Consequences

* Canonical entity data may contain more entities than the active learning set.
* New country-set definitions can be introduced without changing factual entity records or learning identities.
* Active membership has one semantic owner.
* Existing consumers that assume `countries` equals the active population must instead consume a resolved population.
* Classification and user policy can evolve independently.

## Alternatives considered

### Store learning membership on each entity

Rejected because fields such as `countsTowardWorldMastery` embed selectable product policy in canonical reference data.

### Maintain separate hard-coded Country ID lists

Rejected because duplicated membership lists can drift from canonical classification and create competing sources of truth.

### Let each workflow interpret classification

Rejected because separate workflows could derive inconsistent active populations.

## Current-state documentation impact

When implemented, update:

* `docs/architecture/features/WORLD_COUNTRIES.md`
* `docs/architecture/PERSISTENCE.md`

## Confirmation

Implemented and verified against the repository on 2026-08-11 through Change
Spec 0002 verification and the full TypeScript, Vitest, and Vite checks.
