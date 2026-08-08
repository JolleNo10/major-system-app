# Pi feature guide

## Feature purpose

This feature supports memorizing, reciting, and maintaining digits of pi as two-digit pairs using Major System words and optional per-segment stories. It owns pi data, segment/range logic, quiz runs, progress/session metrics, story persistence, anchor pacing, and per-segment maintenance scheduling. It does not own the Major System word dictionary/provider, global settings and answer mode, shared scoring/storage infrastructure, page layout, or the application stats/settings screens.

## Scope and discovery boundaries

- Treat `src/features/pi/` as the default discovery and modification scope. Start with this guide, `index.ts`, `PiDrill.tsx`, and the subdirectory for the requested workflow.
- You may inspect a direct dependency outside this directory only to resolve a shared contract or failing test/typecheck/build. Expected legitimate targets are `src/features/major-system/index.ts`/`WordsContext.tsx`, `src/core/storage.ts`, `src/core/scoring/attemptStore.ts`, `itemStore.ts`, `sm2.ts`, `quiz.ts`, `src/core/ui/`, `src/core/types.ts`, `src/app/settings/`, `src/app/layout/PageLayoutContext.tsx`, and current consumers of `index.ts`.
- Do not explore sibling features for examples or broad context. Prefer the architecture and invariants below over repository-wide discovery.
- Modify this feature only by default. Outside dependencies are inspect-only unless the requested contract cannot be implemented locally. Identify that dependency and explain why before modifying it; database schema changes, global settings changes, and public-consumer changes are examples that may legitimately cross the boundary.

## Architecture map

- `index.ts` — small public API: `PiDrill`, `PI_PAIRS`, session/stat types and read helpers used by application settings/stats.
- `PiDrill.tsx` — feature entry; owns persisted Memo/Recite/Maintain tab selection and the maximum-pairs slider, and publishes shared header chrome.
- `memo/` — segment study/recall workflow, story editor/rail, and client-side image resizing.
- `recite/` — full contiguous recitation and anchor-chain modes, range/setup rails, and anchor transition pace tracking.
- `maintain/` — due-batch assembly and UI plus the per-segment SM-2 schedule store.
- `shared/PiNumberQuiz.tsx` — common pair/batch quiz engine and result screen; optionally records attempts, sessions, completion callbacks, mistake-story review, and records.
- `shared/piDigits.ts` — source digits exposed as `PI_PAIRS`; consumers work in two-digit strings.
- `shared/piSegments.ts`, `piProgress.ts`, `piStats.ts` — segment coordinate math, explicit memo/flawless progress, sessions, per-position attempts, and per-segment learning summaries.
- `shared/PiSegmentGrid.tsx`, `PiSegmentRangePicker.tsx`, `usePiSegmentStatuses.ts` — shared segment display/selection and async status loading.
- `shared/story/` — IndexedDB story records, export/import, hooks/views, ordered word highlighting, and mistake review.
- Colocated `*.test.ts` files cover pure segment/progress/stats/maintenance/story rules and persistence adapters.

## Important execution and data flow

`PiDrill` reads global settings, caps the local maximum range, publishes the tab/slider header, and renders one workflow:

- Memo: segment selection -> `PiMemoTab` derives ten pairs and Major System words -> study/story view -> recall UI -> a fully correct result adds the 0-based segment to `piProgress`'s memoed set. `usePiStoryEditor` coordinates story text/image reads and writes through `shared/story/piStories.ts`.
- Full recite: range selection in `PiReciteFull` -> contiguous `PI_PAIRS` slice -> `PiNumberQuiz` -> per-pair `pi:<position>` attempts during answers -> on result, a `PiSession` plus whole-segment `piseg:<segment>` tries are recorded. Flawless complete segments are persisted and seed (but do not advance) their maintenance schedule.
- Anchor recite: `PiReciteAnchors` builds one opening pair per selected segment -> `PiNumberQuiz` with anchor-specific labels/result mode and `recordAttempts={false}` -> transition timings update `anchorPace`. It does not affect normal recitation attempts, segment status, or Pi sessions.
- Maintain: `PiMaintainTab` loads segment statuses and `piMaintainStore` -> `buildMaintenanceBatches` selects contiguous weak/learned ranges and ranks due batches -> `PiNumberQuiz` -> completion records `piseg:` tries and reschedules every fully covered segment with SM-2. It deliberately records no `PiSession`.

`PiNumberQuiz` is the shared execution seam: callers provide the sequence, 1-based anchor, answer size/mode, words, recording flags, and completion handlers. Put workflow policy in the caller and reusable question/result mechanics in this component.

## Public boundaries and external dependencies

- Outside code imports from `@/features/pi`. `src/app/modes.tsx` consumes `PiDrill`; `StatsOverlay.tsx` consumes session/position-stat exports; `SettingsOverlay.tsx` consumes `PI_PAIRS`. Do not expose internals without a real cross-feature consumer.
- `useWords()` from `@/features/major-system` supplies the `Record<string, string>` mapping for two-digit pairs. Pi owns sequencing and stories, not word selection/storage.
- `useSettings()` supplies `maxPiDigits`, `piPairsPerAnswer`, and `piMaintainBatchSegs`; `AnswerMode` comes from `src/core/types.ts`.
- `useLayoutHeader`/`useRails` publish feature chrome and side panels into the shared page layout. Rail dependency values must be stable; `useSegmentPickerData` intentionally memoizes derived statuses to prevent publish loops.
- `src/core/storage.ts` provides guarded localStorage access. `src/core/scoring/attemptStore.ts` owns the shared `major-system` IndexedDB connection, the `attempts` store, and the `pi_stories` object store schema. Story code must reuse `getDb()`; opening a separate/versioned connection can block upgrades.
- Shared scoring utilities provide attempt retention, age-decay constants, median timing, batch timing, distractors, and SM-2. There is no backend or network API.

