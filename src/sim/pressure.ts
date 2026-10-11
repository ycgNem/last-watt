// How hard a wave comes against what the wall can do (DESIGN.md §6 "the throughput check"; the
// fifth review's M6): the kJ of dark per second over the wave's span, against the kJ/s the towers
// would deal at full fire on the power the grid makes now. Read-only, like lines.ts: the NEXT
// strip and the design scripts read it, nothing in the tick does.
import { ENEMY_BY_CODE } from '../data/enemies';
import type { WaveDef } from '../data/waves';
import type { Game } from './Game';
import { windShade } from './systems/economy';
import { fullDraw } from './systems/grid';
import { spacingOf } from './systems/waves';

export interface Pressure {
  /** the wave's health, all of it */
  kj: number;
  /** seconds from its first spawn to its last */
  span: number;
  /** kJ/s it brings over that span */
  inflow: number;
  /** kJ/s the towers would deal all firing, on the power the grid makes (no Jars, no Overcharge) */
  wall: number;
  /** the same at full power: what more Burners would buy */
  wallFull: number;
  /** inflow ÷ wall: §6 says 1.1–1.3 leaks 0–2 */
  ratio: number;
}

/** kW the grid makes without its Jars (a Vane at its average) */
export function makeKw(g: Game): number {
  let make = 0;
  for (const b of g.buildings.values()) {
    if (b.net < 0) continue;
    if (b.def.role === 'core') make += g.hearthOutput();
    else if (b.def.role === 'generator') make += b.def.fuel === 'wind' ? (g.spec(b).output ?? 0) * g.map.windMean * windShade(g, b) : g.spec(b).output ?? 0;
  }
  return make;
}

export function wavePressure(g: Game, w: WaveDef): Pressure {
  let kj = 0, span = 0;
  const sp = spacingOf(g, w);
  for (let i = 0; i < w.seq.length; i++) {
    const def = ENEMY_BY_CODE[w.seq[i]];
    kj += def.health;
    if (i < w.seq.length - 1) span += def.packGap && w.seq[i + 1] === w.seq[i] ? def.packGap : sp;
  }
  // the wall: every tower firing, served after the Works (§2.3); the Labs wait
  let works = 0, peak = 0, dealt = 0;
  for (const b of g.buildings.values()) {
    if (b.net < 0 || b.off) continue;
    const d = g.spec(b);
    if (d.role === 'extractor') works += fullDraw(g, b);
    else if (d.role === 'tower' || d.role === 'beacon') {
      const kw = fullDraw(g, b);
      peak += kw;
      if (d.role === 'tower') dealt += kw * (d.efficiency ?? 0);
    }
  }
  const share = peak > 0 ? Math.min(1, Math.max(0, makeKw(g) - works) / peak) : 1;
  const wall = dealt * share;
  const inflow = span > 0 ? kj / span : kj;
  return { kj, span, inflow, wall, wallFull: dealt, ratio: wall > 0 ? inflow / wall : Infinity };
}
