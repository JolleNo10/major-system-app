# Change Spec 0002 - Configurable World Countries country definitions

* **Status:** Implemented
* **Date:** 2026-08-11
* **Related ADRs:** [ADR 0022](../adr/0022-derive-world-countries-learning-sets-from-entity-classification.md)
* **Current-state docs:** [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md), [Persistence architecture](../architecture/PERSISTENCE.md)

## Goal

Separate the canonical geopolitical entity dataset from the learner's active Country set.

The current canonical dataset contains **197 entities**. This change adds Greenland, Cook Islands, and Niue, producing **200 canonical entities**.

The default active learning population remains the **193 UN Member States**.

Settings allow the learner to expand that population with defined geopolitical categories without changing canonical entity records, stable Country identity, or stored learning evidence.

## User-visible behavior

### Primary Country set

World Countries always starts from:

```text
UN Member States
```

This is the default 193-entity active set.

Settings → World Countries adds optional inclusion categories:

```text
Primary Country set

UN Member States (193)              always included

□ UN observer states
□ Partially recognized sovereign states
□ Special political-status entities
□ Territories & dependencies
```

All optional categories default to off.

Selections are additive and form a set union. An entity matching more than one factual classification must appear only once.

Example:

```text
UN Member States
+ observer states
+ partially recognized sovereign states

=> 193
   + Vatican City / Holy See
   + Palestine
   + Kosovo
   + Taiwan
=> 197 active entities
```

Changing these settings updates World Countries without requiring an application reload.

### Category semantics

#### UN observer states

Includes entities whose canonical classification has:

```ts
unStatus === 'observer'
```

Initial expected entities:

* Vatican City, represented at the UN by the Holy See;
* Palestine, represented at the UN as the State of Palestine.

#### Partially recognized sovereign states

Includes entities satisfying:

```ts
unStatus === 'none'
&& entityType === 'sovereign-state'
&& recognition === 'partial'
```

The explicit `unStatus === 'none'` condition keeps this optional group separate from observer states even where recognition attributes overlap.

Initial expected entities:

* Kosovo;
* Taiwan.

#### Special political-status entities

Includes canonical entities modeled as state-like or administratively distinct special cases rather than ordinary sovereign states or territories.

Initial required support:

* Cook Islands;
* Niue.

Both are modeled as associated states, not territories.

`special-political-status` is a **derived country-set policy group over canonical entity classifications**. It is not stored as an entity classification or boolean field.

The model must allow later additions such as special administrative regions or disputed-territory entities without changing country-set resolution architecture.

#### Territories & dependencies

Includes entities whose canonical classification has:

```ts
entityType === 'territory'
```

Initial required addition:

* Greenland.

Additional territories may be added to canonical data later without changing country-set resolution.

This Change Spec does **not** require an exhaustive global territory/dependency catalog.

## Scope

### 1. Add canonical geopolitical classification

Create:

```text
src/features/world-countries/data/countryClassification.ts
```

Keep geographic and learning content in:

```text
countries.ts
```

Keep geopolitical classification in:

```text
countryClassification.ts
```

Both datasets use the same stable `CountryId`.

Required conceptual model:

```ts
type UnStatus =
  | 'member'
  | 'observer'
  | 'none'

type RecognitionStatus =
  | 'general'
  | 'partial'
  | 'not-applicable'

type EntityType =
  | 'sovereign-state'
  | 'associated-state'
  | 'territory'
  | 'special-administrative-region'
  | 'disputed-territory'

interface CountryClassification {
  unStatus: UnStatus
  recognition: RecognitionStatus
  entityType: EntityType

  unRepresentationName?: string

  relationship?: {
    type:
      | 'territory-of'
      | 'free-association-with'
      | 'special-administrative-region-of'
    countryId: CountryId
  }
}
```

Equivalent naming is acceptable where semantics remain identical.

Do not add:

```ts
countsTowardWorldMastery
includedInPrimaryList
isPrimaryCountry
learnable
specialPoliticalStatus
```

