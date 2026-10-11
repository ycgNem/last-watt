# CLAUDE.md — Last Watt

You are building **Last Watt**, a pixel-art tower defense where energy is a live flow. Read
`PLAN.md` (what and why), `DESIGN.md` (every number and its derivation), `ROADMAP.md` (what to
build now), `STYLE.md` (how it looks) and `PROGRESS.md` (what exists) at the start of every
session, in that order. `DECISIONS.md` holds every design decision with its reason; add to it,
never silently contradict it.

## Stack (decided, don't relitigate)

TypeScript strict · Vite · one HTML5 Canvas 2D with `imageSmoothingEnabled = false` ·
fixed 60 Hz pure simulation decoupled from a rAF renderer · immediate-mode UI drawn on the
canvas with the bitmap font · Web Audio (procedural + jsfxr bank) · localStorage saves with
versioned migrations · Vitest for the sim · Playwright + headless Chromium for screenshots,
UI checks and bot play · GitHub Pages via the workflow · Electron packaging later.

The engine layer came from Sprocket & Sprout (`C:\Users\jacks\Documents\sprocket-and-sprout`):
`src/engine/`, the UI kit and font, `render/atlas.ts`, the lighting buffer, the art importers and
PixelLab scripts, the e2e harness and the deploy workflow. **Nothing from its `sim/` or `data/`
is to be copied, adapted or consulted.** If a mechanic there seems reusable (the power
satisfaction rule, for instance), re-derive it from `DESIGN.md`.

## Architecture rules

- `src/sim/` is pure: no DOM, canvas, audio or timers. It runs headless in tests. Presentation
  effects are events on the game's event queue, drained by the renderer each frame.
- One system per file in `src/sim/systems/`, run in a fixed order from `Game.ts`:
  waves → enemies → grid (supply, tiers, satisfaction, storage) → towers → abilities →
  research → construction → economy → stats.
- The grid is computed once per tick, before any consumer acts. Consumers read their
  satisfaction; they never compute it.
- All content is typed data in `src/data/` (buildings, towers, enemies, waves, research,
  skills, maps). A validation test checks every cross-reference and that **every numeric stat
  has a `derivation` string** pointing at a section of `DESIGN.md`.
- Rendering: baked static ground chunks; dynamic sprites culled and y-sorted; the darkness
  buffer with light holes is the primary read of grid state (see `STYLE.md`).
- Saves: seed + deltas, `SAVE_VERSION` + ordered migrations, from the first milestone.

## Definition of done (every milestone, every PR-sized change)

1. `npm run typecheck` clean, `npm test` green (sim tests, data validation, pace tests).
2. `npm run screens` run and the report inspected: no overlapping or cut-off text.
3. For anything the player sees: a Playwright screenshot taken and **looked at** (Read the PNG).
4. For anything that changes a number: the derivation updated in `DESIGN.md`, and the pace test
   that encodes the lesson still passes (or is updated with the new reasoning written down).
5. `PROGRESS.md` updated (what exists, what is stubbed, what is next). `DECISIONS.md` updated
   if a decision was made. Commit with a message that says what and why.

## Standing instructions

- **Vertical slice first.** Until `ROADMAP.md` Milestone 2's decision gate is marked passed,
  build nothing from Milestone 3 onward, however tempting. Add ideas to `IDEAS.md` instead.
- **Flag anything derivative.** If a mechanic, number, name, enemy, tower or UI pattern you are
  about to write resembles a specific shipped game, stop and say so in chat and in
  `DECISIONS.md`, then either re-derive it from the model or drop it. The not-list in `PLAN.md`
  is a floor, not the whole list.
- **No new currency, no new tree** without a `DECISIONS.md` entry explaining which pillar it
  serves and why the existing four currencies / three trees can't carry it.
- **Every upgrade node has a wattage column.** A node with no energy-side effect is rejected
  by the data validation test.
- **Readability over detail.** If a screenshot at 1× zoom doesn't make powered / starved / dark
  obvious within a second, fix that before adding anything.
- When the build is runnable, play it with the bot before asking for a review, and send
  screenshots of the moments that matter (first brownout, first Shade blackout, first Overcharge).
- Ask before: changing the tile size, the palette, the tick rate, the currency list, or the
  milestone order. Everything else: decide, write it down, move on.

## Agents (in `.claude/agents/`)

