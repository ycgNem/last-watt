# Handoff

Where the last session stopped, for a fresh one. Read this first, then the rest of the docs in
the order `CLAUDE.md` gives. `PROGRESS.md` is the long version.

## State (2026-10-11, end of the fifth session)

- **Everything is committed and pushed to `main`**; the live build redeploys on each push (link in
  the repo's About box, never in a file). `npm run typecheck` is clean and `npm test` passes
  143 tests.
- The Milestone 2 gate is passed. Since then: the owner's asks (wave pay, split build bar,
  tutorial), pieces of Milestones 3–11 and **seven `td-critic` reviews**, each followed by fixes
  (`DECISIONS.md`, "Second review" to "Seventh review"). The seventh was a verification pass, and
  its findings are fixed.
- **Four maps**: the station (forgiving on purpose), the Switchback, the Fork and Two Roads.
  Measured bar (lights kept of 20: plan / no verbs / human profile / plan +2 Jars):

  | Map | Plan | No verbs | Human | +2 Jars |
  |---|---|---|---|---|
  | Station | 20 | loses w12 | 20 | 20 |
  | Switchback | 17 | 7 | 12 | 17 |
  | Fork | 13 | 5 | 17 | 13 |
  | Two Roads | 11 | loses | 11 | 16 |

## Waiting on the owner

The four calls are in `PROGRESS.md` → Next, each with a recommendation: the Flywheel (cut),
the content freeze (keep, next round on sound and art), the late money glut (leave), and the
first map staying forgiving (keep). Don't act on these without an answer. If the owner says
"keep going", do the suggested next work listed there.

## How to run and check

- Play: `Play.bat`, or `npm run dev` → http://localhost:5173.
- Gate: `npm run typecheck`, `npm test`, `npm run screens` (overlap audit; look at the PNGs in
  `e2e/out/`), `npm run shots`, `npm run smoke`.
- Balance probes: `design/*.mts`, run with `npx vite-node design/<name>.mts`; each script's
  header says what it measures. `verbs.mts` measures the twelve-wave run (the bar above);
  `check.mts` covers one map.

## Environment gotchas (learned the hard way)

- Node is `C:\Users\jacks\tools\node-v22.20.0-win-x64`. In Git Bash prefix commands with
  `export PATH="/c/Users/jacks/tools/node-v22.20.0-win-x64:$PATH"`.
- LSP diagnostics are often stale after edits; `npm run typecheck` is the authority.
- Bash heredocs that contain template strings with backticks break. For multi-line code edits,
  write a small Python script to the session scratchpad (replace with `assert a in s`) and run it
  with `python3`, or use the Edit tool.
- Never `import` `e2e/screens.mjs` to inspect it: importing it runs the whole harness.
- Don't commit `.claude/launch.json` (local) or `e2e/out/` (regenerated). Stage with
  `git add -A -- . ':!.claude/launch.json' ':!e2e/out'`.
- The repo is public: no tokens, account names, emails or the live URL in any file. The PixelLab
  token lives only in `PIXELLAB_API_TOKEN`.

## Branches and worktrees

- `main`: everything.
- `magpie-wip`: the Magpie (a storage thief), parked on purpose (grid attacks don't bite while
  the grid is in surplus). Not merged.
- `embers`, `maps`, `exp`: fully merged into `main`, safe to delete. The old worktree
  `C:\Users\jacks\Documents\candlepower-wt` (on `exp`) is obsolete; remove it with
  `git worktree remove ../candlepower-wt` when convenient.

## Where the recent work lives

- Grid threats and pressure (read-only models beside the tick): `src/sim/threats.ts`,
  `src/sim/pressure.ts`, `src/sim/lines.ts`.
- The supply ledger and per-wave flow: `src/sim/systems/stats.ts` (`lossByWave`, `flowByWave`).
- The loss line: `src/app/diagnose.ts` (pure, tested in `tests/diagnose.test.ts`).
- Lesson cards: `src/app/lessons.ts`. Telegraph, threat overlay, Extractor panel, end chart:
  `src/app/play.ts`. Threat band and feed: `src/render/renderer.ts`.
- The Coker (coke can't be snuffed): `src/sim/systems/economy.ts`, `enemies.ts`,
  `tests/coker.test.ts`, `DESIGN.md` §3.2.

## A good first prompt for the next session

> Read HANDOFF.md, then the docs as CLAUDE.md says. The owner's answers to the four calls are:
> … (or: "go on with the suggested next work"). Work through it and finish with the Definition
> of Done.