or another field containing the result of the user's country-set policy.

### 2. Classification completeness

Every canonical `CountryId` must have exactly one classification.

Classification must not exist for an unknown Country ID.

Add automated validation for both directions:

```text
Country without classification -> failure
Classification without Country -> failure
```

Do not silently apply a default classification to missing records.

### 3. Classify the existing dataset

Classify the existing records so that:

```text
UN members = 193
UN observers = 2
partially recognized non-UN sovereign states = 2
```

Required special records:

| Entity       | UN status | Entity type     | Recognition |
| ------------ | --------- | --------------- | ----------- |
| Vatican City | observer  | sovereign-state | general     |
| Palestine    | observer  | sovereign-state | partial     |
| Kosovo       | none      | sovereign-state | partial     |
| Taiwan       | none      | sovereign-state | partial     |

For Vatican City:

```ts
unRepresentationName: 'Holy See'
```

Preserve `VA` as the learner-facing Vatican City entity.

Preserve the existing `XK` Country ID for Kosovo. Do not replace stable persisted identities merely because an official ISO 3166-1 code is unavailable.

### 4. Add initial missing entities

Add canonical Country records and classifications for Greenland, Cook Islands, and Niue.

The `Subregion` values below refer to the app's existing **learning subregions**.

`unM49Subregion`, where supplied, remains optional reference metadata and does not control learning membership.

#### Greenland

```text
CountryId: GL
Continent: North America
Learning Subregion: Northern America
UN M49 Subregion: Northern America
Entity type: territory
UN status: none
Recognition: not-applicable
Relationship: territory-of Denmark
Capital: Nuuk
```

#### Cook Islands

```text
CountryId: CK
Continent: Oceania
Learning Subregion: Polynesia
UN M49 Subregion: Polynesia
Entity type: associated-state
UN status: none
Recognition: general
Relationship: free-association-with New Zealand
Capital: Avarua
```

#### Niue

```text
CountryId: NU
Continent: Oceania
Learning Subregion: Polynesia
UN M49 Subregion: Polynesia
Entity type: associated-state
UN status: none
Recognition: general
Relationship: free-association-with New Zealand
Capital: Alofi
```

Use ISO 3166-1 identifiers for new entities where an assigned identifier exists.

Do not use UN M49 membership as the definition of the active Country set.

### 5. Add country-set group definitions

Create the country-set capability under:

```text
src/features/world-countries/geography/
```

Suggested source anchor:

```text
geography/countrySet.ts
```

Define stable group IDs equivalent to:

```ts
type WorldCountriesEntityGroupId =
  | 'observer-states'
  | 'partially-recognized-sovereign-states'
  | 'special-political-status'
  | 'territories'
```

The group registry owns the predicates.

`special-political-status` is intentionally a **policy grouping** over multiple canonical `entityType` values; it must not be introduced as a canonical classification field.

Required rules:

```ts
UN_MEMBER_BASE:
  classification.unStatus === 'member'

observer-states:
  classification.unStatus === 'observer'

partially-recognized-sovereign-states:
  classification.unStatus === 'none'
  && classification.entityType === 'sovereign-state'
  && classification.recognition === 'partial'

special-political-status:
  classification.entityType === 'associated-state'
  || classification.entityType === 'special-administrative-region'
  || classification.entityType === 'disputed-territory'

territories:
  classification.entityType === 'territory'
```

Do not reproduce these predicates in workflow modules.

### 6. Add one active-set resolver

Provide one pure resolver equivalent to:

```ts
resolveCountrySet(
  countries,
  classifications,
  includedGroups,
): Country[]
```

Required behavior:

1. Always include UN Member States.
2. Add entities matching each selected group.
3. De-duplicate by stable `CountryId`.
4. Preserve canonical Country ordering in the result.
5. Do not read localStorage or React Settings directly.
6. Do not mutate canonical data.

The resolver is the semantic source of truth for active membership.

### 7. Persist selected groups in Settings

Use the existing app Settings capability.

