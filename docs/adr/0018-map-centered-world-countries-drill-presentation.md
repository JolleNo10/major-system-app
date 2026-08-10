# ADR 0018: Map-Centered World Countries Drill Presentation

## Status

Accepted

## Date

2026-08-10

## Builds on

* ADR 0001 — `PageLayout`: one base pattern for center + side rails
* ADR 0017 — World Countries Drill Scope and Recall Modes

## Context

ADR 0017 introduced the World Countries Drill workflow with:

* one Continent as the geographic root;
* the entire Continent or one or more Subregions as the Drill scope;
* four user-facing Drill modes;
* separate setup, active recall, and results phases;
* reusable Country + recall-skill learning evidence.

The initial implementation is functionally usable, but its presentation does not follow the interaction model already established by World Countries Memo.

Memo treats Geography itself as the primary learning surface.

Its overview screens keep the map central while hierarchy, navigation, progress, memory aids, and secondary actions are placed in the PageLayout rails.

Drill currently behaves primarily as a conventional configuration form:

```text
Drill introduction

Continent selection
Subregion selection

Recall mode

Start Drill
```

This gives setup controls more visual importance than Geography.

For World Countries, that is the wrong hierarchy.

The map is not decorative context. It is a primary mnemonic peg used to establish and retrieve Country information.

The learner should remain geographically oriented while:

* choosing what to practise;
* choosing the recall relationship;
* performing recall;
* receiving correction;
* completing a Drill.

Drill should therefore feel like another activity within the same World Countries learning environment as Memo rather than a separate quiz tool.

The current reusable map architecture also requires clarification.

`memo/MemoMap.tsx` currently owns several capabilities needed by the desired Drill setup:

* World and Continent overview maps;
* Continent/Subregion hover groups;
* rail ↔ map hover synchronization;
* Country-click navigation;
* geographic muting;
* zoom;
* Country coloring.

Some of those capabilities are reusable Geography-map behavior, while others are specifically Memo semantics, such as learned-Country coloring and interpreting clicks as Memo navigation.

By contrast, `learning/CountryLearningMap.tsx` serves a different purpose: an individual learning/recall map for a known Continent and Country scope.

ADR 0018 therefore also needs to establish the shared map boundary required by the new Drill presentation.

---

## Decision

### 1. The map is the primary Drill surface

World Countries Drill will use a map-centered presentation.

The PageLayout center is reserved primarily for:

```text
Geography map
+
current recall interaction
```

Supporting configuration and context should move into PageLayout rails where practical.

The map must not become a small preview beneath a large setup form.

The intended desktop hierarchy is approximately:

```text
┌────────────────┬──────────────────────────────┬────────────────┐
│ Geography /    │                              │ Drill          │
│ scope          │            MAP               │ controls       │
│                │                              │                │
│                │      recall interaction      │ context        │
└────────────────┴──────────────────────────────┴────────────────┘
```

The exact rail content may differ between setup, recall, and results.

The invariant is that Geography remains the dominant center context.

---

### 2. Drill uses the existing PageLayout geometry

ADR 0001 remains authoritative for page width, centering, rails, and responsive behavior.

This ADR does not introduce a wider World Countries Drill layout.

Drill must not:

* introduce a second width owner;
* break out of the PageLayout center;
* use negative-margin width hacks;
* create a Drill-specific desktop width;
* render substantial Drill content outside PageLayout.

The existing 672px center-column invariant remains unchanged.

More usable space is created by moving supporting controls and information into the existing rails rather than widening the center.

This is a deliberate tradeoff: the map does not receive an arbitrarily wide canvas, but it becomes the dominant content within the application's established layout.

---

### 3. Drill follows Memo's geographic navigation precedent

Drill should use the same broad geographic navigation language already established by Memo:

```text
World
→ Continent
→ selected Subregions
```

This is presentation and navigation state.

It does not alter ADR 0017's Drill-selection model.

A Drill session still contains exactly:

```text
one Continent
+
one or more of that Continent's current Subregions
```

Country membership remains derived from canonical Geography.

---

## Setup presentation

### 4. World-level Drill setup is map-centered

At World level, the center displays the World map.

The **selection unit at World level is the Continent**.

The left rail presents available Continents.

Conceptually:

```text
LEFT RAIL                     CENTER

World                         WORLD MAP

Continents
Africa
Americas
Asia
Europe
Oceania
```

The interaction should follow Memo precedent:

* hovering a Continent rail entry highlights that Continent on the map;
* hovering Geography on the World map identifies the corresponding Continent in the rail;
* selecting a Continent from either surface enters that Continent's Drill setup.

Country clicks on the World map therefore resolve to their containing Continent for Drill navigation.

The World map serves both navigation and spatial orientation.

A conventional Continent `<select>` must not remain the primary Drill navigation mechanism.

---

### 5. Continent-level setup keeps the map central

After selecting a Continent, the center displays the appropriate Continent map.

The **selection unit at Continent level is the Subregion**.

Conceptually:

```text
LEFT RAIL                     CENTER                    RIGHT RAIL

World / Europe                EUROPE MAP                Drill

Geographic scope                                        Recall mode

☑ Entire Continent                                      Countries
                                                       Countries + Capitals
or                                                     Capitals
                                                       Countries from Capitals
☑ Northern Europe
☐ Western Europe                                       Current selection
☑ Southern Europe
                                                       Start Drill
```

Responsibility should remain approximately:

#### Left rail

* geographic breadcrumb;
* Continent context;
* Entire Continent action;
* individual Subregion selection;
* geographic selection status.

#### Center

* Continent map;
* current scope visualization;
* map interaction.

#### Right rail

* Drill mode;
* compact selection summary;
* Start Drill;
* other Drill-specific setup controls that do not require center space.

The precise styling can evolve independently of this responsibility split.

---

### 6. `Entire Continent` remains a convenience selection

ADR 0017's scope semantics remain unchanged.

`Entire Continent` means:

```text
all currently defined Subregions for the selected Continent
```

It is not a separate domain-level scope type.

Selecting or deselecting individual Subregions naturally changes whether the current selection represents the entire Continent.

---

### 7. The map participates directly in scope selection

The rail and map represent the same geographic selection.

At Continent level:

* hovering a Subregion rail entry identifies the same Subregion on the map;
* hovering a Country identifies its containing Subregion in the rail;
* selected and unselected Subregions are visually distinguishable;
* clicking a Country on the map may toggle its containing Subregion.

For example:

```text
click Norway
→ toggle Northern Europe
```

not:

```text
click Norway
→ create a Norway-only Drill
```

Country-level Drill scope is not introduced by this ADR.

This requires reusable support for **Subregion-group hover and selection presentation**, not merely individual-Country highlighting.

---

### 8. Scope selection and learning progress are separate visual concerns

The map needs a visual treatment for:

```text
selected geography
vs
unselected geography
```

Possible mechanisms include:

* muting;
* opacity;
* outlines;
* emphasis;
* another non-progress map treatment.

This ADR does not define mastery colors, proficiency colors, or any other learning-progress color scale.

Scope-selection presentation must remain independent enough that a later learning-progress visualization can coexist with it.

---

## Shared map architecture

### 9. `MemoMap.tsx` is the source of the reusable overview-map capability

The map-centered Drill setup requires capabilities that currently exist primarily inside:

```text
memo/MemoMap.tsx
```

The reusable parts of that implementation should be extracted rather than duplicated in Drill.

Reusable behavior includes:

* World and Continent map presentation;
* map-definition selection;
* canonical Country → SVG resolution;
* Continent hover groups;
* Subregion hover groups;
* external group-hover synchronization;
* Country hover reporting;
* Country click reporting;
* muting of out-of-scope Geography;
* zooming to relevant Geography;
* reusable Country presentation hooks needed by more than one workflow.

The extraction is a substantive part of implementing ADR 0018, not incidental refactoring.

---

### 10. The shared overview/selection map belongs in `maps/`

The extracted interactive Geography overview-map capability belongs under:

```text
src/features/world-countries/maps/
```

because it owns reusable Geography-to-SVG presentation and interaction rather than Memo or Drill learning policy.

A suitable conceptual component might be:

```text
maps/GeographyOverviewMap.tsx
```

or equivalent.

The filename is illustrative rather than mandatory.

The shared component may understand geographic presentation concepts such as:

```text
world
continent
Country
Subregion hover group
visible geographic scope
```

because `maps/` already owns Geography-to-SVG translation.

