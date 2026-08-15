# Change Spec 0012 - Map-centered World Countries Recite

- **Status:** Implemented
- **Date:** 2026-08-15
- **Issue:** None.
- **Related ADRs:** [ADR 0026 - Isolate World Countries Recite outcomes from Drill evidence](../adr/0026-isolate-world-countries-recite-outcomes-from-drill-evidence.md)
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md), [Persistence](../architecture/PERSISTENCE.md)

## Goal

Replace the current World Countries Recite placeholder with a map-centered
ordered-recall activity.

Recite reuses the established World Countries geographic hierarchy, authored
order, map surface, answer matching, and rail layout conventions, while remaining
a sibling workflow with its own modes, session mechanics, durable Recite status,
and results.

Recite answers must not alter Drill proficiency or Learning milestones.

## User-visible behavior

Recite uses the same page composition as map-centered Drill:

```text
LEFT RAIL              CENTER                    RIGHT RAIL
Geography              Geography map             Recite mode
World / Continent      Setup status coloring     Map assistance
Subregion scope        Active Recite session     Start / session controls
```

The map remains the primary visual surface through setup, active Recite, and
completion.

### Geography

Use the existing World Countries hierarchy and effective authored order.

At World level:

- show Continents in effective World order;
- selecting a Continent enters its Continent Recite setup.

At Continent level:

- show Subregions in effective Continent order;
- allow one or more Subregions to be selected;
- provide the existing Entire Continent selection behavior;
- selected Countries are derived from the active World Countries population.

There is no Recite order selector.

Session order is always:

```text
selected Subregions in effective Continent order
  -> each Subregion's Countries in effective Country order
```

Selection click order must not redefine the authored sequence.

World-wide Recite is not added by this change.

Recite opens at the World-level Geography view. A fresh Recite setup selects
`Countries` and `Visible`. While the Recite workflow remains mounted, it may
retain the current setup selection independently for each visited Continent;
these setup preferences are transient and are not persisted.

### Recite modes

The right rail exposes exactly three initial modes:

1. **Countries**
2. **Countries + Capitals**
3. **Countries from Capitals**

All modes traverse the same concrete Country sequence in order.

#### Countries

For the current Country position, prompt:

```text
Next country
```

Do not identify or highlight the expected Country.

The learner types the expected Country name.

After the Country is resolved, show correct feedback and advance to the next
Country position after explicit continuation.

#### Countries + Capitals

Each Country position has two ordered prompts:

```text
1. Next country
2. Capital of <resolved Country>
```

The Country prompt must be resolved before the Capital prompt is shown.

Only after the Capital prompt is resolved and its feedback is explicitly
continued does Recite advance to the next Country position.

The expected Country sequence is never displayed in advance.

#### Countries from Capitals

For the current Country position, show its Capital and ask for the Country:

```text
Oslo
Country: [           ]
```

The Capital is a cue; the underlying traversal still follows effective Country
order.

After the Country is resolved, show correct feedback and advance to the next
position after explicit continuation.

### Typed free recall

Recite uses typed free recall.

Do not convert Recite into multiple choice or recognition mode from the global
answer-mode setting.

Use the existing World Countries recall answer matcher for Country and Capital
names, including the existing normalization/fuzzy-match policy rather than
creating Recite-specific spelling rules.

### Map assistance

The right rail exposes:

```text
Map assistance
○ Visible
○ Reveal as you go
```

Default to `Visible`. The map-assistance selection is transient for this change
and is not persisted; it remains separate from durable Recite progress.

#### Visible

At session start:

- all Countries in the active scope remain geographically visible;
- Country names are hidden;
- the expected/current Country is not highlighted;
- historical Recite status colors are removed;
- future Countries remain neutral.

As Countries are resolved, the map may apply the current-session outcome
treatment to completed Countries.

The visible map acts only as a geographic scaffold; it must not reveal which
Country is next.

#### Reveal as you go

