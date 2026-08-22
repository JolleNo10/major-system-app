# Change Spec 0024 - Correct tiny-Country anchor derivation and SVG coordinate handling

- **Status:** Ready
- **Date:** 2026-08-22
- **Issue:** None.
- **Related ADRs:** [ADR 0030 - Derive unambiguous tiny-Country anchors from map geometry](../adr/0030-derive-unambiguous-tiny-country-anchors-from-map-geometry.md)
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)
- **Supersedes:** [Change Spec 0023 - Correct tiny-Country task assistance](0023-correct-tiny-country-task-assistance.md) for anchor eligibility, hover resolution, and coordinate handling. Preserve its explicit task-scoping model.

## Goal

Make tiny-Country assistance reliable and consistent across real maps: simple dot-like Countries are discovered automatically from map geometry, every eligible candidate gets identical hover/click assistance regardless of the current answer, ambiguous multi-dot Countries keep an explicit representative anchor, and all generated assistance is positioned/hit-tested correctly through SVG transforms.

This is a corrective refactor of the current task-assistance implementation, not another Country-specific patch.

## User-visible behavior

In a map-click exercise such as `Find Andorra`:

- Andorra, San Marino, Vatican City, and every other eligible tiny candidate in the active answer scope behave consistently.
- Hovering the forgiving area around any eligible tiny candidate enlarges that candidate only.
- Leaving restores the normal source appearance.
- The fact that Andorra is the correct answer does not make Andorra uniquely hoverable or enlarged before feedback.
- Clicking the forgiving area selects the same Country as clicking the real SVG geometry and fires one answer callback.

On Oceania and other transformed SVG assets:

- generated markers/rings/halos appear on the actual Country location, not at a fixed or offset root-SVG position;
- resizing, expanded-map presentation, and zoom do not detach assistance from the source geography.

For a multi-dot Country such as Micronesia:

- one explicit representative anchor receives the forgiving halo and visual assistance;
- direct clicks on any genuine selectable source component still select Micronesia;
- hovering another real component does not make a marker jump to the representative point.

Ordinary geography/setup/progress maps retain original source geometry and do not gain task-only assistance.

## Scope

- Replace the current "metadata record required for every tiny Country" behavior with automatic geometry-derived anchors for unambiguous compact Country representations.
- Keep explicit map-owned representative-anchor metadata only where the source representation is ambiguous/distributed or an intentional override is required.
- Correct all task-assistance coordinate calculations so source geometry, generated elements, pointer coordinates, hit radii, and nearest-target resolution use compatible coordinate spaces.
- Make answer-selection hover independent from generic hover styling and independent from the correct answer.
- Preserve explicit task semantics introduced by ADR 0029/Change Spec 0023: answer-selection candidates and task target remain separate from ordinary selectability/highlight state.
- Preserve direct source-geometry clicks and existing Country-to-SVG translation.
- Update tests and current-state architecture documentation.

## Interaction and states

### Answer-selection rest

- Source SVG geography remains unchanged.
- Eligible simple tiny candidates have an invisible forgiving interaction target.
- No visible marker identifies the correct answer.
- Eligibility is the same for all candidates with equivalent map geometry.

### Answer-selection hover

- Entering an eligible tiny candidate's forgiving region makes only that candidate visibly larger/emphasized.
- Hover behavior works even when ordinary `hoverHighlight` / `hoverShowName` are disabled.
- Leaving removes hover-only emphasis.
- Moving between overlapping halos resolves deterministically to the nearest eligible anchor after direct source-geometry hits are considered.

### Task target

- When an eligible tiny Country is intentionally the location question/correction target, its assistance marker may remain visibly enlarged for the target state as already defined by the task-assistance contract.
- This persistent target state is separate from answer-selection hover.
- Changing/clearing the task target removes stale generated state.

### Reduced motion

- No continuous pulse is required.
- Static size/state changes remain understandable without animation.
- Existing reduced-motion behavior must remain honored.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and ADR 0030.
- Tiny-geometry detection, anchor resolution, coordinate transforms, generated hit geometry, marker presentation, and overlap resolution remain in `src/features/world-countries/maps/`.
- Workflow components may declare answer-selection Country IDs and/or the task target only. They must not know which Countries are tiny or where anchors are located.
- Do not add hard-coded workflow/UI lists for Andorra, San Marino, Vatican City, Nauru, Micronesia, or any other Country.
- Do not mutate bundled SVG assets to enlarge tiny Countries.
- Do not use the current correct answer to decide which answer-selection candidate receives hover/click assistance.
- Do not preserve the existing single-dot metadata list as an authoritative eligibility allowlist.
- Do not compare screen/client pointer coordinates with untransformed Country-local SVG coordinates.
- Do not copy points from a transformed Country group into a root-level overlay without applying the required transform.
- Keep the controller workflow-agnostic: no Drill/Today/Practice mode names or correctness semantics in `SvgMapController`.

