# Implementation Prompt - Change Spec 0029: Country for Shape Drill mode

Implement Change Spec **0029 - Country for Shape Drill mode** in repository `JolleNo10/major-system-app`.

## Scope

Work only in the **World Countries / Countries** feature except where an existing shared contract genuinely requires a minimal change.

The authoritative delivery contract is:

- `docs/changes/0029-country-for-shape-drill-mode.md`

Before editing, read and follow:

1. `/CLAUDE.md`
2. `/AGENTS.md`
3. `/src/features/world-countries/AGENTS.md`
4. `/docs/architecture/features/WORLD_COUNTRIES.md`
5. `/docs/architecture/PERSISTENCE.md`
6. `/docs/changes/0029-country-for-shape-drill-mode.md`

Also inspect Change Spec 0028 where useful for the existing failed-Country retry behavior.

## Required outcome

Add a fourth normal Drill mode, **Country for Shape**:

- reuse the existing global geography selector;
- ask the learner to identify a Country from its isolated real map shape;
- before answering, hide every other Country and explicitly fit the target Country;
- reuse the existing Country-name answering/matching/fuzzy/keyboard/feedback lifecycle;
- on a correct answer, keep the isolated shape until the ordinary transition;
- on an incorrect answer, keep the same mounted map, zoom to the target Country's subregion, reveal the other active Countries in that subregion, highlight the correct Country, then advance using ordinary incorrect-feedback timing;
- integrate with ordinary Drill proficiency, results, persistence, and Retry Failed Countries.

## Architecture and data decisions already made

These are part of the Change Spec; do not reopen them unless current repository state makes one impossible.

### New recall skill

Add:

`shape-to-country`

It is an **additional** World Countries recall skill.

Do not record these answers as `location-to-country`.

Do not add `shape-to-country` to the current core World-mastery/Today/Learning Readiness skill set.

Use the existing opaque recall target format:

`world-countries:shape-to-country:<CountryId>`

Do not introduce a persistence schema migration solely for this namespace extension.

### Country answer matching

Reuse the existing Country-name answer classifier and candidate behavior.

Do not add a shape-specific matcher, alias table, fuzzy algorithm, answer component, or timing model.

### Map behavior

Use actual source-map Country geometry.

Do not:

- redraw or generate silhouettes;
- normalize scale;
- rotate Countries;
- simplify geometry;
- substitute synthetic tiny-Country dots/anchors for the shape cue.

Multipart Countries must show all source geometry owned by that Country.

Extend the existing Country-aware map seam with generic caller-controlled visibility and explicit Country zoom inputs if needed. Keep Country-to-SVG translation inside the map adapter/component layer.

`SvgMapView` / `SvgMapController` already provide declarative hidden/highlight/zoom capabilities; use those rather than introducing a second map path.

The transition from isolated shape to incorrect-answer subregion context must not remount or reload the SVG.

Explicit zoom requested by this mode must override generic learning-map auto-zoom exceptions where necessary, including Oceania.

### Wrong-answer context population

Do not derive context only from the Drill queue.

The current session may be:

- proficiency-filtered;
- a failed-Country retry;
- another explicit transient subset.

For an incorrect answer, show the target among the other **active World Countries in its subregion**.

Answer candidates and session progression still use the session queue. Geographic feedback context uses the active feature population.

## Likely implementation seams

Start from these seams, but follow current code rather than blindly editing every file:

- `src/features/world-countries/drill/drillModes.ts`
- `src/features/world-countries/learning/recallTargets.ts`
- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- existing Drill progress/preference/setup/results code where generic mode/skill registries require extension.

Prefer extending registries/generic seams so existing setup, persisted mode preference, progress perspective, completion, and Retry Failed Countries behavior work naturally.

Avoid unrelated refactors.

## Tests

Add focused tests that protect meaningful behavior, including at least:

- fourth mode is selectable;
- `shape-to-country` is the mode's evidence/proficiency skill;
- isolated question view exposes only the target Country and explicitly zooms to it;
- Country name is not revealed by the map before answer;
- multipart Country geometry is preserved;
- no synthetic task-assistance geometry is used as the prompt;
- exact correct does not reveal the subregion;
- existing fuzzy/remediation behavior remains shared;
- incorrect answer reveals the full active subregion and highlights the target;
- proficiency/retry subsets still reveal non-session active Countries in the target subregion;
- isolated -> incorrect-context transition does not force SVG reload/remount where the current test seams can assert it;
- Retry Failed Countries works for the new mode through the generic workflow;
- existing three Drill modes remain unchanged.

Do not overfit tests to private implementation details when observable component/controller contracts can verify the behavior.

## Documentation

Because current-state docs enumerate the existing modes/skills, update:

- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/architecture/PERSISTENCE.md`

Keep the existing core skill semantics unchanged.

Do not create an ADR unless implementation discovers a genuinely new durable architecture decision not already covered by the current docs and Change Spec. If that happens, stop that architectural choice from being implicit: create the minimal ADR and link it from the Change Spec.

## Verification

Use progressive verification:

1. focused tests for changed helpers/components;
2. `npx vitest run src/features/world-countries`;
3. `npm run typecheck`.

Also manually verify representative cases:

- normal contiguous Country;
- multipart/archipelago Country;
- tiny Country;
- Oceania Country;
- incorrect answer in a proficiency-filtered or Retry Failed Countries session.

After successful verification:

- update `docs/changes/0029-country-for-shape-drill-mode.md` to `Status: Implemented`;
- fill in its Verification section with actual evidence;
- ensure architecture docs describe the resulting current state.

Do not mark the Change Spec implemented before verification passes.
