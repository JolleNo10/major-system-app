# ADR 0017: World Countries Drill Scope and Recall Modes

## Status

Accepted

## Date

2026-08-10

## Context

The World Countries feature has separate Memo, Drill, Recite, and Maintenance workflows.

Memo is responsible for initial learning of geography and Country–Capital relationships. Drill is intended for deliberate practice over a learner-selected geographic scope.

Drill therefore needs to allow the learner to choose:

* which geographic material to practise; and
* which recall relationship to practise.

The canonical World Countries data model already associates each Country with:

* a Continent;
* a Subregion;
* a Capital;
* a stable Country identifier.

Existing learning architecture also distinguishes recall direction. Recalling a Capital from a Country and recalling a Country from a Capital are different skills even though they involve the same underlying Country–Capital relationship.

Drill therefore needs an architecture that:

* supports an entire Continent or selected Subregions within one Continent;
* derives Country membership from canonical geography rather than duplicating it;
* represents recall direction explicitly;
* supports several recall skills for the same Country;
* records independent evidence for those skills;
* keeps Drill-specific setup and session orchestration inside `drill/`;
* keeps reusable World Countries learning semantics inside `learning/`;
* uses shared domain-neutral learning infrastructure where appropriate;
* allows future Recite and Maintenance workflows to consume the same learning evidence without depending on Drill internals.

The Pi Recite workflow provides useful UX patterns such as separating setup from active recall and remembering setup preferences. Its implementation structure should not be copied directly, because workflow orchestration, persistence, scoring, and side effects are comparatively tightly coupled.

## Decision

### 1. Drill uses one Continent as its geographic root

Every Drill session is scoped to exactly one Continent.

Within that Continent, the learner may select:

* the entire Continent; or
* one or more Subregions.

A Drill session must not combine Subregions belonging to different Continents.

The Drill UI may present **Entire continent** as a distinct choice, but this is not a separate domain-level scope type.

Selecting the entire Continent means selecting all currently defined Subregions belonging to that Continent.

Conceptually:

```ts
interface WorldCountriesDrillSelection {
  continent: Continent
  subregionIds: readonly SubregionId[]
}
```

This type represents Drill setup selection. It is not intended to define a generic scope model for Recite or Maintenance.

The selected Countries are always derived from canonical geography.

Drill must not persist a flattened list of Country identifiers representing Continent or Subregion membership.

This ensures that canonical geography remains authoritative if hierarchy membership changes.

---

### 2. Drill supports four recall modes

The initial World Countries Drill supports four user-visible recall modes.

#### Countries

The learner is shown a Country location on the map and must identify the Country.

Recall relationship:

```text
location → country
```

Example:

```text
[ Norway highlighted on map ]

Which country is this?

Norway
```

#### Countries + Capitals

The learner is shown a Country location and must first identify the Country and then recall its Capital.

Recall chain:

```text
location → country → capital
```

Example:

```text
[ Norway highlighted on map ]

Which country is this?
Norway

What is its capital?
Oslo
```

The Country and Capital answers are evaluated independently.

Submitting the location → Country answer completes that atomic attempt.

The canonical Country represented by the map is then used for the Country → Capital question.

If the learner identified the Country incorrectly, the actual Country is revealed before the Capital question is asked.

The learner's Country answer must never determine which Capital is expected.

For example:

```text
[ Norway highlighted ]

Which country is this?
Sweden ✗

Correct answer: Norway

What is the capital of Norway?
Oslo ✓
```

This records:

```text
location-to-country:NO = incorrect
country-to-capital:NO = correct
```

It must not record Capital evidence for Sweden.

#### Capitals

The learner is given a Country and must recall its Capital.

Recall relationship:

```text
country → capital
```

Example:

```text
Norway

What is the capital?

Oslo
```

#### Countries from Capitals

The learner is given a Capital and must recall its Country.

Recall relationship:

```text
capital → country
```

Example:

```text
Oslo

Which country has this capital?

Norway
```

The user-facing labels may evolve independently of the underlying recall relationships.

---

### 3. Recall skills are represented independently from Drill modes

Drill modes describe the learner-facing workflow.

Learning evidence describes atomic recall skills.

The initial World Countries recall skills are:

```ts
type WorldCountriesRecallSkill =
  | 'location-to-country'
  | 'country-to-capital'
  | 'capital-to-country'
```

`Countries + Capitals` is therefore not a separate atomic learning skill.

It is a Drill mode combining:

```text
location-to-country
country-to-capital
```

This distinction allows Country → Capital evidence generated by `Countries + Capitals` to contribute to the same learning history as evidence generated by the dedicated `Capitals` mode.

Drill mode must not be encoded into learning-evidence identity.

---

### 4. Country is the stable domain identity behind recall targets

Each recall target is associated with:

* a stable Country identifier; and
* a recall skill.

Conceptually:

```ts
interface WorldCountriesRecallTarget {
  countryId: CountryId
  skill: WorldCountriesRecallSkill
}
```

