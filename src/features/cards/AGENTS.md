# Cards task bootstrap

## Required context — load before inspecting implementation

Before inspecting or modifying implementation files in this feature, you MUST
read `docs/architecture/features/CARDS.md`.

- Load `docs/architecture/CORE.md` for shared card, scheduling, UI, or
  layered-store behavior.
- Load `docs/architecture/PERSISTENCE.md` for editable decks, histories,
  migrations, resets, or import/export.
- Load `docs/architecture/SYSTEM.md` for public exports, app modes/providers, or
  the Major System dependency.

## Scope and starting points

Normally remain inside `src/features/cards/` plus direct contracts. Start from
`index.ts` and the owning flavor: `themed/`, `pao/`, or genuinely shared
mechanics in `shared/`.

Do not inspect Pi, World Countries, or Major System.

## Validation

Follow the progressive verification policy in the root `AGENTS.md`.

- Feature root: `src/features/cards/`.
- During implementation, prefer the owning capability/subdirectory:
  `themed/`, `pao/`, `shared/`, or the relevant `card/` mechanics.
- Near feature completion for substantial work, run:

```text
npx vitest run src/features/cards
npm run typecheck
```

Do not repeatedly run global typecheck or a production `vite build` for normal
feature changes. Use the equivalent scoped Docker command from the root policy
when Node/npm are unavailable; widen to the full repository only at an
integration boundary.

## Known traps

- PAO's three-field and triple data shape intentionally does not fit the
  single-value shared Cards engine.
- Themed and PAO editable stores are independent; seeding Person values changes
  only PAO.
- PAO Decode selected fields come from distinct cards and advance together.
- PAO Deck Memo preserves partial final triples.
