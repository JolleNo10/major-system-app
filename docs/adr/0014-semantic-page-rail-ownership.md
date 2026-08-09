# ADR 0014 — Semantic ownership of page side rails

* **Status:** Proposed
* **Date:** 2026-08-09
* **Refines:** ADR 0001 — `PageLayout`: one base pattern for center + side rails
* **Initial application:** `src/features/world-countries/`
* **Goal:** define semantic ownership of the existing left rail, center column, and right rail so wide-screen space is used deliberately without weakening the fixed-center layout established by ADR 0001.

---

## Context

ADR 0001 established one application-wide page layout:

```text
[left rail] [center] [right rail]
```

with:

```text
center = 672px
left rail ≤ 288px
right rail ≤ 288px
```

At `xl` and above, `PageLayout` renders the three-column layout.

Below `xl`, the rails are hidden from the page and exposed through feature-labelled drawers.

`PageLayout` is the single authority for:

```text
width
centering
rail geometry
responsive drawer behavior
```

Features publish rail content through:

```ts
useRails(config, deps)
```

and do not implement their own page-level sidebars.

This structural model works well, but ADR 0001 primarily answers:

```text
where rails appear
how wide they are
when they become drawers
how features register them
```

It does not clearly answer:

> What kinds of content belong in each region?

Without a semantic rule, features may continue placing nearly all content in the 672px center column simply because that is the default.

World Countries Memo currently demonstrates this.

Its overview screens vertically stack content such as:

```text
navigation/context
↓
map
↓
primary actions
↓
learning order
↓
mnemonic
↓
supporting information
```

Several of those capabilities are contextual or supporting rather than part of the primary task.

This creates unnecessary vertical scrolling on wide displays while leaving the existing rails unused.

The application therefore needs a semantic ownership model for the three PageLayout regions.

---

# Decision

The existing PageLayout regions receive the following default semantic ownership:

```text
LEFT RAIL
Navigation context + scope + state

CENTER
Active task + focal content

RIGHT RAIL
Supporting material + tools
```

A useful mental model is:

```text
LEFT
Where am I?
Where can I go within this hierarchy?
What scope/state/sequence is active?

CENTER
What am I doing right now?

RIGHT
What can help me do it?
```

These rules define content placement.

They do not change PageLayout geometry.

ADR 0001 remains authoritative for width, centering, breakpoint, and drawer mechanics.

---

# 1. The left rail owns hierarchical context, scope, and state

The left rail should contain information describing the current feature-local context.

Typical responsibilities include:

```text
hierarchical navigation
active scope
progress
completion state
sequence
current position
status
```

Examples:

```text
World Countries:
World → Europe → Southern Europe

Continent selector
Subregion selector

World progress
Continent progress
Subregion learning state

Learning order
Current sequence position
```

The left rail answers:

> Where am I, where can I go within this feature hierarchy, and what is the state of the current scope?

---

# 2. Hierarchical feature navigation belongs in the left rail

Feature-local hierarchical selectors belong in the left rail when they describe movement within the current workspace.

For World Countries:

```text
World overview
    ↓
Continent selection

Continent overview
    ↓
Subregion selection
```

Therefore:

```text
World overview:
left rail → Continents

Continent overview:
left rail → Subregions
```

These selectors are not classified as supporting tools.

They are part of the navigational context of the current scope.

This rule applies specifically to hierarchical navigation inside a feature.

It does not mean that all application navigation moves into the left rail.

For example:

```text
World Countries:
Memo / Drill / Recite

Pi:
Memo / Recite / Maintain
```

may remain in their existing primary navigation/header treatment.

Application-level navigation remains owned by `src/app/`.

---

# 3. The center owns the active task

The 672px center remains the visual and interaction focal point.

Content belongs in the center when it represents what the user is actively doing.

Typical examples include:

```text
map exploration
question answering
learning walkthrough
recall exercise
primary result
substantial form or editor
primary call to action
```

For World Countries Memo:

```text
World map
Continent map
Subregion map

Stage A location recall
Stage B ordered recall

Start learning
Review countries
Practice Stage B
```

The center must not become a generic container for all information related to the current screen.

---

# 4. The right rail owns supporting material and tools

