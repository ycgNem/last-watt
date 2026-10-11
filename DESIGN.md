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

## 3. Buildings

| Building | Cost | Role | Numbers |
|---|---|---|---|
| **Hearth** (station core) | free, one | the thing you defend; also the bootstrap generator and the first node | 8 kW at 20 lights, no fuel; **0.4 kW less for every light lost** (8 × lights / 20). Node radius 4 tiles. At 0 lights the run ends. |
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

**Why the Hearth dims (2026-10-11, second session).** The first critic review flagged 20 lights
with bigger enemies costing more as Kingdom Rush's 20 hearts, and proposed that a leak weaken the
grid itself (pillar 1). The lights stay as the run's life, and each one is now also 0.4 kW of the
Hearth's output (its glow shrinks with them on screen). The coupling is deliberately mild: a
5-light Pall leak costs 2 kW, about one idle Floodlight, so a leak stings the grid without
starting a death spiral. Replacing lights with kW outright would have turned the §6 wave 1
lesson B (four Lamps on 8 kW) into four Lamps on 20.

### 3.2 The factory half (Milestone 3, as built)

Belts are **deferred** (`DECISIONS.md`): the adjacency feed already makes the factory a spatial
puzzle, and laying belts in a 20 s breather is a chore at tower-defense tempo. What Milestone 3
adds instead are new ways to make, store and carry watts, each a different energy profile:

| Building | Cost | Numbers | Its decision |
|---|---|---|---|
| **Vane** (research 600 kJ) | 50 | 15 kW × the wind, no fuel, goes anywhere on a network | The wind is three slow sine swells (periods 53, 19 and 7.1 s, amplitudes 0.28 / 0.17 / 0.08 around **0.55**, clamped to 0.1–1). Average 8.2 kW: **6.1 money per average kW**, nearly twice a Burner's 3.2, but it needs no deposit and no Extractor, and a Snuffer can't put it out. Its gusts are the Jar's job. |
| **Bellows** (Burner tier 2, 1000 kJ) | +50 | 30 kW at efficiency 0.6 | A rock gives 400 × 0.6 = 240 kJ (was 200) and lasts 8 s (was 10), so one Extractor (8 s a rock) feeds exactly one Bellows Burner. +50% output and +20% energy per rock. |
| **Deep bit** (Extractor tier 2, 700 kJ) | +38 | 1 rock / 5 s, draws 4 kW | 1.6 rocks per 8 s for 2 kW more: feeds a Bellows Burner and most of another. |
| **Bank** (Jar tier 2, 800 kJ) | +75 | 1500 kJ, charge 25 kW, discharge 45 kW | Late waves are long enough that one Jar's 600 kJ runs dry mid-wave. |
| **Long line** (Node tier 2, 500 kJ) | +13 | reach 6 tiles, **loses 1 kW** while it carries power | The first transmission loss: a longer reach pays in watts, so it is a choice, not a pure upgrade. Losses come off a network's generation before anyone sees it. |

Tier costs follow §4's rule: base × 1.25. Still Milestone 3 and not built: belts and arms, the
Refiner (coke), the tar still, node capacity, the Flywheel, production stats, blueprints.

## 4. Towers

| Tower | Cost | Idle | Firing | Eff. | Damage at full power | Range | Behavior |
|---|---|---|---|---|---|---|---|
| **Lamp** | 20 | 1 kW | 12 kW | 0.50 | 6.0 kJ/s | 3.5 | single target, nearest to station |
| **Floodlight** | 80 | 2 kW | 24 kW | 0.60 | 14.4 kJ/s | 5.0 | throws a **cone** 30° either side of its target (nearest to station); each enemy inside catches **0.4** of the beam, and three or more share all of it evenly (re-derived 2026-10-11, second session; it was a 4 : 2 : 1 spill) |
| **Beacon** | 50 | 4 kW constant | — | — | — | 4.0 | slows enemies 40% × satisfaction |

Why the Lamp fires at 12 kW (was 6 until 2026-10-11): at 3 kJ/s a Lamp needed 10 s per Moth while a
Moth spends 4–6 s in its range, so no wave-1 layout could clear (§6). At 6 kJ/s a Lamp kills a
Moth in 5 s, inside its exposure at a bend but not on a straight, which is the placement lesson.
It also makes two powered Lamps (24 kW) nearly fill the starting grid (28 kW), so the third Lamp
is the first purchase that needs a second Burner.