The World Countries learning layer owns construction and interpretation of the opaque identifiers used by shared learning infrastructure.

Conceptually, identifiers may resemble:

```text
world-countries:location-to-country:NO
world-countries:country-to-capital:NO
world-countries:capital-to-country:NO
```

The exact serialized format is an implementation detail.

Identifier construction must be centralized.

UI components and workflow code must not construct learning identifiers through ad-hoc string concatenation.

---

### 5. Learning evidence is separate from mnemonic identity

Country–Capital mnemonics and recall-performance evidence serve different purposes.

Mnemonic identifiers such as:

```text
geo:country-capital:<CountryId>
```

identify authored mnemonic content.

They must not be reused as identifiers for:

* Drill attempts;
* mastery;
* progress;
* Recite evidence;
* Maintenance scheduling.

Learning-performance identity must instead use the Country identifier together with the recall skill.

This preserves the distinction between:

```text
What mnemonic helps me remember this relationship?
```

and:

```text
How well can I currently recall this relationship?
```

---

### 6. Atomic attempts are recorded per recall skill

Each answered recall relationship records its own attempt.

For example, in `Countries + Capitals`:

```text
Location → Norway     incorrect
Norway → Oslo         correct
```

produces:

```text
location-to-country:NO = incorrect
country-to-capital:NO = correct
```

The combined Drill interaction does not receive a separate mastery record.

Progress and mastery are derived from the underlying atomic skill evidence.

The learner's answer to one step must not alter the domain identity of the next step.

---

### 7. Map-based Drill modes schedule Countries as visible units

For modes involving Country identification from the map, the visible Drill unit is a Country.

This applies to:

```text
Countries
Countries + Capitals
```

For example, `Countries + Capitals` should schedule:

```text
Norway
Sweden
Denmark
Finland
...
```

and then ask the applicable recall steps for each Country.

It should not independently schedule:

```text
location-to-country:NO
country-to-capital:NO
```

as unrelated visible questions.

Treating the atomic recall targets as unrelated scheduling units could otherwise create undesirable sequences such as repeated questions about the same Country in immediate succession.

World Countries may therefore aggregate relevant skill progress when choosing the next Country for a combined Drill mode.

The answers produced inside that visible Country unit are still stored as independent atomic recall evidence.

---

### 8. Capital-focused modes use the same Drill geographic selection

Capitals do not define a separate geographic hierarchy.

For both:

```text
Capitals
Countries from Capitals
```

the learner selects the Country set indirectly through the normal Drill Continent/Subregion selection.

For example:

```text
Europe

✓ Northern Europe
✓ Western Europe
```

defines the Country population.

The selected recall mode determines which relationship is tested for those Countries.

This avoids introducing separate concepts such as:

```text
Capital scope
```

or duplicating Capital membership metadata.

---

### 9. Shared learning infrastructure remains domain-neutral

Generic learning mechanics should use the existing shared learning infrastructure where its semantics fit the World Countries requirement.

This includes capabilities such as:

* atomic attempt recording;
* item progress derivation;
* mastery derivation;
* scope progress;
* generic next-item selection.

Shared core learning code must not gain knowledge of:

* Countries;
* Capitals;
* Continents;
* Subregions;
* World Countries Drill modes.

World Countries owns the adapter between its domain concepts and shared opaque recall-item identities.

If World Countries requires Country-level scheduling behavior that does not map directly onto generic item scheduling, that adaptation belongs inside the World Countries feature rather than adding geography concepts to core.

---

### 10. `learning/` owns reusable World Countries recall semantics

Capabilities that represent reusable World Countries learning semantics belong under:

```text
src/features/world-countries/learning/
```

This includes responsibilities such as:

* defining World Countries recall skills;
* constructing recall-target identifiers;
* translating Country and skill combinations into shared learning items;
* evaluating Country and Capital answers;
* resolving skill-specific evidence;
* deriving Country-level progress from one or more skills;
* reusable World Countries recall helpers needed by more than one workflow.

The existing `learning/` directory already contains reusable capabilities used by Memo, including answer matching and session helpers.

Drill must reuse existing capabilities where their semantics match instead of duplicating them.

Existing helpers must not be generalized merely to force reuse when Drill requires different behavior.

Changes to shared World Countries learning helpers must preserve their existing Memo-facing behavior unless that behavior is intentionally changed by a separate decision.

A capability that is specific to Drill remains owned by `drill/`, even if it operates on learning data.

---

### 11. `drill/` owns Drill-specific selection and session orchestration

The Drill workflow owns:

* setup UI;
* Continent/Subregion selection;
* Drill mode selection;
* starting and ending a Drill session;
* active session sequencing;
* selecting the next visible Country within Drill-specific policy;
* Drill-specific session state;
* results presentation;
* non-authoritative Drill preferences.

A suitable structure is:

