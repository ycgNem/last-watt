# Progress

What exists, what is stubbed, what is next. Updated at the end of every session.

## Status (2026-10-11)

**A playable vertical slice exists.** Milestones 0 and 1 were built in one session at the
owner's request; the Milestone 2 gate is **not** passed (`ROADMAP.md`). The `td-critic` agent
reviewed it the same day and its critical and major issues were fixed (`DECISIONS.md`, "After
the first td-critic review"); the deeper redesigns it proposed wait for the owner (`IDEAS.md`).
The owner plays it next and decides where the game goes.

**How to play:** double-click `Play.bat` (or `npm run dev` and open http://localhost:5173).
Title → BEGIN. The first-steps card says what to build; Space starts wave 1. H shows controls.

## What exists

- **Sim** (`src/sim/`, pure, 60 Hz, runs headless): `Game.ts` steps the systems in the fixed order
  waves → enemies → targeting → grid → towers → abilities → research → economy → stats.
  - Grid (`systems/grid.ts`): networks from the Hearth and Nodes (coverage radius 4, links,
    cut-outs), supply (Hearth 8 kW + lit Burners), demand per consumer, four priority tiers
    served in order (**1 Works · 2 Wall · 3 Labs · 4 Spare**), each tier's share of power,
    a wall-wide share for the HUD and brownout, Jar charge (≤ 15 kW from surplus) and
    discharge (≤ 30 kW on a deficit), wasted kW, whole-tier shedding, brownout with
    hysteresis (starts below 60%, ends above 75%).
  - Waves: the 8 waves of `DESIGN.md` §5. Wave 1 on the player's call; after that **the
    breather**: the next wave starts 20 s after the field is clear, Space starts it sooner, no
    bonus. Enemies: Moth; Shade (cuts any Node within 2.5 tiles for 10 s, never the Hearth);
    Pall (drinks every later Floodlight share, and takes only 1/4 of a Lamp's beam). Leaks cost
    lights; 0 lights ends the run.
  - Towers: Lamp (tier 1–2), Floodlight (4 : 2 : 1 spill), Beacon (40% × share-of-power slow);
    damage = firing draw × efficiency × share of power.
  - Fuel: Extractors on emberrock (one per deposit tile) hand rock to a touching Burner.
  - Storage and burst: Jars buildable from the start; Overcharge (120 kJ from the Jars on the
    tower's network, 3× for 4 s). Research: Lab, one project (Lamp tier 2, 900 kJ).
  - Actions (`actions.ts`): place, sell (half back), shed, set tier, shed a tier, upgrade,
    Overcharge, research, next wave.
- **Data** (`src/data/`): buildings, enemies, waves, research, rules, map, palette. Every numeric
  field has a `why` naming its `DESIGN.md` section; the validation test enforces it.
- **Rendering** (`src/render/`): baked ground chunk, y-sorted buildings in three readability
  states (powered / starved: tinted and stuttering / dark: tinted with one cold pixel), the
  darkness buffer with stepped light holes sized by share of power (towers' light = their
  range × share), node wires that go dark when cut, beams (purple and broken when starved, white
  on Overcharge), enemies as silhouettes with eyes in the dark and lit sprites in light, kJ bars,
  floating bounty, leak flash, Overcharge blow-out. Placing a Node shades the Shade's reach red.
- **UI** (`src/ui/`, `src/app/play.ts`): bitmap font (from the S&S kit), immediate-mode kit that
  records every box for the overlap audit; HUD (lights, money, supply / demand / wasted kW, Jar
  kJ, four tier bars, Shift-click to shed one, wave block with the breather countdown or
  "N left"), build bar with tooltips, selected-building panel (state, kW, tier buttons, shed,
  Overcharge, upgrade, research, sell), message feed, first-steps card, help, pause, speed
  ×1/2/3, win and lose screens with run stats (the lose screen names lights lost by enemy and
  the worst wave), contextual hints (brownout spiral, Burner with no Extractor, wasted power →
  Jar). T raises priority one tier. Title screen.
- **Audio** (`src/engine/audio.ts`): procedural; a grid hum whose pitch drops as the wall starves,
  and one-shots for place, kill, leak, wave, brownout, cut, Overcharge, research, win, lose.
- **Art** (`pixel-art/`, `src/assets/art/`): 15 code-drawn sheets in Apollo (Hearth, Lamp ×2,
  Floodlight, Beacon, Node, Extractor, Burner, Jar ×4 charge, Lab, Moth, Shade, Pall with lit
  and silhouette rows, ground tiles, 15 icons). `npm run art` rebuilds all of them; the contact
  sheet `pixel-art/contact-buildings/contact.png` shows each building powered / starved / dark.
- **Tests** (`npm test`, 27): grid arithmetic (§2, §3, §4, §8, Works-first tiers, the Shade's
  reach, the Pall and narrow beams), data validation (derivations, wattage column,
  cross-references, §5 wave totals and bounties), the §6 pace tests (wave 1: A 0 / S 4 / B 7
  leaks; wave 2: three Lamps beat two, 1 vs 7; a Jar charges at its limit in a breather; a far
  Lamp fed from Nodes in a Shade's reach loses 16 s in wave 3, from Nodes out of reach 0 s),
  and the full-run bot (**wins with 10 of 20 lights**, 57 Overcharges, about 11 min; no factory
  loses in wave 3).
- **Harness**: `npm run screens` (12 UI states × 4 sizes, overlap audit → `e2e/out/screens/report.md`),
  `npm run shots` (title, opening, placing, first brownout, first Shade blackout, first
  Overcharge, mid-run, win, lose, help → `e2e/out/`), `npm run smoke` (a real opening by clicks
  and keys, then wave 1). `design/tune.mts` re-tunes wave spacing with the bot;
  `design/check.mts` is one bot run with an optional spacing override.
- **Deploy**: `.github/workflows/deploy.yml` (adapted from S&S) runs the tests, builds and
  publishes to GitHub Pages on every push to `main`; the play link is in the repo's About box.
  `README.md` has the pitch and controls for playtesters.
- **Agents** (`.claude/agents/`): `td-critic` (replaces `indie-critic`), `art-director`,
  `qa-screens`, `balance-auditor`.

## Stubbed or missing

- No saves (runs are ~11 min). `SAVE_VERSION` + migrations still to come.
- No `Package for web.bat`, no jsfxr bank, no PixelLab scripts or art
  importers (code-drawn art goes straight from `build.py` to `src/assets/art/`).
- Palette is provisional (Apollo); the owner hasn't picked. Endesga 64 is saved for a swap.
- Construction is instant (tier 4 is empty). Embers and the skill tree: Milestone 8.
- Art weak spots the art agents named: the Extractor reads heavy at 16 px, the Burner's top plate
  is plain, the Moth's wings-raised silhouette is a blob, the beacon icon looks a bit like a
  figure.

## Next

1. The owner plays it and reads `DESIGN.md` §10 against what they felt.
2. The owner's calls on what the critic left open (`IDEAS.md`, "Left open by the first
   td-critic review"): the Floodlight as a cone, leaks draining the Hearth instead of 20 lights,
   the cut list, the palette.
3. A second td-critic pass after those calls, then the Milestone 2 gate.

Spent: PixelLab 0 generations (3,030 left, resets 2026-11-09).