## Existing capabilities to reuse

- `src/features/world-countries/maps/SvgMapController.ts` — shared SVG discovery, source-path interaction, task-assistance lifecycle, screen-space sizing, cleanup, and reduced-motion behavior.
- `src/features/world-countries/maps/SvgMapView.tsx` — declarative adapter that carries task-assistance state into the controller.
- `src/features/world-countries/maps/CountryLearningMap.tsx` (or current equivalent) — canonical Country ID -> map/SVG adapter and task-semantics seam.
- `src/features/world-countries/maps/learningAnchors.ts` — retain as the map-owned explicit-decision contract for ambiguous/distributed representatives; refactor away from simple-dot allowlisting.
- Existing Country discovery/path pairing and Country-to-SVG translation — do not duplicate identity mapping.

## Automatic anchor derivation requirements

The exact internal algorithm is implementation detail, but the observable contract is not.

For each active answer-selection/task-target Country with no explicit ambiguous override:

1. inspect its actual source Country geometry in the loaded map;
2. decide whether the representation is a compact, unambiguous learning location using a shared map-level rule;
3. if eligible, derive the anchor from that compact source geometry;
4. if the representation is materially distributed/ambiguous, do not invent a representative point automatically.

The eligibility decision must be stable for the map asset. Resizing, entering expanded map mode, or zooming must not cause a Country to repeatedly enter/leave the "tiny Country" classification. Use source/default-map geometry or an equivalent stable basis for classification; use current screen-space transforms only to size/position the generated interaction aid.

The shared rule must avoid both failure modes:

- a normal Country with a mainland plus small islands is not classified as tiny because one component is small;
- a distributed island Country is not assigned the center of its overall bounding box as its learning peg.

Explicit metadata continues to be authoritative when a representative point is deliberately authored for ambiguous/distributed geometry.

## SVG coordinate-space requirements

Generated assistance must remain attached to geography across maps with transformed ancestors.

The implementation must satisfy these invariants:

- a source-derived anchor is converted into the coordinate space used by the generated marker/halo before positioning it;
- an authored representative point is interpreted in its documented source/map space and transformed into the generated layer's space when necessary;
- pointer hit/nearest-distance calculations compare positions expressed in one common space;
- fixed target sizes are screen-space usability sizes even when coordinates are stored/rendered in SVG user units;
- transformations are recomputed when the viewBox, rendered size, zoom area, or relevant SVG transforms change;
- no map-specific transform constants or hand-tuned Oceania offsets are introduced.

A valid implementation can satisfy this by sharing the source ancestor transform or by using SVG CTM/screen-CTM matrix conversion. The Change Spec intentionally does not prescribe which internal representation is chosen.

## Pointer and overlap behavior

Resolve answer intent in this order:

1. direct hit on real selectable Country geometry wins;
2. otherwise, among active tiny assistance regions containing the pointer, choose the nearest anchor in a common coordinate space;
3. deterministic tie-break; never rely on accidental DOM insertion order.

Additional requirements:

- one click dispatches one Country callback;
- hidden/out-of-scope Countries have no active forgiving target;
- a tiny halo must not make a neighboring normal Country unreachable;
- task hover state must be cleared when the pointer leaves, the candidate scope changes, the map reloads, or task assistance becomes inactive.

### Multi-dot source hover

A Country path may contain multiple separated subpaths but still be one SVG path element. If the controller cannot identify which subpath is under the pointer, generic source-path hover MUST NOT be allowed to move the assistance marker to the configured representative anchor.

For an explicit multi-dot representative:

- the representative halo itself may drive task-assistance hover;
- direct source clicks anywhere on the Country remain valid;
- non-representative source-component hover may use existing generic map hover semantics, but must not create spatially false representative-marker movement.

## Edge cases