The right rail contains capabilities that help with the active task but do not define the current navigation or workflow state.

Typical examples include:

```text
mnemonics
reference material
supporting tools
optional helpers
secondary actions
```

For World Countries Memo, suitable right-rail content includes:

```text
mnemonic story
mnemonic image
mnemonic stale-state warning
reference/help material
```

The right rail answers:

> What supporting material can help me perform the current task?

---

# 5. Rails are contextual to the current view

Rails are not permanent application sidebars.

Each feature view decides which rails are appropriate for its current state.

Conceptually:

```text
World overview
    ↓
World rails

Continent overview
    ↓
Continent rails

Subregion overview
    ↓
Subregion rails

Stage A
    ↓
Stage A rails

Stage B
    ↓
Stage B rails
```

A view may publish:

```text
no rails
left only
right only
both rails
```

Changing workflow phase may add, replace, or remove rail content.

That is expected behavior.

---

# 6. Feature code owns rail visibility

Workflow knowledge remains inside the feature.

`PageLayout` must not gain awareness of concepts such as:

```text
recall
quiz
study
spoiler safety
learning phase
```

The feature decides what rail content is safe for the current phase and publishes that content through `useRails`.

The existing Pi Memo and Pi Recite implementations are the canonical architectural pattern:

```text
feature workflow state
        ↓
feature-owned rail composition
        ↓
useRails(...)
        ↓
PageLayout
```

Pi already suppresses rail content during recall/quiz phases by publishing no rail content for those phases.

World Countries should follow the same pattern where applicable.

Do not introduce:

```text
PageLayout focusMode
PageLayout recallMode
phase metadata on generic rail items
PageLayout filtering based on workflow state
```

`PageLayout` remains workflow-ignorant.

---

# 7. Recall phases must not expose answer-revealing rails

A learning or recall phase must not retain contextual or supporting material that reveals the required answer.

For example, during World Countries ordered recall, the following must not remain visible:

```text
ordered country list
country-sequence mnemonic
answer-revealing reference material
```

The feature publishing the rails is responsible for omitting those capabilities for the relevant phase.

This requirement is enforced by feature composition, not by PageLayout.

---

# 8. World Countries Memo — World overview

Preferred layout:

```text
LEFT                 CENTER                 RIGHT

Continents            World map              optional supporting
World progress                               capability if useful

Africa
Asia
Europe
North America
South America
Oceania
```

The map remains the focal content.

The existing Continent selector should move from the vertical center flow into the left rail.

The World progress summary may also live in the left rail because it describes the state of the current scope.

Do not add right-rail content merely to fill the space.

An empty right rail is valid.

---

# 9. World Countries Memo — Continent overview

Preferred layout:

```text
LEFT                 CENTER                 RIGHT

Subregions            Continent map          optional supporting
Continent progress                           capability if useful

Northern Europe
Western Europe
Central Europe
Eastern Europe
Southern Europe
...
```

The existing Subregion selector should move from below the map into the left rail.

The Continent map remains centered.

---

# 10. World Countries Memo — Subregion overview

Preferred layout:

```text
LEFT                 CENTER                 RIGHT

Learning status       Subregion heading      Memory aid
Learning order        Subregion map          story
                      Countries actions      image

1. Portugal
2. Spain
3. Italy
4. Greece
...

[Edit order]
```

The learning-order sequence belongs in the left rail because it is contextual Subregion state.

The mnemonic belongs in the right rail because it is supporting learning material.

The map and primary learning actions remain in the center.

---

# 11. Learning-order editor does not render inside the rail

The compact learning-order sequence belongs in the left rail.

The full sortable editor does not.

The left rail should show:

```text
Learning order

1. Portugal
2. Spain
3. Italy
4. Greece

[Edit order]
```

Selecting:

```text
Edit order
```

opens the existing sortable editing experience in a larger workspace.

The larger workspace may be:

```text
overlay
dialog
modal
center-focused editing view
```

The ADR does not require one exact presentation mechanism.

The architectural rule is:

> The rail owns the learning-order capability and exposes its state and entry point, but the full drag-and-drop interaction is not constrained to 288px.

The existing persistence behavior remains unchanged:

```text
open editor
↓
modify local draft
↓
Save order
↓
persist CountryId sequence
```

Closing without saving continues to discard the draft.

---

# 12. Rails may launch larger interactions

A capability does not have to perform all of its interaction inside the rail.

A rail may contain:

```text
current state
compact preview
summary
entry action
```

and launch a larger temporary interaction when required.

Examples:

```text
LEFT RAIL
Learning order
[Edit order]
       ↓
larger sortable editor
```

or:

```text
RIGHT RAIL
Mnemonic preview
[Edit]
   ↓
larger mnemonic editor if needed
```

This does not change semantic ownership.

The capability still belongs to its rail when shown as context/supporting material.

Its editor temporarily becomes the active task.

---

# 13. Objective escape conditions for leaving a rail

Content that semantically belongs in a rail should remain there unless a concrete constraint justifies a larger workspace.

Valid reasons include:

### Width constraint

The interaction would become non-functional or significantly harder within the approximately 288px rail width.

Examples:

```text
drag-and-drop sorting
large form editing
detailed comparison
multi-column interaction
```

### Active-task transition

The user explicitly begins editing or manipulating the capability and that operation now becomes the active task.

Example:

```text
Learning order
    ↓
Edit order
    ↓
sortable editor becomes active task
```

### Answer leakage

Keeping the rail visible would expose information the current recall/learning task requires hidden.

These are preferred over subjective justifications such as:

```text
this content feels important
this would look clearer in the center
```

Importance alone is not sufficient reason to break the rail ownership model.

---

# 14. Drawer labels are part of feature UX

Below `xl`, rail content is exposed through PageLayout drawers.

Therefore each product-facing rail must provide a meaningful:

```ts
leftLabel
rightLabel
```

through `useRails`.

Features should not normally rely on PageLayout's generic fallback labels:

```text
Stats
Tools
```

for user-facing rail capabilities.

Initial World Countries Memo labels should be:

```text
World overview:
leftLabel = "Continents"

Continent overview:
leftLabel = "Subregions"

Subregion overview:
leftLabel = "Learning context"
rightLabel = "Memory aid"
```

If a rail is not registered for the current view, no drawer button is shown.

Labels should describe the actual current capability rather than merely saying:

```text
Left
Right
Navigation
Tools
```

---

# 15. Dedicated feature rail composition is preferred

Rail composition should not be scattered across unrelated leaf components.

Prefer a feature-owned rail composition layer that derives content from the current view/workflow state.

The existing Pi pattern is the reference architecture:

```text
Pi workflow state
        ↓
Pi feature rail hook
        ↓
useRails(...)
```

World Countries may introduce equivalent feature-local hooks/components where that improves ownership clarity.

Possible structure:

```text
world-countries/
  memo/
    WorldCountriesMemoRails.tsx
```

or more specific feature-local composition such as:

```text
memo/
  subregion/
    useSubregionMemoRails.tsx
```

The exact file structure is an implementation detail.

The invariant is:

> Feature workflow state determines feature rail composition, which is then published through the existing PageLayout integration seam.

Do not create a generic cross-feature rail orchestration framework solely because Pi and World Countries both use rails.

---

# 16. Interactive rail content is allowed

Rails are not read-only.

They may contain controls when those controls semantically belong to the rail.

Examples:

```text
select a Continent
select a Subregion
open learning-order editor
open mnemonic editor
```

However, the rail should normally host compact interaction.

Complex editing may transition to a larger workspace under the rules above.

---

# 17. Rail width remains unchanged

This ADR does not change ADR 0001 geometry.

Keep:

```text
center:
42rem / 672px

left rail:
minmax(0, 18rem)

right rail:
minmax(0, 18rem)

breakpoint:
xl
```

Do not:

```text
widen the center
create a World-Countries-specific page width
introduce asymmetric rails
increase rail width to fit the sortable editor
```

First use the existing layout according to the semantic model.

A future geometry change requires a separate decision.

---

# 18. Responsive behavior remains owned by PageLayout

Below `xl`:

```text
left rail
right rail
```

continue to become drawers through PageLayout.

Features publish the same capabilities.

They do not implement separate feature-specific mobile sidebars.