At session start:

- all Countries in the active Recite scope are visually hidden;
- their Country labels are hidden;
- hidden Countries cannot reveal their names on hover;
- hidden Countries are not clickable or otherwise interactive;
- geographic context outside the active scope may remain visible using the
  established context-grey treatment.

When the learner resolves a Country prompt, that Country becomes visible.

For `Countries + Capitals`:

- the Country may become visible after its Country-name prompt is resolved;
- its final current-session outcome treatment is determined only after the
  Capital prompt is also resolved.

If the learner uses Reveal/Skip for the Country prompt, reveal that Country as
part of the answer feedback.

Do not simulate hiding only by assigning the normal map background fill if that
leaves hover, labels, strokes, clicks, or other answer-revealing interaction
active.

### Answer state and retries

Each prompt begins in a clean state.

#### Correct first submission

- resolve the prompt;
- record prompt outcome `recalled`;
- show concise correct feedback;
- require explicit continuation before advancing to the next prompt/position.

#### Incorrect submission

- show concise incorrect feedback;
- keep the same expected prompt active;
- keep the input usable;
- do not advance;
- mark the prompt as having required recovery.

The learner may retry without a fixed retry limit.

If the learner later supplies the correct answer without using Reveal/Skip,
resolve that prompt as `recovered`.

#### Reveal / Skip

Provide an explicit secondary action to reveal the expected answer when the
learner cannot continue.

Using it:

- displays the expected answer;
- resolves that prompt as `revealed`;
- reveals the Country geometry when required by `Reveal as you go`;
- requires an explicit Next/Enter action to continue after the revealed answer
  has been shown.

Do not automatically expose the correct answer after the first incorrect
submission.

### Country outcome for the run

For single-prompt modes:

```text
first-try correct        -> recalled
correct after retry      -> recovered
Reveal/Skip used         -> revealed
```

For `Countries + Capitals`, derive the Country's final run outcome from both
prompts:

```text
both recalled                         -> recalled
no reveal + either/both recovered     -> recovered
either prompt revealed                -> revealed
```

### Keyboard flow

Keep typed Recite efficient with the established World Countries keyboard/QoL
conventions.

- `Enter` submits the active text input.
- After correct feedback, show a separate continue action; `Enter` proceeds to
  the next prompt/position.
- After Reveal/Skip feedback, `Enter` continues to the next prompt.
- Native editable/control behavior retains precedence.
- Ignore modified/repeated shortcuts and suppress feature shortcuts while a
  blocking overlay is open, consistent with existing World Countries patterns.

No keyboard interaction with individual map Countries is required.

### Setup Recite status coloring

Before a session starts, the map shows durable status for the currently selected
Recite mode.

Status is per Country and per Recite mode:

| Recite status | Meaning | Map fill |
| --- | --- | --- |
| Unrecited | No completed Recite outcome for this mode/Country | `#52525b` |
| Revealed | Last completed run containing this Country used Reveal/Skip | `#92400e` |
| Recovered | Last completed run required retry but no Reveal/Skip | `#d97706` |
| Recalled | Last completed run was first-try clean | `#15803d` |

These colors intentionally reuse the established World Countries visual grammar:

- grey = no relevant evidence;
- amber/brown = needs work;
- green = clean completion.

Countries outside the current geographic scope use the established context grey
`#303036`.

Status must also be available through a legend, description, or equivalent
non-color presentation.

Do not display Drill proficiency or Learning Readiness as the Recite status when
the Recite mode is selected.

### Active-session map presentation

When Recite starts:

- suppress historical Recite status colors;
- the map represents the current run only;
- do not show Drill proficiency or Learning Readiness colors as fallback;
- never highlight the expected future Country.

Resolved Countries may use the same current-run outcome colors:

- recalled -> `#15803d`;
- recovered -> `#d97706`;
- revealed -> `#92400e`.

Unresolved visible Countries remain neutral.

