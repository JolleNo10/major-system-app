# Change Spec 0001 - Unify World Countries map status palette

* **Status:** Ready
* **Date:** 2026-08-11
* **Current-state docs:** [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Make World Countries maps communicate learning status and progress with a smaller, consistent visual language.

The map should make progression toward mastering the world visually obvious:

* grey = geographic context or no relevant Drill evidence;
* amber = practiced but needs work;
* green = strong through mastered.

Memo and Drill keep their existing learning semantics. This change only changes map presentation.

## User-visible behavior

### Visual grammar

Country **fill** communicates learning status.

| Meaning                                                 | Fill      |
| ------------------------------------------------------- | --------- |
| Outside active geographic scope                         | `#303036` |
| Not memoed / neutral                                    | `#52525b` |
| Countries memoed, no relevant Drill evidence            | `#71717a` |
| Countries + Capitals memoed, no relevant Drill evidence | `#a1a1aa` |
| Weak                                                    | `#92400e` |
| Developing                                              | `#d97706` |
| Strong                                                  | `#22c55e` |
| Mastered                                                | `#15803d` |
| Complete                                                | `#15803d` |

Temporary pointer interaction must not introduce another progress-like fill color.

Pointer hover and temporary map selection preserve the resolved semantic fill and use a light neutral outline:

* outline color: `#d4d4d8`
* effective stroke width: at least `2px`

For grouped hover, each participating Country is outlined individually.

### Memo maps

Memo overview maps use only the three Memo readiness greys:

* `NOT_MEMOED` → `#52525b`
* `COUNTRIES_MEMOED` → `#71717a`
* `COUNTRIES_AND_CAPITALS_MEMOED` → `#a1a1aa`

Remove purple and magenta readiness fills.

Memo readiness semantics, progression rules, labels, and stored state do not change.

### Drill maps

Drill setup and results preserve the existing relevant-evidence precedence for each Country in the selected Drill mode:

1. If relevant Drill evidence exists, show Drill proficiency.
2. Otherwise, fall back to the Country's Subregion Memo readiness.

Drill proficiency presentation:

* `WEAK` → `#92400e`
* `DEVELOPING` → `#d97706`
* `STRONG` → `#22c55e`
* `MASTERED` → `#15803d`

Country `Complete` uses the same final green as `MASTERED`:

`#15803d`

`STRONG` must be visibly green but lighter than `MASTERED`.

Strong, Mastered, and Complete remain distinct semantic states even where fill color alone does not distinguish them.

The applicable legend, status description, label, or other existing non-color presentation must preserve those distinctions.

### Geographic context

When a map presents a restricted geographic scope, Countries outside that scope use:

`#303036`

Examples include:

* viewing one Subregion;
* selecting a subset of Subregions for Drill;
* any existing overview-map state that mutes Countries outside the active scope.

Scope muting overrides the visible status fill.

A Country's underlying learning state is not changed. When it returns to the active scope, its resolved semantic status fill is restored.

### Interaction cues

Temporary pointer interaction remains visually separate from learning status.

Normal pointer hover and temporary selection must not replace a Country's semantic status with teal, cyan, or another status-like hue.

Instead:

* preserve the resolved semantic fill;
* apply the neutral `#d4d4d8` outline;
* ensure an effective outline width of at least `2px`;
* outline each Country individually during grouped hover.

Selected geographic scope should normally be communicated through active-vs-muted map contrast rather than a separate status-like selection fill.

This Change Spec does not introduce keyboard focus, keyboard map navigation, keyboard activation, or new SVG accessibility semantics.

### Active Drill recall

Existing recall-safety behavior is unchanged.

During active recall, Memo readiness and Drill proficiency treatments remain suppressed wherever the current architecture requires them to be hidden until feedback.

This change must not reveal target or answer information during recall.

## Scope

* Replace the existing World Countries Memo readiness palette with the defined grey palette.
* Replace Drill proficiency presentation with the defined amber-to-green palette.
* Establish `#303036` as the World Countries map fill for geographic context outside active scope.
* Replace normal teal/cyan pointer-hover or temporary-selection fill behavior with the defined neutral outline where semantic status fills are present.
* Preserve semantic fills during pointer interaction.
* Remove duplicated independently owned Drill progress color values when an existing shared World Countries learning/map presentation seam can provide them.
* Update affected legends and explanatory copy to match the new visual grammar.
* Update automated tests covering affected presentation behavior.

No learning-state migration or persisted-data change is required.

## Interaction and states

### Memo overview

```text
outside scope
  -> context grey

inside scope
  -> Memo readiness grey
```

### Drill setup/results

```text
outside scope
  -> context grey

inside scope + relevant Drill evidence
  -> Drill proficiency

inside scope + no relevant Drill evidence
  -> Memo readiness fallback
```

### Pointer interaction

```text
resolved semantic fill
  + pointer hover / temporary selection
  -> preserve fill
  -> add neutral outline

grouped hover
  -> preserve each Country's resolved fill
  -> outline each participating Country individually
```

Existing non-color descriptions remain available so status is not communicated by color alone.

## Architecture constraints

Follow [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md) and `src/features/world-countries/AGENTS.md`.

Change-specific constraints:

* Learning semantics remain owned by `learning/`.
* Generic SVG/map interaction remains workflow-neutral.
* Memo and Drill must not import each other's internals.
* Memo readiness and Drill proficiency remain distinct semantic models despite sharing a smaller visual vocabulary.
* Raw reusable map presentation tokens may be centralized in the existing map/presentation layer, but semantic state-to-presentation mapping remains with the capability that owns the semantic state.
* Drill must not establish a second independent source of truth for shared proficiency colors.
* Pointer-interaction behavior must not require adding keyboard-focus semantics to the SVG map.
* Do not introduce persistence, new learning evidence, new Country states, or new public feature exports.

## Existing capabilities to reuse

* `maps/SvgMapController.ts`
  Existing owner of SVG styling, hover, highlight, muting, and interaction behavior.

* `maps/SvgMapView.tsx`
  Existing React adapter around map-controller presentation.

* `maps/GeographyOverviewMap.tsx`
  Existing owner of overview-map scope muting, selection presentation, and caller-provided Country colors.

* `learning/progressPresentation.ts`
  Existing reusable World Countries proficiency/status presentation seam.

* `learning/memoReadiness.ts`
  Existing owner of Memo readiness presentation metadata.

* `drill/drillProgressPresentation.ts`
  Existing composition seam for Drill evidence precedence and fallback behavior.

* `drill/DrillProgressLegend.tsx`
  Existing Drill legend and map-cue presentation.

* `memo/MemoMap.tsx`
  Existing thin Memo-specific overview-map wrapper.

Reuse these boundaries rather than introducing a parallel palette/presentation system.

## Edge cases

* A mastered Country outside the current geographic scope appears as `#303036`; returning it to scope restores its mastered green.
* A Country with no relevant evidence for the selected Drill mode continues to use Memo readiness fallback even if it has evidence for another Drill skill.
* `Countries + Capitals` keeps its existing relevant-evidence activation rules.
* Strong and Mastered remain semantically distinct despite both being green.
* Mastered and Complete remain semantically distinct despite sharing `#15803d`.
* Hovering a Weak, Developing, Strong, Mastered, Complete, or Memo-readiness Country must not erase its status fill.
* Grouped hover preserves each participating Country's own resolved fill and outlines each Country individually.
* Existing maps without semantic Country status must continue to have a valid neutral/default presentation.
* Countries that cannot be resolved to map SVG IDs continue to follow existing map-adapter behavior; this change does not alter ID translation.
* Active recall must not expose hidden progress through fill, outline, legend, or another new interaction cue.

## Out of scope

* Changes to proficiency calculation.
* Changes to mastery rules.
* Changes to Country completeness.
* Changes to Memo readiness derivation.
* Changes to Drill evidence precedence.
* Changes to Drill scheduling or question selection.
* Changes to geographic hierarchy or Country/Subregion membership.
* Persistence changes or migrations.
* New user-configurable themes or palettes.
* General application-wide design-token refactoring.
* Keyboard map navigation.
* Keyboard focus or activation of individual SVG Countries.
* New SVG accessibility semantics.
* Redesign of non-map Memo or Drill UI beyond legend/copy needed for this palette.
* Changes to Recite or Maintenance behavior unless required to preserve an existing shared map-presentation contract.

## Acceptance criteria

* [ ] Memo `NOT_MEMOED` Countries render as `#52525b`.
* [ ] Memo `COUNTRIES_MEMOED` Countries render as `#71717a`.
* [ ] Memo `COUNTRIES_AND_CAPITALS_MEMOED` Countries render as `#a1a1aa`.
* [ ] Purple and magenta Memo readiness fills are no longer used on World Countries maps.
* [ ] Drill `WEAK` renders as `#92400e`.
* [ ] Drill `DEVELOPING` renders as `#d97706`.
* [ ] Drill `STRONG` renders as `#22c55e`.
* [ ] Drill `MASTERED` renders as `#15803d`.
* [ ] Country `Complete` uses `#15803d`.
* [ ] Strong and Mastered remain distinguishable through the applicable existing non-color presentation.
* [ ] Mastered and Complete remain distinguishable through the applicable existing legend, status description, label, or other non-color presentation despite sharing `#15803d`.
* [ ] A Country with no relevant evidence for the selected Drill mode still displays its existing Memo readiness fallback.
* [ ] A Country with relevant Drill evidence displays Drill proficiency instead of Memo readiness.
* [ ] Countries outside active geographic scope render as `#303036` regardless of underlying learning state.
* [ ] Returning an out-of-scope Country to active scope restores its resolved semantic status fill.
* [ ] Pointer hover on a status-colored Country preserves its resolved status fill.
* [ ] Temporary map selection preserves the resolved semantic fill where semantic status is being presented.
* [ ] Applicable pointer hover/temporary-selection interaction uses outline color `#d4d4d8`.
* [ ] Applicable pointer hover/temporary-selection outline has an effective stroke width of at least `2px`.
* [ ] Grouped hover outlines each participating Country individually.
* [ ] Normal pointer hover/temporary selection no longer uses teal/cyan as a competing progress-like status fill where semantic status is shown.
* [ ] Existing active-recall progress suppression remains intact.
* [ ] Existing legends/status descriptions accurately identify Memo readiness and Drill proficiency states.
* [ ] Status remains understandable without relying exclusively on color.
* [ ] Drill does not maintain an independent duplicate set of shared proficiency hex values.
* [ ] No keyboard map interaction or focus semantics are introduced by this change.
* [ ] No learning semantics, evidence identity, persistence schema, geography identity, or public feature API changes.
* [ ] Relevant World Countries presentation/controller tests cover the new palette, precedence, muting, grouped hover, and interaction behavior.

## Source anchors

* `src/features/world-countries/maps/SvgMapController.ts`
* `src/features/world-countries/maps/SvgMapView.tsx`
* `src/features/world-countries/maps/GeographyOverviewMap.tsx`
* `src/features/world-countries/maps/GeographyOverviewMap.test.tsx`
* `src/features/world-countries/maps/SvgMapController.test.ts`
* `src/features/world-countries/learning/progressPresentation.ts`
* `src/features/world-countries/learning/progressPresentation.test.ts`
* `src/features/world-countries/learning/memoReadiness.ts`
* `src/features/world-countries/learning/memoReadiness.test.ts`
* `src/features/world-countries/drill/drillProgressPresentation.ts`
* `src/features/world-countries/drill/drillProgressPresentation.test.ts`
* `src/features/world-countries/drill/DrillProgressLegend.tsx`
* `src/features/world-countries/memo/MemoMap.tsx`

## Documentation impact

After implementation, review `docs/architecture/features/WORLD_COUNTRIES.md`.

Update it only if necessary to record a durable current-state presentation boundary or invariant established by the implementation.

Do not duplicate the palette table into current-state architecture documentation unless exact palette values become an architectural constraint.

## Verification

Complete when changing this Change Spec to `Implemented`.

Record:

* implementation date;
* affected automated tests;
* World Countries feature test result;
* TypeScript build result;
* production build result;
* any concise manual verification needed for map interaction or visual precedence.