The Floodlight's cone keeps the unit rule: it never delivers more than draw × efficiency. A wide
beam lands only partly on one body: against one enemy it delivers 0.4 × 14.4 = **5.8 kJ/s** from
24 kW (worse per watt than a Lamp's 6 from 12); against two, 11.5; against three or more, all
14.4 (better). That difference is its job. *Why a cone (the critic's call, owner-approved
"implement what the critic criticizes"):* the 4 : 2 : 1 spill reached only 1.5 tiles past its
target, so it almost never landed on Moths spaced 2–3 tiles apart and read as Mindustry's Arc minus
the arc. A 30° cone 5 tiles long holds two or three spaced Moths on a straight, and the Pall's
shadow becomes literal: everyone further from the glass than a Pall in the cone gets nothing, and
the Pall takes their shares.

**Upgrade tier rule**: each tier multiplies damage by **1.8** and firing draw by **1.5**
(so efficiency rises by 1.2× per tier; upgrades are a slightly better use of watts, but they
*always* raise demand). Upgrading to tier n costs base cost × 1.25 × (n − 1). Slice: Lamp tier 2
only: 18 kW firing, 0.60 eff → 10.8 kJ/s, cost 25. Branches (wide-dim vs narrow-bright) come in
Milestone 4 and are expressed as different (draw, efficiency, range, targets) tuples.

Tier 2 for every tower (second session), all from the rule: Floodlight 36 kW at 0.72 → 25.9 kJ/s
(100); Searchlight 45 kW at 0.72 → 32.4 (88); Brazier 12 kW a body at 0.6 → 7.2 each (75);
Starshell charges at 15 kW at 0.96 (113). The Beacon's "damage" is its slow: an enemy in range
spends 1 / (1 − s) as long there, 1.67× at s = 0.4; tier 2 multiplies that by 1.5 → 2.5× → **s =
0.6** at 6 kW (63). Tier 3 and the branches stay in Milestone 4's backlog.

### 4.1 The wall half (Milestone 4, as built)

Three towers join the slice's three, each a different (draw, efficiency, range, targeting) tuple,
and each unlocked by research (§7) so a first run starts with the slice's three:

| Tower | Cost | Draw | Eff. | Damage at full power | Range | Behavior |
|---|---|---|---|---|---|---|
| **Searchlight** | 70 | idle 2, firing **30** kW | 0.60 | 18 kJ/s | **7** | a narrow beam (a Pall drinks 3/4) that locks onto the enemy with the **most health left** in reach and holds it; **0.5 s** to swing onto a new target |
| **Brazier** | 60 | idle 1 + **8 kW for each body** in range (up to 8) | 0.50 | 4 kJ/s on **each** | 2.5 | burns everything in range at once; heat needs no sight (it finds Veils) and a Pall can't drink it |
| **Starshell** | 90 | **10 kW** while its shell charges, 0 when full | 0.80 | a 60 kJ shell bursts into 48 kJ; each enemy within 1.5 tiles catches **0.3** (four or more share it) | 2–7 | charges and holds one shell, lobs it at the thickest crowd, leading its target by its 0.8 s flight |

Why these numbers:
- *Searchlight.* At range 7 beside a straight it covers 2√(49 − 2.25) = 13.7 tiles, more than
  twice a Lamp's 6.3: the answer to "every tower after the bends sits on a straight" (§6). Its
  watts per kJ match the Lamp family (0.6), and its money per kJ/s is the Lamp's: 70 + 30 kW ×
  3.2 = 166 money for 18 kJ/s = 0.108 kJ/s per money, the Lamp's 0.103 (§6). What it buys is
  reach and targeting, paid for in a 30 kW lump a small grid can't feed. The swing delay keeps it
  bad against Flit clumps, where a fresh target every half-second wastes it.
- *Brazier.* Its draw scales with the bodies in its fire, so a crowd spikes demand: it is the
  tower that most directly turns a wave into a brownout, which is the point (pillar 1). At 4 kJ/s
  a body, a Moth crossing its ~4 tiles of path in 2.7 s takes 11 kJ; behind a Beacon (1.67×) 18;
  a clump of eight Flits all burn at once. Heat is the light fiction's one non-beam: it is what
  finds Veils and what a Pall can't shadow.
- *Starshell.* It charges at 10 kW only while its shell isn't full, so it charges on spare power
  between waves and opens every wave with a burst, a small storage consumer. At full power a shell
  every 6 s is 8 kJ/s at full catch: weak on singles (14.4 kJ a burst), strong on clumps, and the
  one wall answer that reaches 7 tiles over a crowd. The catch rule is the Floodlight's: area
  light lands on what's in it.


## 5. Enemies

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

*(The table above is the slice's eight waves, kept for the record. The run now has twelve: below.)*

Starting money: **120**. Wave 1 waits for the player (there is no countdown before it); from
then on each wave starts 20 s after the field clears (the breather), or earlier when called.
Spacing for waves 2–8 was set by the bot (§6, "What the real map and the bot said", and "After
the first td-critic review").

**The run's twelve waves (second session, 2026-10-11).** The slice's waves 1–3 and 5 stand; the
slice's 7 and 8 become 8 and 11; each new enemy gets a wave that introduces it with an intel card
the first time it appears. Flits come in clumps of eight, 0.3 s apart inside a clump.

| Wave | Composition | Total health | Bounty | + wave pay | Spacing |
|---|---|---|---|---|---|
| 1 | 8 Moth | 240 | 40 | 20 | 2.25 s |
| 2 | 12 Moth | 360 | 60 | 25 | 1.9 s |
| 3 | 10 Moth, 2 Shade | 480 | 78 | 30 | 3.0 s |
| 4 | 12 Moth, 3 Shade, 8 Flit (new) | 742 | 118 | 35 | 2.2 s |
| 5 | 10 Moth, 1 Pall, 8 Flit | 812 | 126 | 40 | 1.6 s |
| 6 | 16 Moth, 4 Shade, 16 Flit | 1,064 | 168 | 45 | 1.2 s |
| 7 | 14 Moth, 6 Veil (new), 2 Shade | 1,020 | 164 | 50 | 1.4 s |
| 8 | 18 Moth, 9 Shade, 2 Pall | 2,150 | 336 | 55 | 0.6 s |
| 9 | 18 Moth, 3 Snuffer (new), 4 Veil, 16 Flit | 1,524 | 238 | 60 | 0.85 s |
| 10 | 20 Moth, 4 Shade, 4 Veil, 2 Snuffer, 1 Pall, 16 Flit | 2,184 | 340 | 65 | 0.65 s |
| 11 | 30 Moth, 9 Shade, 4 Veil, 3 Pall, 16 Flit | 3,414 | 532 | 70 | 0.42 s |
| 12 | 40 Moth, 8 Shade, 8 Veil, 4 Snuffer, 5 Pall, 24 Flit | 5,456 | 844 | 75 | 0.38 s |

Total: 3,044 bounty and 570 wave pay. A run is about 17 minutes.

### 5.1 The new things of the Dim (Milestone 4, as built)

Each one interacts with the grid in a different way, as Milestone 4 asks:

| Enemy | Health | Speed | Bounty | Grid interaction | Leak |
|---|---|---|---|---|---|
| **Flit** | 14 kJ | 2.6 t/s | 2 | none: it is a **throughput** test. A clump of eight 0.3 s apart brings 14 / 0.3 = 47 kJ/s, about eight Lamps' worth, for 2.4 s. Single beams can't keep up; cones, fire and bursts can. | 1 |
| **Veil** | 70 kJ | 1.3 t/s | 11 | **sight**: only a tower whose share of power (smoothed over 0.5 s) is at or above **0.6**, the starved line, can find it; an Overcharged tower always can, and a Brazier's heat needs no sight. A brownout lets Veils walk through. | 2 |
| **Snuffer** | 160 kJ | 0.8 t/s | 24 | **generation**: puts out any Burner within **3.5 tiles**: the burning rock is lost and the Burner stays cold while it is near and 8 s after. At 3.5 tiles the north deposit's Burners beside the first straight are in reach and the south deposit's are not, so the factory has a safe side. Vanes and the Hearth can't be snuffed. | 3 |

Bounty is still round(health × 0.15). **Derivative flags** (written in `DECISIONS.md`): the
Veil's "some towers can't see it" is Bloons' camo; here the counter is the grid's state, not a
tower type, which is re-derived from pillar 1. The Flit is the genre's generic fast swarm. The
Snuffer is the Shade's mechanic aimed at generators.

### 5.2 Wave pay (owner's request, 2026-10-11)

Clearing a wave (all of it spawned and none of it left on the field) pays **15 + 5 × the wave**,
leaks or not: 20 for wave 1, 75 for wave 12, 570 over a run. Kills still pay bounty. *Why these
numbers:* a powered Lamp costs about 58 money (§6), so wave pay alone buys one every two or three
waves early and about one a wave late; it is about 16% of a run's money, enough to soften the
compounding §6 found (a leak pays nothing, so leaks starve the next wave's wall) without making
leaks free. It is paid leaks or not on purpose: a "clean wave" bonus would compound leaks again.
**Derivative flag:** end-of-round income is Bloons TD's (100 + the round there); the numbers here
come from §6's money model.

### 5.3 Endless

After the last wave the win screen offers **endless**: wave n brings the last wave's kJ × **1.14**^(n −
12) in blocks of its mix, spacing 3% tighter a wave down to 0.25 s. The profile keeps the best
endless wave. 1.14 is the slice's own rise from wave 11 to 12 spread over a few waves, so endless
starts at the slope the run ended on.

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

**The twelve-wave run and the bot (second session, 2026-10-11).** The bot was rewritten for the
new content (`src/app/bot.ts`): it researches down a list (Brazier, Starshell, Lamp tier 2,
Bellows, Vane, Searchlight, then tier 2s), builds the new towers when they unlock, adds Vanes
when the deposits are full, upgrades Burners when it is short of power, and Overcharges Palls,
late heavies and crowds. The one dial it has is **headroom**: it buys generation when the wall's
full-fire draw would exceed generation × headroom. A sweep over headroom showed the run's shape:

| Headroom (full-fire draw ÷ generation it allows) | 1.2 | 1.4 | 1.8 | 2.2 | 2.5 | 3.0 |
|---|---|---|---|---|---|---|
| Result (lights left) | lose w8 | win, 9 | win, 20 | win, 10 | lose w11 | lose w8 |

Too much factory (1.2) leaves the wall too small; too little (2.5+) browns out (106 s of brownout
at 3.0) and Veils walk. The winning band is 1.4–2.2 (measured after the bot's plan was fixed to
put every building on a network and to spend its late money on more wall). The reason it sits near 2 and not 1:
towers along a path don't all fire at once, so the measured peak demand runs at about half the
full-fire draw (wave 10: 143 kW asked of a 308 kW full fire), and Jars carry the spikes. **That
is pillar 2 answered with numbers: the money split is a real decision, and both mistakes lose.**
The tests now assert both ends (`tests/bot.test.ts`). The bot's default is 1.8 (wins with 20).
Waves 9–12 were tightened (1.0 / 0.75 / 0.5 / 0.45 → 0.85 / 0.65 / 0.42 / 0.38 s) after the
first sweep showed the 2.0 bot taking no leaks at all; one notch further (0.8 / 0.6 / 0.4 / 0.35)
and every headroom loses. Without Jars the plan loses in wave 11: storage is load-bearing.

Pall leaks are the swing: at 5 lights each, one Pall is a quarter of the margin, so results jump
in steps of 5. That is acceptable for a run whose climax is Palls; the critic should judge it.

**The pace tests assert**, on the real slice map, with layouts named by where the Lamps stand:
- wave 1: layout **A** (two Lamps at the inside of the bends, Burner fed) leaks ≤ 2; layout **S**
  (the same two Lamps on straights) leaks at least 2 more than A; layout **B** (four Lamps, no
  Burner) leaks ≥ 5;
- wave 2: three Lamps on one Burner leak fewer than two Lamps;
- a Jar charges at its 15 kW limit in a breather: two Overcharges' worth in one 20 s gap, full in two;
- a far Lamp fed by Nodes inside a Shade's reach loses ≥ 10 s of uptime in wave 3; fed from Nodes
  out of reach, none;
- the bot wins the whole run with at least 8 lights; with no factory it loses by wave 4; with too
  much factory (headroom 1.2) and with too little (3.0) it loses; without Jars it loses
  (`tests/bot.test.ts`);
- the new mechanics' arithmetic (`tests/grid.test.ts`): the cone's 0.4 catch and the Pall's
  shadow, the Brazier's per-body draw, the Searchlight's lock and swing, the Starshell's shell and
  burst, the Veil's sight line, the Snuffer's reach, the Vane's average, Bellows, the Long line's
  loss, wave pay, the dimming Hearth and Overcharge's cooling.

If the real map's bends differ from the reference path, tune **wave 1's spacing** (2.0–2.4 s;
at 2.5 s on the reference path the straights stop leaking too and the placement lesson is gone)
until these hold. Don't change unit stats to fit a map.

## 7. Research (energy)

A Lab draws 10 kW while a project is active and converts it at 1:1 into progress. Projects are
priced in kJ. Slice: **Lamp tier 2** (900 kJ).

**The tree (second session, Milestone 5 in part).** Fourteen projects in two columns:

| LIGHT | kJ | POWER | kJ |
|---|---|---|---|
| Lamp tier 2 | 900 | Vane | 600 |
| Searchlight | 800 | Bellows (Burner tier 2) | 1000 |
| Brazier | 700 | Deep bit (Extractor tier 2) | 700 |
| Starshell | 1200 | Bank (Jar tier 2) | 800 |
| Floodlight tier 2 | 1000 | Long line (Node tier 2) | 500 |
| Beacon tier 2 | 600 | | |
| Searchlight tier 2 (needs Searchlight) | 1100 | | |
| Brazier tier 2 (needs Brazier) | 900 | | |
| Starshell tier 2 (needs Starshell) | 1200 | | |

Total 12,000 kJ. One Lab at full power does 10 kJ/s, about 6,000 kJ over a 17-minute run if it
runs most of the breathers and is shed in the worst of the waves; two Labs about 10,000. So a run
can't have everything, and what to research is a decision; a second Lab is 50 money and 10 kW for
twice the rate. Costs scale with what a project changes: an unlock about 80 s of one Lab, the
strongest crowd answer (Starshell) 120 s. Every project's building or tier changes something on
the energy side (CLAUDE.md, the data test). *The Jar unlock (600 kJ) was a second project
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
  two Moths); on a Floodlight 173 kJ, shared across a crowd or all of it into a Pall
  (a real play). It works on every tower kind by the same rule, 3× whatever it draws: a Brazier
  burns each body at 3×, a Starshell charges its shell at 3× (a shell every 2 s), a Searchlight
  fires at 90 kW. **Then the glass cools for 10 s** before it can take another (second session):
  the first review counted about 55 Overcharges a run and the critic asked whether it had become
  the dominant verb. A 14 s cycle per tower keeps it a choice of *which* tower, not a rhythm on
  one; a run still fires about 55, spread over the wall. An Overcharged tower also blows away a
  Veil's cover (§5.1).
  The flat price is deliberate, and it is the one place the model gives energy away: the
  tripled draw is 144 kJ on a Lamp and 288 kJ on a Floodlight, and the gaffer pays 120 either
  way. It makes Overcharge scale with the tower, so upgrading towers also upgrades the gaffer.
- **Shed** (free): toggle a tower, sector or building to off/another tier. This is a UI verb,
  but it is the most important one and gets a hotkey and a visible dimming.

- **Pulse** (research, Q; Milestone 6, second session): every Jar on a network whose lit towers
  have an enemy within **3 tiles** empties at once, and **0.6** of it lands, split evenly across
  those enemies. A flash comes from every side, so a Pall takes its share whole. It needs **300
  kJ** stored where a tower is lit (half a Jar) and something in reach; a network with nothing in
  reach keeps its charge. Numbers: 0.6 is the Floodlight's efficiency (light through glass); 3
  tiles sits between the Brazier's 2.5 and the Lamp's 3.5, so the flash lands on the road beside
  the wall, not across the map. One full Jar (600 kJ) is 360 kJ of light: a lone Pall at the wall
  takes 360 of its 400, a crowd of twelve Moths takes 30 each (every one dies). Per kJ it is
  worse than Overcharge (0.6 against 0.6 to 1.44) and it empties the Jars the wall leans on in a
  brownout, so it is a decision, not a free button. The first version split each tower's share
  by the cone rule (0.4 to a lone enemy) and was measured useless: 600 kJ through ten towers put
  14 kJ on a Moth. The bot test (`design/pulsecheck.mts`): researched early (after the Lamp tier
  2) it costs the station run (the research and the emptied Jars arrive when the wall needs
  them); after the Vane it ends the station 10 lights down and the Switchback 5 lights up; after
  the Bank it changes nothing. Its value is in the player's timing, which the bot does not have.
  The default bot plans do not research it.

Milestone 6, still to build: **Reroute** (temporarily bridge a gap between two nodes), **Dark Bait** (brown out
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

## 11. Maps (Milestone 7, second session)

Every map is 40 × 30 and plays the same twelve waves (§5); what changes is the road, the
deposits, the wind and the **pace** (every wave's spacing × pace). A map opens when the player
has reached its wave on any map: the station always, the Switchback at wave 4, Two Roads at
wave 8 (lenient on purpose: the owner wants to see the content).

| Map | Roads | Deposits | Wind | Pace | Its decision |
|---|---|---|---|---|---|
| **The Last Station** | one, 41 tiles, two bends facing the Hearth | two near, one far | 0.55 | 1.0 | the slice: bends vs straights (§6) |
| **The Switchback** | one, 72 tiles, five bends; the first and fourth legs run 7 tiles apart | one near, one *inside* the strip between those legs, one far | **0.7** | 1.0 | the strip is the best ground on the map (a Lamp there reaches both legs) and every Node in it is within a Shade's 2.5; a windy plateau makes Vanes worth 10.5 kW on average (4.8 money per average kW, still more than a Burner's 3.2) |
| **Two Roads** | two, 34 and 33 tiles, from the west and the east; their last legs run down either side of a **3-wide ridge** to the Hearth | one safe south, one north of the ridge, one far west | 0.55 | **1.5** | the ridge is the only ground that sees both roads (a Lamp on it sits 1.5 from one road and 2.5 from the other: 6.3 + 4.9 tiles of beam), it holds one tower per two rows, and only its lower half is inside the Hearth's reach; the rest hangs off a ridge Node that every Shade on either road can cut. Everything off the ridge covers one road. Spawns alternate roads per kind (a Flit clump keeps to one), and each wave starts on the other road, so each road sees half of every kind |

Why those paces. **Exposure, not inflow, sets the pace on a long road.** The Switchback was first
set to 0.8 on the reasoning that 1.75× the road gives 1.75× the time on each enemy, so the waves
could come denser; the bot lost by wave 5 at 0.8 and won with 15 lights at 1.0. A longer road
adds bends (exposure) but the wall still has to handle every enemy, so the station's pace stands.

**Two Roads halves the wall each enemy meets.** The first version (two roads ending at the
Hearth from opposite sides, nothing shared) lost wave 3 at every pace from 1.0 to 2.5: a Moth on
either road met one Lamp, where the station's Moth meets two at bends. Slowing the waves cannot
fix that; only shared ground can. Hence the ridge. A 4-wide ridge was tried first and was wrong:
a 2×2 tower's centre lands 1.5 from one road and 3.5 from the other, and a Lamp's 3.5 reach
grazes a road at exactly 3.5 (zero tiles of beam). At 3 wide every ridge tower sees both. With
the ridge the bot wins at 1.2–1.8 but always loses the wave-8 Palls (400 kJ each, 0.6 t/s): a
Pall is limited by the burst on its own road, not by inflow, so slower waves do not help either
(1.5 to 1.8 all end at 5 lights). Pace 1.5 is the fastest at which the bot keeps that margin.
Two Roads is the hard map on purpose: it opens at wave 8.

Per-kind alternation (not per-spawn): with one counter, a wave whose sequence puts its Palls on
odd indices sends both down the same road, and the player learns a sequence quirk rather than
a map. Starting each wave on the other road keeps a single Shade from always taking the west.

