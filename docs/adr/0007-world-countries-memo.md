# ADR 0007 — World Countries Memo workflow

> **Archived legacy change record.** This mixed-purpose feature specification is
> retained at its original path for history and stable links. It is not an
> architectural or delivery authority. Use the current
> [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md),
> source, tests, and any named Change Spec. See the
> [classification ledger](LEGACY_CLASSIFICATION.md).

* **Status:** Accepted
* **Date:** 2026-08-08
* **Builds on:** ADR 0005 — Shared learning model
* **Builds on:** ADR 0006 — Reusable mnemonic stories for Pi and Geography
* **Feature:** `src/features/world-countries/`
* **Goal:** add a map-driven Memo workflow for learning countries, capitals, continents, and subregions before introducing the later practice/recite workflow.

## Context

The World Countries feature currently contains:

* the country/capital dataset;
* continent and subregion classification;
* country/capital quiz behavior;
* interactive SVG map infrastructure;
* `SvgMapController`;
* map assets and map definitions.

The next step is to add an initial **Memo** workflow.

The purpose of Memo is different from later practice/recitation.

Memo is where the user:

1. navigates the geographic hierarchy;
2. chooses a continent;
3. chooses a subregion;
4. becomes familiar with the countries in that subregion;
5. learns each Country–Capital relationship;
6. creates mnemonic stories/images;
7. records that a Country–Capital fact has been successfully recalled once.

Later ADRs/features will define the richer workflow for:

* practising countries inside a selected subregion;
* repeated recall;
* question scheduling;
* mastery;
* weak-item handling;
* recitation;
* maintenance.

Do not build those concerns into this feature prematurely.

---

# Decision

Add a dedicated **Memo** workflow to World Countries.

The main navigation is:

```text
World
  ↓
Continent
  ↓
Subregion
  ↓
Subregion Memo workspace
```

The map is the primary navigation surface.

Conceptually:

```text
WORLD MAP

hover continent
      ↓
click continent
      ↓
CONTINENT MAP

hover subregion
      ↓
click subregion
      ↓
zoom/focus selected subregion
      ↓
SUBREGION MEMO WORKSPACE

subregion mnemonic
countries + capitals
country-capital mnemonics
memo progress
```

All geography shown by this workflow must be derived from:

```text
src/features/world-countries/data/countries.ts
```

The SVG map assets provide **geometry and display elements only**.

They are not the source of truth for:

* which Continents exist;
* which Subregions exist;
* which countries belong to a Continent;
* which countries belong to a Subregion;
* country/capital relationships;
* learning scopes;
* Memo progress aggregation.

---

# 1. Geography data is the source of truth

The geography hierarchy must be **data-driven** from:

```text
src/features/world-countries/data/countries.ts
```

The current country records provide information such as:

```ts
{
  id: 'NO',
  country: 'Norway',
  capital: 'Oslo',
  continent: 'Europe',
  subregion: 'Northern Europe',
}
```

The Memo feature derives:

```text
World
Continents
Subregions
countries per Continent
countries per Subregion
country/capital facts
```

from these records.

Do not create parallel hard-coded arrays such as:

```ts
const EUROPE_COUNTRIES = [...]
```

or:

```ts
const NORTHERN_EUROPE = [
  'Norway',
  'Sweden',
  ...
]
```

or:

```ts
const CONTINENTS = [
  'Europe',
  'Asia',
  ...
]
```

when those values can be derived from `countries.ts`.

The dataset is the canonical geography model.

---

# 2. Map configuration is an adapter, not geography data

Map configuration may contain information that cannot be derived from `countries.ts`, such as:

* SVG asset URL;
* SVG-specific aliases;
* SVG path IDs;
* zoom padding;
* map-specific display configuration;
* mapping from a domain Continent to a particular SVG asset.

It must not duplicate domain membership unnecessarily.

For example, this is acceptable:

```ts
{
  continent: 'Europe',
  svgUrl: europeSvgUrl,
}
```

But avoid:

```ts
{
  continent: 'Europe',
  countryIds: [
    'NO',
    'SE',
    'DK',
    ...
  ]
}
```

when that list is already derivable from:

```ts
countries.filter(
  country => country.continent === 'Europe'
)
```

Likewise, Subregion hover groups should be generated from the country data rather than manually maintained.