- `td-critic` (replaced `indie-critic`, 2026-10-11): tower-defense design review against
  `PLAN.md` pillars, the not-list and `DESIGN.md` §10; runs at every milestone and at the
  Milestone 2 gate. It plays the build and does the kJ arithmetic itself.
- `art-director`: owns `STYLE.md`; draws placeholders in code with `pixel-art-studio` and final
  art with PixelLab (`STYLE.md` → Art sources), quantizes to the palette, imports through the
  pipeline. Never copies a reference sprite.
- `qa-screens`: runs the screenshot and overlap checks and reports.
- `balance-auditor`: reads `src/data/*`, recomputes every derived check in `DESIGN.md` §6 from
  the current numbers (the pace tests and `design/tune.mts` now exist), and reports any lesson
  that no longer holds.

## Environment notes

Windows. Node is the portable v22.20.0 at `C:\Users\jacks\tools\node-v22.20.0-win-x64`, on the
user PATH since 2026-10-11 (a shell opened before that still needs the S&S `HANDOFF.md` PATH
line). Installed globally there: `typescript@7.0.2` and `@playwright/mcp@0.0.83`. Python 3.13
with Pillow 12 is installed and `python3` works from Git Bash (for `pixel-art-studio`). The repo is
public: no tokens, account names or emails in any file. The folder is still named `candlepower`
(the old working title); the game is Last Watt.

## Dev tools (use them; checked working 2026-10-11)

- **TypeScript LSP**: the `LSP` tool (plugin `typescript-native-lsp`). Navigate `src/` with it
  before grepping: `goToDefinition`, `hover` for types, `documentSymbol`, `incomingCalls`, and
  `findReferences` before renaming or deleting anything. Diagnostics arrive by themselves after
  each edit; fix them as they come rather than waiting for `npm run typecheck`, which is still the
  gate. It runs the project's own `node_modules/typescript` once that exists (else the global
  7.0.2). If `package.json` pins TypeScript 6 or older, also add `typescript-language-server` as a
  devDependency or the LSP stops starting.
- **Playwright MCP**: `mcp__playwright__*`, headed Chrome, `--caps vision`. For playing and
  debugging the running build by hand: start the Vite dev server, `browser_navigate` to it, then
  see with `browser_take_screenshot` (Read the PNG) and `browser_console_messages`, and act with
  `browser_press_key` and the coordinate (`*_xy`) mouse tools. The game is one canvas, so
  `browser_snapshot` only shows `<canvas>`; read game state with `browser_evaluate` against what
  the dev build exposes. It can only write inside the repo and defaults to `.playwright-mcp/`;
  keep that in `.gitignore`. It does not replace the harness: `npm run screens` / `shots` /
  `smoke` remain the definition-of-done checks, and anything found by hand becomes a harness case.
  When the user should watch, use the built-in Browser pane (`preview_start`) instead.
- **PixelLab MCP**: `mcp__pixellab__*`, user scope, the source for final art (`STYLE.md` →
  Art sources).
  Subscription generations reset on the 9th of each month; `get_balance` before a batch.
  `pixelart_workbench` (inspect, edit and draw by hand) is free: use it for small fixes before
  spending a generation. If its tools are missing, `scripts/pixellab.mjs` with
  `PIXELLAB_API_TOKEN` in the environment, never in a file in the repo. Say what you spent from
  the PixelLab budget in `PROGRESS.md`.
- **pixel-art-studio**: project skill in `.claude/skills/pixel-art-studio/` (vendored, MIT; local
  changes listed at the end of its `SKILL.md`). Claude draws every pixel in a Python build script
  with Pillow, renders a preview, Reads it, critiques and redraws. The source for placeholders and
  early art, and for small jobs where a generation isn't worth it; costs no PixelLab generations,
  but every preview pass costs context, so keep loops to the skill's 2–3. Build scripts live in
  `pixel-art/<slug>/build.py` and are the source of truth (never hand-edit their PNGs); the 1×
  master goes through the same importer as PixelLab art. Once the palette is picked, save it into
  the skill as a named palette so code-drawn sprites are palette-locked from the first pixel.
  `scripts/pixelpipe.py` also cleans and palette-locks a PixelLab export locally (background
  strip, alpha hardening, despeckle), which is what SpriteCook was for. SpriteCook is not used.
