# Mnemonics

**Mnemonics** — a mnemonic training tool. Currently implements the **Major System**
(mapping 2-digit numbers `00`–`99` to words) with dedicated **Applications** for Pi and Cards.
Built to expand to additional mnemonic systems over time.
Stack: **Vite + React 19 + TypeScript + Tailwind v4**, single-page, **no backend**,
**always dark** (zinc-950 base, violet-600 accent). Uses the host Node workflow
when Node/npm are available, with Docker as the fallback.

> This file exists so a fresh context can understand the repo without reading every file.
> Keep it in sync when the architecture changes.

## Commands (host Node/npm preferred; Docker fallback)
```bash
# When Node/npm are installed on the host:
npm ci
npm run dev             # dev server
npm test                # tests
npm run build           # type-check + production build

# When the host has no Node/npm:
docker compose up          # dev server → http://localhost:8080 (Vite on 5173)
docker compose up --build  # rebuild after package.json changes
docker compose down
# One-off verification without a host Node toolchain:
docker run --rm -v "$(pwd)":/app -w /app node:20-alpine sh -c "npx tsc -b && npx vitest run && npx vite build"
```
Tests are colocated `*.test.ts` next to the module they cover.

## Source layout (package-by-feature)
`src/` is organized **by domain**, not by technical kind (rationale + rules in **ADR 0002**). Every
import uses the **`@/*` → `src/*`** path alias (configured in `tsconfig.json`, `vite.config.ts`,
`vitest.config.ts`), so specifiers are location-independent (`@/core/scoring/quiz`, `@/features/pi/shared/piStats`).

```
src/
  vite-env.d.ts                 # ambient module decls (*.csv?raw, build-time globals) — stays at root
  app/                          # composition root — may import features/ + core/
    App main modes index.css ModeSelector
    layout/    PageLayout PageLayoutContext Overlay useOverlay overlayGuard
    settings/  SettingsOverlay SettingsContext settings usePwaUpdate
    overlays/  StatsOverlay ReferenceOverlay
  core/                         # depends on nothing but itself
    types storage createWordStore wordsCsv answerMatch cards
    scoring/   scoring sm2 itemStore attemptStore numberStats quiz roundStats
               roundMastery recallColor typingSpeed useStats useAnswerTimer
    ui/        MultipleChoice TypingInput AnswerModeToggle useAnswerMode numericInput
               Switch RangeSlider ScoreBar RankRangeSelector WordListGrid
  features/                     # each depends on core/
    major-system/  drills (WordNumberDrill EncodingDrill DecodingDrill SequenceDrill
                   SpeedRound WeakSpots RepetitionDrill SoundKeyDrill ReverseSoundKeyDrill)
                   SoundKeyGrid SoundKeyPanel HintButton RoundStatsPanel vowelSkeleton
                   words(.csv) soundKey(.csv) soundKeyCsv WordsContext SoundKeyContext
    pi/            index.ts (single barrel) + PiDrill (composition root: tab state + header chrome);
                   internally split by tab (rationale + rules in **ADR 0004**):
                   shared/  PiNumberQuiz PiBatchInput PiSegmentGrid PiSegmentRangePicker
                            piDigits piSegments piStats piProgress usePiSegmentStatuses
                            story/  piStories usePiStory storyHighlight PiMistakeStoryReview
                   memo/    PiMemoTab PiMemoRail usePiStoryEditor imageResize
                   recite/  PiReciteTab PiReciteRail
                   train/   PiTrainTab
                   anchors/ PiAnchorTab
    cards/         index.ts (single barrel); internally split by flavor:
                   shared/  CardsDrill DeckMemoDrill (the Card→Word/Number engine)
                   card/    MajorCardsDrill
                   themed/  ThemedCardsDrill CardWordsOverlay cardWords(.csv) CardWordsContext
                   pao/     PaoCardsDrill PaoDeckMemoDrill PaoWordsGrid PaoWordsOverlay
                            paoCards(.csv) paoCsv PaoCardsContext triples
```

**Layering rule:** `core/` → self only; `features/*` → `core/` (+ kept feature→feature edges:
`cards → major-system` and `pi → major-system` both reuse the Words store); `app/` → anything. The
PAO "🎭 From Themed Deck" seed is now an **intra-feature** edge (`cards/pao/` → `cards/themed/`) since
PAO folded into `cards`.

