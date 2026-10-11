// A fork in the road (DESIGN.md §11 The Fork, §8 Dark Bait). Where a map's two roads share their
// first stretch and split, each enemy chooses its branch at the fork by the light down each:
// the light-drawn (Moths, Flits, Siphons) take the branch with more lit towers on it, the Veil
// the darker one, everything else keeps the road the spawner gave it. Dark Bait puts out the
// towers that light only one branch, so the light-drawn turn the other way.
import { RULES } from '../data/rules';
import type { Game } from './Game';
import type { Building, Enemy } from './types';

/** samples of a branch's own stretch (fork to rejoin), cached per map */
const SAMPLES = new WeakMap<Game, [number, number][][]>();

function samples(g: Game): [number, number][][] {
  let s = SAMPLES.get(g);
  if (s) return s;
  const f = g.map.fork!;
  s = [0, 1].map((i) => {
    const out: [number, number][] = [];
    for (let d = f.at; d <= f.until[i]; d += 0.5) {
      const p = g.paths[i].at(d);
      out.push([p.x, p.y]);
    }
    return out;
  });
  SAMPLES.set(g, s);
  return s;
}

function isLight(b: Building): boolean {
  return b.def.role === 'tower' || b.def.role === 'beacon';
}

/** a building's branches, kept until its reach changes (an upgrade) */
const BITS = new WeakMap<Building, { r: number; bits: number }>();

/** which branches a tower's reach touches (bit 0 the first, bit 1 the second) */
export function branchesOf(g: Game, b: Building): number {
  if (!g.map.fork || !isLight(b)) return 0;
  const r = g.spec(b).range ?? 0;
  const hit = BITS.get(b);
  if (hit && hit.r === r) return hit.bits;
  const cx = b.x + b.def.size / 2, cy = b.y + b.def.size / 2;
  let bits = 0;
  samples(g).forEach((pts, i) => {
    if (pts.some(([x, y]) => Math.hypot(x - cx, y - cy) <= r)) bits |= 1 << i;
  });
  BITS.set(b, { r, bits });
  return bits;
}

/** a tower that reads as lit on the map: on a line, not shed, above the starved line */
export function lit(g: Game, b: Building): boolean {
  return b.net >= 0 && !b.off && !g.tierOff[b.tier] && b.sat >= RULES.starvedBelow.v;
}

/** lit towers whose reach touches each branch (a tower over both counts for both) */
export function branchLight(g: Game): [number, number] {
  const out: [number, number] = [0, 0];
  if (!g.map.fork) return out;
  for (const b of g.buildings.values()) {
    if (!isLight(b) || !lit(g, b)) continue;
    const bits = branchesOf(g, b);
    if (bits & 1) out[0]++;
    if (bits & 2) out[1]++;
  }
  return out;
}

/** the branch an enemy takes at the fork, by its lean and the light now */
export function forkChoice(g: Game, e: Enemy, light = branchLight(g)): number {
  const lean = e.def.lean;
  if (!lean || light[0] === light[1]) return e.route;
  const brighter = light[0] > light[1] ? 0 : 1;
  return lean === 'light' ? brighter : 1 - brighter;
}

/** the branch the light-drawn would take now (-1: a tie, they keep to their roads) */
export function mothsGo(g: Game, light = branchLight(g)): number {
  return light[0] === light[1] ? -1 : light[0] > light[1] ? 0 : 1;
}

/** towers Dark Bait would put out on a branch: lit only that one, not shed by the player */
export function baitable(g: Game, branch: number): Building[] {
  const out: Building[] = [];
  for (const b of g.buildings.values()) if (isLight(b) && !b.off && branchesOf(g, b) === 1 << branch) out.push(b);
  return out;
}
