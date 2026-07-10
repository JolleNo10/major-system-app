# Majorsystemet

Norwegian Major system mnemonic practice app. Vite + React + TypeScript + Tailwind CSS v4. Docker-only dev workflow.

## Commands
```bash
docker compose up          # start dev server → http://localhost:8080
docker compose up --build  # rebuild (after package.json changes)
docker compose down        # stop
docker build -t major-system . && docker run -p 8080:80 major-system  # prod
```

## Key Files
| File | Purpose |
|------|---------|
| `src/data/words.ts` | **WORD LIST** — edit to change words (canonical defaults) |
| `src/data/soundKey.ts` | Sound key mapping (digit → sounds) |
| `src/context/WordsContext.tsx` | React context: merges words.ts + localStorage overrides |
| `src/hooks/useStats.ts` | Per-number correct/wrong stats (localStorage) |
| `src/App.tsx` | Top-level state machine (mode, overlay, answerMode) |
| `src/components/modes/` | One file per drill mode (7 total) |

## Architecture
- **No router**: `currentMode` state in App.tsx drives rendering
- **Answer modes**: all drills render `<MultipleChoice>` or `<TypingInput>` based on `answerMode` prop
- **Word list**: `words.ts` = defaults, localStorage `major-word-overrides` = user edits, `useWords()` = merged
- **Stats**: localStorage key `major-stats`, read via `getStats()`, written via `useStats().recordAnswer()`
- **Always dark**: no light mode, zinc-950 base, violet-600 accent

## Ignore in Context
`node_modules/` `dist/` `.vite/` `*.lock`
