# Change Spec 0010 - World Countries map-centered interaction and QoL

- **Status:** Ready
- **Date:** 2026-08-13
- **Issue:** None.
- **Related ADRs:** None required.
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Make World Countries faster and calmer to use: keep the map as the stable workspace, put immediate task actions at the map, keep workflow navigation in rails, and standardize keyboard/focus behavior without changing Learning/Drill semantics or persistence.

## User-visible behavior

Use one feature-wide interaction language for map-backed states:

- **Center:** compact task context + dominant map + contextual bottom dock.
- **Dock:** only immediate task actions/status.
- **Right rail:** Back, Skip/next-stage, Exit, session/workflow tools.
- **Left rail:** geography/scope and allowed contextual authoring.

Learning:

- Review keeps the Set map visible. Previous/Next live with the map. `Left Arrow` / `Right Arrow` traverse Review items.
- Location Practice keeps the map as the interaction surface.
- Typed Practice keeps geographic context where it does not reveal an answer; input remains primary and auto-focused.
- Location Ready, Set Ready, Combined Ready, and Final recall gate no longer replace the map with standalone screens; show existing status/actions in the dock.
- Set Ready preserves the existing next-plan action plus `Keep practising`; e.g. `Practise all 6` when that is the current plan action.
- Final recall mechanics, repair/rewind, answer matching, and milestone writes are unchanged.
- Learning completion retains the completed Subregion map and existing done/restart/multi-Subregion continuation behavior.

Drill/Practice:

- Keep the map dominant during active recall/practice.
- Reduce separate prompt/status cards where compact map context is sufficient.
- Keep typed/click interaction directly associated with the map.
- Preserve feedback timing, auto-progression, question order, scoring/evidence, and the existing Results map.

Keyboard/focus:

- `Enter`: native submit in typed forms; otherwise invoke the single visible primary action for the current non-editing state.
- `Left Arrow` / `Right Arrow`: Review Previous/Next only.
- `Escape`: may close existing drawers/editors; never globally exits Learning/Drill/Practice.
- Feature shortcuts must not fire while an editable/native control handles the key, with modifiers, or from key-repeat transitions.
- Typed inputs keep autofocus. If a transition removes the focused control and enters Ready/gate state, focus the visible primary action.
- Ready/status changes use accessible status/live semantics.

Visual semantics remain: cyan = action/focus, green = Ready/success, zinc = neutral, amber/red = existing attention/error. Green is not a generic primary-action color.

## Scope

- Add feature-local reusable map-surface/dock presentation.
- Apply it to Country/Capital Learning map-backed states and gates.
- Align active Drill/Practice map presentation with the same rules.
- Move Learning Back controls from center-step content to the right rail.
- Standardize keyboard, focus, action labels, and Ready announcements.
- Avoid visible map reload/flicker or framing jumps between adjacent states using the same map source and effective scope.
- Preserve direct access to primary actions below `xl` even though rails become drawers.
- Update World Countries architecture after implementation.

No new persisted state, Learning milestone, scheduler behavior, Drill evidence, mode, geography membership, or authored order behavior.

## Interaction and states

For adjacent states with the same map definition and effective scope, update the mounted map declaratively; do not show the SVG loading state again solely because workflow stage changed. Reframe only when effective scope changes or existing behavior intentionally requires it.

The dock is contextual, not permanent. Do not place settings, authoring, Exit, or generic workflow tools in it.

Do not expose two controls both labelled `Next` when one means Review-item navigation and another means Skip/plan progression. Labels must make the difference clear.

Below `xl`, the dock may stack/attach below the map if overlaying would make the map unusable; the primary action stays in the center surface, not only inside a rail drawer.

The shared map-surface/dock interaction applies to active Country and Capital
Learning states (Review, Location Practice, typed Practice, Ready/gates, Final
recall, and completion) and active Drill/Practice sessions. Setup and Results
retain their existing map layouts.

Map continuity is based on the map source, Continent, effective scope
membership, and any intentional zoom exception. Stage/phase changes, country
highlight or name changes, hover state, and sequence annotations update the
mounted map declaratively and do not by themselves trigger a remount or SVG
loading state. Remount or reframe only when the map source, effective scope,
or intentional zoom behavior changes.

For a non-editing state without timer-owned feedback, `Enter` invokes the
single visible cyan primary action in the center/dock. It never chooses
`Keep practising`, Back, or Exit. Native interactive controls retain ownership
of their Enter behavior. Review arrows are traversal-only: at the first or last
item they do nothing rather than advance workflow. Feature shortcuts do
nothing while an editable/native control handles the key, when modifiers are
held, on key-repeat transitions, when the action is absent or disabled, or
while feedback timing owns progression. `Escape` only closes an existing
drawer/editor and never exits a workflow.

During non-complete Learning phases, the right rail remains the workflow
action surface even when the quiet-phase left rail is hidden. Its action order
is Back, valid Skip/next-stage, then Exit. Completion actions retain their
existing center-surface behavior. Typed Practice keeps a scoped map: Country
practice may show the target location without its name, Capital practice may
show the Country context but never the capital answer, and Combined practice
also retains the map without rendering the answer text.

Ready and gate transitions expose one polite accessible status/live region and
move focus to the visible primary action after the transition. Typed inputs
retain autofocus when active practice begins or advances; ordinary feedback
and Review transitions do not steal focus.

