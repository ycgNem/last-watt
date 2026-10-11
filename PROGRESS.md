# Progress

What exists, what is stubbed, what is next. Updated at the end of every session.

## Status (2026-10-11, second session)

**The Milestone 2 gate is passed** (the owner played the slice and asked for the next phase;
`DECISIONS.md`). This session built the owner's asks (wave pay, a split build bar, a tutorial)
and the first half of Milestones 3, 4 and 5, then balanced the twelve-wave run with the bot and
reviewed it with `td-critic` (see the end of this file for what the critic found and what was
done about it).

**How to play:** double-click `Play.bat` (or `npm run dev` and open http://localhost:5173), or the
live build (link in the repo's About box). Title → TUTORIAL (first time) or PLAY.

## What exists

- **Sim** (`src/sim/`, pure, 60 Hz, runs headless): `Game.ts` steps the systems in the fixed order
  waves → enemies → targeting → grid → towers → abilities → research → economy → stats.
  - Grid (`systems/grid.ts`): networks from the Hearth and Nodes (coverage, links, cut-outs),
    supply (the Hearth's 8 kW × lights / 20, lit Burners, Vanes), **line losses** (Long line
    Nodes), demand per consumer (per kind: beams, the Brazier's per-body draw, the Starshell's
    charge), four priority tiers (1 Works · 2 Wall · 3 Labs · 4 Spare), Jar charge/discharge,
    wasted kW, a smoothed share of power per building (for Veils), the wall's full-fire peak,
    brownout with hysteresis.
  - Waves (`systems/waves.ts`, `data/waves.ts`): twelve waves; the 20 s breather; **wave pay**
    (15 + 5n) when a wave is cleared; Flit clumps; endless after the last wave (×1.14 kJ a wave).
  - Enemies: Moth, **Flit** (fast clumps), Shade (cuts Nodes within 2.5), **Veil** (only seen by
    towers at ≥ 60% power, Overcharged towers, or a Brazier's heat), **Snuffer** (puts out Burners
    within 3.5 for 8 s), Pall (drinks 3/4 of a narrow beam, shadows a cone).
  - Towers: Lamp (beam), Floodlight (**30° cone**, 0.4 catch), Beacon (slow), **Searchlight**
    (7-tile beam, locks the heaviest, 0.5 s swing), **Brazier** (radial, 8 kW per body),
    **Starshell** (charges a 60 kJ shell, lobs it at crowds, leads its target). Tier 2 for all.
  - Factory: Extractor (adjacency feed), Burner, **Vane** (wind 0.1–1, mean 0.55), Jar, Node, Lab;
    tier 2 for Burner (Bellows), Extractor (Deep bit), Jar (Bank), Node (Long line).
  - Abilities: Overcharge (120 kJ, 3× for 4 s, any tower kind) with a **10 s cooldown**;
    **Pulse** (research; Q): every Jar empties, 60% lands split across the enemies beside lit towers.
  - Research: fourteen projects (unlocks and tier 2s, three with prerequisites), Labs at 1:1.
  - Actions (`actions.ts`): place, sell, shed, set tier, shed a tier, upgrade, Overcharge,
    research, next wave, endless.
- **Data** (`src/data/`): every numeric field has a `why` naming its `DESIGN.md` section; the
  validation test enforces it and that every upgrade changes an energy-side stat.
- **Rendering** (`src/render/`): readability states, the darkness buffer (the Hearth's glow
  shrinks with its lights), tier-2 sprites (or a brass pip), the Floodlight's cone wedge,
  Searchlight beam and spot, Brazier flame tongues, Starshell arcs and bursts (with light),
  Veils as a shimmer when unseen, the Starshell's shell bar, SNUFFED / CUT / NO FUEL / NO POWER
  tags, red reach overlays when placing a Node (Shades) or a Burner (Snuffers), the tutorial's
  gold spot and arrow.
- **UI** (`src/app/play.ts`): HUD (lights, money, supply / demand / wasted, stored kJ, tiers 1–3
  (4 when used), the wave block), a NEXT / THIS WAVE strip with enemy icons and counts, the build
  bar in two groups (**LIGHT 1–6 · POWER 7–=**, locks on unresearched slots), a placement
  forecast ("you make X kW; everything firing would ask Y → towers at Z%"), the selected panel
  (tiers, shed, Overcharge with its cooldown, upgrade with a stat diff, research board button,
  sell), the **research board** (L), enemy hover tips, **intel cards** for each new enemy, the
  **tutorial** (11 steps, skippable, holds the game on its reading steps), help, pause, speed,
  win screen with **KEEP GOING: ENDLESS**, lose screen, best result.
- **Maps** (`src/data/map.ts`, `DESIGN.md` §11, Milestone 7 in part): The Last Station; **The
  Switchback** (a 72-tile road that doubles back, a rich strip between two legs in Shade reach,
  wind 0.7; opens at wave 4); **Two Roads** (two roads down either side of a 3-wide ridge, the
  only ground that sees both; pace 1.5; the hard map, opens at wave 8). Roads can be several:
  spawns alternate per kind, targeting reads "least road left". The title screen picks the map
  (buttons or arrow keys), shows its blurb and the best on it. A bot plan per map
  (`planFor`), and `tests/maps.test.ts` holds each one to a win with nothing dark.
- **Profile** (`src/app/save.ts`): localStorage, `SAVE_VERSION` 2 + migrations: tutorial done,
  enemies met, best overall and per map, the map picked, runs, mute.
- **Audio**: procedural hum and one-shots, plus upgrade, wave pay, new enemy, snuff, shoot, burst.
- **Art**: 29 code-drawn sheets (Apollo): the slice's 15 plus Searchlight, Brazier, Starshell,
  Vane, tier-2 Floodlight / Searchlight / Brazier / Starshell / Beacon / Burner, Flit, Veil,
  Snuffer, and 31 icons (new: the new buildings, wind, upgrade, six enemy heads, pause, wave,
  tutorial, lock). PixelLab: 0 generations spent this session.
- **Tests** (`npm test`, 41): grid arithmetic and every new mechanic, data validation (12 waves,
  endless curve, research cross-references), the §6 pace tests (unchanged lessons: A 0 / S 4 /
  B 7; wave 2: 1 vs 7; Jar fill; Shade downtime 16 s vs 0), and the bot: the plan wins with ≥ 8
  lights (20 now), and no factory, too much factory (headroom 1.2), too little (3.0) and no Jars
  all lose.
- **Design tools** (`design/`): `check.mts` (one run), `variants.mts` (bot variants), `sweep.mts`
  and `sweep2.mts` (headroom × spacing), `probe.mts` (per-wave power trace), `tune.mts` (old
  per-wave tuner).
- **Harness**: `npm run screens` (now 17 states × 4 sizes, incl. tutorial, research board, intel
  `npm run continue` (save and CONTINUE in a browser) and `npm run perf` (Milestone 11's load: 302
  buildings and 492 enemies at 1920×1080 run at 60 fps average, p95 21 ms, in headless Chrome; the
  sim alone steps in 2.8 ms, `design/perf.mts`).
  card, a full late-game wall), `npm run shots`, `npm run smoke`; `e2e/peek.mjs` for quick looks.

## Stubbed or missing (by milestone)

- **M3**: belts and arms (deferred on purpose, `DECISIONS.md`), Refiner, tar still, Flywheel,
  node capacity, production stats / Lines view, blueprints.
- **M4**: towers 7–10, enemies 7–10, tier 3 and branches, walls and gates.
- **M5**: multiple-Lab scheduling UI beyond "all Labs on one project"; the rest of the tree.
- **M6**: Pulse exists (research, Q); Reroute and Dark Bait do not.
- **M7**: three maps, embers, and mid-run saves (CONTINUE) exist; still missing: per-map waves, more maps, a map preview on the picker.
- **M8**: embers and the skill tree exist (nine nodes, respec); still missing: a meta save separate from the run save (there is no run save yet). **M9**: the jsfxr bank. **M10**: settings, keybinds, UI scale.
- Milestone 0 leftovers: `Package for web.bat`, the PixelLab scripts and art importers.

## Next

See the critic section below; then, in order of value: a second map (the bot plan per map), tier
3 branches for the towers, Pulse as the first Milestone 6 verb, then belts if the factory still
reads shallow.

Spent: PixelLab 0 generations (3,030 left, resets 2026-11-09).