```text
world-countries/
├── drill/
│   ├── WorldCountriesDrill.tsx
│   ├── DrillSetup.tsx
│   ├── DrillSession.tsx
│   ├── DrillResults.tsx
│   ├── drillSelection.ts
│   ├── drillSession.ts
│   └── drillPreferences.ts
│
├── learning/
│   ├── recallTargets.ts
│   ├── recallProgress.ts
│   ├── answerMatching.ts
│   └── ...
```

These filenames are illustrative rather than mandatory.

`WorldCountriesDrill.tsx` should remain a thin workflow coordinator rather than becoming a large component that directly owns geography resolution, persistence, answer evaluation, learning evidence, scheduling logic, and rendering.

No generic `RecallSession` or shared geographic scope abstraction should be introduced merely because Recite or Maintenance may need related concepts later.

Reusable abstractions should be extracted when there is a real shared requirement.

---

### 12. Drill setup and active recall are separate phases

Drill follows a setup → recall → results workflow.

During setup the learner chooses:

```text
Continent
Subregions / Entire continent
Recall mode
```

The learner then explicitly starts the Drill.

During active recall, setup controls and other UI that could expose answers should not be shown.

After completion, the learner sees the session result and may start another Drill.

This adopts the useful setup/session separation found in Pi Recite without reproducing its implementation structure.

---

### 13. Drill preferences are separate from learning evidence

Small convenience preferences may be persisted, for example:

* last selected Continent;
* last selected Subregions;
* last selected Drill mode.

These are workflow/view preferences, not learning state.

They belong to Drill and must remain separate from:

* attempt evidence;
* mastery;
* geographic metadata;
* mnemonic content.

Deleting or changing Drill preferences must not affect learning history.

---

### 14. Session size is not part of recall identity

The number of questions or Countries included in one Drill run is a workflow setting.

It does not define:

* Country identity;
* recall-target identity;
* geographic membership;
* mastery;
* learning evidence.

A later implementation may allow the learner to select a session length independently from Continent, Subregions, and recall mode.

The exact session-length options, defaults, limits, and presentation are not decided by this ADR.

---

### 15. Detailed scheduling and mastery policy are not defined here

This ADR establishes the identities, recall directions, and ownership boundaries required by Drill.

It does not define the final algorithm for:

* exposure balancing;
* weak-item weighting;
* repetition spacing;
* recent-item suppression;
* mastered-item frequency;
* mastery thresholds;
* session-end criteria;
* session length.

These policies may use existing domain-neutral learning infrastructure together with World Countries-specific adaptation.

Future scheduling behavior must preserve the atomic Country + recall-skill identity defined by this ADR.

---

## Consequences

### Positive

* Drill scope follows canonical geography.
* No duplicate Continent/Subregion/Country membership is introduced.
* Country → Capital and Capital → Country are correctly represented as separate recall skills.
* Combined Countries + Capitals practice contributes evidence to the same skills used by focused modes.
* Incorrect Country identification cannot corrupt subsequent Capital evidence.
* Mnemonic identity remains separate from learning-performance identity.
* Drill-specific state remains inside `drill/`.
* Reusable World Countries learning semantics remain inside `learning/`.
* Existing Memo learning utilities can be reused without making Drill depend on Memo.
* Shared core learning remains domain-neutral.
* Recite and Maintenance can later consume shared learning evidence without importing Drill internals.
* Future recall directions can be added without redesigning geographic selection.

### Negative

* A Drill mode does not necessarily correspond one-to-one with a learning item.
* `Countries + Capitals` requires multiple atomic attempts within one visible Country interaction.
* Country-level scheduling in combined modes may need to aggregate several recall-skill progress states.
* The boundary between Drill workflow policy and reusable learning semantics must be maintained deliberately.
* Some existing learning utilities may be reusable while others, such as workflow-specific randomization strategies, may not match Drill semantics.

---

## Future Extensions

The model allows additional atomic recall skills such as:

```text
country → location
```

without changing geographic Drill selection.

Possible future capabilities include:

* configurable Drill lengths;
* targeted weak-item practice;
* mastery-based filtering;
* Maintenance-driven practice recommendations;
* Recite integration;
* complete Continent or World recall;
* additional recall directions;
* more advanced scheduling based on accumulated evidence.

These additions should build on stable Country + recall-skill evidence rather than introducing workflow-specific performance identities.

---

## Documentation Impact

When this decision is implemented, `docs/architecture/features/WORLD_COUNTRIES.md` must be updated in the same change to describe the resulting current-state architecture, including:

* Drill geographic selection;
* supported Drill modes;
* atomic recall skills;
* recall-target identity;
* the boundary between `drill/` and `learning/`;
* shared learning infrastructure usage;
* Drill preference ownership;
* learning-evidence persistence.

Any persistence documentation affected by the new recall-evidence identifiers must also be updated.

Until implementation has been completed and verified, this ADR should not contain an implementation confirmation.

After implementation and repository verification, add:

```text
## Confirmation

Implemented and verified against the repository on YYYY-MM-DD.
```

## Confirmation

Implemented and verified against the repository on 2026-08-10.
