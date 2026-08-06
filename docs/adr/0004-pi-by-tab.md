# ADR 0004 — Restructure `pi` by tab; extract shared segment-range picker

- **Status:** Accepted
- **Date:** 2026-08-06
- **Refines:** ADR 0002 (package-by-feature layout); parallels ADR 0003 (cards split by flavor)

## Context

ADR 0002 landed `pi` as a flat feature. It grew to ~24 modules in one directory:
the four Pi tabs (Memo / Recite / Train / Anchors), the shared quiz engine, the
stats/data modules, and the story utilities all sat side by side with no
in-folder signal of which modules were shared versus tab-local. Only **Memo** had
been split into a center component (`PiMemoTab`) + a rail hook (`usePiMemoRail`).

Two concrete duplications had also accreted:

- **Recite's rails were inline** in `PiReciteTab` (unlike Memo's extracted hook).
- **Recite and Anchors each rendered a near-identical segment-range picker** — the
  same status dot, the same range/anchor cell styling, the same two-click
  selection semantics — diverging only in each cell's inner label and in which
  persistence unit backed the selection.

## Decision

Organize `pi` by tab, mirroring ADR 0003's flavor split for `cards`. One folder
per tab, genuinely shared code in `shared/`, and the Memo center/rail split
mirrored wherever a tab actually has a rail. **One barrel** (`@/features/pi`),
unchanged.

```
features/pi/
  index.ts                    # single public barrel — SAME exports
  PiDrill.tsx                 # composition root (tab state + header chrome)
  shared/                     # reached by 3+ tabs or the app
    piDigits piSegments piStats piProgress usePiSegmentStatuses
    PiNumberQuiz PiBatchInput PiSegmentGrid PiSegmentRangePicker
    story/                    # story infra leaks past Memo (see below)
      piStories usePiStory storyHighlight PiMistakeStoryReview
  memo/    PiMemoTab PiMemoRail usePiStoryEditor imageResize
  recite/  PiReciteTab PiReciteRail
  train/   PiTrainTab
  anchors/ PiAnchorTab
```

- **`PiDrill` stays at root.** It's the feature's composition root — it owns the
  tab state and the `useLayoutHeader` tab-bar/slider chrome — so it's neither a
  shared util nor a single tab.
- **`shared/story/` is shared, not Memo-owned.** Story *display* leaks beyond Memo
  because `PiMistakeStoryReview` is rendered by `PiNumberQuiz` (via
  `reviewStoriesOnMistake`), which Recite/Train/Anchors all use. So `piStories`,
  `usePiStory`, `storyHighlight`, and `PiMistakeStoryReview` are shared; only story
  *authoring* (`usePiStoryEditor`, `imageResize`) is Memo-only.
- **Rails are structural only — no UX change.** Recite's inline rails become
  `usePiReciteRail` (mirroring `usePiMemoRail`), owning the phase→rail mapping and
  the `useRails` call plus its two private view components (`RunHistoryTool`,
  `ReadyToReciteTool`). Train and Anchors have no rail, so they get a folder but
  stay center-only.
- **`shared/PiSegmentRangePicker` folds the duplicated picker.** A *controlled*
  component working purely in 0-indexed segment indices; it owns the grid, the
  cell shell + range/anchor styling, the status dot, and the two-click reducer.
  Each tab converts to/from its own persistence unit (Recite keeps pair numbers
  under its existing localStorage keys; Anchors keeps segment indices) and passes
  its tab-specific cell body via `renderCellBody`. The status line and Start button
  stay per-tab — they differ (Recite: "Pairs X–Y … digits"; Anchors: "Segments
  X–Y … anchors" + the `runCount < 2` rule). The repeated status/memoed wiring both
  tabs did folds into a colocated `useSegmentPickerData` hook.

## Consequences

- **Which modules are shared vs tab-local is now legible at a glance**, and every
  tab that has a rail follows the same center/rail split.
- **The barrel is frozen.** External importers (`app/modes.tsx` → `PiDrill`;
  `app/overlays/StatsOverlay` → `piStats` symbols; `app/settings/SettingsOverlay`
  → `PI_PAIRS`) are untouched — only the barrel's internal source paths changed.
- **The picker duplication is gone**, with pixel-identical selection/styling
  preserved; a single controlled component is the one place segment-range
  selection lives.
- **Precedent:** a feature may split its internals by tab (as `cards` split by
  flavor), keep one barrel, and mirror the center/rail hook split wherever a tab
  has a rail. Subfolders import each other by deep path, as flat modules always did.