In `Reveal as you go`, unresolved target Countries remain hidden.

During an active run, individual map Countries are non-interactive in both map
assistance modes. The map is a geographic scaffold only; Recite interaction is
through the typed prompt and task controls.

### Completion

Completing the last required prompt completes the Recite run.

Do not navigate to a separate full-screen results page.

Keep the map mounted and show completion controls in the established
map-surface/task-dock style.

Show at minimum:

- scope label;
- total Countries;
- Recalled count;
- Recovered count;
- Revealed count;
- completion state.

Provide:

- **Recite again** - start the same scope/mode/map-assistance configuration
  again from the beginning;
- **Back to setup** - return to Recite setup with the newly persisted status
  colors visible.

Only a fully completed run writes durable Recite progress.

Leaving/backing out before completion writes no Recite outcome changes.
Backing out through the Recite setup control immediately discards the incomplete
run without a confirmation step.

## Scope

- Replace the current Recite placeholder with setup, active session, and
  completion states.
- Recreate the established Drill-style Geography rail composition within
  `recite/` without importing Drill workflow internals.
- Support Continent navigation, multi-Subregion selection, and Entire Continent.
- Use effective authored Subregion and Country order.
- Add the three Recite modes defined above.
- Add Visible and Reveal-as-you-go map assistance.
- Add retry and explicit Reveal/Skip behavior.
- Add mode-specific durable Recite status coloring.
- Add feature-local Recite persistence described by ADR 0026.
- Add workflow-neutral map support for truly hiding caller-selected Countries.
- Preserve the mounted map through active Recite and completion where the map
  source/scope does not require replacement.
- Add focused Recite, persistence, ordering, and map-visibility tests.
- Update current-state World Countries and persistence architecture after
  implementation.

## Interaction and states

### Setup

Required setup state:

```text
Continent
selected Subregions / Entire Continent
Recite mode
Map assistance
```

Start is enabled only when the resolved Country scope is non-empty and the
selected map is ready. A loading or failed map keeps Start disabled.

At World level, Recite mode/status may remain visible, but a run cannot start
until a Continent-level Country scope is selected.

### Session construction

On Start:

1. resolve the active Country population;
2. resolve selected Subregions in effective Continent order;
3. resolve each Subregion's Countries in effective Country order;
4. flatten that ordered sequence once;
5. snapshot the concrete sequence into the active Recite session;
6. suppress historical map status;
7. initialize all prompt outcomes as unresolved.

Do not persist the flattened session sequence.

### Mode changes

Changing Recite mode in setup immediately changes the status coloring to that
mode's persisted Recite outcomes.

Changing mode does not change the geographic selection.

Mode cannot be changed during an active run.

### Map-assistance changes

Map assistance can be changed in setup.

Do not allow toggling from Reveal-as-you-go to Visible during an active run,
because doing so would reveal future Countries.

Prefer freezing the selected map-assistance mode for the run.

### Empty scope

If no Subregions are selected:

- show the map/setup normally;
- disable Start;
- show concise scope guidance.

Do not fall back to Entire Continent automatically.

### Map load failure

Use the existing map error presentation.

Recite setup controls remain available, but a map-dependent Recite run must not
start while the map is loading or if the selected mode cannot satisfy its
defined map-assistance behavior after a map failure.

Do not invent a second non-map Recite UI as fallback in this change.

### Active population/order changes

An active Recite session uses its start-time snapshot.

If settings or authored order change while the run is active, do not mutate the
current sequence.

A new run resolves the latest active population and effective order.

## Architecture constraints

Follow:

- [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md)
- [ADR 0026](../adr/0026-isolate-world-countries-recite-outcomes-from-drill-evidence.md)

Change-specific constraints:

- `recite/` is the workflow owner.
- Do not import `drill/` implementation modules.
- Reuse feature-neutral UI/geography/map/learning seams instead of copying
  semantic logic from Drill.