Add one setting equivalent to:

```ts
worldCountriesIncludedEntityGroups: WorldCountriesEntityGroupId[]
```

Default:

```ts
[]
```

An empty array therefore means:

```text
UN Member States only
```

Persist group IDs only.

Do not persist the resulting Country IDs.

On load:

* discard unknown group IDs;
* remove duplicates;
* preserve supported selections;
* fall back to `[]` if the stored value is invalid.

Do not introduce another World Countries settings localStorage key.

### 8. Settings UI

Add the controls to the existing **World Countries** Settings group.

Base membership is informative, not toggleable:

```text
UN Member States (193)
```

Provide independent toggles for the four optional groups.

The UI must be generated from or remain synchronized with the stable group definitions. Do not create a second unrelated list of group semantics inside the Settings component.

### 9. Runtime composition

Resolve the active Country population at a World Countries composition seam.

Pure `data/` and `geography/` modules must not import app Settings.

Avoid independent Settings reads throughout Memo, Drill, progress, and other workflows.

The selected policy should enter World Countries once and the resulting active population should be passed through existing geography/query seams or another feature-local composition mechanism.

### 10. Geography queries

The exported canonical `countries` collection remains the complete known entity dataset.

After this change it contains **200 canonical entities** and no longer means:

```text
the current learning population
```

Review default parameters such as:

```ts
entries: readonly Country[] = countries
```

Where a function semantically operates on active learning membership, the caller must provide the resolved population.

Canonical-data utilities may continue operating over the full dataset.

Do not make low-level pure query helpers implicitly read Settings.

### 11. Memo

World, Continent, and Subregion Memo membership must derive from the active Country set.

Inactive canonical entities:

* do not appear as active learning targets;
* do not contribute to active completion;
* do not contribute to active progress denominators.

### 12. Drill

Drill membership order is:

```text
canonical entities
→ active Country set
→ selected Continent
→ selected Subregions
```

Existing Drill preferences remain:

```text
Continent
Subregion IDs
Drill mode
```

Do not persist resolved Country IDs.

### 13. Recite and Maintenance

Recite and Maintenance use the same active Country population.

Historical learning evidence for currently inactive entities remains stored.

Inactive entities must not enter Maintenance merely because historical attempts exist.

If an entity becomes active again, its retained evidence becomes usable again.

### 14. Progress

World, Continent, and Subregion denominators use active Country membership.

Atomic Country proficiency does not change when the Country-set setting changes.

Example:

```text
193 selected
193 complete
=> 100%

enable observers
193 of 195 complete
=> 98.97%

disable observers
=> 193 of 193 complete again
```

Changing the setting must not reset attempts.

### 15. Preserve learning evidence

Existing atomic IDs remain:

```text
world-countries:<skill>:<CountryId>
```

Do not add country-set or group identity to atomic learning IDs.

Changing Country-set options must not:

* delete attempts;
* rewrite attempts;
* create duplicate Country identities;
* reset Country proficiency.

### 16. Preserve user-authored order

Stored Country ordering remains based on stable Country IDs.

Effective order is projected over the currently active population.

When an entity becomes inactive:

* hide it from the active sequence;
* retain its stored ID.

When it becomes active again:

* restore it to the effective sequence using retained order metadata.

Saving an order while some canonical entities are inactive must not truncate those hidden IDs from persisted metadata.

### 17. Preserve Subregion completion non-destructively

The current Subregion learning store validates completion using a Country-membership fingerprint.

A user-selectable Country set makes membership changes routine rather than structural corruption.

Required behavior:

```text
completion earned for membership A
switch to membership B
→ A completion is not applicable to B
→ A completion evidence remains stored

switch back to membership A
→ previous A completion can become applicable again
```

Do not solve this by:

* deleting completion on every policy change;
* treating completion as valid for every membership;
* removing membership validation.

Existing stored completion/fingerprint information must be preserved as far as it can be interpreted safely.

### 18. Maps

Canonical map identity is independent of active learning membership.

