# ADR 0020: World Countries Memo Readiness and Drill Map Precedence

## Status

Proposed

## Date

2026-08-10

## Builds on

* ADR 0016 — Subregion Memo Capital Learning Workflow
* ADR 0017 — World Countries Drill Scope and Recall Modes
* ADR 0018 — Map-Centered World Countries Drill Presentation
* ADR 0019 — World Countries Recall Mastery, Core Completion, and Progress

## Supersedes and refines

This ADR supersedes ADR 0016 section 5, **Countries-first is recommended, not
required**. Countries Memo completion is now a prerequisite for entering any
Capital Memo learning, review, or practice action.

This ADR refines ADR 0019's progress-map and Memo relationship decisions. Memo
readiness may be shown on Drill maps only while the selected Drill perspective
has no relevant attempt evidence. It is not Drill proficiency, mastery, or
Country completeness.

---

## Context

World Countries has two distinct learning activities:

```text
Memo
    initial, guided learning

Drill
    measured recall practice
```

ADR 0019 established durable, evidence-based Drill proficiency and Country
core completeness. Its implementation also placed those evidence-derived
states on Memo overview maps and in Memo progress summaries.

That presentation answers the wrong question for Memo.

```text
Memo asks:
    What introductory material has this learner completed?

Drill asks:
    How reliably can this learner recall the selected skill?
```

At the same time, a learner choosing Drill scope needs to know whether a
Subregion has been introduced through Memo. A Country with no Drill attempts
can otherwise appear merely `Unpractised`, without distinguishing between:

```text
not introduced through Memo
Countries introduced through Memo
Countries and Capitals introduced through Memo
```

That readiness information is useful before Drill begins, but it must not be
mistaken for measured recall proficiency.

Existing persistence already records the required coarse instructional facts:

```ts
interface SubregionLearningState {
  countriesLearnedAt?: number
  capitalsLearnedAt?: number
}
```

These are Subregion-level Memo completion facts. They are intentionally not
per-Country evidence and do not establish ADR 0019 mastery.

---

## Decision

### 1. Memo readiness and Drill proficiency remain distinct

World Countries uses two separate presentation concepts:

```text
Memo readiness
    derived from coarse Subregion Memo completion

Drill proficiency
    derived from Country + recall-skill attempt evidence
```

Memo readiness must never:

* create an attempt;
* increase proficiency;
* establish mastery;
* establish Country core completeness;
* be persisted as a duplicate Drill status.

Drill evidence must not replace Memo's own instructional status on Memo maps or
in Memo progress summaries.

### 2. Memo readiness has exactly three Subregion states

The canonical Memo readiness states are:

```text
NOT_MEMOED
COUNTRIES_MEMOED
COUNTRIES_AND_CAPITALS_MEMOED
```

They derive from the existing Subregion learning facts:

| `countriesLearnedAt` | `capitalsLearnedAt` | Memo readiness |
|---|---|---|
| absent | absent | `NOT_MEMOED` |
| present | absent | `COUNTRIES_MEMOED` |
| present | present | `COUNTRIES_AND_CAPITALS_MEMOED` |
| absent | present | `NOT_MEMOED` |

The final row is the legacy Capitals-first case. The Capital timestamp remains
stored, but Capital completion alone does not claim that the learner has memoed
Country locations.

When the learner later completes Countries Memo, the preserved Capital
timestamp immediately yields `COUNTRIES_AND_CAPITALS_MEMOED`.

### 3. Memo readiness is all-or-nothing per Subregion

Memo remains an easy introductory workflow. This ADR does not introduce
per-Country Memo completion.

Every current canonical Country in one Subregion receives the same Memo map
treatment:

```text
Subregion readiness
    → presentation for every Country in that Subregion
```

For example, completing Northern Europe Countries Memo changes every Northern
Europe Country from `NOT_MEMOED` to `COUNTRIES_MEMOED` on Memo overview maps.

The existing Country and Capital Memo completion criteria remain unchanged.
They may be made more demanding by a later decision without changing the
three-state readiness vocabulary.

### 4. Memo maps show Memo readiness only

World and Continent Memo overview maps display the three Memo readiness states.
They do not display ADR 0019 Weak, Developing, Strong, Mastered, or Complete
states.

