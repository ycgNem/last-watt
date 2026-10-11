# Last Watt

A pixel-art tower defense where energy is a live flow. Your towers are lights and they fire on
watts, not ammo: an enemy's health is in kJ, and a Lamp drawing 12 kW does 6 kJ/s only if the
grid can feed it. Build more towers than your Burners can run and the whole wall slows down
together. Keep the Hearth lit for 12 waves, then see how long it lasts in endless.

**Play in the browser:** the link is in this repo's About box (GitHub Pages, rebuilt on every
push to `main`). A run takes about 17 minutes. Desktop browser, mouse and keyboard. New players:
pick TUTORIAL on the title screen.

This is a work in progress, built to find out whether the idea is fun. Rough edges are
expected; what you felt matters more than bugs.

## What is in it

- **Four maps**, each opened by reaching a wave anywhere: The Last Station, The Switchback, The
  Fork (the road splits, and the light-drawn take the brighter branch) and Two Roads.
- **Six towers**, each with a second tier and a choice of two at the third: Lamp, Floodlight,
  Beacon, Searchlight, Brazier, Starshell.
- **Seven enemies** that each hit the grid a different way: Moths and Flits walk to the light,
  Shades cut Nodes, Snuffers put out Burners, Siphons drink from your lines, Veils hide from a
  starved wall, Palls drink thin beams.
- **The grid**: Extractors dig emberrock for Burners, Vanes turn in the wind, Jars store what is
  spare, Labs turn it into research. Every consumer sits on a priority tier (Works, Wall, Labs,
  and Spare, which runs only on what would be wasted). Each Node carries at most 40 kW, so where
  the power goes is a decision: a second route, a Jar past it, or a Heavy line.
- **Verbs mid-wave**: Overcharge a tower (3x for 4 s, paid from spare power and the rest of the
  wall), Pulse every Jar onto the enemies, Reroute a cut Node, shed a building or a whole tier,
  Dark Bait on the Fork.
- **Between runs**: embers buy skills that change the power rules for every run after.

## Controls

| Key | Does |
|---|---|
| 1–6 | pick a LIGHT (tower): Lamp, Floodlight, Beacon, Searchlight, Brazier, Starshell |
| 7 8 9 0 - = | pick a POWER building: Node, Extractor, Burner, Vane, Jar, Lab |
| Click | place it / select a building |
| Right-click, Esc | cancel / deselect (Esc with nothing to cancel: the menu) |
| Space | start the next wave now |
| X | shed (turn off) the building under the mouse |
| T / Shift+T | raise / lower its power priority tier |
| E | Overcharge a tower: 3x for 4 s, after the Works and ahead of the rest of the wall (a Jar never pays for it) |
| Q | Pulse: every Jar at once onto the enemies near your lit towers (research) |
| G | Reroute: a cut Node back at once (research, 100 kJ) |
| B | Dark Bait on The Fork: turn the Moths down the other branch |
| U / Y | upgrade (Y takes the other way where a tier has a choice) |
| L | research board (needs a Lab); Shift-click queues a project |
| V | Lines view: every power line and what holds it back |
| Del | sell the selected building (half back) |
| Shift-click a tier bar (top) | shed the whole tier |
| WASD, middle-drag, wheel | pan, zoom; C recentres |
| F / P / M | speed / pause / mute |
| O / K | settings / skills (K on the title) |
| H | all of this, in the game |

**Reading the screen:** bright = powered, flickering purple = short of power, dark with one blue
pixel = no power at all. Light only reaches where the grid does. A power line is amber while it
carries power, gold when busy, and violet and pulsing when its Node carries all it can.

## Running it locally

Node 22, then `npm install` and `npm run dev`. `npm test` runs the simulation tests and a bot
that plays a full run on every map. The design and its numbers are in `DESIGN.md`, every
decision with its reason in `DECISIONS.md`, and what exists in `PROGRESS.md`.
