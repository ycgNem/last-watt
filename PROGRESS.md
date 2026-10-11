# Progress

What exists, what is stubbed, what is next. Updated at the end of every session.

## Status (2026-10-11, end of the second session)

**The Milestone 2 gate is passed** (the owner played the slice and asked for the next phase;
`DECISIONS.md`). This session built the owner's asks (wave pay, a split build bar, a tutorial),
pieces of Milestones 3–11, and ran four `td-critic` reviews, each followed by the fixes
(`DECISIONS.md`: "Second review", "Third review", "Fourth review").

**How to play:** double-click `Play.bat` (or `npm run dev` and open http://localhost:5173), or the
live build (link in the repo's About box). Title → TUTORIAL (first time) or PLAY; arrows pick a
map once it is open; K skills; O settings; H in game lists every key.

## What exists

- **Sim** (`src/sim/`, pure, 60 Hz, runs headless): `Game.ts` steps waves → enemies → targeting →
  grid → towers → abilities → research → economy → stats.
  - Grid (`systems/grid.ts`): networks from the Hearth and Nodes, supply (the Hearth's 8 kW ×
    lights / 20, lit Burners, Vanes in each other's **wind shadow**), line losses, per-consumer
    demand, priority tiers (0 Overcharge · 1 Works · 2 Wall · 3 Labs · 4 Spare), Jar and
    **Flywheel** charge/discharge (Jars never pay for an Overcharge's extra), **Siphon** drain
    served before every tier, wasted kW, brownout with hysteresis; a dry pass for building while
    paused. **Transmission** (`systems/flow.ts`, `DESIGN.md` §3.3): each network is a tree from
    the Hearth, every Node carries at most 40 kW (a Heavy line 80), a full link holds the branch
    past it to what fits, max-min fair.
  - Waves: twelve waves (§5), per-map sequences where a map has its own (`MapDef.waves`), the
    20 s breather, **wave pay**, Flit clumps, per-kind road alternation, enemies appearing a few
    tiles along the road, endless after the last wave.
  - Enemies (7): Moth, Flit, Shade (cuts Nodes within **3.5** for **6 s**), Veil (seen only above
    60% power), Snuffer, Pall, **Siphon** (taps a line for 12 kW).
  - Towers (6): Lamp, Floodlight, Beacon, Searchlight, Brazier, Starshell; tier 2 for all;
    **tier 3 with a branch for all six** (Arc lamp / Lantern, Blaze / Wide, Drag / Halo, Lance /
    Long Eye, Inferno / Bonfire, Nova / Barrage).
  - Factory: Extractor, Burner, Vane, Jar (tier 2: **Bank or Flywheel**), Node (tier 2: **Long
    line or Heavy line**), Lab (a research **queue**: shift-click on the board).
  - Verbs: shed, tiers, **Overcharge** (live power, 3× for 4 s, ahead of everything, never from a
    Jar), **Pulse** (Q), **Reroute** (G), **Dark Bait** (B, on the Fork).
  - Commands (`commands.ts`): every player action is a logged command; `replay` rebuilds a run.
  - The **Lines view** model (`lines.ts`): each network's kW in, full-fire draw and bottleneck
    (a full Node among them); "short" only when the wall fell under 75% this wave.
- **Data** (`src/data/`): every numeric field has a `why` naming its `DESIGN.md` section; the
  validation test enforces it, every upgrade (and branch) changes an energy-side stat.
- **Meta** (`src/app/save.ts`, profile v4): tutorial, enemies met, best per map (recorded as
  each wave starts), **embers** and the **skill tree** (nine nodes, three columns, respec),
  **settings** (volume, UI scale, screen flashes). **Mid-run save** (`runsave.ts`): seed + skills +
  command log every few seconds; CONTINUE on the title replays it.
- **Rendering**: readability states, the darkness buffer, tier sprites and pips (ice for the
  other branch), the Flywheel's wheel, cone wedges, beams, flames, shells, Veil shimmer,
  **power gauges** under under-powered towers, SNUFFED / CUT / GUARDED / NO FUEL / WAITING FOR
  ROCK / NO POWER / NO SUPPLY / FULL tags, Siphon tethers, the Lines view overlay, red reach
  overlays when placing, enemies fading in; **wires coloured by load** (amber, gold, violet and
  pulsing when full; a spare route dashed).
- **UI** (`src/app/play.ts`): HUD with tier bars, a NEXT / THIS WAVE strip (per road on Two
  Roads), the split build bar (LIGHT 1–6 · POWER 7–=), placement forecast, selected panel (tiers,
  shed, Overcharge with its kW and yield, upgrade or a branch choice U / Y, Reroute, sell),
  research board (L, tier 3 takes its tier-2 row, a queue), intel cards, the **tutorial** (18
  steps: after wave 3's pay a second Burner pair, a fourth Lamp, a Lab on the Brazier), hints
  (brownout, spiral, waste, Veils, Siphons, idle Lab, an Overcharge as the cause, money unspent
  at a wave's start), the message feed (bottom left, two at most), help,
  the **Esc menu** (resume, settings, help, to the title), settings (O), the end screen (embers,
  a diagnosis from the last quarter of the lights, worst wave by lights, PLAY AGAIN, TITLE).
- **Title**: map picker (four maps, each with a whole-map preview and a line of facts), skill
  tree (K), settings (O), CONTINUE.
- **Maps**: The Last Station; **The Switchback** (72-tile road, heavier late waves, pace 0.9);
  **The Fork** (the road forks; the light-drawn take the brighter branch, Dark Bait turns them);
  **Two Roads** (two roads meet at a junction 9.4 tiles above the Hearth; pace 1.4). A bot plan
  per map.
- **Audio**: procedural hum and one-shots; volume and mute.
- **Art**: 30 code-drawn sheets (Apollo), the newest the **Siphon** (art-director). PixelLab: 0
  generations spent (3,030 left, resets 2026-11-09).
- **Tests** (`npm test`, 122): grid arithmetic and every mechanic (Overcharge on live power,
  Flywheel, branches, tier 3, Siphon, Lines view, Pulse, Reroute, roads, the fork, the research
  queue, **node capacity**), data validation, the §6 pace tests, the profile migrations,
  commands and replay, skills, the tutorial played as a newcomer **through wave 4** (it now loses
  no light there), and the bot: the plan wins with 14 or more and some brownout; no verbs ends at
  least 4 lower; too much / too little factory and no Jars end with at most half; the **human
  profile wins every map with 6 or more** (20 / 17 / 18 / 12).
- **Design tools** (`design/`): `verbs.mts` (the review bar per map), `forkcheck.mts`,
  `tier3check.mts`, `trwaves.mts` and
  `sbwaves.mts` (per-map wave sweeps), `tune2.mts`, `sweep2.mts`, `planview.mts`, `mapview.mts`,
  `pallwatch.mts`, `pulsecheck.mts`, `skillcheck.mts`, `perf.mts`, `wavekj.mts`.
- **Harness**: `npm run screens` (37 states × 4 sizes, overlap audit), `npm run shots`,
  `npm run smoke`, `npm run continue`, `npm run perf` (302 buildings, ~500 enemies at
  1920×1080: about 60 fps in headless Chrome).

## Stubbed or missing (by milestone)

- **M3**: belts and arms (deferred on purpose, `DECISIONS.md`), Refiner, tar still, blueprints.
  (Node capacity, the Heavy line, the Flywheel and the Lines view exist.)
- **M4**: towers 7–10, enemies 8–10 (the Magpie, a storage thief, is parked on the branch
  `magpie-wip`), walls and gates.
- **M5**: per-Lab projects (all Labs work on one; there is a queue).
- **M7**: maps five and six; wave tables generated from a model.
- **M8**: done in part (the tree has nine nodes; §9 lists more).
- **M9**: the jsfxr bank.
- **M10**: keybinds; lesson cards for first wasted power exist as hints, not cards.
- **M11**: the itch page, README polish, the final name's domain.
- Milestone 0 leftovers: `Package for web.bat`, the PixelLab scripts and art importers.

## Known gaps (measured, written down)

- The third review's bar is met except one condition: a no-verb wall does not spend 15 s under
  75% in each of waves 8–12 (`DESIGN.md` §6, "After the third review"). The grid is pressed by
  the player's own Overcharges and by Siphons; no verbs loses to Palls instead.
- The bot plans end with money unspent on the Switchback (about 1,750), the Fork and Two
  Roads (about 1,000): the plans run out of spots, so this measures the plans as much as the game.
- The station is flawless for the reference plan and the human profile since wave 8 was smoothed
  (`DESIGN.md` §11, the fourth review); the expert difficulty is the other three maps.
- Two Roads' junction can still be fed from safe ground (a Node reaches 4, a Shade 3.5): no
  policy sees a cut there (`DESIGN.md` §11).

## Next

A fifth review of the transmission build, then the owner's calls in the report.
