# Last Watt — Design model

Every number in the game derives from this file. Numbers below are **starting hypotheses for the
vertical slice**, chosen from the model, to be tuned by play and by the pace tests — never by
looking up what another game uses. When you change a number, write the new derivation here.

## 1. Units

- Simulation tick: 1/60 s. Power in **kW**, energy in **kJ**. 1 kW for 1 s = 1 kJ.
- Distance in tiles (16 px). Speed in tiles/s.
- **Enemy health is energy**: an enemy with 30 kJ of health needs 30 kJ of delivered damage.
- **Towers convert power into damage**: `damage per second (kJ/s) = firingDraw (kW) × efficiency × satisfaction`.
- Money is an integer. Bounty for an enemy = `health_kJ × 0.15`, rounded (Moth 5, Shade 14, Pall 60).
  It was `health_kJ / 10` until 2026-10-11; §6 ("What the real map and the bot said") says why it moved.

## 2. The grid, per tick

1. **Supply** = Σ generator output (kW, each scaled by its own fuel state) + battery discharge
   (only when there is a deficit, up to each battery's max discharge rate).
2. **Demand** = Σ consumer draw (towers: idle draw, or firing draw while they have a target;
   extractors; labs while researching; constructors while building).
3. Consumers sit in **priority tiers**. Power is allocated tier by tier: tier 1 is served fully
   before tier 2 sees anything. Within a tier, every consumer gets the same
   `satisfaction = min(1, remaining supply / tier demand)`.
   Default tiers: **1 Works (Extractors) · 2 Wall (towers, Beacons) · 3 Labs · 4 constructors**
   (empty in the slice). The player can move any consumer or sector to another tier, or to
   **off** (this is the shed-load verb). *Changed 2026-10-11 after the first td-critic review;
   it was 1 towers · 2 extractors. See the brownout spiral below.*
4. Surplus charges batteries (up to each one's max charge rate). Surplus beyond that is
   **wasted**, and the HUD says so in kW. Wasted power is the game's nudge toward storage and labs.
5. **Networks**: a network is a connected set of nodes. Anything within a node's radius is on
   that node's network. Generators and consumers on different networks don't see each other.
   A node that is knocked offline splits its network; everything downstream goes dark that tick.
   (Line capacity and losses are a Milestone 3 tier, not in the slice.)

Everything scales with satisfaction: tower fire rate, beacon slow strength, extractor speed,
research speed, construction speed. There is no state where "not enough power" blocks an action;
it only slows it.

**The brownout spiral (found in play, 2026-10-11).** With towers on tier 1 and Extractors on
tier 2, once the towers asked for more than the Hearth's 8 kW (eight idle Lamps do), the
Extractors got nothing, the Burners ran dry, and the grid couldn't restart itself. The critic's
real-click run followed every hint and still lost to it: it read as a bug, not a decision. So
the Works tier now comes first by default. Each Extractor asks only 2 kW, so feeding them first
costs the wall almost nothing, and starving the factory becomes a deliberate burst play (move the
wall to tier 1 while a Pall is in range, and pay for it with cold Burners later), not a trap.

## 3. Buildings (slice set)

| Building | Cost | Role | Numbers |
|---|---|---|---|
| **Hearth** (station core) | free, one | the thing you defend; also the bootstrap generator and the first node | 8 kW always on, no fuel. Node radius 4 tiles. Losing it ends the run. |
| **Extractor** | 30 | pulls fuel from a deposit | 1 emberrock / 8 s at full satisfaction; draws 2 kW |
| **Burner** | 40 | burns emberrock | 20 kW output at 0.5 efficiency → 40 kW thermal → **one emberrock lasts 10 s** (400 kJ each). Holds 5. |
| **Node** | 10 | transmission | radius 4 tiles. Can be knocked offline by Shades (10 s). |
| **Jar** (battery) | 60 | storage | 600 kJ; discharge ≤ 30 kW; charge ≤ 15 kW |
| **Lab** | 50 | research | draws 10 kW while a project is active |

**Slice rules, decided when the map was built (2026-10-11):**

- **Coverage.** A tile is on a node's network when its centre is within the node's radius of the
  node's footprint, so the Hearth reaches 4 tiles past its own edge. A building is on a network
  when any of its tiles is. Two nodes link when either covers the other; a building covered by
  two networks joins them.
- **Jars are buildable from the start** (60 money; they were a research unlock until the first
  critic review), so Overcharge is a verb from wave 1.
- **Fuel by adjacency.** An Extractor hands each rock to a Burner whose footprint touches its own
  (edge or corner), the emptiest first, and holds up to 3 rocks while none has room. This
  replaces hand-carrying (a rock every 10 s per Burner is a chore with no decision in it;
  `DECISIONS.md`). Belts are still Milestone 3.
- **Deposits** take one Extractor per tile. The slice map has two near deposits of 5 tiles and one
  far of 6. Each Extractor can feed 1.25 Burners, so the ceiling is how many Burners fit
  against the Extractors, not the tile count: about 6 Burners (128 kW with the Hearth) on the
  two near deposits, more if the player runs Nodes out to the far one past the path.
- **Sizes.** Burners and Labs are 2 × 2; Extractors, Nodes and Jars 1 × 1.
- **Construction is instant** in the slice (tier 4 stays empty).
- **Selling** pays back half of everything spent on the building: a placement is a commitment,
  a mistake is not a run-ender.

An Extractor (1 rock / 8 s) feeds 1.25 Burners (1 rock / 10 s each), so power costs
**3.2 money per kW**: a Burner (40) plus 0.8 of an Extractor (24) per 20 kW.

## 4. Towers (slice set)

| Tower | Cost | Idle | Firing | Eff. | Damage at full power | Range | Behavior |
|---|---|---|---|---|---|---|---|
| **Lamp** | 20 | 1 kW | 12 kW | 0.50 | 6.0 kJ/s | 3.5 | single target, nearest to station |
| **Floodlight** | 80 | 2 kW | 24 kW | 0.60 | 14.4 kJ/s | 5.0 | lights its target (nearest to station) and spills onto up to 2 more enemies within 1.5 tiles of it; the 14.4 kJ/s splits **4 : 2 : 1** (8.2 / 4.1 / 2.1), and a share with no enemy to land on is lost |
| **Beacon** | 50 | 4 kW constant | — | — | — | 4.0 | slows enemies 40% × satisfaction |

Why the Lamp fires at 12 kW (was 6 until 2026-10-11): at 3 kJ/s a Lamp needed 10 s per Moth while a
Moth spends 4–6 s in its range, so no wave-1 layout could clear (§6). At 6 kJ/s a Lamp kills a
Moth in 5 s, inside its exposure at a bend but not on a straight, which is the placement lesson.
It also makes two powered Lamps (24 kW) nearly fill the starting grid (28 kW), so the third Lamp
is the first purchase that needs a second Burner.

The Floodlight's split keeps the unit rule: it never delivers more than draw × efficiency.
Against one enemy it delivers 8.2 kJ/s from 24 kW (worse per watt than a Lamp); against a crowd,
14.4 (better). That difference is its job.

**Upgrade tier rule**: each tier multiplies damage by **1.8** and firing draw by **1.5**
(so efficiency rises by 1.2× per tier; upgrades are a slightly better use of watts, but they
*always* raise demand). Upgrading to tier n costs base cost × 1.25 × (n − 1). Slice: Lamp tier 2
only: 18 kW firing, 0.60 eff → 10.8 kJ/s, cost 25. Branches (wide-dim vs narrow-bright) come in
Milestone 4 and are expressed as different (draw, efficiency, range, targets) tuples.

## 5. Enemies (slice set)

| Enemy | Health | Speed | Bounty | Behavior | Station damage on leak |
|---|---|---|---|---|---|
| **Moth** | 30 kJ | 1.5 t/s | 5 | walks the path | 1 light |
| **Shade** | 90 kJ | 1.0 t/s | 14 | cuts any Node whose footprint is within **2.5 tiles** of it for 10 s; never the Hearth | 2 lights |
| **Pall** | 400 kJ | 0.6 t/s | 60 | walks; casts a shadow: a Pall in a Floodlight's beam takes its own share *and every share after it*, whether or not there are enemies to receive them, so the Moths beside it get nothing; a **single narrow beam** (a Lamp) lands only **1/4** on it, the rest is drunk | 5 lights |

Station starts with **20 lights**. At 0 the run ends.

Slice waves (spawn spacing per wave, derived in §6). **The breather:** once a wave has fully
spawned and the field is clear, the next wave starts 20 s later; Space starts it sooner. There is
no call-early bonus. *Until the first critic review the timer ran 45 s from each wave's start,
so waves stacked and there was never a quiet moment for Jars or Labs; and the time-scaled
call-early bonus was flagged as Kingdom Rush's mechanic almost one to one. Both went.*

Why the Shade reaches 2.5 tiles (it was 1): at 1 tile a Node one tile back from the path was safe
and still powered Lamps across it, so no real layout ever exposed a Node and the bot was cut 0
times a run. At 2.5, power that crosses or hugs the path is always cuttable, and where Nodes go
becomes the transmission decision. Why the Pall drinks narrow beams: about seven ordinary Lamps
killed a Pall, so the §6 claim that "the Pall needs burst" was false and the Floodlight and
Overcharge had no job.

| Wave | Composition | Total health | Bounty | Spacing (was) |
|---|---|---|---|---|
| 1 | 8 Moth | 240 | 40 | 2.25 s |
| 2 | 12 Moth | 360 | 60 | 1.9 s (1.75) |
| 3 | 10 Moth, 2 Shade | 480 | 78 | 3.0 s (1.75) |
| 4 | 15 Moth, 4 Shade | 810 | 131 | 2.3 s (1.5) |
| 5 | 10 Moth, 1 Pall | 700 | 110 | 1.5 s (1.75) |
| 6 | 20 Moth, 4 Shade | 960 | 156 | 1.0 s (1.75) |
| 7 | 18 Moth, 9 Shade, 2 Pall (was 12 / 6 / 1) | 2,150 | 336 | 0.5 s (0.9) |
| 8 | 30 Moth, 9 Shade, 3 Pall (was 20 / 6 / 2) | 2,910 | 456 | 0.4 s (0.75) |

Starting money: **120**. Wave 1 waits for the player (there is no countdown before it); from
then on each wave starts 20 s after the field clears (the breather), or earlier when called.
Spacing for waves 2–8 was set by the bot (§6, "What the real map and the bot said", and "After
the first td-critic review").

## 6. Derived checks (these become tests, see CLAUDE.md)

Two limits decide how much of a wave gets through, and each check below says which one it leans on.

- **Exposure**: an enemy takes at most Σ (tower kJ/s × its time in that tower's range). A tower
  set beside the path (2×2 footprint, so its centre is 1.5 tiles off the path's centreline) with
  range r covers `2√(r² − 1.5²)` tiles of a straight; a Moth crosses a Lamp's 6.3 tiles in
  **4.2 s**. At the inside of a bend the Lamp covers about 9.3 tiles: **6.2 s**.
- **Throughput**: single-target towers are shared. While a wave streams past, the wall delivers
  at most its total kJ/s, and the wave brings `average health per spawn ÷ spacing` kJ/s. When
  that inflow is well above the wall's kJ/s, enemies leak however good the placement is.

The first version of this section checked exposure only, at 1.5 s spacing, and was wrong: two
Lamps there leak 7 of 8 Moths. Wave 1 and 2 numbers below come from `design/wave_sim.py` (a
rough model of these rules on a reference path: 36 tiles, east 12 / south 12 / east 12, lamps
1.5 tiles off the path). The pace tests check them again on the real map.

**Wave 1, the intended lesson.** 120 money buys 2 Lamps (40) + Extractor (30) + Burner (40) +
Node (10). Supply 8 + 20 = 28 kW; demand with both Lamps firing 24 + 2 = 26 kW; satisfaction
1.0, 2 kW wasted; 12 kJ/s. A Moth every 2.25 s brings 13.3 kJ/s, just above the wall, so
placement decides the rest. Lamps at the inside of the two bends (6.2 s exposure, 37 kJ each per
Moth): **0 leaks**. The same two Lamps on straight stretches (4.2 s, 25 kJ each, and shared by
the stream): **4 leaks**. Placement is the first lesson.

**Wave 1, the tempting mistake.** 4 Lamps (80) + Node (10), no factory. With all four firing,
tier 1 asks 48 kW of the Hearth's 8: satisfaction 0.17, 4 kJ/s for the whole wall, a third of
two powered Lamps, and the whole wall visibly dims: **7 leaks**, the same as two Lamps with no
fuel. Lamps added to a starved grid add nothing. Brownout is the second lesson.

**Wave 2, satisfaction is a dial.** 12 Moths every 1.75 s (17 kJ/s). Two Lamps alone leak 8.
After wave 1 the player has 24 money: a third Lamp on the same 28 kW (38 kW asked with all three
firing: satisfaction 0.74) leaks **2**; a second Burner as well leaks 0. A grid at 0.74 is weaker,
not broken; a grid at 0.17 is broken.

**Payback.** In wave 1 the Burner (40 money) is the difference between 7 leaks and 0: 21 money of
bounty and 7 lights. It repays its lights at once and its money by wave 2. Factory spending is
never an investment you regret in the short term.

**Shade teaches transmission.** Wave 3's Shades knock out nodes beside the path. A single
chain of nodes from Hearth to the far lamps means one Shade blacks out the whole far wall for
10 s. A second node path (ring, not chain) costs 10–20 money and is the third lesson.

**Jar teaches burst** *(superseded 2026-10-11: Jars are buildable from wave 1 and the breather
gives them 20 s of spare power to fill; the paragraph below is the original reasoning).* The earliest a Jar exists in play: a Lab (50) after wave 2, the
Jar project (600 kJ: 60 s at 10 kW, in tier 3, so it runs between waves), and the Jar (60) after
wave 4, in time for wave 5's Pall. That is 110 money not spent on the wall over waves 3–4: the
money split §10 asks about. One Jar holds 600 kJ: a Floodlight at full firing draw for 25 s on
its own, or five **Overcharges** (§8). By then the grid's spare power between waves is well above
the Jar's 15 kW charge limit, so it fills in 40 s, inside one 45 s wave timer; the rest shows as
**wasted** on the HUD, the nudge toward a second Jar or a Lab.

**The Pall needs burst.** A Floodlight at the inside of a bend covers about 12.5 tiles of path, so
a Pall (0.6 t/s) is in its beam for about 21 s and takes about 300 kJ of its 400. One Overcharge
adds about 115 kJ over the Floodlight's normal output (43.2 − 14.4 kJ/s for 4 s): together, just
enough. A Lamp at a bend gives a Pall about 93 kJ. No single tower stops a Pall on plain grid
power; this is what the Jar is for.

**Every wave: the throughput check.** Spacing for wave n = average health per spawn ÷ (1.2 × the
wall a player can afford by then). The affordable wall is 12 kJ/s at wave 1 plus about 0.1 kJ/s
per money of bounty earned since: a powered Lamp costs 20 + 12 kW × 3.2 money/kW ≈ 58 money for
6 kJ/s. The 1.2 comes from waves 1–2 above, where inflow at 1.1–1.3× the wall leaks 0–2. Waves
1–2 were set by the simulation; waves 3–8 come from this rule, rounded to 0.25 s, and are
hypotheses for the Milestone 1 bot to confirm.

| Wave | Avg kJ per spawn | Bounty earned before it | Affordable wall | Rule gives | Spacing |
|---|---|---|---|---|---|
| 1 | 30 | 0 | 12 kJ/s | 2.08 s | 2.25 s (sim) |
| 2 | 30 | 24 | 14.4 | 1.74 | 1.75 (sim) |
| 3 | 40 | 60 | 18.0 | 1.85 | 1.75 |
| 4 | 42.6 | 108 | 22.8 | 1.56 | 1.5 |
| 5 | 63.6 | 189 | 30.9 | 1.72 | 1.75 |
| 6 | 40 | 259 | 37.9 | 0.88 | 1.0 |
| 7 | 68.4 | 355 | 47.5 | 1.20 | 1.25 |
| 8 | 69.3 | 485 | 60.5 | 0.95 | 1.0 |

**Supply ceiling (open).** Wave 8's ~60 kJ/s wall needs 100–120 kW at efficiency 0.5–0.6. One
Extractor per deposit fuels at most 3.75 Burners (75 kW) plus the Hearth's 8. Either deposits
take more than one Extractor, or the last waves are meant to lean on Jars and Overcharge. The
Milestone 1 map decides; the bot checks it.

**What the real map and the bot said (2026-10-11).** The slice map (`src/data/map.ts`: 41 tiles,
east 27.5 / south 9 / west 4.5, both bends facing the Hearth) reproduces the wave 1 lesson
exactly: layout A leaks **0**, S **4**, B **7** (the numbers above). Wave 2 at its old 1.75 s:
two Lamps leak 8, three Lamps 5 (not 2); at 1.9 s three Lamps leak 0 and two leak 7, so the
"a third Lamp at 0.74 is weaker, not broken" lesson holds at 1.9 s. A chain of Nodes beside the
path loses 19 s of far-wall uptime in wave 3; a second route a tile back loses 0.

The throughput rule for waves 3–8 did not hold, for two reasons the rule leaves out:
1. *Realized wall.* Only two towers can stand at the inside of a bend. Every tower after that sits
   on a straight (6.3 tiles, two-thirds of a bend's exposure) and shares its targets with the
   towers around it, and Moths spawned after a Shade catch it up and soak the targeting ("nearest
   the Hearth"). Measured: the wall the bot can afford delivers about two-thirds of its nominal
   kJ/s, so the rule's 1.2 × affordable wall becomes about 0.8 × in practice.
2. *Leaks compound.* A leaked enemy pays no bounty, so a wave that leaks leaves the next wave's
   wall smaller still. With bounty at health / 10, a sensible player loses by wave 5 or 6 at any
   spacing up to 2.5× the rule's.
Two changes, both from the model: **bounty = health × 0.15**, so income keeps the realized wall
in step with the waves (×1.5 = 1 / two-thirds), and **spacing tuned wave by wave**
(`design/tune.mts`: for each wave in turn, the tightest spacing at the 0.05 s grid at which the
bot leaks at most one; then smoothed). Waves 3–4 need long spacing because the first Shades
arrive before most players have a third Burner; waves 7–8 are tight because by then a player
who has kept up owns most of what the map can hold. Unit stats did not change. The bot
(`src/app/bot.ts`: keeps generation within 1.5 × of the wall's full firing draw, Extractors on
tier 1, Lab and Jars from wave 4, Overcharges at Palls) wins with **9 of 20 lights**; with no
factory it loses in wave 3. Waves 7–8 are easy for the bot and are the ones to watch in play.

**After the first td-critic review (2026-10-11, same day).** The critic played the slice and found
the model never under pressure: one build (about two Lamps per Burner, Lamps at the bends) won
with 19 lights; the Lab → Jar → Overcharge line lost runs; idle towers starved the factory into a
spiral the hints couldn't rescue; waves always overlapped, so Jars and Labs never had a quiet
minute; Shades cut nothing; a Pall died to seven Lamps; and waves 7–8 leaked nothing. The model
changes, each written into its section above: Works tier first (§2.3), Jars from the start (§3),
the 20 s breather after a cleared field and no call-early bonus (§5), the Shade's reach 2.5 tiles
(§5), the Pall drinking 3/4 of a narrow beam (§5), waves 7–8 at about 1.5× the kJ, and spacing
for waves 6–8 tuned again with a bot that Overcharges Shades as well as Palls. Bounty stays at
health × 0.15 (× 0.125 loses by wave 6). With the Node for bend A moved one tile back
(21, 10, out of a Shade's reach) the bot wins with **10 of 20 lights**, leaking in waves 2, 3 and 5;
one notch tighter on waves 6–8 (0.9 / 0.45 / 0.35 s) a Pall gets through in wave 7 and it ends on
5 lights; at 1.0 / 0.45 / 0.3 it loses. The run is now about 11 minutes. Still open, for the
owner: the Floodlight's 4 : 2 : 1 spill rarely lands on spaced Moths (the critic would re-derive
it as a cone), lights as 20 hit points, and how much Overcharge a run should allow (the bot
fires about 55).

**The pace tests assert**, on the real slice map, with layouts named by where the Lamps stand:
- wave 1: layout **A** (two Lamps at the inside of the bends, Burner fed) leaks ≤ 2; layout **S**
  (the same two Lamps on straights) leaks at least 2 more than A; layout **B** (four Lamps, no
  Burner) leaks ≥ 5;
- wave 2: three Lamps on one Burner leak fewer than two Lamps;
- a Jar charges at its 15 kW limit in a breather: two Overcharges' worth in one 20 s gap, full in two;
- a far Lamp fed by Nodes inside a Shade's reach loses ≥ 10 s of uptime in wave 3; fed from Nodes
  out of reach, none;
- the bot wins the whole run, and the same bot with no factory loses (`tests/bot.test.ts`).

If the real map's bends differ from the reference path, tune **wave 1's spacing** (2.0–2.4 s;
at 2.5 s on the reference path the straights stop leaking too and the placement lesson is gone)
until these hold. Don't change unit stats to fit a map.

## 7. Research (energy)

A Lab draws 10 kW while a project is active and converts it at 1:1 into progress. Projects are
priced in kJ. Slice: **Lamp tier 2** (900 kJ). *The Jar unlock (600 kJ) was a second project
until the first critic review showed the Lab → Jar line losing runs (the bot did better without
it); Jars are now buildable from the start.*
Research during a wave sits in tier 3, so it starves first under load unless the player moves it
up, which starves towers instead. That trade is the point. Full tree in Milestone 5: generators
(wind spinner, tar still, vent tap), transmission tiers (capacity, long lines), storage (flywheel,
bank), refiners (emberrock → coke, 2.5× energy density), towers, gaffer abilities.

## 8. Gaffer abilities (stored energy, mid-wave)

Abilities draw **directly from batteries** on the target's own network, ignoring tiers and
satisfaction. No storage, no abilities; a Jar cut off by a Shade can't pay. Slice set:

- **Overcharge** (flat 120 kJ from storage): one tower fires at 3× its firing draw for 4 s at
  satisfaction 1.0 regardless of the grid. On a Lamp that is 72 kJ of damage (a panic button:
  two Moths); on a Floodlight 173 kJ, split 4 : 2 : 1 across a crowd or all of it into a Pall
  (a real play).
  The flat price is deliberate, and it is the one place the model gives energy away: the
  tripled draw is 144 kJ on a Lamp and 288 kJ on a Floodlight, and the gaffer pays 120 either
  way. It makes Overcharge scale with the tower, so upgrading towers also upgrades the gaffer.
- **Shed** (free): toggle a tower, sector or building to off/another tier. This is a UI verb,
  but it is the most important one and gets a hotkey and a visible dimming.

Milestone 6: **Pulse** (whole-grid flash, damage in a radius around every powered tower, drains
every Jar), **Reroute** (temporarily bridge a gap between two nodes), **Dark Bait** (brown out
a sector on purpose so light-seeking enemies turn toward a lit kill zone).

## 9. The gaffer's skill tree (embers, between runs)

Embers earned = waves cleared + a bonus for lights remaining. Nodes change rules, never
multiply stats. Starter list for Milestone 8: begin each run with one Jar placed; Hearth
output 8 → 10 kW; burners relight 2× faster after a blackout; nodes can be placed during a
wave; Overcharge cost 120 → 90 kJ; wasted power above 5 kW trickles into the nearest Jar;
Shades take 2 s to knock a node offline instead of instantly. Each node's description names
what it changes on the energy side.

## 10. What the slice must answer

1. Does deciding *where the watts go* during a wave feel like playing, or like a tax?
2. Does the money split (wall vs factory) produce a real choice by wave 3?
3. Can a new player read powered/starved/dark off the screen with no panel open?

If any answer is no after the critic's review, fix the model here before building anything in
Milestone 3 or later.
