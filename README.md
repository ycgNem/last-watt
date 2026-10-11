# Last Watt

A pixel-art tower defense where energy is a live flow. Your towers are lights and they fire on
watts, not ammo: an enemy's health is in kJ, and a Lamp drawing 12 kW does 6 kJ/s only if the
grid can feed it. Build more towers than your Burners can run and the whole wall slows down
together. Keep the Hearth lit for 12 waves, then see how long it lasts in endless.

**Play in the browser:** the link is in this repo's About box (GitHub Pages, rebuilt on every
push to `main`). A run takes about 17 minutes. Desktop browser, mouse and keyboard. New players:
pick TUTORIAL on the title screen.

This is an early vertical slice, built to find out whether the idea is fun. Rough edges are
expected; what you felt matters more than bugs.

## Controls

| Key | Does |
|---|---|
| 1–6 | pick a LIGHT (tower): Lamp, Floodlight, Beacon, Searchlight, Brazier, Starshell |
| 7 8 9 0 - = | pick a POWER building: Node, Extractor, Burner, Vane, Jar, Lab |
| Click | place it / select a building |
| Right-click, Esc | cancel / deselect |
| Space | start the next wave now |
| X | shed (turn off) the building under the mouse |
| T | raise its power priority one tier |
| E | Overcharge a tower (needs a charged Jar) |
| U | upgrade the building (after its research) |
| L | research board (needs a Lab) |
| Del | sell the selected building (half back) |
| Shift-click a tier bar (top) | shed the whole tier |
| WASD, middle-drag, wheel | pan, zoom; C recentres |
| F / P / M | speed / pause / mute |
| H | all of this, in the game |

**Reading the screen:** bright = powered, flickering purple = short of power, dark with one blue
pixel = no power at all. Light only reaches where the grid does.

## Running it locally

Node 22, then `npm install` and `npm run dev`. `npm test` runs the simulation tests and a bot
that plays a full run.
