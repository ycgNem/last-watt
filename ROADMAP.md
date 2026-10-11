# Last Watt — Roadmap

Each milestone ends with the Definition of Done in `CLAUDE.md`. **Nothing from Milestone 3
onward starts until Milestone 2's gate is marked passed below.**

## Milestone 0 — Foundation (starter kit)

Extract the engine layer from Sprocket & Sprout into this repo: loop, input and keybinds, rng,
events, audio engine, bitmap font, IMGUI kit, atlas and sprite loading, camera, chunked ground,
darkness/lighting buffer, save scaffolding with migrations, art importers and PixelLab scripts,
Playwright harness (`screens`, `shots`, `smoke`), `Play.bat`, `Package for web.bat`, the GitHub
Pages workflow, Vitest config. Strip every S&S-specific name. Copy and rewrite the three agents;
add `balance-auditor`. Art director runs the palette test from `STYLE.md` and writes the index
table and ramps.

Exit: `npm run dev` shows a dark map with a lit Hearth and a moving camera; `npm test` green on
an empty sim; `npm run screens` produces a report; the deploy workflow publishes it to GitHub
Pages; `PROGRESS.md` and `DECISIONS.md` exist with their first entries.

## Milestone 1 — The vertical slice

Exactly the `DESIGN.md` slice set: one hand-made map (36-tile path with two bends, two near
deposits and one far), Hearth, Extractor, Burner, Node, Jar, Lab with two projects, Lamp (tiers
1–2), Floodlight, Beacon, Moth, Shade, Pall, 8 waves with call-early (bonus dropped after the first critic review: the breather instead), money and bounty, priority
tiers with Shed, Overcharge, lights and run end, win screen after wave 8, restart. Placeholder
art is fine for a week; the three readability states are not optional even with placeholders.
The pace tests in `DESIGN.md` §6. A bot that plays layouts A, S and B.

Exit: a new player can finish or lose a 10-minute run with no explanation beyond a two-line
title screen; the pace tests pass; screenshots of first brownout, first Shade blackout and
first Overcharge are in `e2e/out/` and have been looked at.

## Milestone 2 — The gate

`td-critic` reviews the slice against the three questions in `DESIGN.md` §10 and the
not-list. The owner plays it. Either the model changes (in `DESIGN.md`, then the slice is
revised and reviewed again) or the gate is marked passed here with the date.

**Gate status: PASSED 2026-10-11, on the owner's word** after playing the slice ("its cool so
far"; asked for the next phase and the milestones). See `DECISIONS.md`, second session.
(Earlier the same day: Milestones 0 and 1 were built together as a playable slice at the owner's
request, revised after the first `td-critic` review, and published on GitHub Pages.)

**Since the gate (second session, 2026-10-11), in part:** Milestone 3 without belts (the Vane,
Burner / Extractor / Jar / Node tier 2, the first line loss); Milestone 4's first half (Searchlight,
Brazier, Starshell; Flit, Veil, Snuffer; tier 2 for every tower; the Floodlight re-derived as a
cone); Milestone 5's board (fourteen projects); Milestone 7's endless mode (one map still);
Milestone 10's tutorial and intel cards, brought forward at the owner's request. Each
milestone's remaining items are listed under it in `PROGRESS.md`.

## Milestone 3 — The factory half

Belts and arms carrying fuel from extractors to burners (lanes, curves, merging; no need for
undergrounds yet). Refiner (emberrock → coke at 2.5× density). Second and third generator types
(wind spinner: free, variable, weather-driven; tar still: liquid chain). Transmission tiers:
node capacity, long lines with losses. Flywheel (fast, small) vs Jar (slow, deep). Production
stats and a Lines view that names each power network's bottleneck. Blueprints.

## Milestone 4 — The wall half

Tower roster to 8–10, each a different (draw, efficiency, range, targeting) tuple. Per-tower
branches at tier 3. Enemy roster to 8–10, each interacting with the grid in a different way
(node knockers, light-drinkers that add demand, fuel thieves, dark-walkers that avoid light).
Walls and gates that cost no power but shape exposure.

## Milestone 5 — Research as a consumer

The full research tree priced in kJ, multiple labs, tier-3 scheduling UI, the research-during-
wave tension made legible (labs visibly dim when starved).

## Milestone 6 — The gaffer's verbs

Pulse, Reroute, Dark Bait; ability hotkeys; the cost of each shown in kJ against current storage.

## Milestone 7 — Runs and maps

Four to six hand-made maps with different deposit layouts and path shapes; escalating wave
tables generated from a model (total kJ per wave as a curve, composition by map); run end,
embers awarded, map unlocks. Save mid-run.

## Milestone 8 — The gaffer's skill tree

Embers, the tree from `DESIGN.md` §9, meta save separate from run save, respec.

## Milestone 9 — Sound and juice

Procedural and jsfxr bank; the grid has a sound (hum pitch tracks satisfaction; brownout is
audible); hit, kill, overcharge, blackout; screen effects within the readability rules.

## Milestone 10 — Onboarding and UX

First-run lesson cards triggered by events (first starve, first wasted power, first node
knocked out); settings, keybinds, UI scale; tooltips with kW/kJ everywhere.

## Milestone 11 — Balance and release

Bot plays every map; the balance auditor's report is clean; perf test with 300 towers and 500
enemies; README, itch page, GitHub Pages at the final name; domain later.

## IDEAS.md

Anything not on this list goes to `IDEAS.md` with one line of why. It is reviewed at each gate,
not acted on between them.
