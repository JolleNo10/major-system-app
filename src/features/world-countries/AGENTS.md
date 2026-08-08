# World Countries feature guide

## Feature purpose

This feature provides the country/capital drill and an interactive SVG map workarea. It owns the country dataset, quiz question/answer rules, map definitions, and SVG discovery/highlight behavior. It does not own application mode registration, global answer-mode selection, shared layout/UI primitives, persistent scoring, or remote geographic data.

## Scope and discovery boundaries

- Treat `src/features/world-countries/` as the default discovery and modification scope. Start with this guide, `index.ts`, and the relevant subdirectory.
- You may inspect a directly imported file outside this directory when needed to understand a shared type, layout/UI contract, asset handling, or a failing test/typecheck/build. Likely legitimate targets are `src/core/types.ts`, `src/core/ui/`, `src/app/layout/PageLayoutContext.tsx`, `src/app/modes.tsx`, and the root Vite/Vitest configuration.
- Do not scan sibling features for examples or general context. Prefer the contracts recorded here over rediscovering the repository.
- Modify files in this feature only by default. Outside files are inspect-only unless the requested behavior truly crosses a public boundary. Before changing one, identify the dependency and explain why the feature-local change is insufficient.

## Architecture map

- `index.ts` — public feature API: `WorldCountriesDrill`, `countries`, `Country`, and `Continent`.
- `data/countries.ts` — static country/capital/continent/subregion records used by the quiz.
- `quiz/CountryCapitalDrill.tsx` — feature entry UI; owns Quiz/Workarea selection and all in-memory quiz session state.
- `quiz/countryQuiz.ts` — pure normalization, answer matching, country selection, and distractor construction.
- `workarea/MapWorkarea.tsx` — React adapter for the imperative SVG controller; owns workarea controls and publishes the country rail.
- `common/worldMap.ts` — registry connecting map assets to demo IDs and hover groups.
- `common/SvgMapController.ts` — framework-independent SVG loading, validation, structural country discovery, rendering, hover/group, color, name, and outline behavior.
- `assets/MapChart_Map_Europe_names.svg` — current map source; its element structure and IDs are part of the controller/map-definition contract.
- Colocated `*.test.ts` files cover quiz helpers, map registry expectations, and the controller's DOM behavior.

## Important execution and data flow

The application renders `WorldCountriesDrill` from `index.ts`. The component publishes its Quiz/Workarea switch with `useLayoutHeader`.

- Quiz: filter/direction interaction -> `CountryCapitalDrill` builds a pool -> `pickCountry` and `buildCountryQuestion` create a question -> `MultipleChoice` or `TypingInput` returns an answer -> `matchesPlaceName` scores it -> local score/streak/coverage state updates -> the next question appears after 1.4 seconds. Changing direction remounts the quiz; changing a geographic filter resets the session.
- Workarea: `MapWorkarea` selects a `MAP_DEFINITIONS` entry -> creates `SvgMapController` -> `load({ url })` fetches, validates, imports, and discovers the SVG -> discovered demo countries populate the right rail -> control handlers update the controller and mirror active IDs in React state. Changing the map definition is the only normal reload path; unmount destroys the controller.

## Public boundaries and external dependencies

- Consumers must import the public symbols from `@/features/world-countries`, not internal paths. `src/app/modes.tsx` is the current UI consumer.
- `AnswerMode` comes from `src/core/types.ts`; answer widgets and score display come from `src/core/ui/`.
- `useLayoutHeader` and `useRails` from `src/app/layout/PageLayoutContext.tsx` place feature chrome and the workarea country controls in the shared page layout. Their dependency arrays must remain referentially stable enough to avoid republish loops.
- Vite's `?url` and `?raw` SVG imports are used by runtime map loading and DOM tests respectively. The map URL is a bundled local asset; there is no backend/API boundary.
- `SvgMapController` uses browser `fetch`, `DOMParser`, SVG DOM APIs, and pointer events. Its test explicitly selects the jsdom environment.

## Local conventions and invariants

- `Country.country` is the quiz identity and immediate-repeat key. Quiz options exclude duplicate answer strings and prefer distractors from the same subregion, then continent, then elsewhere.
- Typed place names are case-, accent-, punctuation-, and whitespace-insensitive; compact whitespace variants such as `Washington DC` and `NDjamena` are accepted.
- Quiz statistics are session-only. Filtering, direction changes, and Reset clear score, streak, and coverage; do not add persistence implicitly.
- A discoverable SVG country is a single sibling `<path>` paired with a non-empty `<text id="*_label">` in the same parent. The path ID is the country ID; label IDs need not match it (the Europe asset's Switzerland label is the tested exception).
- IDs in `demoCountryIds`, `hoverGroups`, color maps, and outline definitions must exactly match discovered SVG path IDs. Unknown IDs are reported by controller mutation results rather than treated as countries.
- Loaded SVG is untrusted input: scripts/embedded elements and non-fragment external references are rejected. Preserve that validation when extending loading.
- The controller owns DOM styles/listeners and restores or removes them in `destroy()`. React owns control state; keep the adapter/controller boundary explicit.
- The map mount has an accessible `role="img"` label reflecting selected countries; individual imported SVG content is `aria-hidden`.

## Where changes should go

- Country/capital or geographic classification change -> `data/countries.ts`.
- Question choice, matching, normalization, or distractor change -> `quiz/countryQuiz.ts` and its tests.
- Quiz layout, filters, score, direction, or session behavior -> `quiz/CountryCapitalDrill.tsx`.
- Workarea controls or React/layout integration -> `workarea/MapWorkarea.tsx`.
- Add a map or alter its configured demos/groups -> `assets/` plus `common/worldMap.ts`; verify asset IDs structurally.
- Reusable SVG discovery, sanitization, highlighting, colors, hover, labels, or outlines -> `common/SvgMapController.ts` and its jsdom tests.
- Change what other application areas can import -> `index.ts`; update an outside consumer only when the public contract requires it.

## Validation

The developer machine may not have Node/npm. Detect them first. With a host toolchain:

```powershell
npx vitest run src/features/world-countries
npx tsc -b
```

Without one, use the Compose-built image and its isolated `/app/node_modules` volume:

```powershell
docker compose run --rm app sh -c "npx vitest run src/features/world-countries"
docker compose run --rm app sh -c "npx tsc -b && npx vite build"
```

Run the targeted tests for feature-local logic. Run typecheck/build when changing React integration, public exports, SVG imports/assets, or external contracts. If dependencies changed, rebuild first with `docker compose build app`.

## Known traps

- The country quiz dataset and the Europe SVG are separate data sources; their names/coverage are not automatically synchronized.
- `MapWorkarea` intentionally keeps live controller settings out of its load effect. Adding them to that effect reloads the SVG and clears selections on every toggle.
- `SvgMapController.test.ts` exercises both synthetic markup and the real SVG asset; seemingly cosmetic asset restructuring can break discovery.
