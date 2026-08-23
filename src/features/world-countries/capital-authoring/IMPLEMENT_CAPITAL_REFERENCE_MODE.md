# Implementation Prompt — Capital Authoring Reference Mode

Implement the attached branch-tool specification in:

- repository: `JolleNo10/major-system-app`
- branch: `tool/capital-map-authoring`
- feature scope: `World Countries`
- primary code scope: `src/features/world-countries/capital-authoring/`

Read before implementation:

1. `AGENTS.md`
2. `src/features/world-countries/AGENTS.md`
3. `docs/architecture/features/WORLD_COUNTRIES.md`
4. `BRANCH_TOOL_CAPITAL_REFERENCE_MODE.md`

This is **branch-only developer tooling**. Do not create a numbered change spec or ADR and do not generalize the feature into production architecture.

Implementation intent:

- Add an on-demand Reference mode to the existing capital authoring editor, optimized for use while `MapSurface` is expanded/fullscreen.
- Keep the same mounted editor/map; do not create a separate fullscreen editor, route, modal, or workflow.
- Add checked-in authoring-only capital/country geographic reference coordinates. Do not fetch the coordinate dataset at runtime and do not add these fields to the canonical `Country` model.
- Add a compact reference panel with the current canonical capital/country, an OpenStreetMap preview, Google Maps / OSM / image-search links, coordinates, and an approximate position clue.
- Add a visually distinct, non-interactive **approximate ghost target** to the existing SVG authoring overlay.
- Derive that target with a small, deterministic, tested branch-local geographic→SVG heuristic based on measurable Country SVG positions plus checked-in geographic references. Prefer a local Country-anchored delta derived from a fitted affine transform rather than pretending the source SVG has a formally known projection.
- Be conservative: if inputs/calibration are inadequate or the result is implausible, show reference unavailable rather than a misleading marker.
- Reference mode must never create, accept, or mutate an authoring placement by itself.
- Do not change existing dot-candidate semantics, manual placement, unresolved behavior, arrow nudging, navigation, or import/export.
- Keep `CAPITAL_AUTHORING_SCHEMA_VERSION = 1`; reference data and ghost-target state must never enter exported authoring JSON.
- Avoid changing shared `MapSurface`, production `SvgMapController`, learning anchors, synthetic dots, or other feature areas unless absolutely necessary. If a shared change appears necessary, first prove why a branch-local composition cannot solve it.
- Preserve graceful operation when external map content is unavailable/offline.

Work incrementally and keep responsibilities separated: reference data, pure projection/math, URL construction, panel presentation, and SVG overlay rendering should not become one large editor component.

Testing/verification requirements:

- Add focused tests for reference-data integrity, URL generation, projection/sanity behavior, 3×3 positional clues, and Reference-mode UI lifecycle.
- Prove toggling/navigating Reference mode does not create or mutate placements.
- Preserve existing capital-authoring tests.
- Finish with:

```bash
npx vitest run src/features/world-countries/capital-authoring
npx vitest run src/features/world-countries
npm run typecheck
```

Do not stop at a design-only result. Implement the change, run the relevant verification, fix failures caused by the change, and report the files changed, the projection/reference-data approach actually used, known reference-data exceptions, and final test/typecheck results.
