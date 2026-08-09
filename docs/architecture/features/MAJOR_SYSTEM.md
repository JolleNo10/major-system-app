# Major System

## Agent loading

Before modifying this feature, read `src/features/major-system/AGENTS.md` and
this document. Stay in `src/features/major-system/` plus direct dependencies.
Load [CORE.md](../CORE.md) for shared scoring/UI/store changes,
[PERSISTENCE.md](../PERSISTENCE.md) for word/sound-key or attempt state, and
[SYSTEM.md](../SYSTEM.md) for barrel, provider, mode, or cross-feature changes.

## Purpose

Major System owns the digit-to-sound key, the editable `00`–`99` word mapping,
and drills that train encoding, decoding, sound recall, sequences, speed,
weakness, and due repetition. It supplies the word provider used by Pi and the
Major Cards flavor, but does not own those features' sequencing or workflows.

## Entry points

- `index.ts` is the public boundary for drills, providers/hooks, `SoundKeyGrid`,
  and shipped words required by app or feature consumers.
- `WordNumberDrill.tsx` is the shared configurable Encode/Decode engine.
- `WordsContext.tsx` and `SoundKeyContext.tsx` instantiate editable layered
  stores.
- Individual root `*Drill.tsx` files own distinct training modes.

## Ownership

- `words.csv`/`words.ts` — shipped fixed-width number-to-word content.
- `soundKey.csv`, `soundKeyCsv.ts`, `soundKey.ts` — shipped/editable digit sound
  rules and derived lookup structures.
- contexts and grids — effective shipped/saved/trial data and editing UI.
- `WordNumberDrill` plus thin Encode/Decode wrappers — word-number practice.
- Sequence, sound-key, reverse-sound-key, speed, weak-spots, and repetition
  files — their mode-specific orchestration.
- `HintButton`, `vowelSkeleton`, `RoundStatsPanel`, and `SoundKeyPanel` —
  Major-specific support UI/rules.

## Decision rules

- Major-specific word/sound semantics and drill policy stay here.
- Generic scoring, scheduling, matching, CSV, layered-record, answer-control,
  and storage mechanics belong in their existing `core/` owners.
- `WordNumberDrill` owns behavior shared only by Major Encode/Decode. Do not
  move it to core because other features consume the resulting word provider.
- Shipped word changes edit `words.csv`; shipped sound changes edit
  `soundKey.csv`. Browser persistence is user customization, not a way to
  rewrite bundled data.
- Cross-feature consumers use `useWords()`/the feature barrel and must not deep
  import contexts or data implementation.

## Dependencies

The feature uses `core/scoring`, `core/ui`, `core/storage`, `core/answerMatch`,
`core/wordsCsv`, and app settings for shared tolerance/focus. Pi and Major Cards
depend on the Major System public boundary; Major System does not depend on
them.

## Persistence

- `major-word-saved` and `major-word-overrides` layer user content over shipped
  words.
- `major-soundkey-saved` and `major-soundkey-overrides` do the same for
  composite `<digit>:<field>` entries.
- Major item/attempt evidence uses shared `major-item-data` and IndexedDB
  `attempts` namespaces `enc:NN`/`dec:NN`.
- Sequence, speed, and similar mode keys are feature-local preferences.

Load [PERSISTENCE.md](../PERSISTENCE.md) before schema, reset, migration, or
import/export changes.

## Public boundary

`@/features/major-system` exposes app modes, providers/hooks, `WORDS`, and the
reference grid required by current consumers. Keep implementation helpers and
contexts private unless a demonstrated external consumer needs them.

## Invariants

- Number keys are fixed-width strings `00`–`99`.
- The effective word/sound mapping is shipped, then saved, then trial override.
- Sound-key storage uses composite keys; display strings are derived, not
  independently persisted.
- Encode/Decode scoring continues through shared scoring/attempt contracts.
- Major System owns word meaning/storage; consumers own how they sequence and
  assess those words in their domains.

## Source anchors

- `src/features/major-system/index.ts`
- `src/features/major-system/WordNumberDrill.tsx`
- `src/features/major-system/WordsContext.tsx`
- `src/features/major-system/SoundKeyContext.tsx`
- `src/features/major-system/words.ts`
- `src/features/major-system/soundKey.ts`

## Historical rationale

Current feature packaging resolves
[ADR 0002](../../adr/0002-package-by-feature.md). Load it only when
reconsidering package ownership or the public boundary.