**Feature barrels:** each feature has an `index.ts` that re-exports its **public interface** (drill
entry-points, providers/hooks, and the handful of data/stats symbols the shell needs). All code
outside a feature imports from `@/features/<name>` (the barrel) — never a deep path; everything else
in the folder is internal. Within a feature, modules import each other by deep path as usual. **Adding
a symbol to a feature's public surface = add one line to its `index.ts`.**

## Big picture
- **No router.** `App.tsx` holds `mode: Mode` (state machine) + three overlay booleans
  (`showReference`, `showSettings`, `showStats`). `mode === 'home'` renders `ModeSelector`;
  every other value renders a drill from `features/`.
- **Answer modes.** A global `answerMode` (`'multiple-choice' | 'typing'`, `useAnswerMode`)
  is threaded to drills, which render `<MultipleChoice>` or `<TypingInput>`.
- **Number keys are zero-padded 2-digit strings** (`"00"`..`"99"`) everywhere. Direction is
  `'enc' | 'dec'`; store keys are `` `${dir}:${num}` `` (e.g. `enc:07`).

## Data model & persistence
| Store | Where | Contents |
|-------|-------|----------|
| `major-item-data` | localStorage | `Record<"enc:NN"\|"dec:NN", ItemRecord>` — per-number/direction SM-2 stats (correct/wrong, rolling `latencies` (last 10), `ease`, `intervalDays`, `dueAt`, `lastSeenAt`, `reps`, `hintCount`) |
| `major-system` (db, **v2**) → `attempts` store | **IndexedDB** | Per-answer log `{id, key:"enc:07", at, ok, ms}`, pruned to 90 days / 200 per key. Written on every answer. Keys are usually `"enc:NN"`/`"dec:NN"` but the same store also holds Pi's `"pi:<position>"` per-position log and the Train tab's `"pi-chain:<segIdx>"` boundary-crossing log (`features/pi/shared/piStats.ts`). Read via `getAllAttempts` (Pi weak-spots + Train segment/boundary ranking); the number-drill read path is otherwise unconsumed (future age-decay) |
| `major-system` (db, v2) → `pi_stories` store | **IndexedDB** | Per-segment Pi mnemonic story `{seg, text, image:Blob\|null, updatedAt}`, keyed by 0-indexed `seg` (no index — always accessed by primary key). Purely user-authored (no shipped defaults), text + one downscaled picture stored atomically (`features/pi/shared/story/piStories.ts`). Backed up via JSON export/import (`{seg,text,imageDataUrl}[]`, base64). **`core/scoring/attemptStore.ts` is the single DB owner** — it exports `getDb`/`reqToPromise`/`txDone`/`hasIdb` and `piStories.ts` reuses that one connection (a second open at a different version would `onblocked`-hang the v1→v2 upgrade) |
| `major-pi-sessions` | localStorage | Pi number-quiz run summaries (`PiSession[]`, capped 50) — reach, accuracy, pairs/sec per completed run (`features/pi/shared/piStats.ts`) |
| `major-word-saved` | localStorage | Committed custom words (layer 2) |
| `major-word-overrides` | localStorage | Trial/pending word edits (layer 3, shown yellow) |
| `major-soundkey-saved` / `-overrides` | localStorage | Editable sound-key layers (same 3-layer store), keyed by composite `"<digit>:<field>"` strings |
| `major-pao-saved` / `-overrides` | localStorage | Editable PAO deck layers (same 3-layer store), keyed by composite `"<NN>:<field>"` (`field` = `person`\|`action`\|`object`) — the PAO Deck's Person/Action/Object per card `01`–`52` |
| `major-pao-drilltype` / `-suits` / `-deck-count` / `-decode-field` / `-deck-memo-history` | localStorage | PAO Deck UI/session state (drill type, active suits, deck-memo card count, decode field selector, and the PAO deck-memo run history) |
| `major-settings` | localStorage | `{ masteryLatencyFactor, maxPiDigits, offlineMode, piPairsPerAnswer }` (`piPairsPerAnswer` 1\|10 = Pi typing batch size, set in Settings; migrated once from the legacy `major-pi-answer-size` key) |
| `major-typing-speed` / `-digit` | localStorage | Adaptive ms/char estimates, separate for word vs digit typing |
| `major-answer-mode`, `major-hide-options`, `major-seq-length`, `major-seq-studymode`, `major-speed-best`, `major-attempts-migrated`, `major-pi-collapsed-blocks` (collapsed 1000-digit segment blocks, shared across Pi grids), `major-pi-memo-seg` (last-selected Memo segment), `major-pi-memoed-segs` (segments recalled all-correct in Memo mode), `major-pi-recited-segs` (memoed segments later recited flawlessly) | localStorage | Small UI/prefs flags |