The desired relationship is:

```text
countries.ts
     │
     ├── derives Continent groups
     ├── derives Subregion groups
     ├── derives Memo scopes
     └── derives progress aggregation
              │
              ▼
       map adapter resolves
       domain countries
       to SVG elements
              │
              ▼
      SvgMapController
```

---

# 3. Memo state is not mastery

World Countries must preserve the same important distinction already used conceptually by Pi:

```text
Memoed / learned once
        ≠
Mastered
```

For this feature:

> A Country–Capital relationship becomes memoed after its first successful Memo recall.

Example:

```text
Norway ↔ Oslo

first successful Memo recall
        ↓
memoed
```

This means only:

> the user has learned this fact once during the initial learning workflow.

It does **not** mean:

* mastered;
* stable long-term memory;
* two successful recalls;
* due for maintenance;
* high-confidence recall;
* completed spaced repetition.

Those belong to later practice/mastery logic.

Internally prefer the term:

```text
memoed
```

even if the UI uses wording such as:

```text
Learned
```

This avoids confusing initial learning with ADR 0005 mastery.

---

# 4. Memo operates on the Country–Capital relationship

ADR 0005 established that:

```text
Country  ≠ Pi pair
Capital  ≠ Pi digit
```

and instead:

```text
Norway ↔ Oslo
```

is the geography fact.

That remains true here.

The Memo unit is:

```text
Country ↔ Capital
```

not Country and Capital as separate hierarchy levels.

Example:

```text
countryId: NO
country: Norway
capital: Oslo
```

Memo state belongs to this fact.

Later recall directions may be:

```text
Norway → Oslo
Oslo → Norway
```

but Memo does not need separate mnemonic content for those directions.

---

# 5. Geography hierarchy

Keep the explicit geography domain:

```text
World
  Continent
    Subregion
      Country
        capital property
```

This hierarchy is **derived from `countries.ts`**.

For example, conceptually:

```ts
const continents =
  unique(countries.map(country => country.continent))
```

and:

```ts
const subregions =
  unique(
    countries
      .filter(country => country.continent === selectedContinent)
      .map(country => country.subregion)
  )
```

and:

```ts
const countriesInSubregion =
  countries.filter(
    country =>
      country.continent === selectedContinent &&
      country.subregion === selectedSubregion
  )
```

Exact utility APIs may differ, but the behavior must remain data-driven.

Do not turn this into a generic recursive learning tree.

The hierarchy is owned by World Countries.

---

# 6. Memo progress

Persist the atomic Memo fact:

```text
Country–Capital relationship has been memoed
```

The country already has a stable ID.

Conceptually:

```ts
interface CountryMemoState {
  countryId: string
  memoedAt: number
}
```

A Set-like representation is also acceptable if the timestamp is unnecessary.

Example:

```text
NO = memoed
SE = memoed
DK = not memoed
```

Do not persist redundant Memo state for:

* Subregion;
* Continent;
* World;

when it can be derived from countries.

---

# 7. Derived progress

## Country

```text
not memoed
memoed
```

## Subregion

Derive membership from `countries.ts`.

Then derive progress from member countries:

```text
not started
partial
complete
```

Where:

```text
not started = 0 memoed
partial     = some memoed
complete    = all memoed
```

## Continent

Derive all member countries from:

```ts
country.continent
```

Then aggregate their Memo state.

## World

Aggregate all countries in `countries.ts`.

Progress calculations should be pure and independent from map rendering.

For example:

```ts
getSubregionMemoProgress(...)
getContinentMemoProgress(...)
getWorldMemoProgress(...)
```

These helpers should receive/derive their country membership from the dataset rather than from map definitions.

---

# 8. World map

Memo opens on:

```text
MapChart_Map_World.svg
```

The world map has two responsibilities:

1. show Memo progress;
2. select a Continent.

## Progress colors

Country shapes should reflect their Country–Capital Memo state.

For example:

```text
not memoed → default/unlearned style
memoed     → learned style
```

The exact colors are a UI decision.

The semantic states should be separate from hard-coded colors.

Prefer something conceptually like:

```ts
type MemoVisualState =
  | 'unlearned'
  | 'learned'
```

and translate that to colors at the UI/map-adapter boundary.

Do not put concepts such as `memoed` inside `SvgMapController`.