The presentation palette is:

| Memo readiness | Color | Meaning |
|---|---:|---|
| Not memoed | `#52525b` | The Countries Memo track is incomplete |
| Countries memoed | `#7c3aed` | Countries Memo is complete |
| Countries + Capitals memoed | `#c026d3` | Both Memo tracks are complete |

Purple-family colors identify instructional preparation. They are deliberately
separate from the red, amber, blue, and green Drill proficiency palette.

Teal or cyan hover/navigation treatment is temporary map interaction, not Memo
readiness.

### 5. Memo progress aggregates Subregions

Because Memo readiness is Subregion-level, Memo progress summaries count
current canonical Subregions rather than Countries.

Summaries expose two cumulative milestones:

```text
Countries memoed
    number of Subregions with countriesLearnedAt

Countries + Capitals memoed
    number of Subregions with both timestamps
```

A Subregion in `COUNTRIES_AND_CAPITALS_MEMOED` contributes to both counts.

World progress aggregates all current canonical Subregions. Continent progress
aggregates the current canonical Subregions in that Continent. Individual
Subregion rows expose their exact one-of-three readiness state.

Memo rails do not also show ADR 0019 Country core proficiency summaries.

### 6. Countries Memo completion gates all Capital Memo entry actions

Capital Memo remains visible before Countries Memo is complete, but its actions
are locked.

The UI communicates:

```text
Complete Countries first.
```

The gate applies to:

* starting Capital learning;
* reviewing the Capital walkthrough;
* starting direct Capital recall practice;
* any equivalent Capital entry action added later.

The workflow boundary must also reject entry when the UI is bypassed. A disabled
button alone is not the capability rule.

This gate does not delete or overwrite a legacy `capitalsLearnedAt` value.

### 7. Drill uses Memo readiness only when relevant evidence is absent

Drill setup and results maps use a precedence rule per Country and selected
Drill perspective:

```text
if relevant Drill attempts exist
    show Drill proficiency/core state
else
    show Memo readiness
```

Any relevant attempt activates Drill presentation, regardless of whether it:

* was correct or incorrect;
* was free recall or recognition;
* resulted in Weak, Developing, Strong, Mastered, or Complete.

Memo readiness remains a fallback for zero relevant attempts. It does not sit
under or modify the proficiency calculation.

### 8. Relevant evidence is mode-specific

Relevant evidence follows the selected Drill perspective:

| Drill mode | Relevant attempt evidence | Evidence-based final state |
|---|---|---|
| Countries | Location → Country | Mastered |
| Capitals | Country → Capital | Mastered |
| Countries from Capitals | Capital → Country | Mastered |
| Countries + Capitals | Either core skill | Complete |

Attempts for an unrelated skill do not displace Memo readiness.

For example:

```text
Norway has Capital → Country attempts
Countries mode has no Location → Country attempts

Countries-mode setup
    → show Norway's Subregion Memo readiness
```

For Countries + Capitals, the first attempt in either Location → Country or
Country → Capital activates the existing combined core Country state. The
unattempted core skill naturally limits that aggregate state. `Complete`
retains ADR 0019's meaning: both core atomic skills are Mastered.

This ADR does not change the existing Weak, Developing, Strong, Mastered, or
Complete derivation rules.

### 9. Drill legends separate readiness from proficiency

Drill setup and results legends contain two visually and semantically separate
groups:

```text
No Drill evidence
    Not memoed
    Countries memoed
    Countries + Capitals memoed

Drill proficiency
    Weak
    Developing
    Strong
    Mastered
```

Countries + Capitals uses `Complete` instead of `Mastered` for its green final
core state.

`Unpractised` is still a valid evidence-derived fact meaning zero attempts, but
it is not shown as a fourth competing fill when the map presents the more useful
three-state Memo readiness fallback.

The Drill proficiency palette remains:

| Drill state | Color |
|---|---:|
| Weak | `#dc2626` |
| Developing | `#d97706` |
| Strong | `#2563eb` |
| Mastered / Complete | `#16a34a` |

Legends must pair color swatches with text. Color alone is not the status label.

### 10. Active recall suppresses both presentation layers