**Word list is 3 layered sources** (`WordsContext`); effective = `{...shipped, ...saved, ...overrides}`:
1. **shipped** — `src/features/major-system/words.csv` (`number,default,custom`), imported via `?raw` and parsed by
   `words.ts` → `WORDS`. **Edit this file to change the shipped defaults.**
2. **saved** (`major-word-saved`) — customizations committed in-app.
3. **overrides** (`major-word-overrides`) — pending trial edits.

`useWords()` exposes `{ words, shipped, saved, overrides, setOverride, resetOverride, resetTrials,
persist, resetFactory, importSaved }`; `persist()` folds trials→saved. Import/export use the same
CSV format (`wordsCsv.ts`, validated). The browser can't write the repo, so updating `words.csv`
for real = Export → replace the file → commit by hand.

**The 3-layer store is a factory** (`core/createWordStore.tsx` → `{ Provider, useStore }`; values are
`Record<string,string>`). Four instances: `WordsContext` (major `WORDS`, keys `major-word-*`),
`CardWordsContext` (Themed Deck `CARD_WORDS` from `cardWords.csv`, keys `major-cardword-*`, `useCardWords()`),
`SoundKeyContext` (editable sound key, keys `major-soundkey-*`, `useSoundKeyStore()` + derived
`useSoundKey()`), and `PaoCardsContext` (PAO Deck triples from `paoCards.csv`, keys `major-pao-*`,
`usePaoStore()` + derived `usePaoCards()`). `WordListGrid` is prop-driven (`store`/`keys`/`renderLabel`/`groups`/`showAccuracy`/
`exportName`) so both word lists reuse the same editor. `importEffective(map)` on the store folds a
key→effective map into `saved` (import shares it; `importSaved(rows)` delegates).

**The sound key is editable too** (`features/major-system/soundKey.csv` shipped, parsed by `soundKeyCsv.ts` — a
quoting-aware parser, since `sounds`/`hint` carry commas + quotes). Stored flat under composite keys
`"<digit>:<field>"` (`sounds`/`hint`; the UI `display` string is derived from `sounds`, comma-joined,
not stored), so `createWordStore` is reused; `features/major-system/soundKey.ts`
derives the effective `SoundKeyEntry[]`/`ALL_SOUNDS`/`SOUND_TO_DIGIT` from the store via `buildSoundKey`
etc. `SoundKeyGrid` (Reference → Sound Key tab) is the 3-column editor with the same Import/Export/Persist/
Reset flow; the two sound-key drills + `SoundKeyPanel` read `useSoundKey()` so they reflect edits.