## Continent hover

Continent groups are derived from:

```ts
country.continent
```

The Memo map adapter resolves the countries in each domain group to SVG IDs.

Hovering a country in Europe may therefore highlight all countries whose data records have:

```text
continent === 'Europe'
```

Do not manually define the Europe membership list in the map configuration.

## Continent click

Clicking a Continent changes the active Memo navigation level and loads the appropriate configured map asset.

---

# 9. Continent map assets

Do not infer asset paths from Continent names.

The asset model and geography model are not guaranteed to be one-to-one.

Existing assets include forms such as:

```text
MapChart_Map_Africa.svg
MapChart_Map_America.svg
MapChart_Map_Asia_names.svg
MapChart_Map_Europe.svg
MapChart_Map_Europe.svg
MapChart_Map_Oceania.svg
```

For example:

```text
North America
South America
```

may both use:

```text
MapChart_Map_America.svg
```

with different active country groups / zoom areas.

Therefore introduce an explicit **asset mapping**, but keep geography membership data-driven.

Conceptually:

```ts
interface MemoMapDefinition {
  id: string
  svgUrl: string
  domainContinents: readonly Continent[]
}
```

This definition says:

> which asset can render which domain area

not:

> which countries belong to that domain area.

Country membership still comes from `countries.ts`.

---

# 10. Continent view

After selecting a Continent:

1. derive its countries from `countries.ts`;
2. load its configured SVG asset;
3. resolve domain countries to SVG path IDs;
4. preserve Memo color coding;
5. derive Subregions from the selected Continent's country records;
6. generate Subregion hover groups;
7. allow the user to select a Subregion.

Example:

```text
Europe selected

countries.ts
   ↓
all Europe records
   ↓
derive:
Northern Europe
Western Europe
Central Europe
Eastern Europe
Southern Europe
Balkans
...
```

No manually maintained Subregion list should be required.

---

# 11. Subregion groups are data-driven

Subregion grouping must come from:

```text
Country.subregion
```

For example:

```ts
const countriesInNorthernEurope =
  countries.filter(
    country =>
      country.continent === 'Europe' &&
      country.subregion === 'Northern Europe'
  )
```

The map adapter then converts those domain countries to SVG IDs and creates:

```ts
SvgMapHoverGroup
```

data for the controller.

Correct:

```text
countries.ts
   ↓
derive Northern Europe countries
   ↓
map adapter
   ↓
SVG IDs
   ↓
setHoverGroups(...)
```

Incorrect:

```text
memoMaps.ts
   ↓
hard-coded Northern Europe country list
```

This rule applies to every Continent and Subregion.

---

# 12. Subregion focus

Selecting a Subregion does not require loading another SVG.

Prefer using the currently loaded continent map and:

```ts
controller.setZoomArea(countryIds, padding)
```

to focus the visible map on the selected Subregion.

The country IDs passed to the controller are derived through:

```text
countries.ts
   ↓
selected Subregion countries
   ↓
SVG ID resolution
```

The selected group should remain visually clear after zooming.

A dedicated Subregion SVG may be introduced later if there is a strong visual reason, but it is not the default architecture.

---

# 13. `SvgMapController` architecture

All SVG manipulation must go through:

```text
src/features/world-countries/common/SvgMapController.ts
```

`SvgMapController` is the generic imperative controller for map behavior.

Memo React components should not directly manipulate imported SVG DOM.

Target dependency direction:

```text
Memo React components
        ↓
Geography-derived Memo map adapter
        ↓
SvgMapController
        ↓
SVG DOM
```

Avoid:

```text
Memo component
      ↓
querySelector(...)
      ↓
direct path/style mutation
```

unless there is a specific technical reason that cannot reasonably belong in the controller.

---

# 14. Existing controller capabilities should be reused

Before modifying `SvgMapController`, use its existing generic capabilities.

Relevant existing operations include:

```text
load(...)
setHoverGroups(...)
setCountryColors(...)
setHighlighted(...)
clearHighlights(...)
setGroupOutlines(...)
setGroupOutlinesVisible(...)
setZoomArea(...)
resetZoom(...)
setNamesVisible(...)
updateSettings(...)
```

These already cover most Memo map requirements.

Examples:

### Continent hover

Generate groups from `countries.ts`, then:

```ts
controller.setHoverGroups(continentGroups)
```