Authoring/mnemonics remain hidden during quiet recall phases per current architecture. Lightweight read-only geography context may remain visible when it does not reveal an answer or distract from recall.

## Architecture constraints

Follow [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md).

- `maps/` and `CountryLearningMap` stay workflow-neutral; do not add Ready, Drill, Back, keyboard-workflow, or plan semantics to map components.
- Reusable map-surface/dock presentation belongs in feature-local `ui/`.
- `learning/flows/` continues to own Learning orchestration; `drill/` continues to own Drill/Practice presentation.
- Do not change generic PageLayout/rail geometry/drawer behavior or create an app-wide overlay abstraction.
- Do not change scheduler, answer matching, evidence, proficiency, milestones, or persistence contracts.

No ADR: this is presentation/interaction within existing ownership boundaries.

## Existing capabilities to reuse

- `CountryLearningMap` / `SvgMapView` for map rendering and declarative updates.
- `useRails` for semantic rails.
- `RecallFeedback` for accessible transient feedback.
- existing typed forms / `TypingInput` for Enter-submit and autofocus.
- `GuidedLearningRails`, Drill/Practice session rails, and Results rails for existing workflow actions/context.
- existing staged Learning state machines; preserve Change Spec 0009 Ready/Skip/Final-recall semantics.

## Edge cases

- One-item Review has no item traversal but its primary continuation still works by button/Enter.
- One-Set Learning keeps the existing direct Final recall path.
- A gate reached through Skip must not claim Ready.
- New shortcuts do nothing while typing/editing, when the action is absent/disabled, or during wrong-answer feedback where progression is timer-owned.
- Map-click Practice behavior outside effective scope is unchanged.
- Existing map error presentation remains authoritative when map interaction is required.
- Oceania keeps its existing Learning-map zoom exception.

## Out of scope

- Changing Set sizing, scheduler thresholds, Combined-plan placement, Final-recall qualification, or Skip semantics.
- Learning resume/persistence.
- New Drill modes/scoring/evidence/result metrics.
- Functional expansion of Recite or Maintenance/Due Review.
- Swipe gestures or numeric multiple-choice shortcuts.
- Global PageLayout/core-UI redesign or unrelated features.

## Acceptance criteria

- [ ] Country/Capital Review keeps the map visible, supports map-adjacent Previous/Next and safe Left/Right shortcuts.
- [ ] Location Ready, Set Ready, Combined Ready, and Final recall gate retain the map and use contextual dock presentation.
- [ ] Set Ready preserves `Keep practising` and the existing next-plan action; safe Enter invokes the visible primary action.
- [ ] Learning completion retains geographic context and existing completion semantics.
- [ ] Learning Back is available from the right rail rather than center-step buttons; Exit remains deliberate and rail-owned.
- [ ] Typed Learning/Drill inputs retain Enter submit/autofocus and never double-submit through feature shortcuts.
- [ ] Same-scope adjacent map states do not visibly reload the SVG or show a loading placeholder solely due to stage change.
- [ ] Active Drill/Practice adopt the same map-centered hierarchy without semantic/evidence changes.
- [ ] Existing map-status palette semantics remain unchanged; Ready/success uses green and primary action remains cyan.
- [ ] Below `xl`, primary task actions remain directly reachable while existing rail drawers still expose secondary workflow actions.
- [ ] The shared map-surface/dock presentation is limited to active Learning and active Drill/Practice states; setup and Results retain their existing layouts.
- [ ] Map remounting/reframing is driven only by map source, effective scope, or intentional zoom changes—not workflow phase or declarative highlight/name updates.
- [ ] Safe `Enter`, Review arrow boundaries, shortcut suppression, and `Escape` behavior follow the interaction contract above.
- [ ] Quiet-phase Learning states retain right-rail Back/Skip/Exit actions in the stated order while left-rail authoring remains hidden.
- [ ] Typed Country, Capital, and Combined Practice preserve geographic context without rendering the answer text.
- [ ] Ready/gate status is announced accessibly and focuses the primary action without disrupting typed-input autofocus or ordinary feedback.
- [ ] No new persistence keys, milestones, evidence, or shared scheduler/core behavior.

## Source anchors

- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/flows/StagedCountryWalkthroughStep.tsx`
- `src/features/world-countries/learning/flows/StagedCapitalWalkthroughStep.tsx`
- `src/features/world-countries/learning/flows/SchedulerLocationPracticeStep.tsx`
- `src/features/world-countries/learning/flows/SchedulerPracticeStep.tsx`
- `src/features/world-countries/learning/flows/StagedLearningReadyStep.tsx`
- `src/features/world-countries/learning/flows/StagedFinalRecallStep.tsx`
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/drill/DrillSessionRails.tsx`
- `src/features/world-countries/drill/DrillResults.tsx`
- `src/features/world-countries/maps/SvgMapView.tsx`

## Documentation impact

After implementation, update `docs/architecture/features/WORLD_COUNTRIES.md` with the durable map-surface/dock ownership, action-placement, map-continuity, and keyboard/focus rules. Do not create an ADR unless implementation discovers a genuinely new architectural decision.

## Verification

Complete when setting the spec to `Implemented`.

- Use focused affected-component tests during implementation.
- Before completion: `npx vitest run src/features/world-countries`, `npx tsc -b`, `npx vite build`.
- Manually verify keyboard/focus plus desktop and below-`xl` dock/drawer behavior.
