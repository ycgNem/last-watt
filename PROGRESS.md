# Progress

What exists, what is stubbed, what is next. Updated at the end of every session.

## Status (2026-10-11)

**A playable vertical slice exists.** Milestones 0 and 1 were built in one session at the
owner's request; the Milestone 2 gate is **not** passed (`ROADMAP.md`). The owner plays it next
and decides where the game goes.

**How to play:** double-click `Play.bat` (or `npm run dev` and open http://localhost:5173).
Title → BEGIN. The first-steps card says what to build; Space starts wave 1. H shows controls.

## What exists

- **Sim** (`src/sim/`, pure, 60 Hz, runs headless): `Game.ts` steps the systems in the fixed order
  waves → enemies → targeting → grid → towers → abilities → research → economy → stats.
  - Grid (`systems/grid.ts`): networks from the Hearth and Nodes (coverage radius 4, links,
    knock-outs), supply (Hearth 8 kW + lit Burners), demand per consumer, four priority tiers
    served in order, satisfaction per tier, Jar charge (≤ 15 kW from surplus) and discharge
    (≤ 30 kW on a deficit), wasted kW, whole-tier shedding, brownout detection.
  - Waves: the 8 waves of `DESIGN.md` §5, wave 1 on the player's call, a 45 s timer after,
    call-early bonus. Enemies: Moth, Shade (knocks out Nodes touching the path for 10 s),
    Pall (drinks every later Floodlight share). Leaks cost lights; 0 lights ends the run.
  - Towers: Lamp (tier 1–2), Floodlight (4 : 2 : 1 spill), Beacon (40% × satisfaction slow);
    damage = firing draw × efficiency × satisfaction.
  - Fuel: Extractors on emberrock (one per deposit tile) hand rock to a touching Burner.
  - Research: Lab, two projects (Jar 600 kJ, Lamp tier 2 900 kJ). Overcharge (120 kJ from the
    Jars on the tower's network, 3× for 4 s).
  - Actions (`actions.ts`): place, sell (half back), shed, set tier, shed a tier, upgrade,
    Overcharge, research, next wave.
- **Data** (`src/data/`): buildings, enemies, waves, research, rules, map, palette. Every numeric
  field has a `why` naming its `DESIGN.md` section; the validation test enforces it.
- **Rendering** (`src/render/`): baked ground chunk, y-sorted buildings in three readability
  states (powered / starved: tinted and stuttering / dark: tinted with one cold pixel), the
  darkness buffer with stepped light holes sized by satisfaction (towers' light = their range ×
  satisfaction), node wires that go dark when cut, beams (purple and broken when starved, white
  on Overcharge), enemies as silhouettes with eyes in the dark and lit sprites in light, kJ bars,
  floating bounty, leak flash, Overcharge blow-out.
- **UI** (`src/ui/`, `src/app/play.ts`): bitmap font (from the S&S kit), immediate-mode kit that
  records every box for the overlap audit; HUD (lights, money, supply / demand / wasted kW, Jar
  kJ, four tier bars you click to shed, wave timer and call-early bonus), build bar with
  tooltips, selected-building panel (state, kW, tier buttons, shed, Overcharge, upgrade,
  research, sell), message feed, first-steps card, help, pause, speed ×1/2/3, win and lose
  screens with run stats, contextual hints (brownout spiral, Burner with no Extractor, wasted
  power). Title screen.
- **Audio** (`src/engine/audio.ts`): procedural; a grid hum whose pitch drops as the wall starves,
  and one-shots for place, kill, leak, wave, brownout, knock, Overcharge, research, win, lose.
- **Art** (`pixel-art/`, `src/assets/art/`): 15 code-drawn sheets in Apollo (Hearth, Lamp ×2,
  Floodlight, Beacon, Node, Extractor, Burner, Jar ×4 charge, Lab, Moth, Shade, Pall with lit
  and silhouette rows, ground tiles, 15 icons). `npm run art` rebuilds all of them; the contact
  sheet `pixel-art/contact-buildings/contact.png` shows each building powered / starved / dark.
- **Tests** (`npm test`, 26): grid arithmetic (§2, §3, §4, §8), data validation (derivations,
  wattage column, cross-references, §5 wave totals), the §6 pace tests (wave 1: A 0 / S 4 / B 7
  leaks; wave 2: three Lamps beat two; Jar fills inside the timer; chain 19 s vs ring 0 s
  downtime), and the full-run bot (wins with 9 lights; no factory loses in wave 3).
- **Harness**: `npm run screens` (12 UI states × 3 sizes, overlap audit → `e2e/out/screens/report.md`,
  currently clean), `npm run shots` (title, opening, placing, first brownout, first Shade
  blackout, first Overcharge, mid-run, win, lose, help → `e2e/out/`), `npm run smoke` (a real
  opening by clicks and keys, then wave 1). `design/tune.mts` re-tunes wave spacing with the bot.
- **Agents** (`.claude/agents/`): `td-critic` (replaces `indie-critic`), `art-director`,
  `qa-screens`, `balance-auditor`.

## Stubbed or missing

- No saves (runs are ~7 min). `SAVE_VERSION` + migrations still to come.
- No GitHub Pages workflow, no `Package for web.bat`, no jsfxr bank, no PixelLab scripts or art
  importers (code-drawn art goes straight from `build.py` to `src/assets/art/`).
- Palette is provisional (Apollo); the owner hasn't picked. Endesga 64 is saved for a swap.
- Construction is instant (tier 4 is empty). Embers and the skill tree: Milestone 8.
- Art weak spots the art agents named: the Extractor reads heavy at 16 px, the Burner's top plate
  is plain, the Moth's wings-raised silhouette is a blob, the beacon icon looks a bit like a
  figure.

## Next

1. The owner plays it and reads `DESIGN.md` §10 against what they felt.
2. The td-critic's findings (this session's chat; to be filed in `IDEAS.md` / the next plan).
3. Pick the palette; decide whether the brownout spiral stays a trap or becomes a default
   (Extractors on tier 1); decide if waves 7–8 need more teeth.

Spent: PixelLab 0 generations (3,030 left, resets 2026-11-09).