### Subregion hover

Generate Subregion groups from the selected Continent's country records, then:

```ts
controller.setHoverGroups(subregionGroups)
```

### Memo coloring

Derive Memo states from country IDs, resolve to SVG IDs, then:

```ts
controller.setCountryColors(...)
```

### Subregion zoom

Derive Subregion members from the dataset, resolve them, then:

```ts
controller.setZoomArea(subregionSvgIds)
```

Do not recreate these behaviors in Memo-specific React code.

---

# 15. Controller change policy

`SvgMapController` is generic infrastructure.

Do not change it merely because adding a special-case helper would make Memo code shorter.

Modify the controller only when:

1. required functionality cannot cleanly be implemented with the existing API;
2. the missing capability is generic map behavior;
3. the capability is likely useful for current or future map consumers;
4. the controller remains framework-independent.

Reasonable generic additions might include:

```text
better group interaction callbacks
more efficient batch state updates
generic group selection behavior
generic viewBox/focus improvements
generic discovered-bound information
```

Do not add domain methods such as:

```text
selectEurope()
highlightLearnedCountries()
showNorthernEurope()
setMemoProgress()
```

Those belong in the Memo adapter/UI.

---

# 16. Preserve controller invariants

Any controller changes must preserve existing guarantees:

* framework-independent;
* no React imports;
* no Memo imports;
* no learning/mastery imports;
* no dependency on `countries.ts`;
* SVG sanitization remains intact;
* unsafe embedded content remains rejected;
* controller owns DOM styles;
* controller owns attached SVG event listeners;
* `destroy()` continues restoring/removing owned behavior;
* unknown SVG IDs continue being reported;
* existing Workarea behavior continues working.

The important separation is:

```text
countries.ts understands Geography

Memo adapter understands:
Geography ↔ SVG mapping

SvgMapController understands:
SVG interaction only
```

Changes to `SvgMapController` require its targeted tests to be updated.

---

# 17. Memo map definitions

Introduce something like:

```text
memo/memoMaps.ts
```

Its purpose is limited to map-specific configuration.

It may define:

* which SVG asset renders which Continent;
* asset-specific aliases/mappings;
* default zoom padding;
* display settings.

It should **not** become a second geography database.

Do not hard-code:

* Continent membership;
* Subregion membership;
* country-capital relationships.

Those must come from:

```text
data/countries.ts
```

The distinction is:

```text
countries.ts
  = what the geography is

memoMaps.ts
  = how that geography is rendered using available SVG assets
```

---

# 18. Domain country IDs and SVG IDs are different

Persistent learning identity uses stable domain IDs such as:

```text
NO
SE
DK
GB
```

SVG interaction uses IDs discovered from a specific SVG asset.

These must not be assumed to be identical.

Example:

```text
domain:
id = GB
country = United Kingdom

SVG may expose:
England
Scotland
Wales
Northern_Ireland
```

The Memo map adapter is responsible for resolving domain records from `countries.ts` to the relevant SVG IDs.

Use, where appropriate:

* `Country.id`;
* `Country.country`;
* `Country.aliases`;
* explicit asset-specific mapping.

Do not move this resolution logic into `SvgMapController`.

---

# 19. Asset validation

Before registering an SVG asset for Memo:

1. load it through `SvgMapController`;
2. inspect discovered countries;
3. derive expected domain countries from `countries.ts`;
4. verify those countries can be resolved to SVG IDs;
5. identify unresolved or ambiguous mappings;
6. verify generated Continent/Subregion groups;
7. verify zoom behavior.

Tests should catch drift between:

```text
domain geography
```

and:

```text
map geometry
```

Do not silently hard-code around mismatches in multiple places.

Prefer a centralized map-adapter mapping where necessary.

---

# 20. Subregion Memo workspace

After selecting a Subregion, show a workspace beneath the focused map.

The country list is derived directly from `countries.ts`.

Conceptually:

```text
Northern Europe

[ focused map ]

Subregion mnemonic
──────────────────
story / picture
edit

Countries
──────────────────

Denmark
Copenhagen
[ memo state ]
[ mnemonic ]

Estonia
Tallinn
[ memo state ]
[ mnemonic ]

Finland
Helsinki
[ memo state ]
[ mnemonic ]

...
```

