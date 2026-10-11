# Start here

## Before the first Claude Code session (10 minutes, by hand)

1. ~~Decide the name.~~ Done 2026-10-11: **Last Watt** (was "Candlepower"). Quick search found
   no collision; check the `.com`/`.games` domain and GitHub before the first public build.
2. Make the folder `C:\Users\jacks\Documents\candlepower` and put these files in it:
   `PLAN.md`, `DESIGN.md`, `CLAUDE.md`, `STYLE.md`, `ROADMAP.md`. Create empty
   `DECISIONS.md`, `PROGRESS.md`, `IDEAS.md`.
3. `git init` in that folder. Create the GitHub repo when Milestone 0 is done, not before.
4. Check your PixelLab balance (it resets Nov 9; 3,030 left on 2026-10-11). Milestone 0's
   palette test costs about 10–15 generations; the slice's placeholder-to-real art pass about
   60–100. Placeholders are drawn in code with `pixel-art-studio` and cost none
   (`STYLE.md` → Art sources).
5. Read `DESIGN.md` once more yourself. If any number or lesson feels wrong to *you*, change it
   now and write why. After this point the docs are law for Claude Code and changing them
   mid-build is how the last project drifted.
6. Open the folder in Claude Code (the desktop Code tab, as with S&S) and paste Prompt 1.

## Prompt 1 — Milestone 0, the foundation

```
Read CLAUDE.md, then PLAN.md, DESIGN.md, ROADMAP.md, STYLE.md, PROGRESS.md and DECISIONS.md
in that order before doing anything. Then do Milestone 0 only.

Build the foundation of this repo by extracting the engine layer from
C:\Users\jacks\Documents\sprocket-and-sprout: src/engine (loop, input, keybinds, rng, math,
events, audio engine incl. the jsfxr bank loader), the bitmap font and IMGUI kit from src/ui,
render/atlas.ts and the sheet loader, the camera, chunked ground rendering, the darkness and
lighting buffer, the save/migration scaffolding, scripts/ (art importers, pixellab.mjs and
helpers, make-icons), the e2e harness (screens.mjs with its overlap report, shots.mjs,
smoke.mjs), Play.bat, Package for web.bat, the GitHub Pages workflow, vite/vitest/tsconfig and
package.json with the same scripts. Do NOT copy, adapt, read for ideas, or reference anything
under its src/sim, src/data, src/app or src/render/art generators; this game's rules come from
DESIGN.md only. Strip every Sprocket & Sprout name, string, color alias and asset. Keep the
code style and the test setup.

Copy .claude/agents/ (art-director, indie-critic, qa-screens) and rewrite each one's project
section for Last Watt using PLAN.md and STYLE.md, including the standing instruction to flag
anything derivative. The art-director's section covers both art sources from STYLE.md → Art
sources (pixel-art-studio for placeholders, PixelLab for final). Add a balance-auditor agent as
described in CLAUDE.md. The indie-critic's
reference list should cover tower defense and base-defense games (it will know them) and it
must hold the build to the not-list in PLAN.md.

Then: a dark 40x30-tile map, a lit Hearth in the middle drawn through the darkness buffer,
camera pan and zoom at integer factors, the kW HUD strip with placeholder zeros, a title screen
reading "Last Watt". The Hearth and ground are code-drawn placeholders (pixel-art-studio). Have
the art director run the palette test in STYLE.md with PixelLab (6 sprites, both candidate
palettes, each rendered powered/starved/dark in a contact sheet), show me the sheet, and wait
for my pick before writing the palette table. Once picked, save it into pixel-art-studio as a
named palette.

Finish with: typecheck and tests clean, npm run screens report inspected, a screenshot of the
lit Hearth that you have looked at, PROGRESS.md describing exactly what exists, DECISIONS.md
with the first entries (palette pending, anything you decided), one commit. Stop there. Do not
begin Milestone 1.
```

## Prompt 2 — Milestone 1, the slice (after you've picked the palette)

```
Read PLAN.md, DESIGN.md, CLAUDE.md, STYLE.md, ROADMAP.md, PROGRESS.md and DECISIONS.md.
Build Milestone 1, the vertical slice, exactly as DESIGN.md specifies and nothing more.

Order of work, each step tested before the next: (1) the grid system — networks from nodes,
supply, priority tiers, satisfaction, Jar charge/discharge, wasted kW — with unit tests that
check the arithmetic in DESIGN.md §2 and §6; (2) the slice map with its path and deposits;
(3) enemies and waves with call-early and bounty; (4) towers reading satisfaction, Lamp tiers
1–2, Floodlight spill, Beacon slow; (5) build mode, money, Shed as a hotkey and a click, the
three readability states from STYLE.md even on placeholder art; (6) Lab with the two projects;
(7) Overcharge; (8) lights, run end, win after wave 8, restart; (9) the pace tests from
DESIGN.md §6 and the layout A / S / B bot; (10) placeholder art replaced through the art
director within the budget noted in PROGRESS.md.

Every stat in src/data must carry a derivation string naming its DESIGN.md section; the data
validation test enforces this and the wattage-column rule. If a number from DESIGN.md turns out
to produce a lesson that doesn't hold (for example layout A leaks more than 2), do not tune
silently: write the new derivation in DESIGN.md, explain it in DECISIONS.md, then change the
data. If you catch yourself writing a mechanic that resembles a specific shipped game, stop and
tell me.

Send me screenshots at: first brownout, first Shade blackout, first Overcharge, the win screen.
Finish with the Definition of Done from CLAUDE.md, PROGRESS.md updated, and then run the
indie-critic against DESIGN.md §10 and paste its ranked findings. Do not start Milestone 3.
```

## After the slice

Play it yourself for an evening before reading the critic's report, then read it. The three
questions in `DESIGN.md` §10 are the only thing that matters at that point. If the answers are
good, mark the gate passed in `ROADMAP.md` and keep going one milestone per session. If not,
change the model, not the roadmap.