- `geography/` remains the source of truth for membership and effective order.
- Recite must not persist a flattened Country sequence.
- `learning/recallAnswerMatching.ts` remains authoritative for typed Country and
  Capital answer classification.
- Recite does not write shared Drill attempts.
- Recite does not write Learning milestones or Learning Readiness.
- Recite persistence stores latest completed outcome per `(mode, CountryId)`;
  incomplete runs do not write progress.
- `maps/` owns generic hidden-Country rendering/interaction behavior but must not
  import or interpret Recite semantics.
- Hidden Country state must suppress answer-revealing labels, hover, and clicks,
  not only fill color.
- PageLayout geometry, rail widths, global drawer behavior, and generic layout
  contracts remain unchanged.
- Do not add a broad shared/common layer for Recite.
- Keep status semantic mapping in `recite/`; generic raw map presentation stays
  in `maps/`.

## Existing capabilities to reuse

### Geography and order

- `geography/queries.ts`
  - effective Continent/Subregion membership queries;
  - effective Subregion and Country order.
- existing World/Continent metadata stores used by the geography owner.

Do not reconstruct sequence order from canonical array position when effective
authored order exists.

### Feature-local rail/UI primitives

Reuse the feature-local presentational seams used by existing World Countries
activities where ownership permits, including:

- `ui/WorldCountriesPanel.tsx`
- `ui/GeographyBreadcrumbs.tsx`
- `ui/GeographyHierarchyRow.tsx`
- `ui/MapSurface.tsx`

If Recite and Drill need identical purely presentational Geography selection
UI, extract only a feature-local data/callback-driven UI seam. Do not move Drill
workflow state or policy into `ui/`.

### Maps

- `maps/GeographyOverviewMap.tsx`
- `maps/SvgMapView.tsx`
- `maps/SvgMapController.ts`
- `maps/geographyMapAdapter.ts`

Extend the existing declarative map contract with caller-controlled hidden
Country IDs rather than manipulating the loaded SVG from Recite.

### Answer matching

- `learning/recallAnswerMatching.ts`
- `learning/answerMatching.ts`

Use existing Country aliases/normalization/fuzzy behavior.

### Ordered session mechanics

`learning/orderedRecallSession.ts` may be reused only where its existing
repair/rewind semantics match Recite behavior.

This Change Spec requires **same-prompt retry without automatic rewind**.
Do not force Recite into the existing repair/clean-pass behavior merely to reuse
that helper.

A small Recite-owned session state machine is preferred if necessary.

### Layout/keyboard conventions

Reuse established map-centered World Countries form-dock and safe-Enter
presentation patterns through their feature-local/generic UI seams, not by
importing active Drill workflow components.

## Edge cases

- One selected Country is a valid Recite scope.
- Selecting multiple Subregions follows authored Subregion order, not selection
  click order.
- Duplicate Country IDs must not appear in the concrete session sequence.
- Countries disabled by the active country-set policy are not included.
- Country aliases/diacritics follow existing answer matching.
- A blank submission is handled by existing answer-classification conventions
  and must not advance.
- Multiple incorrect retries still produce one final `recovered` Country outcome
  if no Reveal/Skip is used.
- Reveal/Skip after any number of retries produces `revealed`.
- In `Countries + Capitals`, a revealed Country prompt plus a clean Capital
  remains `revealed`.
- In `Countries + Capitals`, a recovered Country plus a clean Capital is
  `recovered`.
- In `Countries + Capitals`, a clean Country plus a recovered Capital is
  `recovered`.
- A Country that was `recalled` in an older run becomes `recovered` or
  `revealed` when a later completed run for the same mode produces that outcome.
  The latest completed run wins.
- Aborting a run after resolving some Countries does not overwrite their prior
  durable Recite status.
- Status from one Recite mode never appears as evidence for another mode.
- Drill evidence changes do not alter Recite status.
- Recite status changes do not alter Drill proficiency.
- Hidden Countries must stay noninteractive even if generic map hover/click
  behavior is enabled elsewhere.