The exact visual component may be:

* cards;
* compact list;
* grid;
* expandable items.

Do not lock the ADR to a specific card design.

The required information architecture is more important than presentation.

---

# 21. Subregion mnemonic

Reuse ADR 0006.

Each Subregion can have:

```text
freeform story text
+
optional image
```

Example target:

```text
geo:subregion:europe:northern-europe
```

The list/order snapshot stored with the mnemonic must be based on the current countries derived from `countries.ts`.

If `countries.ts` later changes:

* membership;
* ordering;
* classification;

ADR 0006's stale mnemonic detection should identify that mismatch.

Do not create a separate Subregion story database.

---

# 22. Country–Capital mnemonic

Reuse ADR 0006.

Each Country–Capital relationship can have:

```text
freeform story text
+
optional image
```

Example:

```text
geo:country-capital:NO
```

This belongs to:

```text
Norway ↔ Oslo
```

not specifically:

```text
Norway → Oslo
```

or:

```text
Oslo → Norway
```

The same mnemonic must later be usable by either recall direction.

Do not duplicate mnemonic storage inside Memo.

---

# 23. Country Memo item

Each country displayed in the selected Subregion should come from the canonical country record.

Each item should expose at least:

```text
Country name
Capital
Memo state
Mnemonic availability/content
```

Example:

```text
Norway
Oslo

Learned ✓

[ Story ]
[ Picture ]
```

The feature should visually distinguish:

```text
not yet memoed
memoed
```

without implying mastery.

---

# 24. First successful recall

Memo completion should be based on a successful recall rather than a manual arbitrary "mastered" button.

The minimal Memo interaction may support something like:

```text
Country shown
     ↓
attempt to recall Capital
     ↓
reveal/check
     ↓
correct
     ↓
mark Country–Capital fact memoed
```

The exact UI may be refined during implementation.

However, ADR 0007 does **not** introduce:

* weighted next-question selection;
* repeated practice;
* batch mastery;
* weak-item scheduling;
* spaced repetition.

The only progress transition required here is:

```text
not memoed
    ↓
first successful Memo recall
    ↓
memoed
```

If the richer country-learning interaction is intentionally implemented in the immediately following feature/ADR, ADR 0007 may expose and render the Memo state without inventing a conflicting temporary practice engine.

Do not substitute:

```text
mnemonic saved
```

for:

```text
successfully recalled
```

---

# 25. Map progress updates

Whenever Memo state changes, the current map should update its country colors.

The flow should be:

```text
memoed Country IDs
       ↓
lookup Country records in countries.ts
       ↓
resolve domain countries → SVG IDs
       ↓
derive visual colors
       ↓
controller.setCountryColors(...)
```

The controller should not read Memo storage directly.

Correct:

```text
Memo state
     ↓
feature adapter
     ↓
SvgMapController
```

Incorrect:

```text
SvgMapController
     ↓
memoStore
```

---

# 26. Navigation state

Memo owns navigation state such as:

```ts
interface MemoNavigationState {
  continent: Continent | null
  subregion: string | null
}
```

The available values come from `countries.ts`.

Expected transitions:

```text
World
  ↓ select Continent
Continent
  ↓ select Subregion
Subregion workspace
```

The UI must provide a clear way to navigate back:

```text
Subregion → Continent
Continent → World
```

Changing map level should be intentional.

Avoid reload effects caused by unrelated UI state changes.

---

# 27. Proposed package structure

Suggested starting point:

```text
src/features/world-countries/
  memo/
    WorldCountriesMemo.tsx

    geographyMemo.ts
    memoProgress.ts
    memoStore.ts

    memoMaps.ts
    memoMapAdapter.ts

    MemoMap.tsx
    MemoWorkspace.tsx
    CountryMemoList.tsx

    SubregionMnemonicPanel.tsx
    CountryMnemonicPanel.tsx
```

This structure is illustrative rather than mandatory.

Responsibilities should remain clear.

### `geographyMemo.ts`

Pure dataset-derived helpers such as:

```text
getContinents()
getCountriesForContinent()
getSubregionsForContinent()
getCountriesForSubregion()
```

These operate on `countries.ts`.

### `memoProgress.ts`

Pure Memo aggregation.

### `memoStore.ts`

Persisted Country–Capital Memo completion.

### `memoMaps.ts`

