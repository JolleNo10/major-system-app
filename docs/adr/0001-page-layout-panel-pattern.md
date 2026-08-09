# ADR 0001 — `PageLayout`: one base pattern for center + side rails

- **Status:** Accepted
- **Date:** 2026-08-06

## Context

The app needs screens with a main (center) area optionally flanked by a left
and/or right panel ("rail"). This showed up first and most visibly in the Pi
drill (Memo/Recite tabs via the old `ToolLayout`), but it kept getting
reinvented and kept breaking.

The root cause of the breakage: **width and centering were owned in two places
that fought each other.**

- `App.tsx` gave `<main>` a `max-w-2xl` (or `lg:max-w-5xl` for `wide` modes),
  centered with `mx-auto`.
- `ToolLayout` then *broke back out* of that column with `xl:-mx-20` to make
  room for rails.

Compounding problems:

- The reading column widened at the `lg` breakpoint, but rails only appeared at
  `xl` — a guaranteed mismatch.
- The center pane's real width was set by the *content* (`max-w-lg` panels
  inside), not by the layout.
- Centering depended on both rail cells always being rendered (even empty), an
  implicit and fragile invariant.
- Some blocks (e.g. Recite's run-history) rendered *outside* the layout, so they
  aligned to a different width than the paned block above them.

Symptoms: the middle got nudged left/right, resized in strange ways, and rails
landed in different positions between screens.

## Decision

Introduce **one component, `PageLayout`, as the single authority** on width,
centering, and rail behavior. Every mode renders through it. Nothing a mode
renders sits outside it.

| Aspect | Decision |
|---|---|
| **Ownership** | `PageLayout` owns width, centering, and rails. `<main>` is a dumb full-width container. |
| **Structure** | 3-column CSS grid: `[gutter] [center] [gutter]`. |
| **Center** | Hard `672px` (`max-w-2xl`), invariant to rails, identical in every mode. |
| **Gutters** | `minmax(0, 18rem)`, symmetric — shrink together, cap at 288px. Equal gutters mean a rail appearing/vanishing cannot move the center. |
| **Breakpoint** | Single: `xl` (1280px). At/above → three columns; below → gutters vanish and rails become drawers. |
| **Content rule** | The center IS the mode's entire content column; every vertical section (setup, run history, results…) stacks inside it as children. A mode may render nothing outside the layout. |
| **Header slot** | Optional chrome (e.g. Pi's tab bar + digit slider) published via `useLayoutHeader`, rendered above the rail row and centered at the center-column width. Keeping it out of the grid lets the rails top-align with the body content instead of the chrome. |
| **Rails** | Optional `left`/`right`, published via `useRails`; the grid is `items-start` so each cell is content-height (rails hug their content, never stretch to the body's full height) and gutters are plain blocks so a rail fills its gutter and sits beside the center. Scroll with the page (not sticky); pass `undefined` for a view that has none. |
| **Panel width** | Content that is flanked by a rail fills the 672px center (`w-full`, not `max-w-lg`) so the rail sits tight against the panel edge rather than across dead space. |
| **Below xl** | Unchanged: a toggle row (📊/🧰) opens each rail as a focus-trapped slide-in drawer over a backdrop, reusing `useOverlay`. |
| **Universality** | Every mode (paned or not) routes through `PageLayout`. One code path. A no-rail mode is just a centered 672px column. |

### Removed

- The `wide` flag in `modes.tsx`.
- The `xl:-mx-20` breakout hack.
- `<main>`'s `max-w-*` / `wide` width logic.
- The `ToolLayout` name (renamed to `PageLayout`).

## Consequences

- **The class of bug is eliminated, not patched.** With one owner and one code
  path, the center cannot drift — there is no second party to fight.
- **Everything aligns by construction.** Because the center is a fixed 672px in
  every mode and all content lives inside it, sibling sections and cross-mode
  navigation never shift the middle.
- **Reusable base pattern.** New panelled screens wrap in `PageLayout` and get
  the exact same geometry for free; no reinvention.
- **Cost:** mechanical churn across every drill (each root wraps in
  `PageLayout`), Pi's inner panels widen from `max-w-lg` to fill 672px, and
  Recite's run-history block moves inside the layout as a child.
- **Constraint to preserve:** the 672px center and `minmax(0, 18rem)` gutters
  are the invariant. Do not reintroduce content-driven center widths or a second
  width owner in `App`/`<main>`.

## Confirmation

Implemented and verified against the repository on 2026-08-09.