## Local conventions and invariants

- A pair is one two-digit `PI_PAIRS` entry. A segment is always 10 pairs/20 decimal digits. Segment indices are 0-based; pi pair positions/anchors and displayed decimal ranges are 1-based. Use `PAIRS_PER_SEGMENT` and `piSegments.ts` helpers instead of duplicating conversions.
- Only whole segments count for `piseg:` tries, flawless completion, or maintenance rescheduling. Partial and non-aligned spans must not silently promote progress.
- A `PiSession` with `anchor === 1` is a full recite; every other anchor is practice. From-start records use consecutive correct reach, require a strict improvement, and ignore practice sessions.
- Segment status comes only from `piseg:<seg>` attempt rows: no tries -> `new`; the latest two whole-segment tries both correct -> `learned`; otherwise `weak`. Memoed state is independent and must not be inferred from that status.
- Persistence namespaces have distinct meanings: `pi:<pos>` is per-pair performance, `piseg:<seg>` is whole-segment performance, `major-pi-sessions` is capped run history, localStorage sets track memoed/flawless segments, `major-pi-maintain` is schedule state, `major-pi-anchor-pace` is anchor-only timing, and `pi_stories` stores user-authored story data keyed by segment.
- Reciting a newly flawless segment seeds its first maintenance interval once. Re-reciting it must not advance an existing schedule; only a Maintain completion reschedules it.
- Maintain eligibility is `weak` or `learned`; `new` segments are excluded and break contiguous batches. An eligible segment without a schedule is due now but has zero meaningful overdue age.
- Anchor mode is intentionally isolated from session/per-pair/segment progress. Its first answer starts the chain; transition pace statistics use answers after the first.
- Story records contain freeform text and at most one image. Empty records are deleted/skipped; import accepts a leading BOM and uses the same non-empty rule. Object URLs created by story hooks must be revoked.
- Keep `PI_PAIRS` as fixed-width two-character strings and keep global `maxPiDigits` within available data; the feature converts the setting to pairs with `floor(digits / 2)`.

## Where changes should go

- Tab/header or maximum-range behavior -> `PiDrill.tsx`.
- Memo study/recall flow -> `memo/PiMemoTab.tsx`; story editing/rail -> `memo/usePiStoryEditor.ts` and `PiMemoRail.tsx`; storage/backup/highlighting -> `shared/story/`.
- Full-range or anchor-specific setup/flow -> the corresponding file in `recite/`; shared Full/Anchors switching -> `PiReciteTab.tsx`/`ReciteModeToggle.tsx`; pace classification -> `anchorPace.ts`.
- Shared answer mechanics, recording flags, or result presentation -> `shared/PiNumberQuiz.tsx`; numeric batch entry -> `PiBatchInput.tsx`.
- Segment coordinates, range selection, grid/status UI, progress derivation, or statistics -> the corresponding `shared/piSegments.ts`, `PiSegmentRangePicker.tsx`, `PiSegmentGrid.tsx`, `piProgress.ts`, or `piStats.ts`.
- Due-batch selection -> `maintain/piMaintain.ts`; SM-2 persistence semantics -> `maintain/piMaintainStore.ts`; Maintain UI/orchestration -> `PiMaintainTab.tsx`.
- Pi digit source or public exports -> `shared/piDigits.ts` or `index.ts`; inspect settings/consumers before changing their contract.

## Validation

Detect host Node/npm first. With a host toolchain:

```powershell
npx vitest run src/features/pi
npx tsc -b
```

Without one, use the Compose-built image and isolated container dependencies:

```powershell
docker compose run --rm app sh -c "npx vitest run src/features/pi"
docker compose run --rm app sh -c "npx tsc -b && npx vite build"
```

Run the smallest colocated test file while iterating, then the full feature test path. Run typecheck/build for React flow, IndexedDB/public boundary, settings, or import changes. If `package.json` or `package-lock.json` changed, run `docker compose build app` before verification.

## Known traps

- `PI_PAIRS_PER_SEGMENT` in `piProgress.ts` and `PAIRS_PER_SEGMENT` in `piStats.ts` currently express the same fixed value for different modules; changing segmentation requires updating both contracts and all related tests.
- `PiNumberQuiz` has delayed transitions. Completion is guarded so effects do not double-record; preserve that idempotence when changing result flow.
- Async status hooks return an empty array while IndexedDB loads. Consumers use length to distinguish loading; do not interpret the initial array as every segment being new.
- Session history predates explicit flawless-segment persistence; `PiReciteFull` derives historical flawless segments from perfect aligned sessions. Removing that merge loses compatibility with existing users.
- Attempt-store writes are intentionally fire-and-forget/best-effort, while story `putStory` propagates write errors so the editor can report quota failures.