SVG asset/configuration mapping only.

### `memoMapAdapter.ts`

Translate data-driven domain groups to map-specific SVG IDs.

### `MemoMap`

React/controller integration.

### `MemoWorkspace`

Selected Subregion composition.

Reuse shared mnemonic infrastructure from ADR 0006.

---

# 28. Public boundaries

World Countries remains the owner of this workflow.

External application code should reach it through:

```text
@/features/world-countries
```

rather than importing Memo internals directly.

Update the feature barrel only for the public entry point required by the application.

Do not expose internal map adapters or Memo stores unless another consumer genuinely needs them.

---

# 29. Relationship to existing Workarea

The existing Map Workarea and Memo are different consumers of the same generic controller.

```text
MapWorkarea
      \
       → SvgMapController
      /
MemoMap
```

Memo should not be implemented by modifying `MapWorkarea` into a learning workflow.

Likewise, Memo-specific navigation should not accidentally become Workarea state.

The Workarea is useful as:

* an existing controller consumer;
* a regression test;
* a place to experiment with generic controller functionality.

It is not the Memo feature itself.

---

# 30. Relationship to ADR 0005

ADR 0005 owns shared concepts around:

```text
RecallItem
LearningScope
Attempt
Mastery
Scheduler
```

ADR 0007 does not replace those concepts.

Memo progress is an explicit initial-study milestone.

Conceptually:

```text
Country–Capital fact
      │
      ├── Memo state
      │     learned once
      │
      ├── Mnemonic
      │     text/image
      │
      └── Learning evidence
            future practice/mastery
```

These concerns are related but independent.

---

# 31. Relationship to ADR 0006

ADR 0006 owns:

```text
mnemonic text
optional image
generic persistence
image processing
backup/import/export
```

ADR 0007 only decides **where those mnemonics appear in the World Countries Memo workflow**.

Do not create:

```text
memoCountryStories.ts
memoSubregionStories.ts
```

with duplicate persistence.

Use the feature adapters defined around ADR 0006.

---

# 32. Deferred follow-up feature

A later feature/ADR will define how the user actively works through the countries in a selected Subregion.

That future work may cover:

* learning sequence;
* batch size;
* Country → Capital recall;
* Capital → Country recall;
* item scheduling;
* anti-repeat logic;
* practice sessions;
* mastery;
* progress toward mastered Subregions;
* maintenance.

ADR 0007 should leave clean integration points for that workflow.

Do not attempt to solve those algorithms here.

---

# Non-goals

ADR 0007 does not define:

* final Country practice behavior;
* mastery rules;
* bidirectional mastery;
* question weighting;
* spaced repetition;
* maintenance;
* weak-item prioritization;
* timed recitation;
* full session analytics;
* AI-generated mnemonic stories;
* multiple images per mnemonic;
* arbitrary map/GIS infrastructure;
* backend synchronization;
* a separate hard-coded geography model for the map.

---

# Architectural constraints

1. `countries.ts` is the canonical geography source for Memo.

2. Continents must be derived from `Country.continent`.

3. Subregions must be derived from `Country.subregion`.

4. Country membership in Continents/Subregions must not be manually duplicated in Memo map definitions.

5. Map definitions describe SVG rendering/configuration, not geography truth.

6. Memo is separate from mastery.

7. One successful initial Memo recall can mark a Country–Capital fact `memoed`.

8. Country–Capital is the fact being memorized; Capital is not a separate learning hierarchy node.

9. Subregion, Continent, and World Memo progress are derived from countries.

10. Stable `Country.id` values are used for persisted identity.

11. SVG path IDs are map-specific and are not persistent learning IDs.

12. Domain country IDs and SVG IDs are resolved through a feature adapter.

13. `SvgMapController` remains the only general SVG DOM-control layer.

14. Memo React components should not directly mutate SVG internals.

15. Existing controller APIs must be tried before extending the controller.

16. Any new controller capability must be generic.

17. `SvgMapController` must remain unaware of Memo state, Geography taxonomy, React, learning state, and mnemonics.

18. Map assets are selected through explicit asset definitions rather than filename assumptions.

19. A map asset may represent more than one domain Continent.

20. Subregion focus should normally use the controller's generic zoom functionality rather than requiring another SVG.

21. Mnemonic persistence comes from ADR 0006.

