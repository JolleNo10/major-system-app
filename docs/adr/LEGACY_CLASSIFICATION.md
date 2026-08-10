# Legacy ADR classification and architecture coverage

## Purpose

This is the migration ledger for ADRs written before the repository separated
architectural decisions from feature-delivery specifications. It classifies the
original records without rewriting history or breaking links.

The original files remain at their existing paths. Their recorded status and
confirmation remain historical facts. Classification determines how agents use
them now:

- **Architectural ADR** - durable decision rationale remains useful. Expanded
  implementation, UX, validation, and acceptance material is legacy delivery
  detail rather than a current requirement.
- **Archived legacy change record** - primarily specifies a feature or workflow.
  It is historical context only, despite having been named and accepted as an
  ADR at the time.

Normal implementation starts from `docs/architecture/`, source, tests, and the
named current Change Spec. No legacy record is a current-state authority or a
template for new work.

## Classification

| Record | Classification | Enduring material covered by current-state architecture |
| --- | --- | --- |
| [0001](0001-page-layout-panel-pattern.md) | Architectural ADR | [System](../architecture/SYSTEM.md) - PageLayout geometry and composition ownership |
| [0002](0002-package-by-feature.md) | Architectural ADR | [System](../architecture/SYSTEM.md), [Core](../architecture/CORE.md), and feature documents - package and dependency boundaries |
| [0003](0003-cards-subfolders-pao.md) | Architectural ADR | [Cards](../architecture/features/CARDS.md) - flavor ownership and PAO boundary |
| [0004](0004-pi-by-tab.md) | Architectural ADR | [Pi](../architecture/features/PI.md) - workflow ownership and shared Pi seams |
| [0005](0005-shared-learning-domain.md) | Architectural ADR, legacy expanded format | [Core](../architecture/CORE.md) and [persistence](../architecture/PERSISTENCE.md) - atomic evidence, opaque identities, derived progress, and shared-learning ownership |
| [0006](0006-shared-mnemonic-content.md) | Architectural ADR, legacy expanded format | [Core](../architecture/CORE.md) and [persistence](../architecture/PERSISTENCE.md) - generic mnemonic records, adapters, target identity, and IndexedDB ownership |
| [0007](0007-world-countries-memo.md) | Archived legacy change record | [World Countries](../architecture/features/WORLD_COUNTRIES.md) - Memo ownership, canonical geography, maps, mnemonics, and workflow boundaries |
| [0008](0008-subregion-identity-metadata-country-order.md) | Architectural ADR, legacy expanded format | [World Countries](../architecture/features/WORLD_COUNTRIES.md) and [persistence](../architecture/PERSISTENCE.md) - stable geography identity, authored order, backup, and stale mnemonic handling |
| [0009](0009-subregion-memo-country-learning-workflow.md) | Archived legacy change record | [World Countries](../architecture/features/WORLD_COUNTRIES.md) - learning-flow ownership, session state, completion facts, answer matching, and map adapter boundary |
| [0010](0010-world-countries-feature-architecture.md) | Architectural ADR, legacy expanded format | [World Countries](../architecture/features/WORLD_COUNTRIES.md) and [System](../architecture/SYSTEM.md) - capability ownership, workflow boundaries, public surface, and removed structures |
| [0011](0011-world-countries-capability-ownership-correction.md) | Architectural ADR, legacy expanded format | [World Countries](../architecture/features/WORLD_COUNTRIES.md) - corrected Geography, Learning, Maps, mnemonic, and workflow ownership |
| [0012](0012-agent-oriented-current-state-architecture-documentation.md) | Architectural ADR | [System](../architecture/SYSTEM.md), [invariants](../architecture/INVARIANTS.md), root routing docs, and feature `AGENTS.md` files - current-state authority and context routing |
| [0013](0013-drag-and-drop-subregion-learning-order.md) | Archived legacy change record | [World Countries](../architecture/features/WORLD_COUNTRIES.md) - authoritative order, draft/save/reset behavior, reusable editor, and keyboard access |
| [0014](0014-semantic-page-rail-ownership.md) | Architectural ADR, legacy expanded format | [System](../architecture/SYSTEM.md) and [World Countries](../architecture/features/WORLD_COUNTRIES.md) - semantic rail ownership and recall-safety boundary |
| [0015](0015-continent-subregion-learning-order.md) | Archived legacy change record | [World Countries](../architecture/features/WORLD_COUNTRIES.md) and [persistence](../architecture/PERSISTENCE.md) - Continent metadata, effective hierarchy order, draft editing, and backup |
| [0016](0016-subregion-memo-capital-learning-workflow.md) | Archived legacy change record | [World Countries](../architecture/features/WORLD_COUNTRIES.md) and [persistence](../architecture/PERSISTENCE.md) - canonical Capital fact, independent Memo tracks, completion fields, and Capital flow ownership |
| [0017](0017-world-countries-drill-scope-and-recall-modes.md) | Architectural ADR, legacy expanded format | [World Countries](../architecture/features/WORLD_COUNTRIES.md) and [persistence](../architecture/PERSISTENCE.md) - scope identity, atomic skills/evidence, workflow ownership, and preferences |
| [0018](0018-map-centered-world-countries-drill-presentation.md) | Archived legacy change record | [System](../architecture/SYSTEM.md) and [World Countries](../architecture/features/WORLD_COUNTRIES.md) - PageLayout use, shared map ownership, map-centered Drill, and recall-safe presentation |
| [0019](0019-world-countries-recall-mastery-core-completion-progress.md) | Architectural ADR, legacy expanded format | [Core](../architecture/CORE.md), [persistence](../architecture/PERSISTENCE.md), and [World Countries](../architecture/features/WORLD_COUNTRIES.md) - evidence quality, mastery policy, core completeness, aggregation, retention, and policy ownership |
| [0020](0020-world-countries-memo-readiness-and-drill-map-precedence.md) | Archived legacy change record | [World Countries](../architecture/features/WORLD_COUNTRIES.md) - readiness states, Capital gate, mode-specific precedence, legends, and active-recall suppression |

## Coverage result

Every enduring ownership, dependency, identity, persistence, public-boundary,
and invariant decision in the archived records has a current home in the files
listed above. Feature-delivery detail intentionally remains only in the
historical record and implemented source/tests; it is not architecture.

Future migrations should update this ledger only when an old record is newly
reclassified or a current-state coverage link changes. New work uses
[../changes/README.md](../changes/README.md) and [TEMPLATE.md](TEMPLATE.md).