Active Drill recall continues to follow ADR 0019 recall-safety rules.

Before an answer, the map must not reveal a target through:

* Memo readiness;
* Drill proficiency;
* Country core state;
* another progress-driven treatment.

Memo readiness and Drill proficiency are primarily setup, overview, and results
presentation. Teal/cyan active-target or hover presentation is temporary
interaction state and must not be described as learning progress.

### 11. Existing persistence remains authoritative

No persistence schema, new storage key, or migration is introduced.

The existing Subregion learning store remains authoritative for Memo readiness.
Existing Country + skill attempt history remains authoritative for Drill
proficiency.

Canonical Subregion membership fingerprint handling continues to determine
whether a coarse Memo completion fact still describes the current learning set.

No duplicate map-status cache is persisted.

---

## Considered alternatives

### Continue showing Drill core progress in Memo

Rejected because it makes Memo answer a measured-recall question rather than an
introductory-workflow question. It also hides the distinction between completing
Memo and mastering recall through Drill.

### Add per-Country Memo completion

Rejected for the current workflow. Memo is intentionally coarse and
Subregion-oriented. Per-Country evidence belongs to Drill's atomic attempt model.

### Show Memo readiness permanently beside Drill proficiency

Rejected for the initial presentation. Two simultaneous status treatments would
make the map harder to scan. Once relevant Drill evidence exists, that evidence
is the more actionable status and owns the Country fill.

### Keep Countries-first as a recommendation

Rejected because the desired readiness ladder is intentionally ordered:

```text
Not memoed
→ Countries memoed
→ Countries + Capitals memoed
```

Allowing new Capitals-first completion creates a fourth instructional state and
weakens the simple introductory path.

### Delete or rewrite legacy Capitals-first data

Rejected because the Capital completion fact remains valid historical work.
Preserving it allows the combined readiness state to appear immediately after
Countries Memo is completed.

### Add new statuses below Weak or change Weak semantics

Rejected. Weak retains ADR 0019's evidence-derived meaning. Memo readiness fills
the zero-evidence information gap without redefining proficiency.

---

## Consequences

### Positive

* Memo and Drill each answer one clear learning question.
* Learners can identify Drill-ready Subregions before practising them.
* Drill mastery semantics remain unchanged.
* Memo remains simple and Subregion-oriented.
* Countries-first becomes a visible, enforceable introductory path.
* Legacy completion data is preserved without requiring migration.
* Status legends explain both color and meaning.

### Negative

* Drill map coloring depends on both attempt evidence and Memo completion facts.
* Switching Drill modes can change whether readiness or proficiency owns a
  Country fill because relevance is skill-specific.
* Capital Memo becomes less flexible for learners who deliberately want to skip
  Country learning.
* A legacy Capitals-first completion is temporarily invisible in readiness
  presentation until Countries Memo is completed.

---

## Testing requirements

Implementation must verify at least:

* all three readiness derivations;
* the legacy Capitals-only case;
* all Countries in one Subregion receive the same readiness presentation;
* cumulative World and Continent Subregion summaries;
* Memo maps and rails contain no Drill-derived proficiency state;
* Capital entry controls and workflow handlers are gated;
* legacy Capital completion reappears after Countries completion;
* each Drill mode uses only its relevant evidence;
* unrelated skill evidence does not displace readiness;
* the first relevant correct, incorrect, recall, or recognition attempt displaces
  readiness;
* Countries + Capitals activates combined core state after either core attempt;
* Mastered versus Complete terminology remains correct;
* active recall suppresses both readiness and proficiency;
* legends include accessible text labels in addition to swatches;
* no persistence migration or duplicate status cache is introduced.

---

## Documentation impact

When this ADR is implemented, update
`docs/architecture/features/WORLD_COUNTRIES.md` to record:

* the three-state Subregion Memo readiness model;
* Subregion-based Memo progress aggregation;
* the Countries-first Capital Memo gate;
* legacy Capitals-first compatibility;
* Drill's relevant-evidence precedence rule;
* the separation between Memo readiness and Drill proficiency;
* active-recall suppression of both layers.

Do not add a `Confirmation` section until implementation has been completed and
verified against the repository.
