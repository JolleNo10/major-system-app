# Change Spec 0034 - Simplify active Country sessions and encode answer type in the map cue

- **Status:** Draft
- **Date:** 2026-08-24
- **Issue:** None.
- **Related ADRs:** `docs/adr/0028-page-layout-expanded-center-presentation.md`
- **Related changes:** Change Spec 0033 expanded map/camera corrections
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`
- **Visual reference:** `0034-world-countries-session-visual-reference.html`
- **Repository / feature scope:** `JolleNo10/major-system-app` — World Countries / Countries only

## Problem

The active World Countries session UI currently repeats the same task information in several places:

- `ANSWER · COUNTRY` / `ANSWER · CAPITAL`;
- `LOCATION → COUNTRY`, `COUNTRY → CAPITAL`, etc.;
- a question sentence such as `Which country is this?`;
- explanatory helper copy;
- the task direction again in the bottom answer dock;
- the current skill again in the right Session rail.

The result is visually noisy and makes the map less dominant even though the map is the primary memory peg.

The explicit `ANSWER · COUNTRY` / `ANSWER · CAPITAL` badge is the weakest part. It consumes attention while adding information already communicated by the task direction and input placeholder.

There is also an unresolved task-orientation problem in **Countries + Capitals**: the same Country remains highlighted when the session transitions from identifying the Country to recalling its Capital. Today the map highlight uses the same cyan task highlight, so the visual cue does not communicate that the expected answer has changed.

## Goal

Redesign the active World Countries task/session presentation around a clear information hierarchy:

1. **Session context** — geography, mode, progress, session actions.
2. **Current task** — the recall direction and the cue.
3. **Primary memory peg** — the map.
4. **Answer interaction** — one compact bottom answer area.

Remove the explicit answer-kind badge.

Use the map itself as an additional, redundant task-orientation cue:

- **Country-answer task highlight:** cyan/blue.
- **Capital-answer task highlight:** violet/purple.

The color distinction is supplemental. Textual direction and the accessible input label remain authoritative so color is never the only way to understand the task.

## Visual contract

The companion HTML file is the primary implementation reference for hierarchy and composition:

`0034-world-countries-session-visual-reference.html`

It contains:

- standard/normal desktop view;
- expanded/fullscreen view;
- switches for all four recall skills;
- the cyan versus violet task-highlight behavior.

The HTML is a **design reference, not a new runtime implementation**. Reuse existing React/PageLayout/MapSurface components rather than copying the prototype wholesale.

Exact pixels are not normative. Relative hierarchy, information placement, repetition removal, and semantic colors are normative.

---

# 1. Information model

## Session information

Session-level information changes slowly and must not be repeated around the current question.

Examples:

- selected geography;
- Drill mode (`Countries + Capitals`, etc.);
- Country position / session progress;
- Exit;
- mnemonic action where currently supported.

### Standard view

Keep session information in the existing rails:

- **left rail:** selected geography;
- **right rail:** mode, progress, session actions.

Do not repeat geography/mode/progress in the center task area.

### Expanded view

Rails are hidden, so promote only the essential session information into a compact top-right session summary beside the task prompt.

Expanded session summary contains:

- geography + Drill mode as compact secondary text;
- `Country X / N`;
- progress bar;
- current expanded-safe session action(s), preserving existing behavior.

Do not recreate the full rails in expanded mode.

## Current-task information

The center task area contains only:

- one small direction label;
- one strong cue/question.

No explicit `ANSWER · ...` badge.
No explanatory helper paragraph during an active task.

## Answer interaction

The answer area contains only what is needed to answer:

- input / choices / map-click instruction;
- primary action;
- optional keyboard hint;
- feedback owned by the existing feedback system.

Do not repeat `DRILL · LOCATION → COUNTRY` or equivalent inside the typed answer dock.

---

# 2. Task copy for all four recall skills

Use task direction as orientation metadata and make the main line the actual cue.

| Skill | Direction label | Main cue | Typed placeholder | Map task tone |
| --- | --- | --- | --- | --- |
| `location-to-country` | `Location → Country` | `Name the highlighted country` | `Type the country…` | Country-answer cyan |
| `country-to-capital` | `Country → Capital` | `{Country}` — e.g. `Micronesia` | `Type the capital…` | Capital-answer violet |
| `capital-to-country` | `Capital → Country` | `{Capital}` — e.g. `Palikir` | `Type the country…` | Country-answer cyan when a task/result highlight is visible |
| `shape-to-country` | `Shape → Country` | `Name this country` | `Type the country…` | Neutral before answer if current behavior is neutral; Country-answer cyan when highlighted/revealed |

The main cue deliberately does **not** repeat a complete sentence when the direction already supplies the transformation.

For example:

```text
COUNTRY → CAPITAL
Micronesia