A known entity excluded from the active set remains a known geographic entity.

Existing map-status and geographic-context presentation remains authoritative.

Where a view renders inactive canonical entities, treat them as outside the active geographic/learning scope rather than removing their map identity.

Add Country-to-SVG translation for new entities where bundled map geometry exists.

Do not modify SVG IDs to become persistence IDs.

## Architecture constraints

Follow:

* ADR 0022;
* `docs/architecture/features/WORLD_COUNTRIES.md`;
* `docs/architecture/PERSISTENCE.md`;
* `src/features/world-countries/AGENTS.md`.

Change-specific constraints:

* `data/` owns canonical classification.
* `geography/` owns country-set resolution.
* app Settings owns user selection.
* workflows consume resolved membership.
* no workflow owns geopolitical policy.
* no flattened active Country list is persisted.
* no Country identity changes with policy.
* no learning evidence is reset by policy changes.
* do not create a generic cross-feature geopolitical framework.

## Existing capabilities to reuse

### `data/countries.ts`

Canonical Country identity, capital, learning Continent/Subregion and aliases.

### `geography/queries.ts`

Existing pure queries already accept injected Country collections. Prefer using these seams over adding Settings access to geography helpers.

### `geography/subregionMetadata.ts`

Existing effective Country-order projection.

Extend its use so hidden inactive IDs survive order writes.

### `learning/scopeProgress.ts`

Already derives progress over supplied Country populations. Supply active membership rather than embedding country-set rules here.

### `learning/recallProgress.ts`

Atomic evidence remains Country-ID based and must remain independent of country-set selection.

### `learning/subregionLearningStore.ts`

Existing membership-fingerprint behavior must be made non-destructive for selectable Country populations.

### `app/settings/settings.ts`

Existing owner of persisted user settings.

### `app/settings/SettingsOverlay.tsx`

Existing World Countries Settings surface.

## Edge cases

### Multi-category entity

Classification dimensions may overlap.

Country-set resolution is a union by `CountryId`.

No duplicate entity may appear.

### Palestine

Palestine may have:

```text
UN status: observer
Recognition: partial
```

It belongs to the observer add-on.

It must not enter through the `partially-recognized-sovereign-states` add-on when observers are disabled because that group explicitly requires:

```ts
unStatus === 'none'
```

### Vatican terminology

The learner-facing entity remains:

```text
Vatican City
```

UN-specific metadata records:

```text
Holy See
```

Do not rename the Country entity to Holy See throughout the app.

### Kosovo

Keep existing stable `XK`.

Do not migrate attempts, mnemonics, map mappings, or ordering solely to replace this identifier.

### Unknown persisted group

Ignore it safely.

Do not fail Settings loading.

### Empty optional selection

Must resolve exactly the 193 UN Member States.

### Dataset extension

Adding a future entity with a supported classification must make it eligible for the appropriate Country-set group without adding Country IDs to the resolver.

## Out of scope

* Exhaustively cataloguing every world territory/dependency in this change.
* Replacing the app's learning Continent/Subregion taxonomy with UN M49.
* Custom user-authored Country sets.
* Per-Country include/exclude overrides.
* Changing World Countries mastery algorithms.
* Changing map colors or map-status semantics.
* Changing Country recall-skill identities.
* Reworking general application Settings architecture.
* Solving every disputed/de-facto-state classification globally.

The classification model must support later enrichment without architectural change.

## Acceptance criteria

### Data

* [x] Canonical dataset contains 200 entities after GL, CK, and NU are added.
* [x] Every canonical Country has exactly one geopolitical classification.
* [x] No classification references an unknown Country ID.
* [x] Exactly 193 canonical entities have `unStatus === 'member'`.
* [x] Vatican City and Palestine have `unStatus === 'observer'`.
* [x] Kosovo and Taiwan are non-UN, partially recognized sovereign-state records.
* [x] Greenland exists as `GL`, North America → Northern America, classified as a territory related to Denmark.
* [x] Cook Islands exists as `CK`, Oceania → Polynesia, classified as an associated state in free association with New Zealand.
* [x] Niue exists as `NU`, Oceania → Polynesia, classified as an associated state in free association with New Zealand.
* [x] `unM49Subregion` is set consistently for GL, CK, and NU where the canonical UN M49 subregion is represented.
* [x] No entity stores `countsTowardWorldMastery`, `specialPoliticalStatus`, or equivalent policy output.

