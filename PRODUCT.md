# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Memory enthusiasts broadly — anyone learning or practicing mnemonic systems (Major System, Pi memorization, card memorization), from casual learners to competitive memory athletes. No single audience gating; the tool is openly useful to anyone who wants structured mnemonic training.

## Product Purpose

Mnemonics is an all-in-one mnemonic training suite. It covers the Major System (mapping 2-digit numbers 00–99 to phonetic keywords), Pi digit memorization, and playing-card association drills — the three pillars of number-based memory sport — in a single installable app that needs no account, no server, and no internet connection after install.

Success means a user can sit down, drill their weak spots, track their progress over time, and walk away faster and more accurate than before.

## Positioning

The meaningful difference is breadth without complexity: Major System encoding and decoding, Pi memorization (number quiz + word chain), and card association (Card→Word, Card→Number, Deck Memo) are all native — no stitching together separate tools. Each drill shares the same SM-2 spaced-repetition engine and latency-aware scoring, so the feedback is consistent and the weak-spot logic works across every mode.

## Operating Context

- Short focused training sessions (mobile or desktop); users may drill during commutes or downtime
- Installed as a PWA; expected to launch and work immediately with no connectivity
- A user builds a personal word list for the Major System over time (3-layer customization: shipped defaults → saved → trial overrides); their word choices are part of their long-term memory practice
- Stats and spaced-repetition history persist locally and inform every future session

## Capabilities and Constraints

**Core capabilities:**
- Major System: bidirectional drilling (encode number→word, decode word→number), sound-key reference, weak-spot targeting, SM-2 repetition queue, speed rounds, sequences
- Pi: number-quiz drill with per-position accuracy tracking and run-history panel; word-chain mode
- Cards: Card→Word, Card→Number, Deck Memo; Themed Deck with a fully separate word list
- Answer modes: multiple-choice and typing input (with adaptive typing-speed compensation)
- Word list is user-editable with import/export (same CSV format as shipped defaults)

**Hard constraints:**
- No backend. Zero runtime network calls. All state lives in the browser (localStorage + IndexedDB).
- Always dark — zinc-950 base, violet-600 accent. No light mode, ever.
- PWA with offline support; must work fully after install with no connectivity.
- Docker-only dev workflow (no host Node).

**Undecided:** No accessibility standard has been formally adopted; no mobile-first constraint was confirmed (desktop and mobile are treated equally).

## Brand Commitments

- **Name:** Mnemonics (product name); "Major System" is the underlying mnemonic technique, not the product name.
- **Visual tone:** always dark; violet accent. This is a permanent commitment, not a preference.

## Evidence on Hand

- Full working implementation in the repository: drill modes, scoring engine, word list, stats overlay, Pi and Cards applications.
- `src/data/words.csv`: 100 shipped keyword defaults (00–99).
- `src/data/cardWords.csv`: 52 card-association defaults.
- No marketing copy, testimonials, case studies, or external brand assets exist.

## Product Principles

1. **Drill what matters.** Weak-spot targeting and SM-2 scheduling mean training time concentrates on items that need it — not items the user already knows.
2. **One suite, full system.** Major System, Pi, and Cards in one place; consistent feedback model across all modes.
3. **Own your data.** Fully offline, no account, no telemetry. The user's word list and history are theirs alone.
4. **Minimal friction.** Sensible defaults and direct entry into a drill — no configuration gate between intent and practice.
5. **Durable, not trendy.** The interface recedes; the memorization work is the experience.