It must not understand workflow-specific intentions such as:

```text
memo this Subregion
select this Subregion for Drill
Country is mastered
start a Drill
```

Those interpretations remain with the caller.

---

### 11. Memo-specific map semantics remain in Memo

The extraction must separate reusable map behavior from Memo behavior.

For example, these remain Memo concerns:

* which Countries count as Memo-learned;
* green learned-Country coloring;
* interpreting a World map click as Memo Continent navigation;
* interpreting a Continent map click as Memo Subregion navigation;
* Memo-specific legends or wording.

`memo/MemoMap.tsx` may remain as a thin Memo-specific wrapper over the extracted shared map.

It must not remain the only owner of behavior now required by both Memo and Drill.

---

### 12. `CountryLearningMap` retains its existing learning/recall responsibility

`learning/CountryLearningMap.tsx` is not replaced by the new overview-map capability.

It continues to represent the reusable learning/recall map used when:

* the Continent is already known;
* the Country scope is already known;
* the workflow needs individual Country names, labels, ordering, or highlighting;
* a specific Country may act as the current recall target.

Conceptually:

```text
maps/GeographyOverviewMap
    World / Continent exploration and grouped interaction

learning/CountryLearningMap
    Country learning and recall presentation
```

Drill may use both during different phases.

This prevents World/Continent navigation and Subregion-selection semantics from being forced into a component whose current responsibility is individual Country learning.

---

### 13. `SvgMapView` remains the low-level declarative map adapter

`maps/SvgMapView.tsx` remains the React lifecycle adapter around `SvgMapController`.

If implementation of the shared overview map requires reusable primitives that `SvgMapView` does not currently expose, it may be extended with narrowly defined presentation capabilities such as:

* externally controlled Country colors;
* hover-group configuration;
* Country/group hover callbacks;
* other declarative controller features genuinely required by multiple map presentations.

Such additions must remain workflow-neutral.

Do not put Memo or Drill rules into `SvgMapView` or `SvgMapController`.

---

## Active Drill presentation

### 14. The map remains present during active recall

Starting a Drill does not replace the geographic workspace with a generic quiz-card screen.

The center should primarily contain:

```text
compact prompt/context

MAP

answer interaction

feedback
```

Secondary session information can move into rails, including:

* Drill mode;
* selected scope;
* current Country number;
* session progress;
* Exit;
* other non-answer-revealing context.

---

### 15. Essential answer interaction remains in the center

PageLayout rails become drawers below the desktop breakpoint.

Controls required for every recall attempt must therefore not live only in a rail.

The learner must not need to open a drawer to answer every question.

The following remain directly available in the main flow:

* recall prompt;
* typing or multiple-choice interaction;
* required feedback;
* information necessary to understand the current question.

Rails provide supporting context.

---

## Map behavior by Drill mode and recall skill

### 16. Countries mode — Location → Country

For the ADR 0017 **Countries** Drill mode:

```text
location → country
```

the highlighted location is the question itself.

Example:

```text
[ Norway highlighted ]

Which country is this?
```

The map should receive most of the visual emphasis.

A large additional "Location recall" card should not compete with the map when a compact prompt is sufficient.

---

### 17. Capitals mode — Country → Capital

For the ADR 0017 **Capitals** Drill mode:

```text
country → capital
```

the Country identity is already given.

Highlighting that Country therefore does not reveal the requested answer.

Example:

```text
Norway

[ Norway highlighted ]

What is the capital?
```

This reinforces:

```text
Country name
↔
Country location
↔
Capital
```

and avoids turning Capital practice into a text-only activity.

---

### 18. Countries from Capitals mode — Capital → Country

For the ADR 0017 **Countries from Capitals** Drill mode:

```text
capital → country
```

the learner must derive the Country from its Capital.

Before submission, the map may show the selected geographic scope but must not identify the target Country.

Example:

```text
Oslo

[ neutral map of selected scope ]

Which country has this capital?
```

Before the answer, the target Country must not be:

* highlighted;
* uniquely colored;
* named;
* automatically zoomed in a way that identifies it;
* otherwise visually revealed.

After submission, the canonical Country may be highlighted as reinforcement or correction.

---

### 19. Countries + Capitals mode — Location → Country → Capital

