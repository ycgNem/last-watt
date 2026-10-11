// Gaffer abilities (§8). Overcharge is started by an action (actions.ts: overcharge) and served by
// the grid ahead of every tier (systems/grid.ts); here its clock runs down.
import { DT, type Game } from '../Game';

export function abilitiesSystem(g: Game) {
  for (const b of g.buildings.values()) {
    if (b.overcharge > 0) b.overcharge = Math.max(0, b.overcharge - DT);
    if (b.guard > 0) b.guard = Math.max(0, b.guard - DT);
  }
}