- **San Marino / Vatican City absent from explicit metadata:** still receive assistance when their source geometry qualifies automatically.
- **Correct answer versus other candidates:** when asked `Find Andorra`, hovering San Marino or Vatican City behaves the same as hovering Andorra before answer resolution.
- **Transformed map groups:** marker and hit target remain centered on the source Country after transforms.
- **Expanded map / resize:** hit target remains usable and marker remains geographically aligned without remounting the map.
- **Zoom:** assistance stays on the Country and keeps sensible screen-space size.
- **Explicit multi-dot representative:** one halo only; no total-bounds center; no marker jump from hovering another island.
- **Stale explicit anchor:** preserve existing validation/fail-fast behavior rather than silently substituting an automatic representative for an intentionally authored multi-dot decision.
- **No explicit metadata + ambiguous geometry:** do not guess; render source geography/direct-click behavior without forgiving representative assistance until an explicit decision exists.

## Out of scope

- Reworking expanded/focus map layout from Change Spec 0020 / ADR 0028.
- Changing Country/capital learning rules, scoring, question selection, or feedback copy.
- Changing base map colors/status palette.
- Re-authoring bundled SVG geography to make microstates physically larger.
- Building a new anchor editor. Existing/future authoring output may continue to feed explicit ambiguous-anchor metadata.

## Acceptance criteria

- [ ] In Europe location-click practice, Andorra, San Marino, and Vatican City all receive the same forgiving hover/click assistance when each is in the active answer candidate set.
- [ ] With the prompt `Find Andorra`, hovering San Marino enlarges San Marino, hovering Vatican City enlarges Vatican City, and neither behavior depends on Andorra being the correct answer.
- [ ] Leaving each tiny candidate returns it to the normal source appearance.
- [ ] Simple tiny Countries do not require individual entries in `MAP_LEARNING_ANCHORS` (or successor explicit-decision data) merely to receive assistance.
- [ ] No workflow/UI Country-name allowlist is introduced.
- [ ] Nauru or another simple Oceania dot receives automatically derived assistance when eligible.
- [ ] On the transformed Oceania asset, generated assistance is geographically aligned with its Country; no fixed/offset ring appears elsewhere on the map.
- [ ] Micronesia uses exactly one explicit representative assistance anchor and does not use its total bounding-box center.
- [ ] Clicking any real selectable Micronesia source component still selects Micronesia.
- [ ] Hovering a non-representative Micronesia source component does not cause an assistance marker to jump to the representative anchor.
- [ ] Direct real-country geometry wins over overlapping halos; otherwise nearest active anchor wins deterministically.
- [ ] One pointer activation produces one answer callback.
- [ ] Generic `hoverHighlight=false` does not disable task-assistance hover growth.
- [ ] Ordinary geography/setup/progress maps show no task-only tiny marker/halo merely because they are clickable/selectable/highlighted.
- [ ] Assistance remains aligned and usable after resize, standard <-> expanded presentation, and zoom/viewBox changes.
- [ ] Reduced-motion remains respected.
- [ ] Generated task-assistance elements/listeners are cleaned on scope change, reload, and destroy.
- [ ] Tests reproduce real pointer hover/leave/click behavior rather than validating only programmatic clicks on generated elements.
- [ ] Existing World Countries tests pass and type checking succeeds.

## Source anchors

- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/SvgMapController.test.ts`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/CountryLearningMap.tsx`
- `src/features/world-countries/maps/learningAnchors.ts`
- `src/features/world-countries/maps/learningAnchors.test.ts`
- `src/features/world-countries/maps/assets/MapChart_Map_Europe.svg`
- `src/features/world-countries/maps/assets/MapChart_Map_Oceania.svg`
- `src/features/world-countries/drill/DrillSession.tsx`

Use repository discovery to correct any source-anchor filename that has moved; stay within World Countries and direct dependencies.

## Documentation impact

- Add ADR 0030 and mark ADR 0029 `Superseded` by ADR 0030.
- Update `docs/architecture/features/WORLD_COUNTRIES.md` with:
  - task-scoped tiny assistance;
  - automatic anchor derivation for unambiguous compact geometry;
  - explicit representative anchors only for ambiguous/distributed geometry;
  - map-layer ownership;
  - SVG coordinate-space/transform correctness.
- Update this Change Spec to `Implemented` only after verification evidence exists.

## Verification

Before marking `Implemented`:

1. run the nearest map/controller/anchor/workflow tests;
2. run `npx vitest run src/features/world-countries`;
3. run `npm run typecheck`;
4. manually verify at minimum:
   - Europe `Find Andorra`: Andorra, San Marino, Vatican City hover independently;
   - Oceania: at least one simple tiny dot aligns correctly under transformed map geometry;
   - Micronesia representative behavior does not jump from other source components;
   - normal geography/progress map has no task-only augmentation.

Complete after implementation:

- Pending browser-level verification. The focused regression set and typecheck
  are passing; the in-app browser is unavailable in the current environment.
