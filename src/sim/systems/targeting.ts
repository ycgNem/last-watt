// Targeting runs before the grid so a tower that will fire this tick asks for its firing draw.
// Lamps and Floodlights take the enemy in range nearest the station; a Searchlight locks onto the
// heaviest and holds it; a Brazier counts the bodies in its fire; a Starshell with a full shell
// picks the thickest crowd. A Veil is found only by a tower above the sight line (§5.1).
import { RULES } from '../../data/rules';
import type { Game } from '../Game';
import type { Building, Enemy } from '../types';

/** can this tower find this enemy at all (§5.1)? Heat needs no sight; an Overcharge blows the dark away */
export function canSee(b: Building, e: Enemy): boolean {
  return !e.def.veiled || b.def.kind === 'radial' || b.overcharge > 0 || b.satAvg >= RULES.veilSight.v;
}

export function targetingSystem(g: Game) {
  for (const e of g.enemies) e.seen = !e.def.veiled;
  for (const b of g.buildings.values()) {
    if (b.def.role !== 'tower') continue;
    const prev = b.target;
    b.target = -1;
    b.bodies = 0;
    if (b.net < 0 || b.off || g.tierOff[b.tier]) continue;
    const s = g.spec(b);
    const r = s.range ?? 0;
    const cx = b.x + b.def.size / 2, cy = b.y + b.def.size / 2;
    const inRange: Enemy[] = [];
    for (const e of g.enemies) {
      const d = Math.hypot(e.x - cx, e.y - cy);
      if (d > r || (s.minRange && d < s.minRange)) continue;
      if (!canSee(b, e)) continue;
      if (e.def.veiled) e.seen = true;
      inRange.push(e);
    }
    if (!inRange.length) continue;
    switch (b.def.kind) {
      case 'radial':
        b.bodies = Math.min(inRange.length, s.maxBodies ?? 1);
        b.target = first(g, inRange).id;
        break;
      case 'mortar': {
        if (b.shell < (s.shellSize ?? 0) && b.overcharge <= 0) break;
        // the thickest crowd: the enemy with the most others within a burst of it, then the furthest along
        let best: Enemy | null = null, bestN = -1;
        const br = s.burstRadius ?? 1;
        for (const e of inRange) {
          let n = 0;
          for (const o of g.enemies) if (Math.hypot(o.x - e.x, o.y - e.y) <= br) n += o.def.health > 100 ? 3 : 1;
          if (n > bestN || (n === bestN && best && g.left(e) < g.left(best))) {
            best = e;
            bestN = n;
          }
        }
        b.target = best!.id;
        break;
      }
      default: {
        if (b.def.targeting === 'heaviest') {
          // hold the lock while it lasts, else the enemy with the most health left
          const held = inRange.find((e) => e.id === prev);
          const t = held ?? inRange.reduce((a, e) => (e.hp > a.hp || (e.hp === a.hp && g.left(e) < g.left(a)) ? e : a));
          if (t.id !== prev) b.sweep = s.sweepTime ?? 0;
          b.target = t.id;
        } else b.target = first(g, inRange).id;
      }
    }
  }
}

/** the enemy nearest the station: the least road left to walk */
function first(g: Game, es: Enemy[]): Enemy {
  let best = es[0];
  for (const e of es) if (g.left(e) < g.left(best)) best = e;
  return best;
}
