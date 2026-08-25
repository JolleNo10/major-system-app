# Implementation Prompt - Change Spec 0037

Implement **Change Spec 0037 - Map-based Country click-order authoring** in
`JolleNo10/major-system-app`.

Repository scope is strictly **World Countries / Countries**. Do not inspect or
modify unrelated feature areas unless required by a dependency of this change.

Read first:

1. `docs/changes/0037-world-countries-map-click-country-order.md`
2. `docs/changes/0035-world-countries-click-sequence-country-order.md`
3. `docs/architecture/features/WORLD_COUNTRIES.md`
4. The source anchors listed by Change Spec 0037.

## Implementation intent

0035 already implemented the semantic click-sequence behavior inside the
Country-order editor. Do not create a second implementation for the map.

The required architecture is:

```text
rail Country activation ─┐
                         ├─> one click-sequence owner ─> rail presentation
map Country activation  ─┘                         └─> map presentation
```

The map is the primary pointer surface during `Click order`; the rail remains
the visible sequence/status representation and keyboard-accessible secondary
surface.

## Required engineering approach

- First inspect the current implementation and verify the assumptions in the
  spec against actual code.
- Identify the narrowest common owner for 0035's `clickMode`,
  `clickSequence`, sequence positions, completeness, restore-on-abandon, Save
  gating, and toggle behavior.
- Refactor/extract/lift those semantics only as needed so map and rail use the
  same state.
- Do **not** duplicate click-sequence state in `CountryLearningFlow`,
  `CapitalLearningFlow`, `CountryLearningMap`, or `SvgMapController`.
- Use the existing `LearningMapSurface` / `CountryLearningMap.onCountryClick`
  path to route map Country activation to the shared sequence owner.
- Keep generic map components workflow-neutral. They may accept generic
  presentation inputs such as Country-ID-to-label/position mappings or a
  selectable Country collection, but they must not contain Country-order
  authoring rules.
- During order editing, map clickability must use the full order-authoring
  membership, not only the current staged-learning `scopeCountries`.
- Ensure partial sequence positions appear on the map and stay synchronized
  after append, remove, and renumber operations.
- Preserve all 0035 semantics for incomplete/complete sequences, Save, Cancel,
  failed Save, Reset canonical, map auto-order, and switching back to
  drag/drop.
- Apply the capability consistently to both Country Learning and Capital
  Learning.
- Preserve existing tiny-country, multipart Country, fullscreen/expanded map,
  Learning task, and Drill map-click behavior.

## Verification requirements

Add or update tests at the correct seams. Do not satisfy this change only with
mocked callback tests.

At minimum prove:

- a real SVG Country click in Learning reaches the click-sequence state;
- the rail updates after a map click;
- the map displays the same assigned position;
- clicking the selected Country again removes it and renumbers later entries;
- all Countries in the full authoring membership are clickable even when the
  current Learning stage contains only a subset;
- an out-of-membership Country is rejected;
- Save gating and persistence remain unchanged;
- switching/cancel/reset/auto-order retain 0035 behavior;
- Country and Capital Learning do not diverge;
- existing map-click task tests remain green.

Run the focused tests first, then:

```bash
npx vitest run src/features/world-countries
npm run typecheck
```

Fix failures caused by the change. Do not weaken existing assertions merely to
make tests pass.

## Documentation and completion

Update `docs/architecture/features/WORLD_COUNTRIES.md` to describe the resulting
current state.

Do not rewrite historical Change Spec 0035.

When complete:

- update Change Spec 0037 status to `Implemented`;
- fill its Verification section with the actual evidence;
- summarize the implementation in terms of behavior and architectural seams,
  not a file-by-file diary.
