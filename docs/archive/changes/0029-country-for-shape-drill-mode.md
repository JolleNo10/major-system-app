# Change Spec 0029 - Country for Shape Drill mode

- **Status:** Implemented
- **Date:** 2026-08-22
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`, `docs/architecture/PERSISTENCE.md`
- **Related ADRs:** None required

## Goal

Add a fourth World Countries Drill mode, **Country for Shape**, where the learner identifies a Country from its isolated map shape. The mode must reuse the existing Drill geography selection, Country-answer interaction, session mechanics, feedback lifecycle, proficiency/evidence system, and failed-Country retry behavior.

## User-visible behavior

In Drill setup, the existing mode selector includes a fourth mode:

- **Country for Shape**
- Purpose: identify a Country from its isolated geographic shape.

The existing global geography selector in the left rail remains the scope selector for this mode. No separate shape-specific geography selector is introduced.

For each question:

1. The next Country is selected through the ordinary Drill session queue.
2. The normal World Countries map remains the question surface.
3. Every other Country is hidden.
4. The questioned Country is shown using its actual source-map geometry.
5. The map zooms to fit that Country comfortably within the available map viewport.
6. The Country name is not shown on the map.
7. The learner answers with the existing Country-name answer interaction.

Example prompt text may be **Which country is this?**, but the implementation should reuse the existing Drill question/answer presentation rather than create a separate shape-specific answer component.

### Correct answer

- Use the existing correct-answer presentation and timing.
- Keep the map in the isolated-Country view during the normal success dwell.
- Do not reveal surrounding Countries just because the answer was correct.
- Advance using the ordinary Drill transition behavior.

### Incorrect answer

- Use the existing incorrect-answer presentation, correction text, and timing.
- On the same mounted map, change from the isolated-Country view to geographic context:
  - zoom out to the questioned Country's subregion;
  - unhide the other active Countries in that subregion;
  - keep the questioned Country clearly highlighted as the correct answer.
- After the existing incorrect-answer dwell, advance through the ordinary Drill transition behavior.

### Fuzzy/alias answer behavior

Country-name matching must use the existing Country answer classifier, aliases, normalization, fuzzy handling, keyboard behavior, remediation behavior, and feedback lifecycle. A fuzzy answer that is handled as accepted/remediation by the existing system is not treated as an incorrect-answer map reveal.

## Scope

- Add `Country for Shape` as a normal `WorldCountriesDrillMode`.
- Add a distinct recall skill for this task: `shape-to-country`.
- Persist Drill evidence for the new skill through the existing opaque World Countries recall-target mechanism.
- Treat `shape-to-country` as an additional skill, not a core World-mastery skill.
- Reuse the existing Drill mode preference, order preference, geography selection, proficiency selection, session queue, completion, result, and retry-failed workflows.
- Reuse existing Country-name answer matching instead of adding a shape-specific matcher.
- Extend the shared World Countries map seam with generic caller-controlled Country visibility and explicit Country zoom targets as needed for this behavior.
- Use the active World Countries population to build the wrong-answer subregion context, even when the active Drill queue is a proficiency-filtered or retry subset.

## Interaction and states

### Drill setup

- `Country for Shape` appears alongside the existing Drill modes.
- The existing left-rail geography selection is unchanged.
- Proficiency scope for this mode is based on `shape-to-country` evidence.
- Existing Drill order behavior applies unchanged.
- Existing persisted mode selection supports the new mode through the normal preference validation path.

### Question state

- Only the target Country geometry is visible.
- The target is not semantically highlighted before the answer; its ordinary source-map geometry is the cue.
- The map is explicitly fit to the full target Country geometry.
- No Country label is shown.
- No neighboring Country geometry is visible.
- No synthetic task-assistance dot, anchor, or replacement geometry is used as the Country shape.

### Correct-feedback state

- Existing correct feedback is shown.
- The isolated shape view remains.
- Surrounding geographic context is not revealed.
- Existing transition timing is preserved.

### Incorrect-feedback state

- Existing incorrect feedback and correction text are shown.
- The existing map instance remains mounted.
- Visibility changes so all active Countries in the target Country's subregion are visible.
- The target Country is highlighted with the existing semantic highlight mechanism.
- Zoom changes to fit the target subregion rather than the isolated Country.
- Existing incorrect-feedback dwell and next-question transition are preserved.

### Completion and retry

- Results use the existing Drill result model.
- Incorrect shape answers contribute to failed-Country derivation through the existing answer records.
- **Retry failed countries** reuses the same `Country for Shape` mode and therefore asks `shape-to-country` again for each failed Country.
- No shape-specific retry workflow is introduced.

### Loading and map failure

Use the existing World Countries map loading/error behavior. The new mode must not add a separate loading or fallback system.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md`: `drill/` owns Drill mode/session behavior; `maps/` owns map rendering and Country-to-SVG adaptation; `learning/` owns recall skills/evidence helpers.
- Follow `docs/architecture/PERSISTENCE.md`: recall target IDs remain opaque feature-owned strings in the form `world-countries:<skill>:<CountryId>`.
- Add `shape-to-country` without changing the meaning of existing evidence.
- Do not record Country-for-Shape answers as `location-to-country`. Recognizing an isolated outline is a different recall task from locating a Country in geographic context.
- `shape-to-country` must not be added to the current core World-mastery finish line, Learning Readiness core calculation, or Today core behavior unless separately specified later.
- Keep active Drill queues as snapshots created at session start.
- Wrong-answer context must come from the active World Countries population, not only the current session queue. A proficiency-filtered or failed-Country retry session must still reveal the target among the other active Countries in its subregion.
- Map state changes for visibility, highlight, and zoom must be declarative updates on the existing SVG/map controller. Do not reload/remount the SVG between isolated and incorrect-feedback states.
- The shape shown to the learner is the real map source geometry. Do not normalize, rotate, simplify, redraw, or replace Country shapes for this mode.
- Do not expose Country-to-SVG implementation details to Drill session logic; extend/reuse the map adapter/component seam.
- Explicit Country/subregion zoom requested by this mode takes precedence over generic learning-map auto-zoom exceptions, including the existing Oceania behavior, because the caller intentionally requests a fit target.
- No ADR is required for this change because it extends existing documented ownership and generic map capabilities. Create an ADR only if implementation discovers a new durable architecture decision that cannot be represented as a local extension of current seams.