[ Type the capital… ]
```

not:

```text
ANSWER · CAPITAL
COUNTRY → CAPITAL
Micronesia
What is the capital?
```

For Location → Country:

```text
LOCATION → COUNTRY
Name the highlighted country
```

not:

```text
ANSWER · COUNTRY
LOCATION → COUNTRY
Which country is this?
The highlighted location remains the same Country used for any following Capital question.
```

The Countries + Capitals sequence is understandable through continuity:

1. Location → Country: target Country is cyan.
2. Country → Capital: same Country remains the memory peg but changes to violet.
3. prompt direction and input placeholder also change.

The color transition is the visual phase cue that the previous answer-kind badge attempted to provide.

---

# 3. Standard / normal desktop composition

Preserve the existing app header and Today / Drill / Recite navigation.

At desktop rail widths, use:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ app header / activity navigation                                           │
├───────────────┬──────────────────────────────────────────┬─────────────────┤
│ LEFT RAIL     │ TASK PROMPT                              │ RIGHT RAIL      │
│ geography     │ Location → Country                       │ Session         │
│               │ Name the highlighted country             │ mode            │
│               ├──────────────────────────────────────────┤ progress        │
│               │                                          │ actions         │
│               │                   MAP                    │                 │
│               │                                          │                 │
│               ├──────────────────────────────────────────┤                 │
│               │             ANSWER DOCK                  │                 │
│               │ [ Type the country…          ][ Check ] │                 │
└───────────────┴──────────────────────────────────────────┴─────────────────┘
```

## Left rail

Keep selected geography.

Simplify headings where possible:

```text
SELECTED GEOGRAPHY
Oceania

SUBREGIONS
Micronesia
Melanesia
Polynesia
```

Avoid redundant `Drill context` wording if the screen already establishes that this is an active Drill.

Proficiency-filtered sessions keep their equivalent current scope information.

## Right rail

Keep:

- `DRILL` / `Session`;
- Drill mode label;
- progress;
- `Country X / N`;
- Exit;
- mnemonic controls.

Remove the current skill/direction from the right rail because the task prompt already owns it.

Current duplication to remove:

```tsx
<p className="mt-1 text-xs text-zinc-500">
  {step ? getDrillSkillLabel(step.skill) : 'Complete'}
</p>
```

The rail should describe **the session**, not restate the active question.

## Center prompt

Use one compact prompt card above the map.

Illustrative JSX:

```tsx
function DrillTaskPrompt({
  direction,
  cue,
}: {
  direction: string
  cue: string
}) {
  return (
    <section
      data-world-countries-task-prompt
      className="rounded-xl border border-zinc-800 bg-zinc-950/55 px-4 py-3"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-400">
        {direction}
      </p>
      <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-100">
        {cue}
      </h1>
    </section>
  )
}
```

This example is structural. Reuse existing feature styles rather than introducing a separate design system.

Do not render `WorldCountriesAnswerKindCue` in the active task prompt.

Do not render helper copy below the question.

## Center map

Map remains the largest visual element.

Do not alter the 0033 viewport-aware camera fit contract.

## Bottom answer

Keep typed answer below the map.

The dock should no longer repeat task identity:

```tsx
<TaskDock variant="form">
  <WorldCountriesTypedInput ... />
</TaskDock>
```

rather than:

```tsx
<TaskDock
  variant="form"
  status={<div>DRILL · LOCATION → COUNTRY</div>}
>
  ...
</TaskDock>
```

The visible input placeholder supplies the final response-type guardrail:

- `Type the country…`
- `Type the capital…`

The existing accessible `answerLabel` remains.

---

# 4. Expanded / fullscreen composition

Expanded mode removes the rails and uses the horizontal space instead of stacking extra task labels.

Use:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ TASK PROMPT                                      SESSION SUMMARY           │
│ Country → Capital                               Oceania · Countries+Caps │
│ Micronesia                                      Country 2 / 12  ━━━━━    │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│                                  MAP                                      │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│                        compact bottom answer dock                         │
│                 [ Type the capital…          ][ Check ]                  │
└───────────────────────────────────────────────────────────────────────────┘
```

## Expanded prompt region

Use a two-column top composition:

- prompt card: flexible / dominant;
- session summary: compact / secondary.

Illustrative structure:

```tsx
const expandedContext = (
  <div
    data-drill-expanded-task-header
    className="grid grid-cols-[minmax(0,1fr)_16rem] gap-3"
  >
    <DrillTaskPrompt
      direction={task.direction}
      cue={task.cue}
    />

    <DrillExpandedSessionSummary
      geography={selection.continent}
      mode={getDrillModeDefinition(state.mode).label}
      progress={deriveDrillSessionProgress(state)}
      onExit={onExit}
    />
  </div>
)
```

The exact width may adapt, but the session summary must remain visually secondary.

Do not use an `ANSWER · ...` badge.

Do not show helper text.

## Expanded progress

This change supersedes the first 0033 Drill-specific placement of progress beside the bottom answer dock.

For Drill, progress moves into the compact **top session summary**.

The generic `MapSurface.expandedCompanion` seam may remain if it is useful to other callers, but Drill should no longer use it for the session-progress panel.

This leaves the bottom answer dock visually clean and consistent between standard and expanded views.

## Expanded bottom answer

Keep the answer interaction centered and bounded.

Do not make it viewport-wide.

Typed example:

```text
                  ┌─────────────────────────────────────────┐
                  │ [ Type the capital…        ][ Check ]   │
                  └─────────────────────────────────────────┘
```

The same interaction model applies to:

- multiple choice: choices occupy the bottom task zone;
- map-click: compact instruction/action area stays below map;
- feedback: existing map-relative overlay remains.

---

# 5. Remove the explicit answer-kind badge

The active task should stop rendering:

```tsx
<WorldCountriesAnswerKindCue answerKind={answerKind} />
```

The feature currently documents the badge as an architecture/current-state rule. Update `docs/architecture/features/WORLD_COUNTRIES.md` to remove this obsolete requirement.

Do not delete `WorldCountriesAnswerKindCue.tsx` blindly. Search all references first.

- If unused after this change, remove it and its tests.
- If another workflow still intentionally uses it, leave the component but active Drill/Practice task presentation must not use it.

The function that derives answer kind may still be useful for semantic map tone. Prefer a neutral semantic helper rather than retaining a UI component solely for that derivation.

---

# 6. Semantic map highlight color

## Intent

The map highlight shown for the active/revealed Country must communicate the **expected answer domain**, not correctness.

### Country answer

Use the established cyan/blue task highlight.

Current default is:

```ts
highlightFill: '#0891b2'
```

Keep this as the Country-answer task tone unless visual verification identifies a contrast issue.

### Capital answer

Use a clearly distinct violet/purple map fill.

Recommended starting value:

```ts
'#8b5cf6' // violet-500 family
```

The final value may be adjusted slightly during browser verification, but it must be unmistakably distinct from cyan while maintaining similar visual weight on the dark map.

## Semantic API

Do not scatter raw task-color hex values through `DrillSession`.

Add a semantic task-highlight contract near the reusable learning-map presentation.

Illustrative API:

```ts
export type CountryLearningTaskHighlightTone =
  | 'country-answer'
  | 'capital-answer'

const TASK_HIGHLIGHT_FILL: Record<CountryLearningTaskHighlightTone, string> = {
  'country-answer': '#0891b2',
  'capital-answer': '#8b5cf6',
}
```

Then:

```tsx
export interface CountryLearningMapProps {
  // ...
  taskHighlightTone?: CountryLearningTaskHighlightTone
}
```

and apply it to the map controller settings:

```tsx
const taskHighlightFill = taskHighlightTone
  ? TASK_HIGHLIGHT_FILL[taskHighlightTone]
  : undefined

