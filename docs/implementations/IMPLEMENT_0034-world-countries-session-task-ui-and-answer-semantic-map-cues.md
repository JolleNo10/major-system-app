# Implementation Prompt - Change Spec 0034

Implement Change Spec **0034 - Simplify active Country sessions and encode answer type in the map cue** in:

`JolleNo10/major-system-app`

Feature scope is strictly:

`src/features/world-countries/**`

plus existing shared layout files only if the current World Countries seams genuinely require a generic correction.

## Inputs

Use these files together:

1. `0034-world-countries-session-task-ui-and-answer-semantic-map-cues.md`
2. `0034-world-countries-session-visual-reference.html`

The Markdown file is the behavioral/architecture contract.
The HTML file is the visual hierarchy/reference.

Do not reproduce the HTML prototype as a separate runtime page. Implement the design using the existing React architecture.

## First inspect

Read:

- `/CLAUDE.md`
- `/AGENTS.md`
- `/src/features/world-countries/AGENTS.md`
- `/docs/architecture/features/WORLD_COUNTRIES.md`
- ADR 0028
- Change Spec 0033
- Change Spec 0034

Then inspect at minimum:

- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/drill/DrillSession.test.tsx`
- `src/features/world-countries/drill/DrillSessionRails.tsx`
- `src/features/world-countries/drill/PracticeSessionRails.tsx`
- `src/features/world-countries/drill/drillModes.ts`
- `src/features/world-countries/drill/drillSessionProgress.ts`
- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/ui/WorldCountriesAnswerKindCue.tsx`
- `src/features/world-countries/ui/WorldCountriesTypedAnswer.tsx`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/app/index.css`

Search all references to `WorldCountriesAnswerKindCue` before deciding whether the file can be removed.

## Primary implementation goals

### 1. Remove redundant answer-kind badge

Active Drill/Practice task UI must stop rendering:

```text
ANSWER · COUNTRY
ANSWER · CAPITAL
```

Do not replace it with another equivalent badge.

Direction + cue + answer interaction are sufficient.

### 2. Centralize task presentation

Prefer a pure helper such as:

`src/features/world-countries/drill/drillTaskPresentation.ts`

Illustrative shape:

```ts
interface DrillTaskPresentation {
  direction: string
  cue: string
  typedPlaceholder: string
  typedAnswerLabel: string
  answerKind: 'country' | 'capital'
  highlightTone: 'country-answer' | 'capital-answer'
}
```

Derive all four recall skills from one function.

Target copy:

```ts
location-to-country:
  direction = 'Location → Country'
  cue = 'Name the highlighted country'
  placeholder = 'Type the country…'

country-to-capital:
  direction = 'Country → Capital'
  cue = country.country
  placeholder = 'Type the capital…'

capital-to-country:
  direction = 'Capital → Country'
  cue = country.capital
  placeholder = 'Type the country…'

shape-to-country:
  direction = 'Shape → Country'
  cue = 'Name this country'
  placeholder = 'Type the country…'
```

Do not move scoring/matching/scheduling into this helper.

### 3. Simplify normal task center

Normal desktop center:

```text
[ direction ]
[ cue       ]
[           ]
[    MAP    ]
[           ]
[ answer    ]
```

Keep geography in left rail.
Keep session mode/progress/actions in right rail.

Do not duplicate geography/mode/progress in center normal view.

Remove helper paragraphs such as:

```text
The highlighted location remains the same Country used for any following Capital question.
```

Remove the active direction from the right Session rail.

Remove direction/status repetition from the typed answer dock.

### 4. Redesign expanded header using existing `expandedContext`

Do not add a second fullscreen path.

`MapSurface` already supports `expandedContext`.

Expanded top should be a two-column composition:

```text
[ dominant task prompt ][ compact session summary ]
```

Session summary contains essential hidden-rail information:

- geography / mode, compact;
- Country X / N;
- progress bar;
- only session actions that are already safe/appropriate in expanded mode.

Do not recreate full rails.

### 5. Move Drill expanded progress away from bottom form

Change Spec 0033 introduced `expandedCompanion` for Drill progress beside the form.

For the redesigned Drill UI, progress now belongs in the expanded top session summary.

Stop passing Drill progress as `expandedCompanion`.

Do not remove the generic `MapSurface` seam unless repository-wide inspection shows it is truly unused and removing it is safe.

Bottom typed form should again be one compact centered form.

### 6. Use task-semantic map highlight color

This is a required functional visual cue.

Current controller default task highlight is cyan:

```ts
highlightFill: '#0891b2'
```

Use:

```text
country-answer -> cyan / existing highlight
capital-answer -> violet/purple
```

Recommended capital starting fill:

```ts
'#8b5cf6'
```

Do not hard-code these repeatedly in `DrillSession`.

Add a semantic prop/model at the `CountryLearningMap` boundary, for example:

```ts
type CountryLearningTaskHighlightTone =
  | 'country-answer'
  | 'capital-answer'