22. Saving a mnemonic does not mark a country memoed.

23. Existing Map Workarea behavior must remain intact.

---

# Acceptance criteria

ADR 0007 is implemented successfully when:

1. World Countries exposes a dedicated Memo workflow.

2. Memo opens with `MapChart_Map_World.svg`.

3. Available Continents are derived from `countries.ts`.

4. Continent country membership is derived from `countries.ts`.

5. Available Subregions are derived from `countries.ts`.

6. Subregion country membership is derived from `countries.ts`.

7. No parallel manually-maintained Continent/Subregion membership lists are required by Memo.

8. Country shapes on the world map can visually reflect Memo state.

9. Hovering a country can highlight its data-derived Continent group.

10. Clicking a Continent changes to the configured continent map.

11. Domain Continent → map asset selection uses an explicit asset registry.

12. North/South America or other shared-map cases can reuse one SVG without changing the domain data.

13. Continent maps preserve Country Memo coloring.

14. Hovering a country on a Continent map can highlight its data-derived Subregion group.

15. Clicking a Subregion focuses/zooms the map to the data-derived group.

16. The selected Subregion has a Memo workspace below the map.

17. The workspace displays the Country/Capital records from `countries.ts` for that Subregion.

18. Country items display their Memo state.

19. A Country–Capital fact can transition to Memoed after its first successful Memo recall, either in this feature or through the explicitly connected follow-up interaction.

20. The map reflects Memo state without requiring mastery calculations.

21. The user can view/edit a mnemonic story and optional image for a Country–Capital relationship.

22. The user can view/edit a separate mnemonic story and optional image for the selected Subregion.

23. Both mnemonic types use ADR 0006 infrastructure.

24. `SvgMapController` contains no Memo-specific or hard-coded Geography grouping logic.

25. Map interactions go through `SvgMapController`.

26. Existing Workarea behavior remains functional.

27. Registered map assets are tested against actual discovered SVG country IDs and the corresponding domain records.

28. World Countries targeted tests pass.

29. Typecheck/build passes after public React/map integration changes.

---

# Implementation guidance for Codex

Start inside:

```text
src/features/world-countries/
```

Read:

```text
AGENTS.md
index.ts
data/countries.ts
common/SvgMapController.ts
common/worldMap.ts
workarea/MapWorkarea.tsx
```

Also read the implemented APIs resulting from ADR 0006 before adding mnemonic code.

Do not scan unrelated sibling features unless a direct shared dependency requires it.

The primary architectural rule is:

> derive Geography from `countries.ts`; adapt that data to the SVG maps.

Do not manually re-enter the geography structure into Memo code.

Implementation order:

```text
1. Add pure geography helpers derived from countries.ts
2. Add Memo composition/root
3. Add Memo progress model/store
4. Add map asset definitions
5. Add domain-country → SVG adapter
6. Add world map integration
7. Generate Continent groups from countries.ts
8. Add Continent navigation
9. Generate Subregion groups from countries.ts
10. Add Subregion grouping + setZoomArea
11. Add Subregion workspace
12. Add ADR 0006 mnemonic integration
13. Add Memo progress coloring
14. Add minimal first-recall completion integration
```

Before writing a group manually, ask:

```text
Can this group be derived from countries.ts?
```

If yes:

```text
derive it
```

Do not hard-code it.

Before editing `SvgMapController.ts`, ask:

```text
Can the requirement be implemented using the existing controller API?
```

If yes:

```text
do not change the controller
```

If no:

```text
identify the missing generic map capability
add it to the controller
add controller tests
then consume it from Memo
```

Do not implement Memo behavior by bypassing the controller with ad-hoc SVG DOM operations.

The intended separation is:

```text
countries.ts
     │
     ├── Geography hierarchy
     ├── Continent groups
     ├── Subregion groups
     ├── Country/Capital facts
     └── Memo progress membership
              │
              ▼
       Memo map adapter
       domain → SVG IDs
              │
              ▼
       SvgMapController
              │
              ▼
             SVG
```

The purpose of ADR 0007 is to establish a **data-driven, map-driven initial learning workspace**.

The richer system for repeatedly working through and practising the countries in the selected Subregion is intentionally the next feature, not part of this ADR.

## Confirmation

Implemented and verified against the repository on 2026-08-09.
