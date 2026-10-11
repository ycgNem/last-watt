// Targeting runs before the grid so a tower that will fire this tick asks for its firing draw.
// Each tower picks the enemy in range that is nearest the station (furthest along the path).
import type { Game } from '../Game';

export function targetingSystem(g: Game) {
  for (const b of g.buildings.values()) {
    if (b.def.role !== 'tower') continue;
    b.target = -1;
    if (b.net < 0 || b.off) continue;
    const r = b.def.range ?? 0;
    const cx = b.x + b.def.size / 2, cy = b.y + b.def.size / 2;
    let best = -1, bestD = -1;
    for (const e of g.enemies) {
      if (Math.hypot(e.x - cx, e.y - cy) > r) continue;
      if (e.dist > bestD) {
        bestD = e.dist;
        best = e.id;
      }
    }
    b.target = best;
  }
}
