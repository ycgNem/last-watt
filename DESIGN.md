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
   Tiers: **1 Works (Extractors) · 2 Wall (towers, Beacons) · 3 Labs**. The player can move
   any consumer to another tier, or to **off** (this is the shed-load verb). *Changed 2026-10-11
   after the first td-critic review; it was 1 towers · 2 extractors. See the brownout spiral
   below.* **There is no fourth tier** (the fifth review M7). A "Spare" tier 4 ran only on power
   that would otherwise be wasted and a Jar never paid for it, meant as a third answer to wasted
   power beside a Jar and a Lab. Measured (`design/sparecheck.mts`, every Lab on Spare against on
   Labs, plan and human, four maps), even once it was served ahead of Jar charging it researched
   10–25% less on every map, saved no light anywhere, and the human profile lost Two Roads with
   it: a run wastes 16,000–43,000 kJ, so the Jars refill between waves whatever the Labs draw,
   and keeping them off the Jars protects nothing. A trap, so cut.
4. Surplus charges batteries (up to each one's max charge rate).
   Surplus beyond that is **wasted**, and the HUD says so in kW. Wasted power is the game's nudge toward storage and labs.
5. **Networks**: a network is a connected set of nodes. Anything within a node's radius is on
   that node's network. Generators and consumers on different networks don't see each other.
   A node that is knocked offline splits its network; everything downstream goes dark that tick.
   Each Node carries at most 60 kW, either way (§3.3, since the fourth review); line loss is the
   Long line's (§3.2).

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
| **Node** | 10 | transmission | radius 4 tiles; **carries at most 60 kW** through it, either way (§3.3). Cut by a Shade within 3.5 tiles, for 6 s (§5, the third review). |
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
- **Construction is instant** in the slice.
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
| **Vane** (research 600 kJ) | 50 | 15 kW × the wind, no fuel, goes anywhere on a network | The wind is three slow sine swells (periods 53, 19 and 7.1 s, amplitudes 0.28 / 0.17 / 0.08 around **0.55**, clamped to 0.1–1). Average 8.2 kW: **6.1 money per average kW**, nearly twice a Burner's 3.2, but it needs no deposit and no Extractor, and a Snuffer can't put it out. Its gusts are the Jar's job. **Wind shadow** (the third review, eased by the fourth): each other Vane within **7 tiles** (centre to centre, a wake three or four rotors long) takes **30%** of its wind, multiplied: two in each other's wake make 1.4 Vanes' worth, three 1.47, four 1.37, so a clump stops paying at three. The third review's 40% within 4 tiles was a spacing tax, not a ceiling (the fourth review: Vanes five apart paid in full, so the shadow only taxed a player who packed them). Money no longer buys unlimited wind: generation is bounded by room on the map, spread out. |
| **Bellows** (Burner tier 2, 1000 kJ) | +50 | 30 kW at efficiency 0.6 | A rock gives 400 × 0.6 = 240 kJ (was 200) and lasts 8 s (was 10), so one Extractor (8 s a rock) feeds exactly one Bellows Burner. +50% output and +20% energy per rock. |
| **Deep bit** (Extractor tier 2, 700 kJ) | +38 | 1 rock / 5 s, draws 4 kW | 1.6 rocks per 8 s for 2 kW more: feeds a Bellows Burner and most of another. |
| **Bank** (Jar tier 2, 800 kJ) | +75 | 1500 kJ, charge 25 kW, discharge 45 kW | Late waves are long enough that one Jar's 600 kJ runs dry mid-wave. |
| **Flywheel** (Jar tier 2 *instead of* Bank, 700 kJ) | +75 | 300 kJ, charge 60 kW, discharge 90 kW, **spins down 2% of its charge a second** | The other way to take a Jar's tier, chosen once (the first upgrade branch). *Re-derived in the fourth review (M5): its first derivation was one tier-2 Floodlight Overcharge (72 kW × 4 s = 288 kJ), void since the third review ruled that a Jar never pays for an Overcharge's extra.* Its job now is **the peak past a full Node** (§3.3): a branch behind a 60 kW link that fires at 100–120 kW while a pack passes and idles at 10–15 between packs. A Jar there gives 30 of the 40–60 kW short (the branch at 75–90%), a Bank 45, a Flywheel all of it up to 90. Between packs the link's spare 45–50 kW refills its 300 kJ in about 7 s with the spin-down (t = −ln(1 − 6 / P) / 0.02), where a Bank, charging at 25, takes 12 s for the same 300. *Against the Bank, honestly (the balance audit):* both cover a 40 kW shortfall, and the Bank lasts 1500 / 40 = 37 s to the Flywheel's 7; the Flywheel wins only past 45 kW short and on refill rate. It is on the cut list until that is a real choice. The spin-down (half gone in ln 2 / 0.02 ≈ 35 s; 6 kW of friction when full, shown as wasted) keeps it from being a better Bank: it is a wave tool past a narrow link, not a store for the breather. Bank or Flywheel: a long wave on open ground wants depth, a crowded branch behind one Node wants rate (`tests/capacity.test.ts`). |
| **Long line** (Node tier 2, 500 kJ) | +13 | reach 6 tiles, **loses 1 kW** while it carries power; still 60 kW through it | The first transmission loss: a longer reach pays in watts, so it is a choice, not a pure upgrade. Losses come off a network's generation before anyone sees it. |
| **Busbar** (Node tier 2 *instead of* Long line, same research) | +13 | carries **120 kW** (was 60), reach **2.5** tiles (was 4) | The other way to take a Node's tier: weight against reach (§3.3; the fifth review replaced the fourth's "Heavy line", 80 kW at the same reach, bought on every Node). 120 kW is a late bend at full fire: three tier-2 Floodlights firing ask 3 × 36 = 108. |

