# Last Watt — Plan

*Named 2026-10-11 (was the working title "Candlepower"): the last light, written in the game's
own unit. No game under that name turned up in a quick search; check Steam, itch.io, GitHub and
the domain once more before the first public build.*

## The hook

A pixel-art tower defense where **energy is a flow, not a stockpile**. Every tower is an
appliance on a grid you build and run. Waves pay money; money buys towers *or* generation, but
nothing fires without watts. You are the gaffer of the last lit station in a dark world, and
the game is the second-by-second job of keeping the lights on while things come out of the dark.

## The fiction (placeholder — flesh out, never borrow)

The world has gone dark ("the Dim"). You hold a station at the edge of it as its **gaffer**, the
one who runs the lights (the real name for the chief lighting electrician on a film set). The
biggest thing in the Dim is a **Pall**: a slow, heavy dark that drinks the light aimed past it.
Your towers are
lights: lamps, floodlights, furnaces, beacons. Things in the Dim are drawn to light and die in
it, slowly, if the light is strong enough. Fuel comes from the ground (emberrock veins, tar
seeps, later vents and wind) and your works turn it into light. A brownout is visible: a whole
sector dims and the Dim walks in. Names, creatures and places are invented for this game.
Nothing is named after, modeled on, or stat-copied from any shipped game.

## Pillars (every feature must serve at least one)

1. **Power is live.** Supply, demand, transmission and storage are simulated every tick.
   Towers fire at `base rate × satisfaction`, where `satisfaction = min(1, supply / demand)`.
   Under-building the grid never blocks a purchase; it makes everything weak at once.
2. **Money is capital, energy is operations.** Money (wave bounty) buys what you *own*.
   Energy decides what *runs*. Every spend is a split between the factory and the wall.
3. **The gaffer is an operator, not a spectator.** Mid-wave verbs: shed load, dump a battery
   into a tower, flip a breaker, reroute around a cut line, brown out on purpose. The slice has
   to prove these are fun before anything else gets built.
4. **One unit.** Enemy health in kJ, tower damage as kW × efficiency, fuel in kJ, batteries in
   kJ, research in kJ. Balance is derived from the model, never typed in from a reference.
5. **Energy you can see.** Powered glows, starved dims, cut lines go dark along their length.
   The player reads the grid off the screen, not off a panel.

## Currencies (four is the ceiling)

| Currency | Kind | Comes from | Spent on |
|---|---|---|---|
| Money | stock | wave bounty, call-early bonus | towers, tower upgrades, factory buildings, lines, storage |
| Energy | flow (kW) / stored (kJ) | generators, batteries | running everything, research labs, gaffer abilities |
| Fuel | physical items | map deposits via extractors; later, harvested kills | generators (via belts, by hand early) |
| Embers | meta stock | end of run, by performance | the gaffer's skill tree between runs |

If a fifth currency appears in a design conversation, something is wrong.

## Structure

Runs on hand-made maps with escalating waves. Losing the station ends the run. Embers persist.
Maps unlock as you reach wave milestones. The player calls the next wave early for bonus money
(a tempo lever). Experimental, not committed: grid output attracts bigger waves.

## Depth: three trees and a set of verbs

- **Per-tower upgrades** (money, in-run): each tier raises damage *and* draw; branches trade
  damage shape against efficiency.
- **Research** (energy, in-run): labs are grid consumers. Researching during a wave competes
  with towers for watts. Unlocks generators, transmission tiers, storage, refiners, towers,
  gaffer abilities.
- **The gaffer's skill tree** (embers, between runs): nodes change how you play (start with a
  battery, faster spin-up after blackout, cheaper overcharge, lay lines during waves). No flat
  percentage boosts here — those belong in per-tower tiers or they trivialize the balance.
- **Gaffer abilities** (stored energy, mid-wave): overcharge, grid pulse, emergency reroute,
  deliberate brownout.

Rule: **every upgrade node has a wattage column.** No node exists unless it changes something
on the energy side.

## The not-list (hard rules, checked by `indie-critic` at every milestone)

- Not **Mindustry**: no ammo on belts to turrets, no unit factories, towers consume power only.
- Not **They Are Billions**: energy is never a static cap raised by building more plants; it is
  a per-tick flow with satisfaction, transmission and storage.
- Not **Factorio defense**: no pollution-driven aggression as the baseline (grid-attracts-waves
  is an experiment, and if it ships it is tuned from our model, not theirs).
- Not **Bloons / Kingdom Rush**: no fixed-path mazing as the core skill; path matters only as
  it interacts with transmission.
- Not **Plants vs Zombies**: towers are not plants; the light fiction is lamps and works.
- **No borrowed numbers.** Every stat derives from `DESIGN.md`. If a number can't be explained
  from the model, it is wrong.
- **No borrowed rosters.** No enemy, tower or character maps onto a named game's cast.
- **No breadth before the slice.** Nothing past Milestone 1 in `ROADMAP.md` is built until the
  slice has passed the critic's decision gate.

## Tech (decided — see CLAUDE.md)

TypeScript strict + Vite, Canvas 2D, fixed 60 Hz pure sim, immediate-mode canvas UI, Web
Audio, Vitest + Playwright, GitHub Pages. Starter kit extracted from Sprocket & Sprout's engine,
UI, atlas, art pipeline, e2e harness and deploy workflow. **None** of its `sim/` or `data/`.
