// Gaffer abilities (§8). Overcharge is started by an action (actions.ts: overcharge) and paid
// straight from Jars; here its clock and the glass's cooling run down.
import { DT, type Game } from '../Game';

export function abilitiesSystem(g: Game) {
  for (const b of g.buildings.values()) {
    if (b.overcharge > 0) b.overcharge = Math.max(0, b.overcharge - DT);
    if (b.cool > 0) b.cool = Math.max(0, b.cool - DT);
  }
}
