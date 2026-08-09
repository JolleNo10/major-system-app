# ADR 0003 — Fold PAO into `cards`; split `cards` by flavor

- **Status:** Implemented
- **Date:** 2026-08-06
- **Refines:** ADR 0002 (package-by-feature layout)

## Context

ADR 0002 landed four flat features: `major-system`, `pi`, `cards`, `pao`. Two
strains showed up quickly:

- **`pao` is a card system, not a peer domain.** It drills a 52-card deck, shares
  the deck definition (`core/cards.ts`), and seeds its Person column from the
  Themed Deck word list — the `pao → cards` cross-feature edge ADR 0002 recorded.
  Treated as a top-level feature, "everything about cards" was split across two
  sibling folders.
- **`cards` itself bundled three distinct flavors flat** — the plain Major Cards
  drill, the Themed Deck, and the shared Card→Word/Number engine — with no
  in-folder signal of which files belonged to which.

## Decision

Merge `pao` **into** `cards` and split `cards`' internals by flavor. The feature
stays one folder with **one barrel** (`@/features/cards`); the flavors are
implementation structure behind it.

```
features/cards/
  index.ts     # single public barrel (Card providers/hooks + all card drills)
  shared/      # CardsDrill, DeckMemoDrill — the Card→Word/Number engine
  card/        # MajorCardsDrill (Major Cards)
  themed/      # ThemedCardsDrill, CardWords{Context,Overlay}, cardWords(.csv)
  pao/         # PaoCardsDrill, PaoDeckMemoDrill, PaoWords*, paoCards(.csv), paoCsv, triples
```

- **Shared engine placement.** `CardsDrill`/`DeckMemoDrill` are used by both
  `card` and `themed`, so they belong to neither — they sit in `shared/` rather
  than being owned by one flavor (which would force a `themed → card` edge).
- **The `pao → cards` edge becomes intra-feature.** The "🎭 From Themed Deck"
  seed is now `cards/pao/` → `cards/themed/CardWordsContext`, a deep import
  *within* one feature — allowed by the ADR 0002 convention. It is no longer a
  cross-feature edge, and `core/cards.ts` no longer needs to sit in `core`
  *specifically* to avoid one (it stays there anyway as genuinely shared infra).
- **Barrel unchanged in spirit.** External code still imports every card symbol
  (`MajorCardsDrill`, `ThemedCardsDrill`, `PaoCardsDrill`, `CardWordsProvider`,
  `useCardWords`, `PaoCardsProvider`) from `@/features/cards`. The old
  `@/features/pao` barrel is gone.

## Consequences

- **"Everything cards" is one folder again**, with each flavor legible at a glance
  and the shared engine named as such.
- **Two consumers simplified:** `app/main.tsx` and `app/modes.tsx` each drop a
  `@/features/pao` import, folding it into their existing `@/features/cards` line.
- **Feature count drops to three** (`major-system`, `pi`, `cards`). The
  layering rule is unchanged; the surviving cross-feature edges are
  `cards → major-system` and `pi → major-system` (both reuse the Words store).
- **Precedent:** a feature may split its internals into flavor subfolders while
  keeping a single barrel. Subfolders import each other by deep path, exactly as
  flat feature modules always have.
