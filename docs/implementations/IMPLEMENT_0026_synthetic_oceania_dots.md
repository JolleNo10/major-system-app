# Implementation prompt — Change Spec 0026

Implement **Change Spec 0026 — Add task-scoped synthetic dots for visually weak Oceania countries** in repository `JolleNo10/major-system-app`, restricted to **World Countries / Countries**.

## Mandatory loading

Before editing:

1. Read `src/features/world-countries/AGENTS.md`.
2. Read `docs/architecture/features/WORLD_COUNTRIES.md`.
3. Read Change Spec 0026 in full.
4. Read Change Spec 0025 and ADR 0031 because 0026 must extend, not replace, their task-pointer architecture.
5. Inspect the current bundled Oceania SVG and the existing map metadata / learning-anchor validation path.

Do not inspect or modify unrelated feature areas unless a direct dependency requires it.

## Implementation intent

Add exactly one map-owned, task-scoped synthetic dot for:

- Samoa (`WS`)
- Solomon Islands (`SB`)
- Vanuatu (`VU`)

These Countries have genuine map geometry, but it is too visually weak/fragmented to serve as a convenient dot-like target at Oceania task scale.

The synthetic dots must behave like existing native tiny dots inside the shared task-assistance pipeline.

## Critical constraints

- Do **not** edit the bundled SVG to draw the dots.
- Do **not** add Country-name/ID conditionals to `SvgMapController`, Drill, Learning, Practice, Today, or generic UI behavior.
- Add declarative map metadata keyed by `mapId + CountryId`.
- Use an explicit authored map-space point for each Country and validate it against the source asset.
- Exactly one synthetic dot per confirmed Country, including Solomon Islands.
- When a configured synthetic dot is active for answer selection, do not also generate a cloud of compact-component assistance points for that Country.
- Original source geometry remains directly clickable and authoritative for semantic styling, identity, labels, and zoom/bounds.
- Synthetic dot position does not participate in geography `getBBox()` / zoom bounds.
- Synthetic dots are task-scoped. They do not appear on normal Geography/setup/progress/navigation maps.

## Reuse existing behavior

Native geometry-derived interaction points and synthetic points must converge into the same:

- task pointer-intent resolver;
- screen-space hit radius;
- hover enlargement;
- ring/marker styling;
- task-hover Country color;
- click dispatch;
- reduced-motion behavior;
- resize/zoom/expanded-mode recomputation;
- cleanup lifecycle.

Do not create a second synthetic-specific hover/click state machine.

The invariant from 0025 remains mandatory:

> At a given pointer coordinate, the Country shown with task hover color is the Country a click at that same coordinate submits.

## Task-target behavior

For explicit `Which country is this?` / location-target presentation, allow the configured synthetic point to provide the one representative target peg for these Countries through the existing task-target semantics.

Do not merge task-target state with answer-selection state.

## Placement

Inspect the real Oceania asset and choose one visually useful point for each Country:

- on/within the visual island group;
- not an arbitrary total-bounding-box center in open water;
- avoiding unnecessary collision with another Country;
- visually consistent with the placement of native dot Countries.

Persist the chosen coordinates as map metadata; do not derive a fresh arbitrary position at runtime.

## Tests

Implement all tests required by Change Spec 0026, including:

- metadata validation and exactly-one-dot assertions for `WS`, `SB`, `VU`;
- source staleness/fingerprint validation;
- synthetic dot absent outside task semantics;
- visible at rest during answer-selection;
- same hover size/hit radius/task-hover color pipeline as native dots;
- hover/click identity consistency;
- real source geometry still selectable;
- no extra component halos for configured synthetic Countries;
- hidden/out-of-scope cleanup;
- task-target behavior;
- real bundled Oceania integration for all three Countries;
- regression comparison with at least one native-dot Country.

Do not satisfy the main regression with mocked `CountryLearningMap` / mocked controller boundaries.

## Documentation

Update `docs/architecture/features/WORLD_COUNTRIES.md` only as required by 0026. Do not add a new ADR unless implementation proves that ADR 0031's ownership/invariants actually need to change.

## Validation

Run:

```bash
npx vitest run src/features/world-countries
npm run typecheck
```

Then perform the manual browser verification required by Change Spec 0026 for Samoa, Solomon Islands, Vanuatu, a native-dot control Country, and a normal non-task Oceania map.

Do not mark the spec Implemented until the browser checks pass.

## Completion report

At completion, report concisely:

- files changed;
- where synthetic-dot metadata lives;
- the chosen point strategy/coordinates for `WS`, `SB`, `VU`;
- how synthetic/native task points converge into one runtime path;
- tests added/updated;
- validation results;
- manual browser verification results;
- any deviation from Change Spec 0026 and why.