## Existing capabilities to reuse

- `src/features/world-countries/drill/drillModes.ts` — existing Drill mode registry and skill ownership.
- `src/features/world-countries/drill/drillPreferences.ts` — existing persisted mode/order/scope preference validation.
- `src/features/world-countries/drill/drillSessionState.ts` — existing queue/session mechanics.
- `src/features/world-countries/drill/WorldCountriesDrill.tsx` — existing Drill coordinator, active Country population, evidence recording, completion, and failed-Country retry integration.
- `src/features/world-countries/drill/DrillSession.tsx` — existing question rendering and answer transitions.
- `src/features/world-countries/ui/WorldCountriesTypedAnswer` — shared typed-answer lifecycle and timing.
- `src/features/world-countries/learning/recallAnswerMatching.ts` — existing Country-name aliases, normalization, fuzzy matching, and answer classification.
- `src/features/world-countries/learning/recallTargets.ts` — recall-skill registry and opaque target IDs.
- `src/features/world-countries/drill/drillProgressPresentation.ts` and `src/features/world-countries/learning/progressPresentation.ts` — existing per-skill proficiency presentation.
- `src/features/world-countries/learning/CountryLearningMap.tsx` — shared Country-aware map seam. Extend it with generic explicit visibility/zoom inputs rather than shape-mode-specific rendering logic.
- `src/features/world-countries/maps/SvgMapView.tsx` / `SvgMapController` — existing declarative hidden/highlight/zoom support and same-SVG update behavior.
- Existing failed-Country retry behavior from Change Spec 0028 — retry remains a normal Drill with an explicit transient Country subset.

## Edge cases

- Multipart Countries and archipelagos show all source geometry belonging to the Country and zoom to the union of those components.
- Very small Countries still use their actual source geometry as the shape cue; synthetic dots/anchors must not replace the cue.
- Countries with multiple map components must remain visually one semantic Country when highlighted after an incorrect answer.
- A target in a proficiency-filtered session reveals the full active subregion on an incorrect answer, not just the proficiency-filtered Countries.
- A target in a failed-Country retry reveals the full active subregion on an incorrect answer, not just the retry subset.
- Countries disabled/removed from the active World Countries population are not reintroduced into wrong-answer context.
- Explicit isolated-Country zoom must work for Oceania and other geographies where generic learning-map zoom behavior is intentionally broader.
- A correct answer must not briefly flash the subregion before the next question.
- An incorrect answer must not reload the SVG when switching to subregion context.
- Existing map errors must not corrupt the Drill queue or record an answer automatically.

## Out of scope

