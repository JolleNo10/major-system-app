# Change Spec 0018 - Align World Countries Today with Drill layout

- **Status:** Ready
- **Date:** 2026-08-21
- **Issue:** None.
- **Related ADRs:** None required.
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)
- **Related Change Specs:** [0010](0010-world-countries-map-centered-interaction-qol.md), [0016](0016-world-countries-today-learning-loop.md), [0017](0017-world-countries-uniform-typed-answer-interaction.md)

## Goal

Make **Today** feel like the same World Countries application as **Drill**.

Use Drill's established map-centered spatial grammar as the presentation precedent:
the map is the primary workspace, geography and workflow/session information live
in rails, and the center task dock contains only the immediate interaction needed
for the current task.

Preserve Today's planning, review scheduling, delayed retry, evidence, Learning
delegation, and typed-answer behavior.

## User-visible behavior

Today must no longer introduce a separate panel-placement language.

### Shared spatial grammar

For Today map-backed states:

- **Center:** compact prompt/context, dominant map, and only the immediate task
  interaction associated with that map.
- **Left rail:** geographic context.
- **Right rail:** Today/session status, progress, workflow controls, and Exit.
- **Task dock:** answer entry, answer feedback, fuzzy remediation, and only
  answer-state actions that are required to resolve the current prompt.
- Do not duplicate rail information as decorative map overlays or large cards
  below the map.

Drill is the visual and placement precedent, not a code dependency. Today must
not import Drill workflow internals.

## Today home

Keep the existing World mastery summary and World mastery map as the central
surface.

Remove the current large standalone Today status panel below the map.

### Center surface

Show:

- compact `World Countries` / `Today` context;
- existing `WorldMasterySummary`;
- existing World mastery map;
- a compact map-adjacent primary action when actionable.

The center must remain visually dominated by the map rather than by a second
full-width card.

When review or Learning is available, the primary action remains directly
reachable from the center surface at all viewport widths:

- `Continue review` when due review exists;
- `Continue learning` when no review is due and Learning remains.

Do not place the only primary action inside a rail drawer below `xl`.

### Right rail

Show the Today plan and workflow status:

- `Today` heading;
- due review count and due Country count;
- next Learning recommendation when one exists;
- checkpoint summary after a completed review block;
- refreshing/loading/error state where relevant;
- secondary navigation or workflow actions when no primary Today work remains.

The right rail is the detailed explanation of **what Today intends to do next**.
The center surface carries the immediate action, not a duplicate full Today
panel.

### Left rail

Use lightweight World-level geographic context consistent with the Drill setup
grammar. Do not introduce Today-specific authoring or navigation behavior.

If the World-level state has no useful left-rail content beyond redundant
decoration, it may remain intentionally sparse; do not add filler panels merely
to make both rails non-empty.

### Caught-up state

When Today is caught up:

- keep the mastery summary and World map visible;
- show `All caught up` and its explanation in the Today/right-rail status;
- expose `Drill` and `Recite` as secondary navigation;
- do not replace the map with a completion card.

### Loading, empty, and error states

Keep the World map/mastery surface stable where current data permits.

- Loading status belongs with the Today status, not in a new central card.
- Evidence-load failure keeps Drill and Recite available.
- Zero active Countries retains the existing explanatory behavior.
- Do not change evidence loading, fallback, or navigation semantics.

## Today review session

Active Today Review must visually align with active typed Drill.

### Center

Use the same hierarchy as typed Drill:

1. compact task context/prompt;
2. dominant Country map;
3. stacked typed-answer form dock below the map.

Preserve the current prompt semantics:

- Location -> Country: highlighted location, Country name hidden until allowed
  by the existing answer-feedback contract.
- Country -> Capital: Country is visible and the learner types the Capital.

Do not add a Today-specific standalone card around the task.

### Answer dock

The form dock contains only immediate answer interaction:

- shared typed-answer feedback;
- shared typed-answer field and Check action;
- fuzzy-remediation controls when active;
- `Skip for now` only for an answerable Today delayed-retry prompt.

Remove from the answer dock:

- Exit;
- review/session progress;
- subregion/session metadata;
- explanatory retry scheduling text that changes dock height between ordinary
  prompts;
- generic workflow navigation.

Initial Today prompts do not gain Skip.

All typed-answer behavior remains governed by Change Spec 0017.

### Left rail during review

Show geographic context for the current prompt, following the same role as
Drill's selected-geography rail.

At minimum provide the current hierarchy needed to orient the learner:

- World;
- Continent;
- Subregion.

Do not reveal a Country name when the current recall task intentionally hides
that answer.

No authoring controls are introduced by this change.

### Right rail during review