<SvgMapView
  // ...
  settings={{
    showHighlightedNames,
    hoverHighlight: hoveredCountryId !== null,
    hoverShowName: showHoverNames,
    hoverFill: '#0f766e',
    hoverStroke: '#d4d4d8',
    hoverStrokeWidth: '2px',
    ...(taskHighlightFill ? { highlightFill: taskHighlightFill } : {}),
  }}
/>
```

This is illustrative; choose the smallest type/API that fits the existing architecture.

## Drill derivation

Derive the tone from the recall skill / expected answer type:

```ts
function getTaskHighlightTone(
  skill: WorldCountriesRecallSkill,
): CountryLearningTaskHighlightTone {
  return skill === 'country-to-capital'
    ? 'capital-answer'
    : 'country-answer'
}
```

or derive through a shared task-presentation model:

```ts
interface DrillTaskPresentation {
  direction: string
  cue: string
  placeholder: string
  answerKind: 'country' | 'capital'
  highlightTone: CountryLearningTaskHighlightTone
}
```

Preferred example:

```ts
function getDrillTaskPresentation(
  skill: WorldCountriesRecallSkill,
  country: Country,
): DrillTaskPresentation {
  switch (skill) {
    case 'location-to-country':
      return {
        direction: 'Location → Country',
        cue: 'Name the highlighted country',
        placeholder: 'Type the country…',
        answerKind: 'country',
        highlightTone: 'country-answer',
      }

    case 'country-to-capital':
      return {
        direction: 'Country → Capital',
        cue: country.country,
        placeholder: 'Type the capital…',
        answerKind: 'capital',
        highlightTone: 'capital-answer',
      }

    case 'capital-to-country':
      return {
        direction: 'Capital → Country',
        cue: country.capital,
        placeholder: 'Type the country…',
        answerKind: 'country',
        highlightTone: 'country-answer',
      }

    case 'shape-to-country':
      return {
        direction: 'Shape → Country',
        cue: 'Name this country',
        placeholder: 'Type the country…',
        answerKind: 'country',
        highlightTone: 'country-answer',
      }
  }
}
```

This centralizes task copy and visual semantics so normal view, expanded view, typed mode, and multiple-choice mode do not drift.

## Important distinction

This tone applies to **active task Country highlighting**.

It must not change:

- proficiency/status colors;
- result-map colors;
- correctness feedback green/red;
- generic hover color;
- muted Country color;
- authored geography;
- map-click candidate semantics.

Color is task orientation, not learning status.

## Countries + Capitals transition

Manual verification must specifically cover:

```text
Location → Country
same Country = cyan task highlight

then

Country → Capital
same Country = violet task highlight
```

The transition should be visually obvious without an `ANSWER · CAPITAL` badge.

---

# 7. Shared task-presentation model

The current `DrillSession.tsx` has several booleans and nested conditional JSX blocks for prompt copy.

This change is a good point to centralize only the presentation derivation, without changing Drill behavior.

Recommended extraction:

```text
src/features/world-countries/drill/drillTaskPresentation.ts
```

Example responsibilities:

```ts
export interface DrillTaskPresentation {
  direction: string
  cue: string
  typedPlaceholder: string
  typedAnswerLabel: string
  answerKind: 'country' | 'capital'
  highlightTone: 'country-answer' | 'capital-answer'
}