Conceptually:

```text
desktop

[Continents] [World map]


mobile

[World map]

[Continents]
     ↓
drawer
```

The capability remains the same even though its presentation changes.

---

# 19. Features publish capabilities; PageLayout owns placement

Feature code decides:

```text
what context exists
what supporting material exists
whether it is safe in the current phase
what drawer label describes it
```

PageLayout decides:

```text
rail width
rail positioning
center positioning
breakpoint behavior
drawer mechanics
```

Correct:

```text
World Countries
      ↓
useRails(...)
      ↓
PageLayout
```

Incorrect:

```text
World Countries
      ↓
custom page grid
custom left sidebar
custom right sidebar
```

---

# 20. Do not duplicate moved content

When a capability moves into a rail, the equivalent complete center card should normally be removed.

For example:

```text
Learning order → left rail
```

means the existing complete Learning Order card should no longer remain underneath the map.

Likewise:

```text
Mnemonic → right rail
```

means the same full mnemonic card should not also remain in the center flow.

Small summaries or primary actions may remain where they materially help the active task.

Avoid duplicate complete interfaces.

---

# 21. Rail content should be compact

Rail presentation should assume approximately 288px width.

Prefer:

```text
vertical lists
compact status
short labels
small buttons
stacked controls
constrained images
```

Avoid embedding layouts originally designed around the full 672px center without adapting their presentation.

Presentation may differ while domain state and feature behavior remain shared.

---

# 22. App/feature ownership remains unchanged

This ADR does not move application navigation into features or feature navigation into `src/app/`.

Existing ownership remains:

```text
src/app/
    application composition
    mode registry
    PageLayout
    overlays
    global navigation

src/features/
    domain workflows
    feature-local navigation
    feature rail composition
```

World Countries hierarchy such as:

```text
World
→ Continent
→ Subregion
```

remains feature-local navigation.

Publishing that navigation into the left rail does not transfer its ownership to `src/app/`.

`useRails` remains an existing approved feature-to-app integration seam.

This ADR introduces no new dependency edge.

---

# Alternatives considered

## Keep all World Countries content vertically stacked

Rejected.

This underuses wide displays and creates unnecessary scrolling.

---

## Put Continent/Subregion navigation in the right rail

Rejected.

Hierarchical selectors describe the current feature context and where the user can move within that hierarchy.

They belong more naturally with scope and state in the left rail.

---

## Add `focusMode` to PageLayout

Rejected.

PageLayout must not know whether a feature is recalling, quizzing, studying, or editing.

Feature code already owns workflow phase and can publish the appropriate rails.

---

## Add workflow-safety metadata to generic rail items

Rejected.

This adds unnecessary abstraction and moves workflow knowledge toward PageLayout.

The feature already knows whether a capability is safe in the current phase.

---

## Render the sortable learning-order editor directly inside the left rail

Rejected as the intended design.

The ordered sequence fits naturally in 288px.

The full drag-and-drop editing interaction benefits from a larger workspace.

---

## Widen the rails

Rejected.

The current geometry has not yet been meaningfully exercised by World Countries.

Semantic distribution should be implemented first.

---

## Widen the center

Rejected.

The fixed 672px center is a deliberate invariant from ADR 0001 and must not become content-driven again.

---

# Consequences

## Positive

Wide displays are used more effectively.

World Countries overview pages become substantially shorter.

Hierarchical navigation remains visible beside maps on desktop.

Scope state and learning order can remain visible without consuming center-column height.

Mnemonic material gains a predictable supporting location.

Recall views can deliberately remove answer-revealing material.

The PageLayout implementation remains generic and workflow-agnostic.

Features gain clear guidance for how to use the existing rail seam.

Mobile drawer labels become intentional instead of relying on generic defaults.

## Negative

Some existing center-oriented components need compact rail presentations.

World Countries gains rail-composition orchestration.

Some operations, such as learning-order editing, require an overlay or other larger temporary workspace.

Feature developers must deliberately decide which rails are appropriate in each workflow phase.

---

# Current-state documentation updates

When accepted and implemented, update:

```text
docs/architecture/SYSTEM.md
```

to describe the resolved PageLayout semantic model:

```text
Left rail:
feature-local navigation context, scope, state, progress, sequence

Center:
active task and focal content

Right rail:
supporting material and tools

Features own current rail composition.
PageLayout owns geometry and responsive presentation.
```

Also state that:

```text
feature workflow state
    ↓
feature rail composition
    ↓
useRails
    ↓
PageLayout
```

is the standard rail-publication model.

Do not make PageLayout workflow-aware.

Update:

```text
docs/architecture/features/WORLD_COUNTRIES.md
```

to describe the resolved Memo rail responsibilities:

```text
World:
Continents + progress → left rail

Continent:
Subregions + progress → left rail

Subregion:
learning context/order → left rail
mnemonic → right rail

recall:
answer-revealing rail content omitted
```

Detailed visual spacing and individual Tailwind classes do not belong in architecture documentation.

---

# Implementation guidance

Implement this first in World Countries Memo.

## World overview

Move the current:

```text
Continents
World progress
```

capabilities into the left rail.

Keep:

```text
World map
```

as the primary center content.

Remove redundant full center-column versions after the rail presentation is in place.

Use:

```text
leftLabel = "Continents"
```

---

## Continent overview

Move:

```text
Subregions
Continent progress
```

into the left rail.

Keep:

```text
Continent map
```

in the center.

Use:

```text
leftLabel = "Subregions"
```

---

## Subregion overview

Move compact:

```text
learning status
learning order
Edit order action
```

into the left rail.

Use:

```text
leftLabel = "Learning context"
```

Move mnemonic presentation into the right rail.

Use:

```text
rightLabel = "Memory aid"
```

Keep:

```text
Subregion map
Countries actions
```

in the center.

---

## Learning-order editing

Do not render the sortable editor inline in the 288px rail.

The left rail displays the current order and an:

```text
Edit order
```

action.

That action opens the existing sortable editor in an overlay/dialog or equivalent larger workspace.

Reuse existing:

```text
SubregionOrderEditor
setSubregionCountryOrder
resetSubregionCountryOrder
```

behavior.

Do not duplicate order state or persistence.

---

## Recall phases

Stage A and Stage B must publish only rail content that is safe for that phase.

In particular, Stage B must not expose:

```text
learning order
sequence mnemonic
other answer-revealing material
```

Prefer following the existing Pi feature pattern of phase-owned rail composition.

Do not add new PageLayout APIs for recall handling.

---

# Validation

Verify desktop behavior at `xl+`.

## Layout

* center remains exactly 672px;
* center remains viewport-centered;
* adding/removing either rail does not shift the center;
* existing 288px rail geometry remains unchanged.

## World overview

* Continent navigation appears in the left rail;
* drawer label is `Continents`;
* the World map remains centered;
* redundant vertically stacked Continent selector is removed.

## Continent overview

* Subregion navigation appears in the left rail;
* drawer label is `Subregions`;
* the Continent map remains centered;
* redundant vertically stacked Subregion selector is removed.

## Subregion overview

* learning state/order appears in the left rail;
* drawer label is `Learning context`;
* mnemonic appears in the right rail;
* drawer label is `Memory aid`;
* map and Countries actions remain centered;
* duplicate center versions are removed.

## Learning-order editing

* `Edit order` opens a larger editing workspace;
* sortable drag-and-drop remains fully usable;
* keyboard sorting remains usable;
* save persists the current CountryId order;
* cancel/close preserves the previously persisted order;
* reset canonical order remains functional.

## Recall

* answer-revealing order content is absent during Stage B;
* mnemonic content that exposes the sequence is absent during Stage B;
* rail clearing is driven by World Countries feature composition;
* PageLayout remains unchanged and workflow-agnostic.

## Responsive

Below `xl`:

* center remains the primary visible content;
* registered rails become existing PageLayout drawers;
* drawer labels accurately describe their capabilities;
* no essential feature capability becomes inaccessible.

Run:

```text
npx vitest run src/features/world-countries
npx tsc -b
npx vite build
```

Report:

1. files changed;
2. rail composition introduced;
3. content moved from center to rails;
4. learning-order editor presentation;
5. recall-phase rail behavior;
6. tests added or updated;
7. validation results.