Own Today Review session state and workflow controls:

- `Today` / `Review` identity;
- current review progress;
- review-block size/progress presentation;
- delayed-retry state when the current prompt is a retry;
- Exit Review.

Use the established World Countries rail panel styling and hierarchy rather
than reproducing session state inside the map/task dock.

Exit Review must be rail-owned on desktop, matching Drill's separation between
task interaction and workflow exit.

Below `xl`, existing rail drawer behavior remains authoritative. Do not change
PageLayout drawer geometry.

### Map overlays

Remove the current Today-specific map metadata overlay that repeats `Today` and
the current Subregion.

Geographic/session context belongs in rails. Preserve only overlays that are
intrinsic to map interaction or answer feedback.

### Delayed retry guidance

Preserve delayed-retry semantics exactly.

The learner may still see concise retry context, but it must not create a
variable-height instructional block in the answer dock on ordinary initial
prompts.

Prefer stable session/status presentation in the right rail. The presence or
absence of retry eligibility must not cause the central map/answer composition
to jump.

## Learning launched from Today

No visual reimplementation is required.

Today continues to delegate to the existing Country and Capital Learning flows.
Those flows retain their own established map-centered rail/dock presentation.

Returning from Learning refreshes Today exactly as today.

## Scope

- Align Today home composition with the established World Countries
  map-centered rail/dock grammar.
- Align active Today Review composition with typed Drill.
- Add Today-owned rail presentation where required.
- Move Today workflow/session information out of the central answer dock.
- Remove redundant Today map metadata overlays.
- Keep the primary Today home action directly reachable in the center surface.
- Reuse existing feature-local map, panel, rail, mastery, and typed-answer seams.
- Consolidate generic presentation only where it is genuinely workflow-neutral;
  do not make Today depend on Drill internals.

No change to:

- Today plan derivation;
- due calculations;
- review queue construction;
- delayed retry eligibility or ordering;
- attempt writes;
- Learning recommendation order;
- Learning milestone ownership;
- answer classification;
- typed-answer lifecycle/timing;
- mastery derivation or colors;
- persistence.

## Interaction and states

### Review transitions

Moving between Today Review prompts must retain the stable map-centered frame.

Prompt, map highlight/name disclosure, progress, and retry status update
declaratively. Do not remount or reframe the map solely because the next prompt
is an initial prompt versus delayed retry.

The shared typed-answer dwell owns answer transition timing:

- exact: existing 500 ms behavior;
- ordinary incorrect: existing 1800 ms correction behavior;
- fuzzy: existing remediation behavior.

No new Continue/Next action is introduced.

### Exit

Exit Review is a deliberate workflow action and not part of answer submission.

- Desktop: rail-owned.
- Below `xl`: available through the existing right-rail drawer behavior.
- Exiting preserves the existing wait-for-pending-writes behavior and Today
  refresh behavior.

### Responsive behavior

Do not change `PageLayout`, rail widths, or drawer breakpoints.

The map and immediate answer/primary action remain usable when rails are
drawers. Secondary Today/session information may move into the existing drawer
without being duplicated as a full central panel.

### Accessibility

Preserve existing accessible semantics from the shared typed-answer,
`TaskDock`, map, and rail controls.

- Do not reveal hidden answer text through rail labels or accessible map
  descriptions before the owning recall state permits it.
- Review progress/status changes remain available to assistive technology.
- Moving status to rails must not create duplicate competing live regions.

## Architecture constraints

Follow [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md).

- `today/` continues to own Today orchestration and review-specific
  presentation.
- `drill/` remains independent; Today must not import `DrillSession`,
  `DrillSessionRails`, Drill selection state, or other Drill workflow
  components to achieve visual consistency.
- Reusable workflow-neutral presentation belongs in feature-local `ui/` only
  when both owners can consume it without Drill/Today semantics.
- `MapSurface`, `TaskDock`, `WorldCountriesTypedAnswer`, and existing rail
  infrastructure remain the preferred shared seams.
- `maps/` remains workflow-neutral.
- Do not modify generic PageLayout/rail geometry for this change.
- No persistence or domain ownership changes.

No ADR: the change applies the already-established map-centered interaction and
workflow ownership rules; it does not introduce a new durable architectural
choice.

## Existing capabilities to reuse

- `ui/MapSurface.tsx` — map-centered context/map/dock composition.
- `ui/TaskDock` — immediate task interaction only.
- `ui/WorldCountriesTypedAnswer` — authoritative typed-answer lifecycle.
- `ui/WorldMasterySummary` — existing Today/Drill World mastery presentation.
- `ui/WorldCountriesPanel` — existing panel styling where a rail panel is
  actually needed.