export function deriveDrillTaskPresentation(
  skill: WorldCountriesRecallSkill,
  country: Country,
): DrillTaskPresentation
```

Do not move:

- scoring;
- matching;
- feedback timing;
- map visibility;
- zoom;
- answer selection;
- session scheduling

into this helper.

It is a pure view-model helper.

---

# 8. Practice and answer interaction modes

`DrillSession` is also used with `activity="practice"`.

Use the same task-presentation derivation for both Drill and Practice so the current question looks the same for the same skill.

Workflow-owned rails/session summary may differ.

## Typed

Use the compact bottom form dock.

## Multiple choice

Keep choices in the bottom task area. Do not reintroduce answer-kind badges above the map or inside the choices.

## Map click

Keep the map as the answer surface. Bottom instruction may remain compact:

```text
Click the country on the map.
```

Do not duplicate `Location → Country` in the instruction if it is already in the prompt.

---

# 9. Accessibility

The redesign must not depend on color.

Required redundant cues:

- direction text (`Country → Capital`);
- accessible typed answer label;
- typed placeholder;
- existing ARIA map labels.

For Capital-answer violet highlights, accessible descriptions remain based on task meaning, not color names.

Do not announce “purple” or “cyan” as required instructions.

---

# 10. Architecture constraints

- Keep the existing `PageLayout` / `useRails` ownership.
- Keep the existing `expanded-center` mechanism from ADR 0028.
- Keep the 0033 semantic zoom/viewBox fit behavior.
- `MapSurface` remains generic and must not learn Country/Capital semantics.
- `DrillSession` owns active Drill task semantics.
- `CountryLearningMap` may accept a semantic highlight tone and translate it to generic `SvgMapView` settings.
- `SvgMapController` remains generic and should continue to receive a concrete `highlightFill`; it does not need to know `country-answer` or `capital-answer`.
- Do not encode task color through proficiency/status maps.
- Do not create a second map instance.
- Do not remount the SVG when the task tone changes.
- Do not introduce a new ADR unless implementation discovers a durable architecture decision beyond these existing ownership boundaries.

---

# 11. Existing code anchors

Current implementation details verified before writing this spec:

### `DrillSession.tsx`

Currently:

- imports and renders `WorldCountriesAnswerKindCue`;
- builds separate standard and expanded context;
- repeats direction in the `TaskDock` status;
- derives `highlightedCountryId` based on skill/feedback;
- already passes `expandedContext` to `MapSurface`.

Use those seams rather than creating another fullscreen/task presentation path.

### `DrillSessionRails.tsx`

Currently the right rail shows both:

- Drill mode;
- active `getDrillSkillLabel(step.skill)`.

Remove the active skill from the rail after the center task prompt becomes authoritative.

### `CountryLearningMap.tsx`

Currently sets:

```tsx
settings={{
  showHighlightedNames,
  hoverHighlight: hoveredCountryId !== null,
  hoverShowName: showHoverNames,
  hoverFill: '#0f766e',
  hoverStroke: '#d4d4d8',
  hoverStrokeWidth: '2px',
}}
```

It does not currently expose task-specific `highlightFill`.

This is the intended seam for adding a semantic task-highlight tone before passing generic settings to `SvgMapView`.

### `SvgMapController.ts`

Current default:

```ts
highlightFill: '#0891b2'
```

Keep controller semantics generic.

### `WORLD_COUNTRIES.md`

Current architecture documentation explicitly says active Country/Capital contexts use the answer-kind badge.

That documentation must be changed as part of implementation.

---

# 12. Tests

## Pure task presentation

Add focused tests for all four skills:

```ts
location-to-country
  direction = Location → Country
  cue = Name the highlighted country
  answer kind = country
  highlight tone = country-answer

country-to-capital
  direction = Country → Capital
  cue = country.country
  answer kind = capital
  highlight tone = capital-answer

capital-to-country
  direction = Capital → Country
  cue = country.capital
  answer kind = country
  highlight tone = country-answer

shape-to-country
  direction = Shape → Country
  cue = Name this country
  answer kind = country
  highlight tone = country-answer