```

Translate it to generic `SvgMapView` / `SvgMapSettings.highlightFill`.

Keep `SvgMapController` generic.

### 7. Countries + Capitals must visibly transition tone

This is the key manual case.

For the same Country:

```text
Location → Country
map Country = cyan

Country → Capital
map Country = violet
```

No answer badge.

Do not change which Country is highlighted or alter zoom just to achieve the color change.

### 8. Preserve visibility/reveal rules

Do not reveal target Country geometry early.

In particular:

- Capital → Country still keeps target unrevealed until current feedback logic reveals it.
- Shape → Country keeps existing isolated/neutral pre-answer behavior if that is current behavior.
- Tone changes only styling of a Country that is already supposed to be highlighted.

### 9. Keep task tone separate from other color systems

Do not modify:

- proficiency colors;
- mastered/strong status colors;
- result-map colors;
- correctness green/red;
- muted fill;
- hover semantics.

Task highlight tone is question orientation only.

## Concrete JSX guidance

### Prompt

Aim for:

```tsx
const task = deriveDrillTaskPresentation(step.skill, country)

const standardContext = (
  <DrillTaskPrompt
    direction={task.direction}
    cue={task.cue}
  />
)
```

No answer badge.
No helper paragraph.

### Typed dock

Aim for:

```tsx
<TaskDock variant="form">
  <section>
    {typed.input}
  </section>
</TaskDock>
```

not:

```tsx
<TaskDock
  variant="form"
  status={<div>DRILL · {task.direction}</div>}
>
```

### Map

Aim for:

```tsx
<CountryLearningMap
  ...
  taskHighlightTone={task.highlightTone}
/>
```

Do not route a raw hex through every caller.

### Expanded

Illustrative:

```tsx
const expandedContext = (
  <div className="grid grid-cols-[minmax(0,1fr)_16rem] gap-3">
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

The exact component names are not mandated.
The separation of responsibilities is.

## Tests first around semantics

Add/adjust focused tests for:

### presentation helper

All four skills:

- copy;
- placeholder;
- answer kind;
- task highlight tone.

### map tone

Prove:

```text
country-answer => cyan
capital-answer => violet
```

at the `CountryLearningMap` -> map settings boundary.

### Drill UI

Prove:

- no visible `ANSWER · COUNTRY/CAPITAL`;
- no helper paragraph;
- no direction duplication in typed dock;
- right Session rail no longer duplicates active skill;
- expanded uses prompt + session summary;
- Drill no longer supplies bottom progress companion;
- typed input state survives expand/collapse;
- current map highlight/reveal IDs are unchanged by this refactor.

Do not test exact pixel sizes in jsdom.

## Browser visual verification is mandatory

Use `0034-world-countries-session-visual-reference.html` while checking.

### Normal view

Check:

- left rail = geography;
- center = task/map/answer;
- right rail = session;
- no redundant answer badge;
- no helper paragraph;
- map is visually dominant.

### Fullscreen

Check:

- top prompt + session summary use horizontal space;
- map camera from 0033 still refits;
- bottom answer form is compact;
- no progress box beside bottom form;
- no duplicated task labels.

### Color transition

Run Countries + Capitals:

1. Location → Country:
   - Country cue is cyan.
2. Answer and advance.
3. Country → Capital:
   - same Country cue becomes violet.
   - prompt shows Country → Capital + Country name.
   - placeholder says Type the capital.

This must be visually obvious.

## Documentation

Update `docs/architecture/features/WORLD_COUNTRIES.md`.

The current line requiring the feature-local answer-kind badge is now obsolete and must be removed/replaced.

Document instead:

- active task uses direction + cue + answer interaction;
- task map highlights use Country-answer cyan and Capital-answer violet;
- color is supplemental to textual/accessibility cues;
- normal view separates geography/session/task information;
- expanded view promotes essential hidden-rail session information into the compact header.

No new ADR unless a new durable architectural decision is actually introduced.

## Verification

Run:

```text
npx vitest run src/features/world-countries/drill
npx vitest run src/features/world-countries/learning
npx vitest run src/features/world-countries/ui
npx vitest run src/features/world-countries
npm run typecheck
git diff --check
```

Do not mark the Change Spec implemented until browser verification passes.