Tier costs follow §4's rule: base × 1.25. Still Milestone 3 and not built: belts and arms, the
Refiner (coke), the tar still, blueprints. The Lines view (V) is the production read-out: each
network's kW in, its full-fire draw, and its worst bottleneck in this order: a Siphon on it, no
power in, a Burner with no rock, **a full Node** (§3.3), a starved wall, a peak the Jars can't
carry, waste, line loss. "Short" and "peak" are said only when the wall actually fell under 75%
during this wave (the fourth review M4: full fire against generation advised the losing end of
the split, since a wall's measured peak is about half its full fire).

### 3.3 Transmission (the fourth review's C1, Milestone 3)

**The problem it answers.** Until the fourth review a network was a bag: anything in reach of any
Node shared everything made anywhere on it, so a Node was a 10-money tile of reach and nothing
more. Where the power went was never a question, only whether there was enough of it, and the
critic measured that money stopped being scarce by wave 6 on every map: the factory's only limit
was deposit room.

**The rule.** Each network is a tree of its conductors grown from its root: the Hearth, or on a
network without one the conductor beside the most generators. Two conductors are linked when
either covers the other; the tree takes the shortest way (breadth first, ties to the older
building). Every other building draws through one conductor: of those that cover it, the one
nearest the root, then the nearest. **A Node's link to its parent carries at most 60 kW in either
direction** (40 until the fifth review; why below): into the branch past it (consumers out there) or out of it (Burners out there sending
power home). The Hearth's own reach has no limit.

**Sharing.** Power is still shared tier by tier (§2.3), and inside a tier every conductor's
consumers still get the same share, *unless a link on their way is full*: then the branch past
that link gets what fits through it, and the rest of the network carries on without it (max-min
fair: the share rises evenly until a link fills, the branch past it stops there, the rest keep
rising). The order of the tick is: line loss and Siphons first; live power to the Works, the
Overcharges, the Wall and the Labs, in that order; then Jars, each giving for what live power could
not reach (a Jar past a full Node carries its branch
over the limit; a Jar on the near side cannot help, since its power would have to come through
the same link); never for an Overcharge's extra (the third review, a budget since the fifth);
then what is left charges Jars as far as the links carry it; the rest
is wasted.

**Why 60 kW.** Three Burners' output (3 × 20), so a Node is a line for a trio, and the opening
and mid-game walls never meet it: three firing Lamps ask 36 kW, a Floodlight with two Lamps 48,
four tier-2 Lamps 72. A link fills where a late wall of tier-2 towers hangs off one Node: two
tier-2 Floodlights and a Lamp ask 84, three tier-2 Floodlights 108. That is when capacity should
bite: late, when money is plentiful and the question is where the watts go, not how many there
are. *History:* at 40 (two Burners) the link filled in waves 3–6, every Node needed the tier-2
line at once, and the 13-money Heavy line (80 kW, same reach) was bought on every Node by the bot
and by the critic: a tax, not a decision (the fifth review M1). At 60 with the Busbar below, the
human profile ends 20 / 12 / 17 / 11 lights on the four maps and the Switchback and Two Roads
spend 40–96 s a wave under 75% in waves 10–12, where they spent none.

**The answers, each a different decision.** A **second route** (another Node from the Hearth or
another line: the branch splits and each half draws through its own link); a **Jar past the
Node** (it fills from the link's spare between packs and gives at the peak; the Flywheel does this
best, §3.2); **Burners on the far side** (power made past a link needs no link, but what they make
beyond the branch's own draw can only go home 60 kW at a time); a **Busbar** (the Node's other
tier 2, at the Long line's research: **120 kW, but 2.5 tiles of reach** instead of 4). Weight costs
reach: a Busbar feeding towers that stand 1.5 off a road has to sit inside a Shade's 3.5 of it, a
chain of them needs a Node every 2.5 tiles, and upgrading a Node to one strands whatever only it
reached (the button says what, before the click). So the Busbar is a layout decision, and the
second route, the Jar and the Flywheel are right wherever the ground is safe (the fifth review M1:
"make weight cost reach"). The Long line is the mirror: reach 6 for 1 kW of loss, same 60 kW. A Shade that cuts one route of two sends the
whole branch through the other, so a cut can fill a link that was fine a second earlier.

**On screen.** A working link is drawn amber, gold above 75% of its limit, and violet pulsing when
full, with a FULL tag naming its kW; a spare link (a second route the tree doesn't use) is a
dashed slate line. Hovering a Node says what it carries. A starved tower past a full Node says so,
and so does the Lines view.

**What it did** (`design/verbs.mts`, `tests/capacity.test.ts`). At 40 kW the Switchback's plan fell
from 17 lights to 6 with a bot that never upgraded a Node (its fourth leg hung off one Node, full
12–48 s a wave from wave 4), and came back to 17 once the bot bought the Heavy line wherever it
saw FULL. With the Busbar at 2.5 tiles and 40 kW Nodes the plans, laid out for 4-tile reach, could
rarely take one without stranding a tower, and the late game collapsed (the Switchback and Two
Roads lost, the station's human profile kept 3): the plans would need re-laying for short
Busbars, and a player would need to. At 60 kW the bot (which takes a Busbar only on a Node it has
seen full, and only when it strands nothing) ends: station 20 / loses / 20, Switchback 17 / loses
wave 10 / 12, the Fork 13 / 5 / 17, Two Roads 11 / loses / 11 (plan / no verbs / human). A Shade cut
of one route of two still matters: the other Node takes the whole branch and can fill.

**Derivative flag** (`DECISIONS.md`): per-line wattage limits are Oxygen Not Included's wires
(1 kW, 2 kW, the Heavi-Watt wire), and its power overlay flags circuits at capacity. Re-derived
here from pillar 1 (energy is a live flow, and *where* it goes is a decision): nothing burns out,
a full link just shares what fits, and the answers are routes and storage. The fifth review found
the first version *was* a wire tier bought everywhere (the "Heavy line", an echo of ONI's name); it
is now the Busbar (a generic electrical term), which trades reach for weight. Kept.

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
the Pall drinks **what is left of the beam** once those in front have caught theirs (k = 1 −
share × its place). A lone Pall takes all 14.4 kJ/s. *Second review:* the code had the Pall take
only its own share plus the shares behind it, so a lone Pall caught 0.4 and the Floodlight that
the intel card recommends could not kill one; this restores §5's text and §6's Pall sum.

Where a cone works: at the **outside** of a bend or looking down a straight, where enemies line
up inside 60°. At the inside of a bend the two legs are 90° or more apart from the tower and the
cone covers one leg (the second review measured one kill from a Floodlight inside bend B against
wave 5). The tooltip says so, and the ghost should show the wedge (backlog).

**Upgrade tier rule**: each tier multiplies damage by **1.8** and firing draw by **1.5**
(so efficiency rises by 1.2× per tier; upgrades are a slightly better use of watts, but they
*always* raise demand). Upgrading to tier n costs base cost × 1.25 × (n − 1). Slice: Lamp tier 2
only: 18 kW firing, 0.60 eff → 10.8 kJ/s, cost 25. Branches (wide-dim vs narrow-bright) come in
Milestone 4 and are expressed as different (draw, efficiency, range, targets) tuples.

Tier 2 for every tower (second session), all from the rule: Floodlight 36 kW at 0.72 → 25.9 kJ/s
(100); Searchlight 45 kW at 0.72 → 32.4 (88); Brazier 12 kW a body at 0.78 → 9.4 each (75; 0.65 and 0.78 since the second review, §4.1);
Starshell charges at 15 kW at 0.96 (113). The Beacon's "damage" is its slow: an enemy in range
spends 1 / (1 − s) as long there, 1.67× at s = 0.4; tier 2 multiplies that by 1.5 → 2.5× → **s =
0.6** at 6 kW (63). Tier 3, with its branches, is §4.2.

### 4.1 The wall half (Milestone 4, as built)

Three towers join the slice's three, each a different (draw, efficiency, range, targeting) tuple,
and each unlocked by research (§7) so a first run starts with the slice's three:

| Tower | Cost | Draw | Eff. | Damage at full power | Range | Behavior |
|---|---|---|---|---|---|---|
| **Searchlight** | 70 | idle 2, firing **30** kW | 0.60 | 18 kJ/s | **7** | a narrow beam (a Pall drinks 3/4) that locks onto the enemy with the **most health left** in reach and holds it; **0.5 s** to swing onto a new target |
| **Brazier** | 60 | idle 1 + **8 kW for each body** in range (up to 8) | **0.65** | 5.2 kJ/s on **each** | 2.5 | burns everything in range at once; heat needs no sight (it finds Veils) and a Pall can't drink it |
| **Starshell** | 90 | **10 kW** while its magazine isn't full, 0 when full | 0.80 | a **70 kJ** shell bursts into 56 kJ; each enemy within 1.5 tiles catches **0.3** (four or more share it) | 2–7 | charges and holds up to **three** shells, lobs them **0.6 s** apart at the thickest crowd, leading its target by its 0.8 s flight |

Why these numbers:
- *Searchlight.* At range 7 beside a straight it covers 2√(49 − 2.25) = 13.7 tiles, more than
  twice a Lamp's 6.3: the answer to "every tower after the bends sits on a straight" (§6). Its
  watts per kJ match the Lamp family (0.6), and its money per kJ/s is the Lamp's: 70 + 30 kW ×
  3.2 = 166 money for 18 kJ/s = 0.108 kJ/s per money, the Lamp's 0.103 (§6). What it buys is
  reach and targeting, paid for in a 30 kW lump a small grid can't feed. The swing delay keeps it
  bad against Flit clumps, where a fresh target every half-second wastes it.
- *Brazier.* Its draw scales with the bodies in its fire, so a crowd spikes demand: it is the
  tower that most directly turns a wave into a brownout, which is the point (pillar 1). **0.65**
  (second review; was 0.5): a Flit crossing a bend's fire (about 7 tiles at 2.6 t/s = 2.7 s)
  must take its 14 kJ, 14 / 2.7 = 5.2 kJ/s = 8 kW × 0.65. At 0.5 it took 10.8 and the review's
  Brazier killed none of eight Flits. Tier 2 by the rule: 12 kW at 0.78. A Moth crossing its fire
  takes 14 kJ; behind a Beacon (1.67×) 23. It is budgeted at a crowd of three (25 kW) but can ask
  65 kW with eight bodies; the forecast names that worst case. Heat is the light fiction's one
  non-beam: it is what finds Veils and what a Pall can't shadow.
- *Starshell.* It charges at 10 kW only while its magazine isn't full, so it fills on spare power
  between waves: storage you can shoot (pillar 2). **Second review:** with one 60 kJ shell it was
  dominated by the Lamp (0.066 kJ/s per money against 0.103) and had a perverse threshold (four
  Flits in a burst took 12 kJ each, none died; three took 14.4, all died). Now the shell is **70
  kJ** (a four-Flit clump needs 4 × 14 = 56 kJ landed; 56 / 0.8 = 70) and it holds **three**
  (210 kJ = 21 s at 10 kW, full inside the 20 s breather plus the walk), lobbed **0.6 s** apart
  (a Flit clump spans 2.4 s), so every wave opens with three bursts, 168 kJ of light bought with
  power that would otherwise be wasted. The catch rule is the Floodlight's: area light lands on
  what's in it.


### 4.2 Tier 3 and its branches (Milestone 4, as built)

Tier 3 is a choice, made once, between two (draw, efficiency, range, cone) tuples. The main line
is the tier rule again (draw × 1.5, efficiency × 1.2); the other way spends the tier on geometry
instead of brightness and keeps tier 2's efficiency. Cost is the rule's base × 1.25 × 2 either way.
Research: one project per tower unlocks both ways, at 1.5 × its tier-2 project.

| Tower | Main line | The other way |
|---|---|---|
| **Lamp** (50; research 1350 kJ) | **Arc lamp**: 27 kW at 0.72 → 19.4 kJ/s, reach 3.5 | **Lantern**: 20 kW at 0.6 → 12 kJ/s, **reach 5** |
| **Floodlight** (200; research 1500 kJ) | **Blaze**: 54 kW at 0.864 → 46.7 kJ/s, 60° cone, catch 0.4 | **Wide**: 40 kW at 0.72 → 28.8 kJ/s, **100° cone**, catch 0.3 |
| **Beacon** (125; research 900 kJ) | **Drag**: 9 kW, slows **73%** (exposure 2.5 × 1.5 = 3.75 → s = 1 − 1/3.75) | **Halo**: 8 kW, slows 60%, **reach 6** (a road 1.5 off slowed for 11.6 tiles, not 7.4: ×1.57) |
| **Searchlight** (175; research 1650 kJ) | **Lance**: 68 kW at 0.864 → 58.8 kJ/s on the heaviest | **Long Eye**: 50 kW at 0.72 → 36 kJ/s, **reach 9.5** (a straight 1.5 off: 18.8 tiles of beam, not 13.7: ×1.37) |
| **Brazier** (150; research 1350 kJ) | **Inferno**: 18 kW a body at 0.936 → 16.8 kJ/s on each (eight bodies ask 144 kW) | **Bonfire**: 13 kW a body at 0.78 → 10.1 kJ/s on each, **reach 3.5** (each body burns 6.3 tiles, not 4.0: ×1.6) |
| **Starshell** (225; research 1800 kJ) | **Nova**: charges at 22.5 kW, **105 kJ shells** | **Barrage**: charges at 15 kW, **six shells** (420 kJ banked, 28 s at 15 kW), 0.4 s apart |

The Starshell's main line breaks the rule on purpose: 0.96 × 1.2 would put its efficiency above 1
(a shell landing more than it holds), so the tier's brightness goes into a bigger shell instead
(1.5× the energy a burst, for 1.5× the charge rate). Its other way is storage: a Barrage is the
Jar of the wall, filled between waves and spent in one clump. Every other way above spends the
tier on reach and keeps tier 2's efficiency: a lower peak in kW for the same kJ over a crossing,
as with the Lantern.

What tier 3 is worth, measured (`design/tier3check.mts`, the bot plan with every tier-3 project
added to the end of its research list, main line): on the Switchback 16 lights either way with
12 towers at tier 3 and the brownout up from 56 s to 98 s; on The Fork 15 either way (8 for the
human profile) with 7 at tier 3 and 31 → 38 s of brownout; on the station and Two Roads the Labs
never get that far. Tier 3 is power the grid has to carry, not a free win: the bot's losses
are Palls at the wall, which a hotter Lamp doesn't fix.

**Arc lamp or Lantern is kW against kJ.** A Lamp 1.5 tiles off the road sees a chord of 2√(r² − 1.5²):
6.3 tiles at reach 3.5, 9.5 at reach 5, so a Lantern holds each enemy in its light 1.5× as long.
Per crossing it delivers 12 × 9.5 = 114 kJ·tiles/s against the Arc lamp's 19.4 × 6.3 = 123 (93%), and
it asks 20 kW at a time instead of 27: the grid sees a lower peak. It is not cheaper in energy
(it fires longer at a lower efficiency: 191 against 171 kJ drawn per crossing per tile/s of speed),
so the choice is the model's own: a factory short of **kW** at the peak takes Lanterns; one with
kW to spare and Jars behind it takes Arcs, which also Overcharge to 81 kW.

**Blaze or Wide is where it stands.** A cone works where enemies line up inside its angle (§4):
at the outside of a bend or looking down a straight. Beside a road, 1.5 tiles off it and pointed
across, a 60° cone lights 2 × 1.5 × tan 30° = 1.7 tiles of road; a 100° cone lights 3.6 (×2.1),
so a Wide holds a crowd strung along a straight in its light where a Blaze holds two bodies. Each
enemy catches 0.3 (not 0.4): a lone enemy gets 8.6 kJ/s from a Wide against 18.7 from a Blaze, and
four or more share the beam either way. A Blaze belongs down a straight or outside a bend; a Wide
beside one. (The first draft claimed a Wide covers both legs of a bend from the inside: it does
not; from the inside corner the near legs are about 124° apart.)

## 5. Enemies

| Enemy | Health | Speed | Bounty | Behavior | Station damage on leak |
|---|---|---|---|---|---|
| **Moth** | 30 kJ | 1.5 t/s | 5 | walks the path | 1 light |
| **Shade** | 90 kJ | 1.0 t/s | 14 | cuts any Node whose footprint is within **3.5 tiles** of it for **6 s**; never the Hearth | 2 lights |
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
becomes the transmission decision. *Third review:* at 2.5 a Node 3.5 back still fed every
path-side tower, so the critic played 11 waves with 0 cuts. At **4.5** (a Node's 4 + 0.5) no
Node feeding a path-side tower could hide, and a 12-Shade wave kept a bend's Node cut for its
whole length: the bot lost 12–14 lights to Shades in wave 8 whatever it did. At **3.5** the safe
Node spots shrink to a few per bend (the station's bend-A Node moved from (21, 10) to (21, 11)),
and a cut lasts **6 s** (was 10), an outage to manage (a second route, Reroute) rather than a lost
bend. Why the Pall drinks narrow beams: about seven ordinary Lamps
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
| 3 | 10 Moth, 2 Shade, 4 Flit (new) | 536 | 86 | 30 | **2.4 s** |
| 4 | 12 Moth, 3 Shade, 8 Flit (in two clumps of four) | 742 | 118 | 35 | 2.2 s |
| 5 | 10 Moth, 1 Pall, 8 Flit | 812 | 126 | 40 | 1.6 s |
| 6 | 10 Moth, 4 Shade, 16 Flit, 2 Siphon (new) | 1,124 | 174 | 45 | 1.2 s |
| 7 | 14 Moth, 6 Veil (new), 2 Shade | 1,020 | 164 | 50 | 1.4 s |
| 8 | 12 Moth, 5 Shade, 2 Pall | 1,610 | 250 | 55 | 0.8 s |
| 9 | 18 Moth, 4 Snuffer (new), 4 Veil, 24 Flit, 2 Siphon | 2,036 | 314 | 60 | 0.85 s |
| 10 | 22 Moth, 7 Shade, 4 Veil, 2 Snuffer, 1 Pall, 16 Flit, 2 Siphon | 2,754 | 428 | 65 | 0.65 s |
| 11 | 36 Moth, 13 Shade, 4 Veil, 3 Pall, 16 Flit, 2 Siphon | 4,194 | 654 | 70 | 0.42 s |
| 12 | 42 Moth, 11 Shade, 8 Veil, 4 Snuffer, 5 Pall, 32 Flit, 2 Siphon | 6,138 | 948 | 75 | 0.38 s |

Total: about 3,300 bounty and 570 wave pay (the data test checks every wave's health and
bounty). A run is about 15 minutes (the bot's station run: 899 s).

*Second review (waves 3 and 8–12).* Wave 3 was 3.0 s apart, looser than wave 2 (13.3 against
15.8 kJ/s), so the money split only bit at wave 4, as a cliff (a one-Burner player leaked 10).
At **2.4 s** it is 16.7 kJ/s, 1.2× a one-Burner wall's 14 kJ/s: §6's rule says that leaks 0–2,
so the split bites a wave earlier and gently. Waves 8–12 gained about a fifth more kJ in Moths,
Shades and Flits (not Palls: an extra Pall moves results in 5-light steps, see §6) after the
model fixes below made the reference plan win untouched; spacing alone did nothing, because the
late wall kills whatever arrives and only more kJ adds pressure.

### 5.1 The new things of the Dim (Milestone 4, as built)

Each one interacts with the grid in a different way, as Milestone 4 asks:

| Enemy | Health | Speed | Bounty | Grid interaction | Leak |
|---|---|---|---|---|---|
| **Flit** | 14 kJ | 2.6 t/s | 2 | none: it is a **throughput** test. A clump of eight 0.3 s apart brings 14 / 0.3 = 47 kJ/s, about eight Lamps' worth, for 2.4 s. Single beams can't keep up; cones, fire and bursts can. | 1 |
| **Veil** | 70 kJ | 1.3 t/s | 11 | **sight**: only a tower whose share of power (smoothed over 0.5 s) is at or above **0.6**, the starved line, can find it; an Overcharged tower always can, and a Brazier's heat needs no sight. A brownout lets Veils walk through. | 2 |
| **Siphon** | 120 kJ | 0.9 t/s | 18 | **demand**: taps the nearest building on a network within **2 tiles** of it and drinks **12 kW** (one firing Lamp) from that line, served before every tier, Overcharge included. It is demand like any other, so spare kW and a charged Jar on that line cover it and a tight line browns out; shedding doesn't help. A Siphon walking a bend at 0.9 t/s is in reach of the bend's towers for about 8 s, about 100 kJ stolen per bend, so it is a margin test: kill it fast where it drinks (Overcharge, a Brazier) or have the kW. Waves 6, 9, 10, 11 and 12 carry two each, in place of Moths (9 and 11 since the third review); the bot's results held (15 / 17 lights) and its no-Jar control fell from 9 to 4. *The fourth review measured that it costs a sensible player nothing on the station and the Switchback (a grid in surplus shrugs off 12 kW), and 2 lights on Two Roads.* | 2 |
| **Snuffer** | 160 kJ | 0.8 t/s | 24 | **generation**: puts out any Burner within **5 tiles**: the burning rock is lost and the Burner stays cold while it is near and 8 s after. The station's south deposit is out of reach, so the factory has a safe side; Burners on the rich ground of the Switchback, the Fork and Two Roads are in it. Vanes and the Hearth can't be snuffed. *The fourth review: at 3.5 the bot's results were the same with Snuffers or without (every plan's Burners sat 4.5 tiles back). At 5 the station's north-deposit Burners are snuffed (6 times a run) and the plan still holds 20; on the other maps no plan builds on the rich ground, so 5 costs the bot nothing there, and the reach only bites a player who goes for that ground. At 6 the station's south Burner (17, 17), 3.35 tiles from the road's end, is in reach: the plan falls to 3 and the human profile loses (the balance audit; an earlier line here said the Fork).* | 3 |

Bounty is still round(health × 0.15). **Derivative flags** (written in `DECISIONS.md`): the
Veil's "some towers can't see it" is Bloons' camo; here the counter is the grid's state, not a
tower type, which is re-derived from pillar 1. The Flit is the genre's generic fast swarm. The
Snuffer is the Shade's mechanic aimed at generators.

### 5.2 Wave pay (owner's request, 2026-10-11)

Clearing a wave (all of it spawned and none of it left on the field) pays **15 + 5 × the wave**,
leaks or not: 20 for wave 1, 75 for wave 12, 570 over a run. Kills still pay bounty. *Why these
numbers:* a powered Lamp costs about 58 money (§6), so wave pay alone buys one every two or three
waves early and about one a wave late; it is about 15% of a run's money (570 of the bot's 3,932), enough to soften the
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
the Wall tier asks 48 kW of the Hearth's 8: satisfaction 0.17, 4 kJ/s for the whole wall, a third of
two powered Lamps, and the whole wall visibly dims: **7 leaks**, the same as two Lamps with no
fuel. Lamps added to a starved grid add nothing. Brownout is the second lesson.

**Wave 2, satisfaction is a dial.** 12 Moths every 1.9 s (15.8 kJ/s). Two Lamps alone leak 7.
After wave 1 the player has 60 money (40 bounty, 20 wave pay): a third Lamp on the same 28 kW
(36 kW asked by the three firing, the Extractor's 2 served first: satisfaction 26 / 36 = 0.72)
leaks **1**; a second Burner as well leaks 0. A grid at 0.72 is weaker, not broken; a grid at
0.17 is broken. (Numbers as the pace tests measure them now; the slice's were 1.75 s, 8 and 2.)

**Payback.** In wave 1 the Burner (40 money) is the difference between 7 leaks and 0: 35 money of
bounty (7 Moths × 5) and 7 lights. It repays its lights at once and its money by wave 2. Factory spending is
never an investment you regret in the short term.

**Shade teaches transmission.** Wave 3's Shades knock out nodes beside the path. A single
chain of nodes from Hearth to the far lamps means one Shade blacks out the whole far wall for
6 s (10 s in the slice; §5 since the third review). A second node path (ring, not chain) costs 10–20 money and is the third lesson.

**Jar teaches burst** *(superseded 2026-10-11: Jars are buildable from wave 1 and the breather
gives them 20 s of spare power to fill; the paragraph below is the original reasoning).* The earliest a Jar exists in play: a Lab (50) after wave 2, the
Jar project (600 kJ: 60 s at 10 kW, in tier 3, so it runs between waves), and the Jar (60) after
wave 4, in time for wave 5's Pall. That is 110 money not spent on the wall over waves 3–4: the
money split §10 asks about. One Jar holds 600 kJ: a Floodlight at full firing draw for 25 s on
its own, or five **Overcharges** (§8). By then the grid's spare power between waves is well above
the Jar's 15 kW charge limit, so it fills in 40 s, inside one 45 s wave timer; the rest shows as
**wasted** on the HUD, the nudge toward a second Jar or a Lab.

**The Pall needs burst.** A Floodlight that has the Pall alone in its cone gives it the whole
beam, 14.4 kJ/s. The plan's bend-B Floodlight (24, 10) sees 16.35 tiles of road, 27 s of a Pall at
0.6 t/s; measured on ample power with no Overcharge it lands 316 kJ, and the two bend Lamps' narrow
beams 23: 339 of 400, so no single tower stops a Pall on plain grid power. One Overcharge adds
115 kJ (43.2 − 14.4 kJ/s for 4 s): 454, with 54 to spare. *Capacity (§3.3) bites here:* an
Overcharge is served through the links like anything else, so a Floodlight past a plain Node is
served 40 of its 72 kW and the burst adds 38 kJ, not 115 (a Floodlight at (14, 7) behind (17, 9):
267 of 400; measured at 40 kW, the limit then). A Pall wants a burst on the Hearth's own reach or
behind a link with room (the balance audit; the Overcharge tip now says what the link allows). The burst comes from spare power and the rest of the wall, never
a Jar (§8). (Second review: the code gave a lone Pall only 0.4 of the cone, 5.8 kJ/s,
and the review measured 91–120 kJ from a Floodlight; this paragraph is the arithmetic the fix
restores, tested in `tests/grid.test.ts`.)

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

**The rule past wave 4, measured (the fifth review's M6).** `design/telegraph.mts` logs, at each
wave's start, its inflow (kJ over its span) against the wall's kJ/s (every tower firing × its
efficiency, on the power the grid makes after the Works: `src/sim/pressure.ts`). The 1.2 holds for
waves 1–4 only. Later the ratio says nothing about leaks: wave 8 comes at 2.4× the station plan's
wall (3.2–3.6× on the Switchback and the Fork) and leaks 0; waves 11–12 at 1.2–2.2× leak 0 for
every plan that Overcharges. An enemy is in a wall's reach for many seconds, and the lights a run
loses late are Palls (wave 5 on the Fork, 8 and 12 on Two Roads, 10–12 for a player without
verbs). So the NEXT strip telegraphs **what is true**: the wave's kJ and its step over the last
(amber at ×1.4 or more), and in its tooltip the inflow beside the wall's kJ/s, with no verdict
drawn from them, and the number of Palls in the wave as the thing that costs lights. *Rejected:*
moving two Palls from wave 12 into waves 9 and 10 (the critic's "800 kJ earlier"). The station's
plan and human profile still lost nothing, the no-verbs player went from losing to 10 lights, Two
Roads got easier (11 → 16), and the Switchback's human profile lost at wave 10 (was 12 lights).

**Supply ceiling (open).** Wave 8's ~60 kJ/s wall needs 100–120 kW at efficiency 0.5–0.6. One
Extractor per deposit fuels at most 3.75 Burners (75 kW) plus the Hearth's 8. Either deposits
take more than one Extractor, or the last waves are meant to lean on Jars and Overcharge. The
Milestone 1 map decides; the bot checks it.

**What the real map and the bot said (2026-10-11).** The slice map (`src/data/map.ts`: 41 tiles,
east 27.5 / south 9 / west 4.5, both bends facing the Hearth) reproduces the wave 1 lesson
exactly: layout A leaks **0**, S **4**, B **7** (the numbers above). Wave 2 at its old 1.75 s:
two Lamps leak 8, three Lamps 5 (not 2); at 1.9 s three Lamps leak 0 and two leak 7, so the
"a third Lamp at 0.74 is weaker, not broken" lesson holds at 1.9 s. A chain of Nodes beside the
path loses 19 s of far-wall uptime in wave 3 (17.7 s at HEAD); a second route a tile back loses 0.
(At HEAD three Lamps in wave 2 leak 1, not 0: the Flits in wave 3 and the Works-first tiers moved
it; the pace test asks for fewer than two Lamps.)

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
| Result (lights left), first session's model | lose w8 | win, 9 | win, 20 | win, 10 | lose w11 | lose w8 |
| Result (lights left), after the second review | win, 5 | win, 7 | **win, 15** | win, 6 | lose w12 | win, 1 |

Too much factory (1.2) leaves the wall too small; too little (2.5+) browns out (106 s of brownout
at 3.0) and Veils walk. The winning band is 1.4–2.2 (measured after the bot's plan was fixed to
put every building on a network and to spend its late money on more wall). The reason it sits near 2 and not 1:
towers along a path don't all fire at once, so the measured peak demand runs at about half the
full-fire draw (wave 10: 143 kW asked of a 308 kW full fire), and Jars carry the spikes. **That
is pillar 2 answered with numbers: the money split is a real decision, and both mistakes lose.**
The tests now assert both ends (`tests/bot.test.ts`). The bot's default is 1.8 (wins with 20).
*At HEAD (the balance audit, after the fourth review):* 1.2 loses wave 5, 1.5 wins with 17, 1.8
with 20, 2.2 with 10, 2.5 with 13, 3.0 loses wave 6: still both ends lose, but the band is not
monotone past 1.8, so "1.4–2.2" above is history.
Waves 9–12 were tightened (1.0 / 0.75 / 0.5 / 0.45 → 0.85 / 0.65 / 0.42 / 0.38 s) after the
first sweep showed the 2.0 bot taking no leaks at all; one notch further (0.8 / 0.6 / 0.4 / 0.35)
and every headroom lost. *At HEAD that notch changes nothing:* 1.5 wins 17, 1.8 wins 20, and every
map's plan and human profile hold within a light; the late waves are decided by the Palls' burst
and exposure, not by spacing (their `why` strings say so). Without Jars the plan loses in wave 11: storage is load-bearing.

Pall leaks are the swing: at 5 lights each, one Pall is a quarter of the margin, so results jump
in steps of 5. That is acceptable for a run whose climax is Palls; the critic should judge it.

**After the second review** (Overcharge on live power, the Pall drinking a lone cone, the
Brazier at 0.65, the Starshell's magazine, wave 3 at 2.4 s, waves 8–12 a fifth heavier). The
review found the grid slack after wave 3 (wall share 1.00 in every wave, 0 s of brownout) and
the 1.8 plan winning 20/20 on every seed. Now: the 1.8 plan wins with **15** and spends **44 s
in brownout** (its Overcharges pull the rest of the wall down when the Jars can't cover them);
the sweep's ends still cost most of the margin (1.2 ends on 5, 3.0 on 1, 2.5 loses); a "human"
profile (acts once a second, Overcharges only a cone, a Brazier or a Starshell, only on a Pall)
wins with 17; without Jars the plan ends on 9 (Jars are no longer required to Overcharge, so
storage costs lights instead of the run). The bot's plan gained six late wall spots (a Node out
of Shade reach on the first straight, a Floodlight looking down it, a Brazier, a Lamp, a
Searchlight and a Starshell behind bend B): with the heavier waves it ran out of spots and ended
some runs with 1,500 money unspent, which measured the plan, not the game. Tests: the plan wins
with 10–16 lights and more than 10 s of brownout; the human profile wins with 6 or more; 1.2
and 3.0 end with at most half the plan's lights; no Jars ends at least 5 lights worse.

**After the third review** (Jars never pay for an Overcharge, the Vane's wind shadow, the Shade
at 3.5 tiles for 6 s, four Flits in wave 3, enemies appearing 6 tiles along the road, Siphons in
waves 6 and 9–12; `design/verbs.mts` measures it). The review's bar was: the plan with no verbs
ends with 8 lights or fewer, a plain player who uses the verbs well ends with 14 or more, and two
extra Jars do not make the run flawless. Measured (lights left at wave 12):

| Map | Plan (verbs) | No verbs at all | Human profile | Plan + 2 Jars |
|---|---|---|---|---|
| The Last Station | 16 | 0 (loses wave 12: Palls) | 16 | 16 |
| The Switchback | 16 | 1 | 16 | 16 |
| Two Roads | 1 | 0 (loses wave 12) | 10 | 12 |

Not met: the review also asked that the no-verb wall spend 15 s or more under 75% in each of
waves 8–12; it doesn't (the bot's headroom and its Jars carry the waves' own peaks). The grid is
pressed instead by the player's own Overcharges, which now take from the rest of the wall, and by
Siphons; the no-verb plan loses to Palls rather than to brownout. On Two Roads the plan's eager
Overcharges cost it (1 light against the human profile's 10): there, an Overcharge on anything
but a Pall is a bad trade, which is the decision working. The enemies' shorter walk (6 tiles) took
37 s of Lab time out of the run before wave 8, which pushed lamp2 and the Vane a wave later; the
plan absorbs it. Tests: the plan wins with 10–16 lights and some brownout; the human profile wins
every map with 6 or more and no verbs ends at least 4 below it; two extra Jars stay under 20.

**After the fourth review** (node capacity §3.3 with the Heavy line, wave 8 at 1,610 kJ, wave 4's
Flits in two clumps, the Snuffer at 5 tiles, the wind shadow at 30% within 7, Two Roads' junction
at 9.4; the bot puts a Heavy line on any Node it has seen full):

| Map | Plan (verbs) | No verbs at all | Human profile | Plan + 2 Jars |
|---|---|---|---|---|
| The Last Station | 20 | 0 (loses wave 12) | 20 | 20 |
| The Switchback | 17 | 7 | 17 | 17 |
| The Fork | 19 | 5 | 18 | 19 |
| Two Roads | 16 | 0 (loses wave 12) | 12 | 16 |

The station is now flawless for the plan (§11, the fourth review: tighter paces do not change
that, the verbs do), so its test asks for 14 or more and some brownout, and the run-level "+2
Jars stay under 20" went: the rule it guarded (a Jar never pays for an Overcharge's extra) is
tested in the grid (`tests/grid.test.ts`). Every map's "no verbs at least 4 below the human
profile" holds with room: 20 / 10 / 13 / 12 lights apart.

**The pace tests assert**, on the real slice map, with layouts named by where the Lamps stand:
- wave 1: layout **A** (two Lamps at the inside of the bends, Burner fed) leaks ≤ 2; layout **S**
  (the same two Lamps on straights) leaks at least 2 more than A; layout **B** (four Lamps, no
  Burner) leaks ≥ 5;
- wave 2: three Lamps on one Burner leak fewer than two Lamps;
- a Jar charges at its 15 kW limit in a breather: a Pulse's 300 kJ in one 20 s gap, full in two;
- a far Lamp fed by Nodes inside a Shade's reach loses ≥ 10 s of uptime in wave 3; fed from Nodes
  4.5 tiles back, out of a Shade's 3.5, none;
- the bot wins the whole run with 14 or more lights and some brownout; a slower "human" profile
  wins with 6 or more; with no factory it loses by wave 4; with too much factory (headroom 1.2) and
  with too little (3.0) it keeps at most half the plan's lights; without Jars, at least 5 fewer;
  with no verbs, at least 4 fewer (`tests/bot.test.ts`);
- a Node carries 60 kW and a Busbar 120 over 2.5 tiles (stranding what only it reached); a second
  route, a Jar or a Flywheel past a full Node carry the branch over it, each by its own discharge
  rate (`tests/capacity.test.ts`);
- the new mechanics' arithmetic (`tests/grid.test.ts`): the cone's 0.4 catch and the Pall's
  shadow, the Brazier's per-body draw, the Searchlight's lock and swing, the Starshell's shell and
  burst, the Veil's sight line, the Snuffer's reach, the Vane's average, Bellows, the Long line's
  loss, wave pay, the dimming Hearth, Overcharge on live power, the Starshell's magazine, Pulse.

If the real map's bends differ from the reference path, tune **wave 1's spacing** (2.0–2.4 s;
at 2.5 s on the reference path the straights stop leaking too and the placement lesson is gone)
until these hold. Don't change unit stats to fit a map.

## 7. Research (energy)

A Lab draws 10 kW while a project is active and converts it at 1:1 into progress. Projects are
priced in kJ. Slice: **Lamp tier 2** (900 kJ).

**The tree (second session, Milestone 5 in part).** Projects in two columns (23 at HEAD,
22,750 kJ: light 16,950, power 5,800; Pulse 900 and Reroute 600 are in the power column, §8):

| LIGHT | kJ | POWER | kJ |
|---|---|---|---|
| Lamp tier 2 | 900 | Vane | 600 |
| Searchlight | 800 | Bellows (Burner tier 2) | 1000 |
| Brazier | 700 | Deep bit (Extractor tier 2) | 700 |
| Starshell | 1200 | Bank (Jar tier 2) | 800 |
| Floodlight tier 2 | 1000 | Wiring: Long line or Busbar (Node tier 2) | 500 |
| Beacon tier 2 | 600 | | |
| Searchlight tier 2 (needs Searchlight) | 1100 | | |
| Brazier tier 2 (needs Brazier) | 900 | | |
| Starshell tier 2 (needs Starshell) | 1200 | Flywheel (Jar tier 2, the other way) | 700 |
| Lamp tier 3 (needs tier 2; Arc lamp or Lantern) | 1350 | | |
| Floodlight tier 3 (needs tier 2; Blaze or Wide) | 1500 | | |
| Beacon tier 3 (Drag or Halo) | 900 | | |
| Searchlight tier 3 (Lance or Long Eye) | 1650 | | |
| Brazier tier 3 (Inferno or Bonfire) | 1350 | | |
| Starshell tier 3 (Nova or Barrage) | 1800 | | |

The first fourteen totalled 12,000 kJ. One Lab at full power does 10 kJ/s, about 6,000 kJ over a run if it
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

Abilities spend energy the grid has: an Overcharge pulls live power ahead of the wall (after
the Works; never from a Jar); Pulse and Reroute spend the Jars. A Jar cut off by a Shade can't pay. Slice set:

- **Overcharge** (second review: **live power, no flat price, no cooldown**): for 4 s one tower
  asks **3× its draw** and is served in a tier of its own, **after the Works and ahead of the
  wall** (the fifth review: ahead of the Works a burst starved the Extractors, the Burners ran dry
  30–50 s later, and the first review's brownout spiral came back; the critic lost a whole station
  run to it in wave 12): from spare power, then whatever the rest of the wall was getting. **Jars
  never pay for it** (third review), as a budget: each Jar gives at most what it would have given
  with every Overcharge at its base draw, and that budget goes to the real shortfalls in tier
  order (the fifth review C2: a cap per tier let the Jars keep the Labs at 74–100% while the wall
  sat at 0–49%). So a burst is still a pure reallocation of live power, and the tiers still mean
  what the HUD says. With two extra Jars the second-review rule made Overcharge free
  again (the bot went to 20/20 with zero leaks); now the plan with two extra Jars ends on 16, the
  same as without them (tested: it must not reach 20). It fires at 3× its draw × what it is served. On a Lamp that is 36 kW and 72 kJ of
  damage; on a Floodlight 72 kW and 173 kJ, shared across a crowd or all of it into a Pall, when it
  is on the Hearth's reach or behind a link with room: past a full Node the burst gets only what the
  link has spare (§3.3; the tip says so). A tier-2 Floodlight's 108 kW is more than a plain Node's
  60. Every
  tower kind follows the same rule: a Brazier burns each body at 3×, a Starshell charges at 30 kW,
  a Searchlight asks 90 kW. An Overcharged tower also blows away a Veil's cover (§5.1).
  *Why it changed.* The second review measured the grid slack after wave 3 (wall share 1.00 in
  every wave, 0 s of brownout), with Overcharge as the only verb that changed outcomes and tiers
  and shed doing nothing. The flat 120 kJ was "the one place the model gave energy away", and
  the 10 s cooldown pushed Overcharges onto whatever tower was ready (the bot put 30 of 73 into
  Lamps on Palls: 18 kJ of damage for 120 stored). On live power the price is the rest of the
  wall: Overcharging a tier-2 Floodlight (108 kW) asks 72 kW beyond its firing draw, and since the
  third review no Jar pays for it: it comes out of spare power, then out of the other towers, Veils slip past them, and now *where the watts go* is the
  decision mid-wave (pillar 1). A Jar is no longer required, but without one an Overcharge
  starves the wall for its 4 s (tested). The bot Overcharges a Pall with a cone, fire or a shell
  once it is close (a narrow beam on a Pall wastes three quarters of the wall it takes), and
  anything else only when spare power covers three quarters of the extra.
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

- **Reroute** (research, G; Milestone 6, second session): **100 kJ** from the Jars (the
  fullest first, any network) brings a cut Node back at once and guards it from Shades for **8
  s**. Numbers: a cut Node darkens what hangs off it for 6 s (it was 10 when Reroute was priced);
  one firing Lamp loses 12 kW × 6 s = 72 kJ of light, two lose 144, so 100 kJ of storage is
  worth paying for a branch with two towers on it and not for a lone Lamp. *The fourth review:
  used 0 times in a played run, and on the cut list.* A Shade at 1.0 t/s spends 2√(3.5² − 1²) + 1 = 7.7 s on the stretch of road
  that can cut a Node 1 tile off it (5.9 s for one 2.5 off), so 8 s covers one Shade's pass, barely,
  not a whole wave of them. It is §8's "temporarily bridge a gap" made simple: the gap is the
  cut Node itself. Research 600 kJ, cheaper than Pulse: it saves a branch, not a wave.

- **Dark Bait** (B, or a click on a branch of the fork sign; Milestone 6, on The Fork, §11): put
  out every tower whose reach touches only that branch, so the light-drawn take the other way;
  the same again lights them. It costs nothing and *saves* the kW those towers drew: its price is
  the light itself, since those towers don't fire while they are out, and the Veils (who keep to
  the dark) now take the baited branch. It only moves towers the player hasn't shed, and gives
  back only those. The play it makes: bait the Cut as a Flit clump reaches the fork so it goes
  round the Loop past the Floodlights, light it back for the Veils behind; or bait the Loop to pull
  a Moth pack onto a Cut that is Overcharged and waiting. No research: the map is the unlock.

## 9. The gaffer's skill tree (embers, between runs)

**Embers** (the fourth currency, PLAN.md) are paid when a run ends: **one for every wave
cleared, and half the lights left on a win, rounded up**. A run lost at wave 5 pays 4; a win
with 15 lights pays 12 + 8 = 20; endless pays each wave it clears on top. Nodes change rules,
never multiply stats, and each one's description names what it changes on the energy side
(`src/data/skills.ts`, field `watt`; the skill test checks it).

The tree (Milestone 8, second session) is three columns of three; each node needs the one
above it. Costs 4 / 8 / 12 by row: the whole tree is 72 embers, about four winning runs or a
dozen short ones. Respec is free.

| | Storage | Supply | Gaffer |
|---|---|---|---|
| **Row 1 (4)** | **Spare Jar**: every run starts with a Jar built beside the Hearth (600 kJ of storage, 60 money not spent) | **Hot Hearth**: the Hearth makes 10 kW at 20 lights (was 8), 0.5 kW a light | **Head Start**: the first research project costs half (350 kJ for a Brazier) |
| **Row 2 (8)** | **Wide Mouth**: Jars charge at 22.5 kW (was 15): full in 27 s, not 40 | **Kindling**: a new Burner holds three rocks: 20 kW for 30 s before its Extractor digs | **Cool Glass**: an Overcharge asks 2.5× its draw (was 3×) and still fires 3× |
| **Row 3 (12)** | **Banked Spark**: the first Jar of a run comes full (600 kJ) | **Quick Relight**: a snuffed Burner is cold 4 s after the Snuffer leaves (was 8) | **Slow Fuse**: a Node is cut only after a Shade has been in reach for 1.5 s |

§9's first list is mostly here. Changed: "Overcharge cost 120 → 90 kJ" became Cool Glass (the
flat price is gone, §8); "nodes can be placed during a wave" was already true, so Kindling
took its place; "wasted power above 5 kW trickles into the nearest Jar" is what Jars already
do, so Wide Mouth makes them take more of it; "burners relight 2× faster after a blackout"
became Quick Relight (the Snuffer is the blackout a Burner has).

What a node is worth, by the bot on the station (`design/skillcheck.mts`; reference 15 lights,
44 s of brownout): Spare Jar, Head Start and Cool Glass alone each take it to 20; Hot Hearth
cuts the brownout to 40 s; the whole tree gives 20 lights and 0 s of brownout. On Two Roads the
whole tree leaves the result at 5 lights (the wave-8 Palls are limited by exposure, not power)
and cuts the brownout from 30 s to 0. So the tree eases the power side, as intended, and the
station becomes forgiving for a player who has played a lot: the harder maps and endless carry
the challenge after that. If that is too generous, the lever is the row costs, not the rules.

## 10. What the slice must answer

1. Does deciding *where the watts go* during a wave feel like playing, or like a tax?
2. Does the money split (wall vs factory) produce a real choice by wave 3?
3. Can a new player read powered/starved/dark off the screen with no panel open?

If any answer is no after the critic's review, fix the model here before building anything in
Milestone 3 or later.

## 11. Maps (Milestone 7, second session)

Every map is 40 × 30 and plays the same twelve waves (§5); what changes is the road, the
deposits, the wind and the **pace** (every wave's spacing × pace). A map opens when the player
has reached its wave on any map: the station always, the Switchback at wave 4, The Fork at
wave 6, Two Roads at wave 8 (lenient on purpose: the owner wants to see the content).

| Map | Roads | Deposits | Wind | Pace | Its decision |
|---|---|---|---|---|---|
| **The Last Station** | one, 41 tiles, two bends facing the Hearth | two near, one far | 0.55 | 1.0 | the slice: bends vs straights (§6) |
| **The Switchback** | one, 72 tiles, five bends; the second and fourth legs run 7 tiles apart | one near, one *inside* the strip between those legs, one far | **0.7** | **0.9** | the strip between the legs is rich ground, and every Node in it is within a Shade's reach; only a Floodlight, a Searchlight or a Starshell placed in it reaches both legs (a Lamp at the middle sits 3.5 from each: 2√(3.5² − 3.5²) = 0 tiles of beam; the first version of this row said a Lamp reaches both, and was wrong). A windy plateau makes Vanes worth 10.5 kW on average (4.8 money per average kW). Its late waves are heavier (two more Palls in wave 8, waves 10–12 half again with more Palls): the long road kills by exposure, so without them no verb mattered |
| **The Fork** | one road in from the west that **forks** after 8.5 tiles: the **Loop** (54 tiles round the north) or the **Cut** (12 tiles straight on); they meet above the Hearth and come down 6.4 tiles together (69 or 27 in all) | one safe south-west, one rich *inside* the Loop (a Snuffer on its top leg reaches it), one far east | 0.55 | 1.0 | **which way the enemies go is the player's light.** At the fork the light-drawn (Moths, Flits, Siphons) take the branch with more lit towers on it, the Veil the one with fewer; everything else keeps the road the spawner gave it. Light the Loop's last leg and the Moths walk 54 tiles past it; light the Cut and they take 12. Dark Bait (§8) turns them mid-wave |
| **Two Roads** | two, 34 and 35 tiles, from the west and the east; they **meet at a junction** 9.4 tiles above the Hearth and come down as one | one safe south, one north of the junction (4.5 tiles from the roads, inside a Snuffer's 5), one far west | 0.55 | **1.4** | cover each road on its way in, or wait on the long shared stretch, where every enemy passes. The lower stretch is on the Hearth's own power; towers up at the junction need a chain of Nodes, each a 60 kW link (§3.3). Spawns alternate roads per kind (a Flit clump keeps to one), and each wave starts on the other road |

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
After the second review's heavier waves 8–12 the bot lost wave 8 at 1.5 and won with 5 lights
at **1.8**, then the map's pace (it is 1.4 since the third review's redraw, below). The Switchback stayed at 1.0 and was the forgiving map after the
review's changes (the bot wins 20/20; at 0.9 it still wins with 18, at 0.8 the early waves
outrun its opening).
Two Roads is the hard map on purpose: it opens at wave 8.

**The third review: Two Roads redrawn.** With the ridge, every human-speed policy the critic tried
lost wave 5, and the bot's win (5 lights) rested on about 200 Overcharges a run paid from its
Jars. Once Jars stopped paying for Overcharge it lost by wave 6 at every pace from 1.5 to 2.6,
with lighter early waves, with longer last legs, and without Shades. The halved wall was the
cause, so the roads now meet at a junction and share the last 7.4 tiles: the stretch gets the
whole wall, the junction is the strong but cuttable ground, and the roads before it are the
choice. At pace 1.0 the opening can't hold waves 1–2 (two Lamps against both roads' inflow on
one stretch); at **1.4** the human profile wins with 10 and no verbs loses. Enemies appear 4 tiles
in (6 on the station, 4 on the Switchback, whose first leg is 6.5 long). The Switchback moved to
**0.9** and heavier late waves (above); before them its plan won 16 with 1,000 money left whether
it used a verb or not.

**The Fork: the lean rule and its numbers.** A branch's light is the number of lit towers (on a
line, not shed, at or above the starved line, 0.6) whose reach touches that branch's own stretch,
fork to rejoin; a tower over both counts for both, so towers at the rejoin never decide anything.
A count, not a sum of kW, so it is readable from the map and does not swing with firing draw
(an idle Lamp asks 1 kW, a firing one 12: a sum would send the Moths wherever the last pack was
being shot). The light-drawn are the three things whose blurbs already said they go to light or
lines (the Moth, its swarm the Flit, and the Siphon); the Veil, the thing that hides in dim
light, keeps to the dark; the Shade, the Snuffer and the Pall walk on, so the player cannot steer
the heavy hitters with a lamp. Measured with `design/forkcheck.mts` (the bot plan lights the
Loop's last leg): 203 of 217 Moths, 119 of 124 Flits and all 10 Siphons take the Loop; 25 of 26
Veils take the Cut. The same plan with its Loop towers left out (the Cut the brighter way) ends
with 9 lights where the plan ends with 15: the 42 tiles of extra walk are worth 6 lights. Its bar
(§6, `design/verbs.mts`): the plan wins with 15, the human profile with 8, no verbs loses wave 8,
two extra Jars end on 15. The bot never baits. The Nodes in the plan sit 4.5 tiles back from every
road, so no Shade cuts them: on this map the Shade's threat is the walk, not the line.

Per-kind alternation (not per-spawn): with one counter, a wave whose sequence puts its Palls on
odd indices sends both down the same road, and the player learns a sequence quirk rather than
a map. Starting each wave on the other road keeps a single Shade from always taking the west.

**The fourth review (maps).** *Two Roads (M3):* the map's stated decision did not exist: Nodes 4.5
tiles back from the stretch fed the junction towers, and no policy ever saw a cut. The junction
moved 2 tiles up, to 9.4 above the Hearth, with both roads' first legs shortened to match (34 and
35 tiles still), and the north deposit 2 tiles up with it. Honest result: a Node's reach (4) is
longer than a Shade's (3.5), so a careful player can still feed the junction from safe ground (the
inner corners of the T sit 4 tiles from both arms), and the bot's plan sees no cuts. What the move
did change: the shared stretch is 2 tiles longer, so holding it is stronger (plan 7 → 16 lights,
human profile a loss → 12), and the junction is now a chain of links from the Hearth, so
capacity (§3.3) is what limits a wall up there. The blurb now says that, not "Nodes a Shade can
reach". *The station:* since wave 8 was smoothed (2,600 → 1,610 kJ) the reference plan and the
human profile both hold all 20 lights; no verbs still loses wave 12. Tighter paces were tried
(0.95 to 0.75 from wave 4: the plan still held 18–20; 0.95 on every wave cost the tutorial 6 lights
in wave 2), so the station's late game is decided by the verbs, not by spacing, and the first map
stays forgiving: the expert difficulty is the other three. Results (`design/verbs.mts`, after
§3.3): station 20 / no verbs loses / human 20; Switchback 17 / 7 / 17; the Fork 19 / 5 / 18;
Two Roads 16 / loses / 12.