- `useRails` — semantic left/right rail ownership.
- `maps/GeographyOverviewMap` — Today World mastery map.
- `learning/CountryLearningMap` — Today Review map.
- Drill setup/session composition — visual placement precedent only.

## Edge cases

- A review block containing one prompt still shows coherent progress without
  creating a special center card.
- A delayed retry prompt keeps `Skip for now` available while answerable.
- If no delayed retry can be scheduled, no retry explanation placeholder is
  required in the answer dock.
- During feedback dwell, Exit remains a workflow control but answer transition
  stays exactly-once under the existing typed-answer lifecycle.
- Evidence refresh after a checkpoint must not cause a second large central
  status card to appear.
- Caught-up, evidence-error, and zero-Country states retain map context and
  secondary navigation where currently valid.
- Location -> Country review must not leak the Country name through new rail
  content before answer disclosure.

## Out of scope

- Redesigning Drill.
- Redesigning Recite.
- Changing Learning flow layout.
- New Today scheduling or learning logic.
- New mastery/proficiency metrics or colors.
- New mnemonic controls.
- New Today persistence or resumable sessions.
- Changes to global application layout, rail widths, drawer behavior, or
  responsive breakpoints.
- A generic cross-application session-shell abstraction.

## Acceptance criteria

- [ ] Today home no longer renders a large standalone Today status card below
      the World map.
- [ ] Today home keeps `WorldMasterySummary` and the World map as the dominant
      center content.
- [ ] Due counts, next Learning recommendation, checkpoint details, and Today
      workflow status are presented through the Today/right-rail hierarchy.
- [ ] When Today has work, `Continue review` or `Continue learning` remains
      directly reachable from the center surface at desktop and below `xl`.
- [ ] Caught-up Today keeps the World map visible and exposes Drill/Recite
      without replacing the map with a completion screen.
- [ ] Active Today Review follows typed Drill's composition: prompt, dominant
      map, stacked typed-answer dock.
- [ ] Today Review has geographic context in the left rail without revealing a
      hidden Country answer.
- [ ] Today Review progress, retry/session status, and Exit Review are owned by
      the right rail rather than the typed-answer dock.
- [ ] The Today Review answer dock contains only shared typed-answer interaction,
      fuzzy remediation, and delayed-retry `Skip for now` when applicable.
- [ ] Exit Review is removed from the answer dock.
- [ ] The Today/Subregion map metadata overlay is removed.
- [ ] Ordinary initial prompts do not gain a variable-height retry explanation
      block in the answer dock.
- [ ] Today does not import Drill workflow components or Drill state to achieve
      the aligned layout.
- [ ] Today Review retains the exact existing queue, retry, evidence, answer
      matching, feedback dwell, and refresh semantics.
- [ ] Today-launched Country/Capital Learning remains delegated to existing
      Learning flows without presentation duplication.
- [ ] Below `xl`, existing rail drawers remain unchanged and immediate center
      actions remain usable without opening a drawer.
- [ ] No hidden Country answer is leaked through new visual or accessible rail
      content.
- [ ] No new persistence keys, evidence semantics, mastery definitions, or
      scheduling rules are introduced.
- [ ] Focused Today tests and the full World Countries feature test suite pass.

## Source anchors

- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/today/TodayReviewSession.tsx`
- `src/features/world-countries/today/reviewQueue.ts`
- `src/features/world-countries/drill/DrillSetup.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/drill/DrillSessionRails.tsx`
- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/ui/WorldCountriesTypedAnswer.tsx`
- `src/features/world-countries/ui/WorldMasterySummary.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/learning/CountryLearningMap.tsx`

## Documentation impact

After implementation, update
`docs/architecture/features/WORLD_COUNTRIES.md` only where necessary to make the
durable Today placement rule explicit:

- Today follows the shared map-centered World Countries spatial grammar;
- workflow/session controls belong in rails;
- immediate answer/task interaction belongs at the map;
- Today remains independent from Drill internals.

Do not create an ADR unless implementation discovers a genuinely new
architectural decision.

## Verification

Complete this section when setting the status to `Implemented`.

During implementation use focused Today/UI tests.

Before completion follow the World Countries agent verification policy:

- `npx vitest run src/features/world-countries`
- `npm run typecheck`

Manually verify:

- Today home at desktop and below `xl`;
- Today Review Location -> Country and Country -> Capital;
- exact, incorrect, fuzzy, and delayed-retry Skip states;
- review Exit with pending attempt writes;
- checkpoint -> Continue review;
- no-due -> Continue learning;
- caught-up, evidence-error, and zero-active-Country states;
- no answer disclosure through rails/accessibility.
