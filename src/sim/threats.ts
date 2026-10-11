// What a wave's grid threats can reach in the build as it stands (the sixth review C1): the Burners
// a Snuffer passing on the road would put out, the Nodes a Shade would cut and what hangs off them,
// the kW Siphons drink. Read-only, like lines.ts and pressure.ts: the NEXT strip, the breather's
// reach overlay, the bot and the design scripts read it, nothing in the tick does.
import { ENEMIES } from '../data/enemies';
import type { Game } from './Game';
import { pointRectDist } from './geom';
import type { Building } from './types';

/** the nearest any road comes to a building's footprint, in tiles */
export function roadDist(g: Game, b: Building): number {
  const r = g.rect(b);
  let best = Infinity;
  for (const p of g.paths)
    for (let d = 0; d <= p.length; d += 0.5) {
      const q = p.at(d);
      best = Math.min(best, pointRectDist(q.x, q.y, r));
    }
  return best;
}

/** lit-or-fuelled Burners within a Snuffer's reach of the road; `coke` too, unless asked not to
 *  (a Burner on coke can't be put out, §3.2) */
export function snuffable(g: Game, coke = false): Building[] {
  const r = ENEMIES.snuffer.snuffRadius ?? 0;
  return [...g.buildings.values()].filter(
    (b) => b.def.role === 'generator' && b.def.fuel === 'rock' && !b.off && b.net >= 0 && (coke || (b.coke <= 0 && !b.burnCoke)) && roadDist(g, b) <= r,
  );
}

/** Nodes within a Shade's reach of the road */
export function cuttable(g: Game): Building[] {
  const r = ENEMIES.shade.knockRadius ?? 0;
  return [...g.buildings.values()].filter((b) => b.def.role === 'node' && b.id !== g.hearthId && b.net >= 0 && roadDist(g, b) <= r);
}

/** towers and Beacons whose way home passes through any of `nodes` */
export function hangingOff(g: Game, nodes: Building[]): Building[] {
  const cut = new Set(nodes.map((n) => n.id));
  return [...g.buildings.values()].filter((b) => {
    if (b.def.role !== 'tower' && b.def.role !== 'beacon') return false;
    const n = g.networks[b.net];
    if (!n?.tree || !n.at) return false;
    let i = n.at.get(b.id) ?? 0;
    while (i > 0) {
      if (cut.has(n.tree.ids[i])) return true;
      i = n.tree.parent[i];
    }
    return false;
  });
}

export interface WaveThreats {
  snuffers: number;
  /** Burners in reach and the kW they make */
  burners: Building[];
  snuffKw: number;
  shades: number;
  nodes: Building[];
  /** towers past those Nodes */
  towers: Building[];
  siphons: number;
  siphonKw: number;
}

/** what the grid threats of a wave sequence could take from this build */
export function waveThreats(g: Game, seq: string): WaveThreats {
  const count = (c: string) => [...seq].filter((x) => x === c).length;
  const snuffers = count(ENEMIES.snuffer.code), shades = count(ENEMIES.shade.code), siphons = count(ENEMIES.siphon.code);
  const burners = snuffers ? snuffable(g) : [];
  const nodes = shades ? cuttable(g) : [];
  return {
    snuffers, burners, snuffKw: burners.reduce((a, b) => a + (g.spec(b).output ?? 0), 0),
    shades, nodes, towers: nodes.length ? hangingOff(g, nodes) : [],
    siphons, siphonKw: siphons * (ENEMIES.siphon.drainKw ?? 0),
  };
}
