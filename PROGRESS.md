# Progress

What exists, what is stubbed, what is next. Updated at the end of every session.

## Status (2026-10-11, the fifth session, overnight)

**The Milestone 2 gate is passed** (the owner played the slice and asked for the next phase;
`DECISIONS.md`). The sessions since built the owner's asks (wave pay, a split build bar, a
tutorial), pieces of Milestones 3–11, and ran seven `td-critic` reviews, each followed by the fixes
(`DECISIONS.md`: "Second review" to "Seventh review"; the seventh only verified the sixth's). The fifth session added transmission
capacity, the Busbar, the Coker, lesson cards, the grid-threat telegraph, the supply ledger and
the end screen's wave-by-wave chart, and cut the Spare tier.

**How to play:** double-click `Play.bat` (or `npm run dev` and open http://localhost:5173), or the
live build (link in the repo's About box). Title → TUTORIAL (first time) or PLAY; arrows pick a
map once it is open; K skills; O settings; H in game lists every key.

## What exists

- **Sim** (`src/sim/`, pure, 60 Hz, runs headless): `Game.ts` steps waves → enemies → targeting →
  grid → towers → abilities → research → economy → stats.
  - Grid (`systems/grid.ts`): networks from the Hearth and Nodes, supply (the Hearth's 8 kW ×
    lights / 20, lit Burners, Vanes in each other's **wind shadow**), line losses, per-consumer
    demand, priority tiers served 1 Works · 0 Overcharge · 2 Wall · 3 Labs, Jar and
    **Flywheel** charge/discharge (no store pays for an Overcharge's extra: a budget, spent in
    tier order), **Siphon** drain served before every tier, wasted kW, brownout with hysteresis;
    every command ends with a dry grid pass, so a paused build reads true. **Transmission**
    (`systems/flow.ts`, `DESIGN.md` §3.3): each network is a tree from the Hearth, every Node
    carries at most **60 kW** (a **Busbar** 120 over 2.5 tiles), a full link holds the branch past
    it to what fits, max-min fair; FULL only when that holds the branch back.
  - Waves: twelve waves (§5), per-map sequences where a map has its own (`MapDef.waves`), the
    20 s breather, **wave pay**, Flit clumps, per-kind road alternation, enemies appearing a few
    tiles along the road, endless after the last wave.
  - Enemies (7): Moth, Flit, Shade (cuts Nodes within **3.5** for **6 s**), Veil (seen only above
    60% power), Snuffer (puts out Burners within 5 tiles, **not one on coke**), Pall, **Siphon**
    (taps a line for 12 kW).
  - Read-only models beside the tick: `lines.ts` (each line's bottleneck), `pressure.ts` (a wave's
    kJ/s against the wall's), `threats.ts` (what a wave's Snuffers, Shades and Siphons can reach in
    the build as it stands).
  - Stats: a per-wave **supply ledger** while enemies are on the field (snuffed, dry, cut, Siphons,
    Overcharge, full Nodes, short) and per-wave kJ made / asked / got / wasted.
  - Towers (6): Lamp, Floodlight, Beacon, Searchlight, Brazier, Starshell; tier 2 for all;
    **tier 3 with a branch for all six** (Arc lamp / Lantern, Blaze / Wide, Drag / Halo, Lance /
    Long Eye, Inferno / Bonfire, Nova / Barrage).
  - Factory: Extractor (tier 2: **Deep bit or Coker**, coke is 2.5 rocks of heat and can't be
    snuffed; its panel prices both at its deposit, and what each nets while a Snuffer passes;
    a Deep bit by the road names the way out: sell it, build a Coker), Burner, Vane,
    Jar (tier 2: **Bank or Flywheel**), Node (tier 2: **Long line or Busbar**), Lab (a research
    **queue**: shift-click on the board).
  - Verbs: shed, tiers, **Overcharge** (live power, 3× for 4 s, after the Works and ahead of the
    rest, never from a Jar), **Pulse** (Q), **Reroute** (G), **Dark Bait** (B, on the Fork).
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
  other branch), the Flywheel's wheel, the Coker's coke heap, cone wedges, beams, flames, shells, Veil shimmer,
  **power gauges** under under-powered towers, SNUFFED / CUT / GUARDED / NO FUEL / WAITING FOR
  ROCK / NO POWER / NO SUPPLY / FULL tags, Siphon tethers, the Lines view overlay, red reach
  overlays when placing, enemies fading in; **wires coloured by load** (amber, gold, violet and
  pulsing when full; a spare route dashed); a selected building's **way home** dotted to the
  Hearth, violet through a full Node.
- **UI** (`src/app/play.ts`): HUD with tier bars, a NEXT / THIS WAVE strip (per road on Two
  Roads; the wave's kJ and its step over the last, amber at ×1.4, and a "!" when its Snuffers
  could take the wall under 75%; inflow against the wall, the Palls, and what its Snuffers,
  Shades and Siphons can reach in your build in its tooltip), the threat's reach drawn unasked in
  the breather before its first wave, the split build bar (LIGHT 1–6 · POWER 7–=), placement forecast, selected panel (tiers,
  shed, Overcharge with its kW and yield, upgrade or a branch choice U / Y, Reroute, sell),
  research board (L, tier 3 takes its tier-2 row, a queue), intel cards and **lesson cards** (the
  first brownout, wasted power, Node cut and full Node of a profile; they fold to a title line after
  4 s and open on hover), the **tutorial** (18 steps:
  the second Burner pair and a fourth Lamp after wave 2, a Jar and a Lab after wave 3), hints
  (brownout, spiral, waste, Veils, Siphons, idle Lab, an Overcharge as the cause, money unspent
  at a wave's start), the message feed (bottom left, two at most), help,
  the **Esc menu** (resume, settings, help, to the title), settings (O), the end screen (embers,
  a diagnosis from the last quarter of the lights and the supply ledger, worst wave by lights, a
  **wave-by-wave chart**, each wave coloured by the wall's share of power when its lights went,
  with the lights lost, PLAY AGAIN, TITLE).
- **Title**: map picker (four maps, each with a whole-map preview and a line of facts), skill
  tree (K), settings (O), CONTINUE.
- **Maps**: The Last Station; **The Switchback** (72-tile road, heavier late waves smoothed so
  wave 10 is not a ×2.3 step, pace 0.9 from wave 2);
  **The Fork** (the road forks; the light-drawn take the brighter branch, Dark Bait turns them);
  **Two Roads** (two roads meet at a junction 9.4 tiles above the Hearth; pace 1.4). A bot plan
  per map.
- **Audio**: procedural hum and one-shots; volume and mute.
- **Art**: 30 code-drawn sheets (Apollo), the newest the **Siphon** (art-director). PixelLab: 0
  generations spent (3,030 left, resets 2026-11-09).
- **Tests** (`npm test`, 143): grid arithmetic and every mechanic (Overcharge on live power,
  Flywheel, branches, tier 3, Siphon, Lines view, Pulse, Reroute, roads, the fork, the research
  queue, **node capacity** and the Busbar, the **Coker** and coke against a Snuffer, wave pressure,
  the loss line and its ledger, the Switchback's wave 1), data validation, the §6
  pace tests, the profile migrations, commands and replay, skills, the tutorial played as a
  newcomer who builds only between waves **through wave 4** (one light lost), and the bot: the
  plan wins with 14 or more and some brownout; no verbs ends at least 4 lower; too much / too
  little factory and no Jars end with at most half; the **human profile wins every map with 6 or
  more** (station 20, Switchback 12, Fork 17, Two Roads 11).
- **Design tools** (`design/`): `verbs.mts` (the review bar per map), `forkcheck.mts`,
  `tier3check.mts`, `trwaves.mts` and
  `sbwaves.mts` (per-map wave sweeps), `tune2.mts`, `sweep2.mts`, `planview.mts`, `mapview.mts`,
  `pallwatch.mts`, `pulsecheck.mts`, `skillcheck.mts`, `perf.mts`, `wavekj.mts`, and from the
  fifth session `telegraph.mts` (wave pressure against leaks), `sparecheck.mts` and
  `flycheck.mts` (the measurements behind the Spare cut and the Flywheel call); from the sixth
  review `cokecheck.mts`, `reserve.mts` (money held back: does a run lose gradually?) and
  `sbw1.mts` (the Switchback's first wave).
- **Harness**: `npm run screens` (51 states × 4 sizes, overlap audit), `npm run shots`,
  `npm run smoke`, `npm run continue`, `npm run perf` (302 buildings, ~500 enemies at
  1920×1080: about 60 fps in headless Chrome).

## Stubbed or missing (by milestone)

- **M3**: belts and arms (deferred on purpose, `DECISIONS.md`), tar still, blueprints. (Node
  capacity, the Busbar, the Flywheel, the Coker as the Refiner, and the Lines view exist.)
- **M4**: towers 7–10, enemies 8–10 (the Magpie, a storage thief, is parked on the branch
  `magpie-wip`), walls and gates.
- **M5**: per-Lab projects (all Labs work on one; there is a queue).
- **M7**: maps five and six; wave tables generated from a model.
- **M8**: done in part (the tree has nine nodes; §9 lists more).
- **M9**: the jsfxr bank.
- **M10**: keybinds. (Lesson cards exist for four first events.)
- **M11**: the itch page, README polish, the final name's domain.
- Milestone 0 leftovers: `Package for web.bat`, the PixelLab scripts and art importers.

## Known gaps (measured, written down)

- The third review's bar is met except one condition: a no-verb wall does not spend 15 s under
  75% in each of waves 8–12 (`DESIGN.md` §6, "After the third review"). The grid is pressed by
  the player's own Overcharges and by Siphons; no verbs loses to Palls instead.
- The bot plans end with money unspent on the Switchback (about 1,800–2,000), the Fork and Two
  Roads (about 1,000–1,300): the plans run out of spots, so this measures the plans as much as
  the game (left as an owner call: the fifth review's M8).
- The Flywheel loses to the Bank wherever it replaces one and is level as a third Jar
  (`design/flycheck.mts`): kept as ROADMAP names it; cutting it is an owner call.
- The station is flawless for the reference plan and the human profile since wave 8 was smoothed
  (`DESIGN.md` §11, the fourth review); the expert difficulty is the other three maps.
- Two Roads' junction can still be fed from safe ground (a Node reaches 4, a Shade 3.5): no
  policy sees a cut there (`DESIGN.md` §11).

- A player who sits on money early still wipes in one wave (holding 100 back from wave 3: station
  20 20 14 10 0, Two Roads 20 20 11 7 0; `design/reserve.mts`): the money hint says so at each
  wave's start; graded leaks were tried and broke the verbs bar (`DECISIONS.md`, sixth review).

## Next

The seventh review (a verification of the sixth's fixes) is done and its findings fixed
(`DECISIONS.md`, "Seventh review"). `HANDOFF.md` is the short version of this file for a fresh
session.

**Waiting on the owner** (each with the recommendation given):

1. **The Flywheel**: it loses to the Bank wherever it replaces one (`design/flycheck.mts`).
   Recommended: cut it, or give it a job no Jar does; keeping it as is teaches nothing.
2. **The content freeze**: no new enemies, towers or buildings until the owner has played the
   current build. Recommended: keep it; spend the next round on sound (the jsfxr bank, needs
   someone who can listen) and art (PixelLab, `STYLE.md`). The Magpie stays parked on the
   `magpie-wip` branch.
3. **The late-game money glut** (bot plans end with 1,000–2,000 unspent off the station).
   Recommended: leave it until the owner has played a late run; it measures the plans as much
   as the game.
4. **The first map stays forgiving** (the station is flawless for the plan and the human profile;
   the other three maps are the hard ones). Recommended: keep it.

**Suggested next work**, if the owner says go on without answering:

- Sound: the procedural layer exists; the jsfxr bank and a mix pass need ears.
- Art: replace the code-drawn placeholders through the art-director (PixelLab budget in
  `START-HERE.md` and `STYLE.md`).
- Milestone leftovers: per-Lab projects (M5), rebindable keys (M10), the itch page (M11).
- Re-run `td-critic` on whatever the owner plays and reports.