For the ADR 0017 **Countries + Capitals** Drill mode:

```text
location → country
→
country → capital
```

the same canonical Country remains the spatial peg across both steps.

Step 1:

```text
[ Norway highlighted ]

Which country is this?
```

After the Country has been established, either correctly or by correction:

```text
Norway

[ Norway remains highlighted ]

What is the capital?
```

The learner's incorrect Country guess must never determine the following Capital question.

ADR 0017's canonical-Country rule remains authoritative.

---

## Feedback

### 20. Corrections reinforce the geographic association

When useful, incorrect answers should be corrected through both textual and geographic feedback.

For example:

```text
Oslo
Answer: Sweden ✗

Correct answer: Norway

[ Norway highlighted ]
```

The intended correction chain is:

```text
wrong answer
→ canonical answer
→ correct geographic association
```

rather than only:

```text
wrong answer
→ correct text
```

When a correction highlight is shown, it must remain visible for the full correction-feedback interval.

The session must not advance before the learner has a reasonable opportunity to perceive the geographic correction.

This ADR does not otherwise redefine the current correct/incorrect auto-advance timing policy.

---

## Rails during active recall

### 21. Rails become quieter during recall

Full setup controls disappear during active recall.

Possible active-session rail content includes:

#### Left rail

* compact geographic context;
* selected Continent/Subregions.

#### Right rail

* Drill mode;
* session progress;
* Exit;
* other non-answer-revealing session information.

The exact split is not architectural.

The required property is:

> Rails provide useful context without competing with or leaking the recall task.

---

## Results

### 22. Results remain geographically grounded

Completing a Drill should keep the learner in the World Countries geographic workspace.

The center retains the map.

Session statistics and next actions may primarily use the rails.

Conceptually:

```text
LEFT RAIL                     CENTER                    RIGHT RAIL

Session                       MAP                       Next action

Questions                                               Drill again
Correct                                                 Change setup
Incorrect
```

The exact representation of:

* mastery;
* proficiency;
* Country knowledge;
* Subregion knowledge;
* Continent knowledge;
* map progress coloring;

is outside this ADR.

A separate learning-model decision will define those concepts.

ADR 0018 only establishes that future progress visualization should remain geographically anchored.

---

## Scoring and mastery

### 23. Scoring and mastery semantics are explicitly out of scope

ADR 0017 establishes independent atomic recall evidence.

This ADR does not redefine:

* recall-skill identity;
* mastery thresholds;
* proficiency;
* scoring;
* skill aggregation;
* Country mastery;
* Subregion mastery;
* Continent mastery;
* World mastery;
* progress colors;
* progress legends.

In particular, this ADR does not decide how:

```text
location → country
country → capital
capital → country
```

should be combined or visualized as user knowledge.

Drill presentation will consume the resulting model rather than introduce a Drill-specific scoring model.

---

## Responsive setup and recall

### 24. Sub-xl setup remains map-centered and fully reachable

ADR 0001 remains authoritative below the `xl` breakpoint: rails become drawers.

This means the full desktop three-column setup cannot simply be reproduced at narrower widths.

At sub-xl widths:

* the World or Continent map remains the primary main-flow surface;
* geographic selection through the map remains available where applicable;
* left- and right-rail controls remain reachable through the normal PageLayout drawer mechanism;
* the main flow shows a compact summary of the current scope and Drill mode where necessary;
* Start Drill remains clearly reachable without requiring repeated drawer navigation;
* full duplicate setup forms must not be introduced into the center merely to avoid using the drawers.

The learner must be able to:

```text
choose Continent
choose Subregions
choose Drill mode
start Drill
```

at sub-xl widths without losing access to the map or encountering unreachable controls.

The same PageLayout responsive model continues into active recall.

---

## Workflow ownership

### 25. Drill owns Drill-specific composition

`drill/` owns:

* Drill setup composition;
* Drill geographic-selection interpretation;
* Drill rail content;
* mode controls;
* active-session context;
* Start, Exit, Again, and Change Setup actions;
* results composition.

For example:

```text
maps/
    reports Country click

drill/
    resolves clicked Country's Subregion
    and toggles that Subregion in Drill selection
```

The map layer must not own the Drill selection model.

---

### 26. Drill follows Memo precedent without importing Memo internals