- Changing the existing `Countries`, `Countries + Capitals`, or `Countries from Capitals` mode semantics.
- Adding Shape-to-Country to core World mastery, Today, Learning Readiness, or Recite.
- Adding a reverse `Country -> Shape` task.
- Creating new map assets or editing source SVG Country shapes.
- Shape normalization, rotation, silhouette simplification, scale normalization, or generated outline assets.
- Changing the synthetic tiny-Country/task-assistance authoring model.
- Adding a new geography selector or shape-specific setup screen.
- Adding a separate answer matcher, feedback component, results screen, or retry system.
- Broad refactoring outside World Countries.

## Acceptance criteria

- [ ] Drill setup exposes a fourth mode named **Country for Shape**.
- [ ] The mode uses the same existing World Countries geography selector in the left rail.
- [ ] Starting the mode uses the ordinary Drill queue/order/session machinery for the selected scope.
- [ ] Before an answer, only the questioned Country's real source-map geometry is visible and no Country name is shown.
- [ ] The map explicitly zooms to fit the complete target Country geometry within the available map surface.
- [ ] Multipart Countries display all mapped components belonging to the Country.
- [ ] Synthetic task-assistance dots/anchors are not used as the shape prompt.
- [ ] Country answers use the existing Country-name alias, normalization, fuzzy, keyboard, feedback, and transition behavior.
- [ ] A correct answer keeps the isolated-Country view through the normal success dwell and advances without revealing the subregion.
- [ ] An incorrect answer uses the normal incorrect feedback/correction and, during that dwell, zooms to the target subregion, reveals the other active Countries in that subregion, and highlights the correct Country.
- [ ] The incorrect-answer isolated-to-subregion transition occurs without remounting/reloading the underlying SVG.
- [ ] Wrong-answer subregion context is derived from the active World Countries population rather than the current proficiency/retry session subset.
- [ ] The new mode records evidence only as `shape-to-country` through the existing World Countries recall-target path.
- [ ] `shape-to-country` has its own proficiency perspective and can be used by existing proficiency-based Drill scoping.
- [ ] Shape evidence does not change `location-to-country`, `country-to-capital`, or `capital-to-country` evidence.
- [ ] Shape evidence does not alter the current core World-mastery finish line, Today core semantics, or Learning Readiness core semantics.
- [ ] Existing persisted Drill mode preferences accept and restore `Country for Shape`.
- [ ] Existing Drill completion/results behavior works for the new mode.
- [ ] Existing **Retry failed countries** behavior works for the new mode without a separate retry implementation.
- [ ] Existing Drill modes and map interaction behavior remain unchanged.
- [ ] Focused tests cover isolated shape presentation, incorrect subregion reveal/highlight, correct non-reveal, evidence skill recording, proficiency/retry subset context, multipart geometry, and regression behavior.

## Source anchors

- `src/features/world-countries/drill/drillModes.ts`
- `src/features/world-countries/drill/drillPreferences.ts`
- `src/features/world-countries/drill/drillSessionState.ts`
- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/drill/DrillSetup.tsx`
- `src/features/world-countries/drill/DrillSetupRails.tsx`
- `src/features/world-countries/drill/drillProgressPresentation.ts`
- `src/features/world-countries/learning/recallTargets.ts`
- `src/features/world-countries/learning/recallAnswerMatching.ts`
- `src/features/world-countries/learning/progressPresentation.ts`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/drill/DrillSession.test.tsx`
- `src/features/world-countries/drill/WorldCountriesDrill.test.tsx`

## Documentation impact

Implementation changes documented current state and therefore must update:

- `docs/architecture/features/WORLD_COUNTRIES.md`
  - Drill owns four modes rather than exactly three.
  - Add `Country for Shape` / `shape-to-country`.
  - Document isolated-shape question behavior and wrong-answer subregion reveal at the appropriate level.
- `docs/architecture/PERSISTENCE.md`
  - Add `shape-to-country` to the documented World Countries recall-skill namespace.
  - Keep the documented core-skill set unchanged.

No ADR is expected.

When delivery is complete, mark this Change Spec `Implemented` and record verification evidence below.

## Verification

- Implemented and verified on 2026-08-22.
- Evidence:
  - Focused mode, matching, map-seam, session, proficiency, evidence, and retry tests: 37 tests passed.
  - Real bundled-SVG integration checks cover isolated tiny Andorra, multipart United Kingdom, Oceania Nauru, absence of synthetic task targets, and isolated-to-subregion updates on the same SVG.
  - `npx vitest run --no-cache src/features/world-countries`: 84 files and 378 tests passed.
  - `npm run typecheck` passed.
  - In-app browser manual verification was unavailable in this environment; the representative interaction checks above use the real bundled SVG/controller path instead.