```

## DrillSession

Protect:

- no `ANSWER · COUNTRY` / `ANSWER · CAPITAL` badge in active task context;
- no old explanatory helper sentence;
- standard context renders one direction + one cue;
- expanded context renders prompt + compact session summary;
- typed dock does not repeat `DRILL · <direction>`;
- existing typed state survives expand/collapse;
- multiple-choice/map-click still render usable interaction;
- Countries + Capitals uses capital-answer tone for `country-to-capital`.

## CountryLearningMap

Protect semantic tone translation:

```ts
country-answer -> existing cyan highlight fill
capital-answer -> violet highlight fill
```

Do not assert Tailwind class implementation details if the contract can be tested at props/controller level.

## Rails

Protect:

- mode remains;
- progress remains;
- current skill/direction is no longer duplicated in Session rail.

---

# 13. Acceptance criteria

## Information hierarchy

- [ ] Active task no longer renders `ANSWER · COUNTRY` or `ANSWER · CAPITAL`.
- [ ] Active task has one direction label and one main cue.
- [ ] Old explanatory helper text is removed from active Drill/Practice question presentation.
- [ ] Typed answer dock does not repeat `DRILL · <direction>`.
- [ ] Right Session rail does not repeat the active task direction.
- [ ] Standard view keeps geography in left rail, session state/actions in right rail, current task in center.
- [ ] Center does not duplicate geography/mode/progress already visible in rails.

## Standard layout

- [ ] Prompt is a compact card above the map.
- [ ] Map remains the dominant center element.
- [ ] Typed answer remains centered below map.
- [ ] Existing app header / Today / Drill / Recite navigation remains unchanged.
- [ ] Normal responsive rail/drawer behavior remains intact.

## Expanded layout

- [ ] Rails remain hidden through existing `expanded-center`.
- [ ] Top uses horizontal space: dominant prompt + compact session summary.
- [ ] Expanded session summary shows essential geography/mode/progress without recreating full rails.
- [ ] Drill progress is no longer presented as a separate companion beside the bottom answer form.
- [ ] Bottom answer form is centered and bounded.
- [ ] 0033 viewport-aware map camera fitting continues to work.

## Task color

- [ ] Country-answer active highlights remain cyan/blue.
- [ ] Capital-answer active highlights use clearly distinct violet/purple.
- [ ] In Countries + Capitals, the same Country visibly changes from cyan on `Location → Country` to violet on `Country → Capital`.
- [ ] `capital-to-country` result/reveal highlight uses Country-answer cyan.
- [ ] Shape-to-country does not reveal the answer early merely to apply a color; current pre-answer visibility semantics are preserved.
- [ ] Task colors do not alter proficiency/status/result palettes.
- [ ] Correctness feedback remains separate from task-tone color.

## Modes

- [ ] Location → Country copy and input are correct.
- [ ] Country → Capital copy and input are correct.
- [ ] Capital → Country copy and input are correct.
- [ ] Shape → Country copy and input are correct.
- [ ] Typed, multiple-choice, and map-click interaction modes remain functional.
- [ ] Practice uses the same task-presentation semantics for equivalent skills.

## Documentation

- [ ] `docs/architecture/features/WORLD_COUNTRIES.md` no longer requires the answer-kind badge.
- [ ] Current-state docs describe semantic task highlight colors and the normal/expanded information hierarchy.
- [ ] No new ADR unless a new durable architecture decision is discovered.

---

# 14. Manual browser verification

Automated tests are not sufficient for this visual change.

Verify all four skills in normal and expanded desktop views.

### Countries + Capitals

Run a Country through both steps.

Expected:

```text
Location → Country
Name the highlighted country
map highlight = cyan
input = Type the country…

then

Country → Capital
Micronesia
same Country remains visible
map highlight = violet
input = Type the capital…
```

The transition must be immediately understandable without the removed answer badge.

### Capital → Country

Expected:

```text
Capital → Country
Palikir
Type the country…
```

No target Country is revealed before existing feedback rules allow it.
When Country highlight is shown, it is cyan.

### Shape → Country

Expected:

```text
Shape → Country
Name this country
Type the country…
```

Do not add a pre-answer cyan fill if current isolation behavior intentionally keeps the shape neutral.

### Expanded

Verify:

- prompt/session summary use horizontal space;
- map remains dominant;
- map camera still refits correctly;
- answer dock is compact at bottom;
- no answer-kind badge;
- no repeated direction in bottom dock;
- no progress companion beside the answer form.

---

# 15. Verification commands

Run progressively:

```text
npx vitest run src/features/world-countries/drill
npx vitest run src/features/world-countries/learning
npx vitest run src/features/world-countries/ui
npx vitest run src/features/world-countries
npm run typecheck
git diff --check
```

Then perform the manual browser verification above.