- Reveal-as-you-go must not expose future Country labels through SVG text,
  hover, focus, selection, or accessibility descriptions that enumerate hidden
  answers during the active run.
- Map zoom/scope calculations may still use hidden Country geometry internally;
  hiding must not break the intended geographic framing.
- Returning to setup after completion reloads/derives the newly persisted Recite
  status without requiring a page refresh.

## Out of scope

- Random Recite order.
- A user-selectable order mode.
- World-wide Recite in this delivery.
- Start-from-middle / checkpoint Recite.
- Timed Recite, speed scoring, records, streaks, leaderboards, or best times.
- Full Recite run-history UI or analytics.
- Weak-only/Developing-only Recite scope.
- Recite affecting Drill mastery/proficiency.
- Recite affecting Learning milestones or readiness.
- Multiple choice Recite.
- Speech input or spoken-answer recognition.
- Automatically revealing the answer after a wrong submission.
- Automatic rewind to earlier Countries after an error.
- New Country/Capital canonical data.
- New map assets.
- General redesign of Drill.
- General application layout changes.
- Keyboard navigation of individual map Countries.

## Acceptance criteria

- [x] Recite no longer shows the current structural placeholder.
- [x] Recite uses a Geography left rail, map-centered main surface, and Recite controls in the right rail.
- [x] World-level Geography lists Continents in effective World order.
- [x] Recite opens at the World-level Geography view with Countries and Visible selected by default.
- [x] Recite setup preferences are transient and may be retained independently per visited Continent while the workflow remains mounted.
- [x] Selecting a Continent enters Continent-level Recite setup.
- [x] Continent-level Geography supports selecting one or more Subregions and Entire Continent.
- [x] Start is disabled for an empty resolved Country scope.
- [x] Session sequence follows effective Subregion order and effective Country order regardless of selection click order.
- [x] The active session snapshots its concrete Country sequence at Start.
- [x] Recite exposes Countries, Countries + Capitals, and Countries from Capitals.
- [x] Recite exposes Visible and Reveal as you go map assistance.
- [x] Recite has no random/in-order selector; all Recite modes are ordered.
- [x] Countries prompts for `Next country` without identifying/highlighting the expected Country.
- [x] Countries + Capitals requires Country resolution followed by Capital resolution before advancing.
- [x] Countries from Capitals shows the Capital for the next Country in authored order and asks for the Country.
- [x] Recite uses typed free recall rather than multiple choice.
- [x] Country/Capital answers use the existing World Countries answer-matching semantics.
- [x] First-try correct resolves as Recalled.
- [x] Incorrect submission keeps the same prompt active and does not expose the correct answer automatically.
- [x] A later correct answer without Reveal/Skip resolves as Recovered.
- [x] Reveal/Skip explicitly exposes the answer and resolves as Revealed.
- [x] Reveal/Skip feedback requires an explicit continue action before advancing.
- [x] Countries + Capitals derives the Country outcome from both required prompts using the specified precedence.
- [x] Enter supports the defined submit/continue flow without overriding native editable/control behavior.
- [x] Correct feedback provides an explicit continuation action, and Enter activates it without overriding native editable/control behavior.
- [x] Setup map coloring changes with the selected Recite mode.
- [x] Unrecited uses `#52525b`, Revealed uses `#92400e`, Recovered uses `#d97706`, and Recalled uses `#15803d`.
- [x] Recite status is understandable without relying on color alone.
- [x] Countries outside active geographic scope use context grey `#303036`.
- [x] Active Recite suppresses historical Recite, Drill, and Learning status fills.
- [x] Active Recite disables interaction with individual map Countries in both map-assistance modes.
- [x] Visible mode leaves future Countries geographically visible but neutral and does not identify the next Country.
- [x] Reveal as you go starts with all target Countries hidden.
- [x] Hidden Countries expose no answer-revealing name, hover, click, or equivalent interaction.
- [x] Resolving a Country reveals it in Reveal as you go.
- [x] Historical status does not leak through hidden/neutral future Countries during active recall.
- [x] Completion keeps the map mounted and does not navigate to a separate results screen.
- [x] Completion shows total, Recalled, Recovered, and Revealed counts.
- [x] Recite again repeats the same configuration from the beginning.
- [x] Back to setup shows newly persisted status colors.
- [x] Start remains disabled while the selected map is loading or has failed to load.
- [x] Only a fully completed run writes durable Recite progress.
- [x] Aborting/incompletely leaving a run writes no Recite progress.
- [x] Back to setup immediately discards an incomplete run without confirmation.
- [x] Latest completed outcome is persisted independently for each `(mode, CountryId)`.
- [x] Recite progress survives normal navigation/browser restart through its feature-owned localStorage record.
- [x] Recite writes no `world-countries:<skill>:<CountryId>` Drill attempts.
- [x] Recite changes do not alter Drill proficiency, Learning Readiness, Learning milestones, or Maintenance evidence.
- [x] No flattened authored/session Country sequence is persisted.
- [x] The generic map layer can declaratively hide/show caller-selected Countries without importing Recite semantics.
- [x] Existing Drill behavior is unchanged.
- [x] Focused Recite, persistence, answer-state, order, and hidden-map tests cover the new behavior.
- [x] World Countries feature tests and TypeScript typecheck pass.