Memo establishes the UX precedent:

```text
rails
+
central Geography map
+
rail ↔ map interaction
```

Drill should follow it.

However:

```text
memo/
drill/
```

remain sibling workflow owners.

Drill must not import workflow-specific implementation from Memo merely to reproduce Memo behavior.

Shared behavior must be extracted to its correct capability owner.

Visual consistency does not justify a generic Memo/Drill workflow abstraction.

---

## Testing requirements

Implementation must cover at least the following behavior.

### World selection unit

Country interaction on the World map resolves to and selects its Continent.

### Continent selection

Selecting a Continent through either:

* the World rail; or
* the World map

enters the same Continent Drill setup.

### Rail/map synchronization

Hovering a Continent or Subregion rail entry identifies the same geographic group on the map.

Map hover produces the corresponding rail context.

### Subregion-group behavior

Continent maps support Subregion-level grouped hover and selection rather than only individual-Country highlighting.

### Subregion selection

Country interaction on a Continent map changes the containing Subregion's scope state.

It does not create individual-Country Drill scope.

### Entire Continent

The Entire Continent action selects all current Subregions in the selected Continent.

### Countries mode

Location → Country highlights the target Country before answering.

### Capitals mode

Country → Capital may highlight the given Country while recalling the Capital.

### Countries from Capitals mode

Capital → Country does not reveal the target Country before submission.

The canonical Country may be highlighted after submission.

### Countries + Capitals mode

The canonical Country remains the geographic peg between the Country and Capital steps.

### Correction reinforcement

Geographic correction remains visible for the full incorrect-answer feedback interval.

### Setup isolation

Full setup controls are absent during active recall.

### Responsive setup

At sub-xl widths the learner can select Continent, Subregions, and Drill mode and start a Drill while retaining the map-centered layout.

### Responsive recall

Required answer interaction remains usable when rails are drawers.

### Shared-map semantics

The extracted overview-map capability contains no Memo learning-state or Drill-selection policy.

### Memo preservation

Moving reusable behavior out of `MemoMap.tsx` preserves existing Memo World/Continent map behavior.

### Workflow boundaries

Drill does not import Memo workflow internals merely to reproduce Memo presentation.

---

## Consequences

World Countries Drill becomes visually consistent with Memo.

The user remains spatially oriented throughout setup and recall.

The setup form ceases to dominate the center.

World and Continent maps become interactive Drill navigation and selection surfaces.

Capital practice remains geographically grounded instead of becoming text-only.

Capital → Country practice retains geographic context without revealing the answer.

Implementation requires a meaningful extraction from the existing Memo overview-map implementation rather than only rearranging Drill components.

The shared map architecture becomes clearer:

```text
SvgMapController
    imperative SVG mechanics

SvgMapView
    declarative React adapter

shared Geography overview map in maps/
    World / Continent grouped exploration

CountryLearningMap in learning/
    Country-focused learning and recall

Memo / Drill
    workflow-specific interpretation and composition
```

This ADR intentionally does not settle mastery, scoring, or progress visualization.

Those concepts remain available for a separate learning-model decision without conflating scope-selection presentation with learner knowledge.

---

## Documentation

When implemented and verified:

* update `docs/architecture/features/WORLD_COUNTRIES.md` with the resulting Drill presentation and shared map boundary;
* document the new shared overview-map capability under `maps/`;
* preserve the documented responsibility of `learning/CountryLearningMap.tsx`;
* preserve ADR 0001 PageLayout invariants;
* preserve ADR 0017 Drill scope and recall semantics;
* record that mastery/progress visualization remains governed by a separate future decision.

## Confirmation

Implemented and verified against the repository on 2026-08-10.

The map-centered Drill setup, shared `maps/GeographyOverviewMap` capability,
PageLayout rail presentation, active-recall map behavior, correction feedback,
results workspace, and responsive drawer access are implemented. Drill now
depends on the shared map capability without importing Memo internals, while
`learning/CountryLearningMap` remains the Country-focused recall surface.

Verification includes the World Countries integration suite, responsive setup
and rail/map synchronization coverage, all four Drill modes, answer-correction
timing, Memo map preservation, TypeScript compilation, and a production build.
ADR 0017's scope, mode, and atomic learning-evidence semantics remain
unchanged.