**The PAO Deck is a fourth editable list** (`features/cards/pao/paoCards.csv` shipped — `number,person,action,object`,
cards `01`–`52` — parsed by `paoCsv.ts`, a dedicated quoting-aware parser, **not** the shared `wordsCsv.ts`).
Stored flat under composite keys `"<NN>:<field>"` (`person`/`action`/`object`), so `createWordStore` is reused
(`PaoCardsContext`); `features/cards/pao/paoCards.ts` derives the effective `PaoCard[]` from the store via `buildPaoCards`.
`PaoWordsGrid` (opened from the PAO Deck's "📇 Edit words" via `PaoWordsOverlay`) is the 3-column,
suit-grouped editor with the same Import/Export/Persist/Reset flow, plus a **"🎭 From Themed Deck"**
button that seeds the Person column from the Themed Deck word list (`useCardWords`, person-only, via `importEffective`). Independent of the Themed Deck list —
the current Themed Deck is untouched. `features/cards/pao/triples.ts` (`groupTriples`, `roleAt`) chunks a deck into
Person/Action/Object triples (partial final group of 1–2 kept).

## Scoring & spaced repetition
- **`core/scoring/scoring.ts` is the single home for all scoring/latency config** (dependency-free): `FAST_MS`/`SLOW_MS`,
  `RECALL_FAST_MS`/`RECALL_SLOW_MS`, `OUTLIER_MS`/`STALE_MS`, `DEFAULT_EASE`/`MIN_EASE`, `MAX_LATENCIES`,
  `HISTORY_HALFLIFE_DAYS`. Every scorer imports from here; `itemStore` keeps only storage config.
- `sm2.ts` — `gradeAnswer(correct, ms, mode)` → 2 (wrong) / 3 (slow) / 4 / 5 (fast); `applySm2(item, grade)`
  updates ease/interval/due (SM-2). Grades use the **recall-adjusted** ms on the multiple-choice scale.
- `typingSpeed.ts` — `adjustLatency(raw, mode, chars)` subtracts estimated typing time (separate word vs
  digit track) so recall speed is judged on one scale. (`recallColor` is a UI helper in `core/scoring/recallColor.ts`.)
- `roundMastery.ts` — per-round mastery: `isMastered` = last `MASTERY_REPS` (2) attempts all correct,
  un-hinted, and `recallMs <= masteryFastMs(settings.masteryLatencyFactor)`. Uses the **in-memory**
  `RoundStat.attempts` (defined in `core/scoring/roundStats.ts`), not the IndexedDB log.
- `numberStats.ts` — **`itemWeakness(item)` is the one weakness score used everywhere** ("weak" is defined
  once): `0.55·easePenalty + 0.25·normLatency + 0.20·(wrongRate · 0.8^reps)` — recency-biased; the lifetime
  wrong-rate residual decays with the current correct streak. `rankByWeakness(dir, nums)` (Stats overlay,
  Weak Spots) sorts by it worst-first; `quiz.pickWeighted` draws with weight `1 + itemWeakness·4`.
- `useStats.recordFull` splits into `aggregateItem` (counts + rolling latency) and `scheduleItem`
  (grade + `applySm2`, incl. the hint→cap-at-3 rule); the due-count / rep-queue / next-due helpers share one
  `allItems()` traversal.

## Module map
- `src/app/App.tsx` — header (mode title, AnswerModeToggle, 📊/📚/⚙️ overlay triggers) + a **full-width** `<main>` that
  wraps `MODES[mode].component` (or `ModeSelector` on home) in a single `<PageLayout>`, + overlays. No per-mode render
  switch, no per-mode width logic (`PageLayout` owns width/centering — see ADR 0001).
- **`src/app/modes.tsx` — the mode registry** (`Record<DrillMode, ModeDef>`): each non-home `Mode` maps to its
  header `title`, drill `component`, `group` (`'major-system' | 'application'`), `hideAnswerToggle`, and ModeSelector card
  metadata. Single source of truth — TypeScript enforces every mode is fully wired. **Add a mode = one entry here.**
  `HOME_TITLE` is `'Mnemonics'`.
- `src/app/main.tsx` — mounts `SettingsProvider > WordsProvider > CardWordsProvider > PaoCardsProvider > SoundKeyProvider > PageLayoutProvider > App`; calls `initAttempts()` (opens IndexedDB + one-time migration of any legacy in-blob attempts).
- `src/core/types.ts` — `Mode`, `AnswerMode`, `Direction`, `NumberStats`/`AllStats` (in `core` so `core/scoring` can consume it).
- **Feature drills** (`features/major-system/`, `features/pi/` — split internally by tab into `shared`(`/story`)`/memo/recite/train/anchors`, `features/cards/` — split internally into `shared`/`card`/`themed`/`pao`): `WordNumberDrill` is the shared config-driven engine for both directions;
  `EncodingDrill`/`DecodingDrill` are ~25-line `DrillConfig` wrappers over it (direction, prompt styling,
  matcher, hint toggle). `SoundKeyDrill`, `ReverseSoundKeyDrill`, `SequenceDrill` (setup→study→recall→result),
  `SpeedRound`, `WeakSpots` (feeds a weak-number `pool` into `EncodingDrill`), `RepetitionDrill` (SM-2 due queue),
  `PiDrill` (four tabs: **Memo** / **Recite** / **Train** / **Anchors**). `PiNumberQuiz` is the shared recite engine (fixed sequence + anchor →
  number-quiz + result; single-pair or 10-pair batch, MC or typing), used by Recite, Train and Anchors. It records per-position
  attempts under `pi:<position>` keys for every answered pair (unless `recordAttempts={false}`) and (when `recordSession`) a
  `PiSession` summary per run. Optional `labels` (`PiQuizLabels`: `prompt`/`hint`/`row`) overrides every on-screen π-position
  string — the escape hatch for non-contiguous sequences — and `distractorPool` overrides where MC distractors are drawn from
  (default: the run sequence).
  All three tabs render their segment grid through the shared **`PiSegmentGrid`** wrapper (`count` + `renderCell(segIdx)`): it owns
  the grid container and the 1000-digit block dividers, each a toggle that **collapses the block above it** (50 segments) — collapse
  state is persisted (`major-pi-collapsed-blocks`) and shared across the grids; with < 1050 π digits there's a single block and no dividers.
  Recite and Anchors go through **`PiSegmentRangePicker`** (`shared/`), a controlled range selector wrapping `PiSegmentGrid`: it owns
  the cell shell + range/anchor styling + status dot + two-click reducer (working in 0-indexed segment indices), while each tab keeps
  its own persistence unit (Recite: pair numbers; Anchors: segment indices), status line, Start button, and per-cell body
  (via `renderCellBody`); the shared status/memoed wiring is `useSegmentPickerData`.
  Each grid paints a per-segment **status dot** (`PiSegmentDot`) derived from the `pi:` log via
  `piSegmentStatuses` (`usePiSegmentStatuses` hook): emerald = learned (every pair answered correctly ≥1× with no recorded misses),
  amber = practising (touched but short of that), gray = memoed correctly but not yet recited, none = new. Recitation status takes
  precedence over memo status. Recite shows just the dots; **Memo** rings the first segment that's
  neither recited (`pi:` log) nor memoed all-correct in Memo mode (`major-pi-memoed-segs`) — "next to memo".
  **Recite** = user-selected range → `PiNumberQuiz` (records a session; setup shows run-history/best-runs). The ultimate goal is reciting π **from #1 onward**, so runs are read-time split into two tracks by anchor (`piStats.ts`: `isFullRecite`/`fullReciteSessions`/`practiceSessions`; **no** stored flag): a **full recite** = a run that started at π #1 (`anchor === 1`) — its own record (`fromStartRecordRun` = greatest `reach`, earliest wins ties) + chronological history + `bestFromStartPairsPerSec`, all in the left rail's top section; every other run is **practice**, collapsed below. Beating the standing from-π#1 record (`isFromStartRecord`, strictly greater, non-zero reach — checked in `PiNumberQuiz` against the sessions stored *before* this run lands) fires a result-screen celebration: a "🎉 New record — π to Nd" banner + `RecordFireworks` (dependency-free canvas overlay, honours `prefers-reduced-motion`). Its rails (left run-history, right "ready to recite") are published via **`usePiReciteRail`** (mirroring Memo's `usePiMemoRail`); the right rail groups adjacent segments that were successfully memoed but not yet flawlessly recited into one-tap continuous runs; flawless segments are persisted independently even when another segment in the same run has mistakes. **Train** (`PiTrainTab`)
  = weakness-targeted practice, two stats-driven sections each surfacing the worst 3 (worst-first, "new" for untested): weakest
  **segments** (`rankPiSegments` rolls up the `pi:` log per 10-pair block → one-tap Recite run for that segment, records a session)
  and weakest **chains** (`rankPiBoundaries` reads the `pi-chain:` log → recite a segment then bridge 20 pairs into the next;
  crossing the boundary records `pi-chain:<segIdx>` for the first pair of the next segment via `recordPiChain`; **no** `PiSession`).
  **Anchors** (`PiAnchorTab`) = segment-chain training: pick a start segment + chain length, then type the **opening pair of each
  segment** in turn (`Segment 4 · π digits 61–80` prompt, answer is the pair) — trains the segment *order*, not any one segment.
  Runs on `PiNumberQuiz` with `answerSize={1}`, `recordAttempts={false}`, custom `labels`, and a `distractorPool` of all segment
  anchors (so MC options never leak what's next). **Session-only — records nothing**, so it can't skew Recite/Train stats.
  Word-chain (Memo) records no `pi:`/session stats, but a segment recalled all-correct in Memo mode is remembered in
  `major-pi-memoed-segs` so it stops being suggested. Memo's setup publishes a **right rail** ("Next to memo") via `useRails`
  whose one-tap **Study →** jumps straight into the first segment that's neither recited nor memoed.
  **Per-segment stories:** the Memo tab lets the user author a freeform **story** + one **picture** per segment (`pi_stories`
  IndexedDB store, `features/pi/shared/story/piStories.ts`; `usePiStory`/`usePiStorySegs`/`useBlobUrl` hooks). Shown inline (view↔edit `StoryPanel`)
  in the **study** phase and read-only-with-edit on the **result** screen; **hidden in recall** (spoiler). Images arrive via file
  upload or clipboard paste, downscaled to ≤1024px WebP@0.8 (JPEG fallback) by `features/pi/memo/imageResize.processImage` before storing.
  Setup grid cells get a violet corner dot for segments with a story; setup also has JSON **Export/Import stories** (all segments
  as `{seg,text,imageDataUrl}[]`). The story display **highlights the segment's words** in the freeform text (`features/pi/shared/story/storyHighlight`,
  token-edge match so "biten" hits "bit" and "fotballmål" hits "mål"); matching is **sequential** — the words are an ordered sequence, so each expected word
  highlights the *next* matching token, consuming one at a time (repeats supported) — and warns (edit + view) when a word never matches.
  **Cards:** `CardsDrill` is prop-driven (`words`/`drillTypes`/`onRecord`/`storagePrefix`/`onEditWords`)
  and hosts Card→Word / Card→Number / `DeckMemoDrill`; two thin wrappers select the word source —
  `MajorCardsDrill` (`cards` mode: `useWords` + records to global stats, all 3 drill types) and
  `ThemedCardsDrill` (`themed-cards` mode: `useCardWords`, Card→Word + Deck Memo only, no stats, opens `CardWordsOverlay`).
  **PAO Deck** (`pao-cards` mode) is a **separate** drill, not a `CardsDrill` wrapper (its triple shape doesn't fit
  the single-string engine): `PaoCardsDrill` (`usePaoCards`) hosts a drill-type toggle (**Encode** / **Decode** / **Deck Memo**)
  + ♣♦♥♠ suit chips. **Encode** = card → type all three fields (per-field ✓/✗, card correct only if all three match).
  **Decode** = one field value (Person/Action/Object selector) → identify the card (MC card-face picks / typing the card code,
  per the global answer toggle). Both are **session-only** (in-memory `roundStats` weighting, no persisted/global stats;
  `pickWeighted('enc', …)` only reads draw weights). **Deck Memo** = `PaoDeckMemoDrill` (forked from `DeckMemoDrill` so the
  shared one stays untouched): memorise the deck in P₁·A₂·O₃ triples, then blind card-order recall grouped in threes; keeps its
  own run history under `major-pao-deck-memo-history`.
- **UI & shell** (`app/`, `app/layout/`, `app/overlays/`, `core/ui/`; a few list-editors in features) — `app/ModeSelector` (home screen: **Systems** section for Major System drills, **Applications** section for Pi + Cards + PAO Deck); shared `core/ui/`: `MultipleChoice`/`TypingInput` (answer inputs),
  `ScoreBar`, `RangeSlider` (dual-thumb number range, accessible), `RankRangeSelector`, `WordListGrid`, `AnswerModeToggle`, `Switch` (accessible on/off toggle);
  Major-System-local (`features/major-system/`): `RoundStatsPanel`, `HintButton` (vowel skeleton), `SoundKeyGrid` (editable sound-key table)/`SoundKeyPanel`.
  **`app/layout/PageLayout`** (the one base layout for every screen — ADR 0001; App renders exactly one, wrapping all mode content).
  Fixed `42rem`/max-w-2xl center that never moves, flanked by symmetric `minmax(0,18rem)` gutters via CSS grid; single `xl`
  breakpoint (three columns above, slide-in drawers below via `useOverlay`). Rails are **not** props — drills publish their
  current-view rails through **`useRails(config, deps)`** (`app/layout/PageLayoutContext`, read back by `PageLayout` via
  `usePageRails`; the `deps` array prevents an update loop), so every phase of every mode stays inside the one center column.
  The grid is `items-start` (rails hug their content height) and gutters are plain blocks (a rail fills its gutter beside the
  center); content flanked by a rail fills the 672px center (`w-full`) so the rail sits tight against it. Chrome that should sit
  **above** the rail row (Pi's tab bar + digit slider) is published via **`useLayoutHeader(node, deps)`** and centered at the
  center width, so rails top-align with the body content, not the chrome. **Overlays share
  `Overlay` (`app/layout/Overlay.tsx`)** — the `role="dialog"` shell, `useOverlay` wiring, header bar, close
  button, and scroll body; callers pass `ariaLabel`/`header`/`maxWidth`/children (`TabButton` is the shared
  header tab). Overlays (`app/overlays/` + feature-local editors): `ReferenceOverlay` (sound key + major `WordListGrid`), `CardWordsOverlay` (Themed Deck
  word list, suit-grouped), `SettingsOverlay` (mastery tolerance, max π digits, Pi pairs-per-answer, offline mode + version/update),
  `StatsOverlay` (worst-first ranking per direction, plus a **🥧 π tab** that async-loads Pi weak positions + run summary).
- **Hooks** (co-located with what they serve) — `core/scoring/`: `useStats` (`recordFull` records item-data + attempts and returns its grade; `getStats`
  derives direction-less aggregates from item-data; `buildRepQueue`, `getDueCount`, `getNextDueMs`),
  `useAnswerTimer` (active-elapsed timer/pause/STALE-discard); `core/ui/`: `useAnswerMode`;
  `features/pi/shared/`: `usePiSegmentStatuses` (async per-segment new/weak/learned status from the `pi:` log, re-fetched on a `refreshKey`),
  `useSegmentPickerData` (statuses + memoed set + statusesLoading, shared by Recite/Anchors — colocated with `PiSegmentRangePicker`),
  `story/`: `usePiStory`/`usePiStorySegs`/`useBlobUrl` (async per-segment Pi story load + grid indicator set + object-URL lifecycle
  for a stored Blob — revokes on change/unmount); `features/pi/memo/`: `usePiStoryEditor` (story authoring lifecycle),
  and the per-tab rail hooks `usePiMemoRail` (`memo/`) + `usePiReciteRail` (`recite/`);
  `app/layout/`: `useOverlay` (focus trap/return + Escape + registers `overlayGuard`);
  `app/settings/`: `usePwaUpdate` (wraps `virtual:pwa-register/react`; gates SW update checks on `settings.offlineMode`,
  auto-applies updates from checks it initiates, exposes build version + manual check — called once in `App`).
- **Pure utils** (now filed by domain) — `core/scoring/`: `quiz` (`shuffle`, `pickDistractors` same-decade-biased, `buildEncOptions`/`buildDecOptions`,
  `pickWeighted(dir,…)`), `roundStats` (`RoundStat`/`RoundAttempt` types + `applyRoundAttempt` reducer, shared
  by all drills), `recallColor` (UI latency color), `roundMastery`, `numberStats`;
  `core/`: `answerMatch` (`matchesAnswer` word + `matchesNumber` digit), `storage` (`safeSet`/`safeRemove` + guarded `readString`/`readJSON`);
  `app/layout/`: `overlayGuard` (`isOverlayOpen`);
  `core/ui/`: `numericInput`;
  `features/major-system/`: `vowelSkeleton`;
  `features/cards/pao/`: `triples` (`groupTriples`/`roleAt` — PAO 3-card grouping);
  `features/pi/shared/`: `piSegments` (`segmentAnchorPos`/`segmentDigitRange`/`segmentAnchorPairs` — 0-indexed π segment ↔ position/digit-range/anchor pair),
  `story/storyHighlight` (`highlightStory` — sequentially match a segment's ordered words at either token edge in a freeform Pi story → highlight runs + missing-word list);
  `features/pi/memo/`: `imageResize` (`processImage` — canvas downscale to ≤1024px + WebP@0.8/JPEG-fallback re-encode, for Pi story pictures).
- **Data & stores** (filed by domain) — `features/major-system/`: `words.csv`+`words.ts`, `soundKey.csv`+`soundKey.ts`+`soundKeyCsv.ts` (editable sound key);
  `features/cards/`: `cardWords.csv`+`cardWords.ts` (Themed Deck, 52 cards; clubs 01–13 seed from the major defaults);
  `features/cards/pao/`: `paoCards.csv`+`paoCards.ts`+`paoCsv.ts` (PAO Deck, 52 person/action/object triples; dedicated quoting-aware parser);
  `core/`: `wordsCsv.ts` (shared CSV parse/serialize), `cards.ts` (52-card deck);
  `core/scoring/`: `scoring.ts` (all scoring/latency constants), `itemStore.ts` (ItemRecord + load/save + storage config),
  `attemptStore.ts` (IndexedDB `major-system` db owner, **v2**; `addAttempt`/`getAttempts` are item-keyed wrappers over the
  raw-key `addAttemptRaw`/`getAttemptsForKey` primitives; exports the shared `getDb`/`reqToPromise`/`txDone`/`hasIdb` plumbing),
  `sm2.ts`, `typingSpeed.ts`;
  `features/pi/shared/story/`: `piStories.ts` (per-segment Pi story CRUD over the `pi_stories` store + JSON export/import + `dataUrlToBlob`/`blobToDataUrl`,
  reusing `attemptStore`'s connection); `features/pi/shared/`: `piStats.ts` (Pi run summaries + per-position aggregation +
  `piSegmentStatuses` new/weak/learned rollup), `piDigits.ts`, `piProgress.ts`;
  `app/settings/`: `settings.ts`.

## Conventions & gotchas
- **Read this file first in fresh contexts and keep it updated** when workflow, architecture, commands,
  or persistent repo expectations change.
- **Verify with the host Node toolchain when available**, otherwise use Docker (`tsc -b`, `vitest run`, `vite build`) — the project supports both workflows.
- **Dev server runs through Docker/Vite on a Windows bind mount.** Vite uses slow polling in
  `vite.config.ts`; after watcher config changes, run `docker compose up -d --build` or restart `app`.
- **Commit + push each completed, verified change to `main`** (one logical change per commit). `.gitignore`
  covers `node_modules/`/`dist/`; keep build artifacts (`package-lock.json`, `tsconfig.tsbuildinfo`) out.
- **All localStorage access goes through `core/storage`** (`safeSet`/`safeRemove` writes, `readString`/`readJSON`
  reads) — private-mode/quota safe.
- **Full-screen overlays must render inside `<Overlay>`** (which uses `useOverlay`) so the drills' global keydown
  handlers (which check `isOverlayOpen()`) don't fire behind them.
- **PWA / offline** (`vite.config.ts` `VitePWA`, generateSW, `registerType: 'prompt'`, `injectRegister: null`).
  The SW is registered in code by `usePwaUpdate` (not the plugin's auto-inject). The app has **zero runtime
  network calls** — once installed it runs fully from the precache; the only server contact is SW update checks,
  which `settings.offlineMode` gates. Build identity is baked at build time via `define` (`__BUILD_TIME__`,
  `__BUILD_COMMIT__` (git short SHA, best-effort — needs git in the build image; the prod `Dockerfile`'s
  `node:20` has it, but `node:20-alpine` does not → `unknown`), `__APP_VERSION__`), declared in `src/vite-env.d.ts`.
  Serve over HTTPS/localhost (secure context) or the SW won't register.
- **Known remaining work:** `PiDrill` (~640 lines) and `CardsDrill` still concentrate the complex nested
  conditionals and would benefit from extracting their phase/answer state into hooks; `RepetitionDrill`/`PiDrill`/
  `SpeedRound` still use their own timing instead of `useAnswerTimer`. Age-based decay in `numberStats` is not
  wired yet (`HISTORY_HALFLIFE_DAYS` is the intended knob); the number-drill `attempts` read path stays unconsumed
  (Pi's per-position log is the first consumer, via `getAllAttempts`).

## Ignore in context
`node_modules/` `dist/` `.vite/`

## Agent skills

### Issue tracker

Issues live in GitHub Issues for this repo (`github.com/JolleNo10/major-system-app`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` at the repo root + `docs/adr/`. See `docs/agents/domain.md`.