## Source anchors

- `src/features/world-countries/recite/WorldCountriesRecite.tsx`
- `src/features/world-countries/recite/reciteScope.ts`
- `src/features/world-countries/WorldCountries.tsx`
- `src/features/world-countries/geography/queries.ts`
- `src/features/world-countries/geography/worldMetadataStore.ts`
- `src/features/world-countries/geography/continentMetadataStore.ts`
- `src/features/world-countries/geography/subregionMetadataStore.ts`
- `src/features/world-countries/learning/recallAnswerMatching.ts`
- `src/features/world-countries/learning/answerMatching.ts`
- `src/features/world-countries/learning/orderedRecallSession.ts`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/geographyMapAdapter.ts`
- `src/features/world-countries/ui/WorldCountriesPanel.tsx`
- `src/features/world-countries/ui/GeographyBreadcrumbs.tsx`
- `src/features/world-countries/ui/GeographyHierarchyRow.tsx`
- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/AGENTS.md`

Expected new Recite-owned modules may include mode definitions, session mechanics,
progress persistence/derivation, Recite rails, and focused tests. Exact file
splitting remains implementation-owned.

## Documentation impact

With implementation:

1. update `docs/architecture/features/WORLD_COUNTRIES.md` to record:
   - the three Recite modes;
   - ordered Geography-derived session construction;
   - Recite-owned latest-outcome status;
   - active-session status suppression;
   - Recite isolation from Drill/Learning evidence;
   - generic hidden-Country map usage.

2. update `docs/architecture/PERSISTENCE.md` to record:
   - `world-countries-recite-progress`;
   - `(ReciteMode, CountryId)` latest-completed-outcome identity;
   - incomplete sessions are transient;
   - no flattened sequence is persisted.

Do not describe the target implementation as current state before the code lands.

## Verification

Complete this section when setting the status to `Implemented`.

During implementation, follow the repository progressive verification policy.

Prefer focused tests while working under:

```text
src/features/world-countries/recite/
src/features/world-countries/maps/
```

Near feature completion run:

```text
npx vitest run src/features/world-countries
npm run typecheck
```

Widen beyond World Countries only if an actual integration boundary requires it.

Implemented verification:

- `npx vitest run src/features/world-countries` — 66 test files, 255 tests
  passed.
- `npm run typecheck` — passed.
- `npm test` — 98 test files, 448 tests passed.