### Resolver

* [x] Empty optional-group selection resolves 193 UN Member States.
* [x] Observer selection adds Vatican City and Palestine.
* [x] Partially-recognized selection adds Kosovo and Taiwan.
* [x] Observer + partially-recognized selection resolves 197 entities.
* [x] Special-political-status selection includes Cook Islands and Niue.
* [x] Territory selection includes Greenland.
* [x] Multi-category matches cannot produce duplicate Country IDs.
* [x] Resolver output preserves canonical ordering.
* [x] Resolver contains no Settings/localStorage dependency.

### Settings

* [x] Default persisted policy is no optional groups.
* [x] All four groups are independently selectable.
* [x] Selection updates World Countries without reload.
* [x] Unknown stored group IDs are ignored.
* [x] Resolved Country IDs are never persisted.

### Workflows and progress

* [x] Memo uses active membership.
* [x] Drill uses active membership before Continent/Subregion selection.
* [x] Recite uses active membership.
* [x] Maintenance excludes inactive entities.
* [x] World, Continent and Subregion progress denominators use active membership.
* [x] Switching policy does not delete or rewrite attempts.
* [x] Returning to a prior policy restores progress from retained evidence.

### Ordering and completion

* [x] Hidden inactive Country IDs survive order edits.
* [x] Re-enabled entities recover their retained ordering information.
* [x] Completion for membership A is not applied to different membership B.
* [x] Switching to B does not destroy A completion evidence.
* [x] Returning to A can restore applicability of A completion.

### Regression

* [x] Existing Country IDs remain unchanged.
* [x] Existing atomic World Countries target IDs remain unchanged.
* [x] Other application features and persistence are unaffected.

## Source anchors

* `src/features/world-countries/data/countries.ts`
* `src/features/world-countries/data/subregions.ts`
* `src/features/world-countries/geography/queries.ts`
* `src/features/world-countries/geography/subregionMetadata.ts`
* `src/features/world-countries/learning/subregionLearningStore.ts`
* `src/features/world-countries/learning/scopeProgress.ts`
* `src/features/world-countries/learning/recallProgress.ts`
* `src/features/world-countries/drill/drillSelection.ts`
* `src/app/settings/settings.ts`
* `src/app/settings/SettingsContext.tsx`
* `src/app/settings/SettingsOverlay.tsx`

## Reference-data constraints

For implementation-time verification:

* use the United Nations as authority for current UN Member and non-member observer status;
* use ISO 3166-1 identifiers for new entities where an assigned code exists;
* preserve existing app-assigned stable identifiers such as Kosovo `XK`;
* treat recognition and entity-type classifications outside the UN membership model as explicit app-maintained classification decisions rather than pretending they come from one universal official country list.

## Documentation impact

When implementation is complete, update:

* `docs/architecture/features/WORLD_COUNTRIES.md`

  * canonical dataset vs active population;
  * classification ownership;
  * country-set resolver ownership;
  * workflow membership;
  * ordering/completion behavior.

* `docs/architecture/PERSISTENCE.md`

  * persisted selected entity groups;
  * non-destructive policy switching;
  * membership-aware Subregion completion.

Do not update current-state architecture to describe the target model until implementation lands.

## Verification

Verified on 2026-08-11:

* `npx vitest run src/features/world-countries` — 51 files, 203 tests passed.
* `npx vitest run src/app/settings` — 1 file, 3 tests passed.
* `npx tsc -b` — passed.
* `npx vitest run` — 82 files, 387 tests passed.
* `npx vite build` — passed.
