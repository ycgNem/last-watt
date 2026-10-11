// The Lines view (ROADMAP Milestone 3): every power network named, with the one thing holding it
// back. It only reads what the grid computed this tick (consumers never compute it), plus each
// wall's full draw, so the player can see a peak coming before the wave does. Pure, so the tests
// can ask it.
import type { Game } from './Game';
import { fullDraw } from './systems/grid';
import { lineKey } from './systems/stats';
import { RULES } from '../data/rules';
import type { Building } from './types';

/** what holds a line back, worst first */
export type Neck = 'siphon' | 'nopower' | 'fuel' | 'short' | 'peak' | 'waste' | 'loss' | 'ok';

export interface LineReport {
  net: number;
  name: string;
  /** kW in after line losses; kW the line asks now; kW it would ask with every tower firing; the
   *  most it has asked this wave */
  made: number;
  demand: number;
  peak: number;
  busiest: number;
  /** kW the Jars on it can give, and the kJ they hold */
  jarKw: number;
  stored: number;
  neck: Neck;
  /** the problem and its usual fix, short enough to hang over the map */
  text: string;
  fix: string;
  /** a tile to hang the label on: the line's Node (or Hearth) nearest its middle */
  at: { x: number; y: number };
}

const r = Math.round;

export function lineReports(g: Game): LineReport[] {
  const out: LineReport[] = [];
  let letter = 0;
  const order = [...g.networks].sort((a, b) => Number(b.hasHearth) - Number(a.hasHearth) || a.id - b.id);
  for (const n of order) {
    const bs = n.members.map((id) => g.buildings.get(id)).filter((b): b is Building => !!b);
    const made = Math.max(0, n.gen - n.loss);
    let peak = 0;
    let jarKw = 0;
    let rockOut = 0;
    let towers = 0;
    for (const b of bs) {
      const role = b.def.role;
      if (role === 'tower' || role === 'beacon') {
        if (!b.off) peak += fullDraw(g, b);
        towers++;
      } else if (role === 'storage' && !b.off && b.charge > 0) jarKw += g.spec(b).maxDischarge ?? 0;
      else if (role === 'generator' && b.def.fuel === 'rock' && !b.off && b.output <= 0 && b.fuel <= 0) rockOut++;
    }
    // the rest of the demand (Labs, Extractors) asks what it asks now
    peak += Math.max(0, n.demand - n.wall.demand);
    const at = anchor(bs);
    // what this wave has actually asked of it, and how low its wall went: the advice reads these,
    // not full fire (the fourth review: "full fire wants 84 kW more" at wall 100% with 17 kW
    // wasted pushed players to the losing end of the split; the measured peak is about half)
    const memo = g.lineMemo.get(lineKey(n.nodes));
    const busiest = Math.max(n.demand, memo?.peak ?? 0);
    const low = Math.min(n.wall.demand > 0 ? n.wall.sat : 1, memo?.low ?? 1);
    const name = n.hasHearth ? 'Hearth line' : `Line ${String.fromCharCode(65 + letter++)}`;
    let neck: Neck = 'ok';
    let text: string;
    let fix: string;
    if (n.drain > 0) {
      neck = 'siphon';
      text = `Siphons drink ${r(n.stolen)} kW`;
      fix = 'Kill them: Overcharge, or a Brazier';
    } else if (rockOut > 0) {
      neck = 'fuel';
      text = `${rockOut} Burner${rockOut > 1 ? 's have' : ' has'} no rock`;
      fix = 'An Extractor touching each, on glowing rock';
    } else if (made <= 0 && n.stored <= 0) {
      neck = 'nopower';
      text = 'No power comes in';
      fix = 'A Burner on it, or a Node to a lit line';
    } else if (n.wall.sat < 0.99 && n.wall.demand > 0 && low < RULES.brownoutEnds.v) {
      neck = 'short';
      text = `Short ${r(n.demand - made - n.discharge)} kW: wall at ${r(n.wall.sat * 100)}%`;
      fix = 'Another Burner (+20 kW), or fewer towers';
    } else if (busiest > made + jarKw + 0.5 && towers > 0 && low < RULES.brownoutEnds.v) {
      neck = 'peak';
      text = `This wave peaked ${r(busiest - made)} kW over what it makes`;
      fix = jarKw > 0 ? 'More Burners, or more Jars' : 'A Jar to carry the peak, or a Burner';
    } else if (n.wasted > 0.5) {
      neck = 'waste';
      text = `Wasting ${r(n.wasted)} kW`;
      fix = 'More towers, a Jar, or a Lab to spend it';
    } else if (n.loss > 0.15 * n.gen && n.loss >= 1) {
      neck = 'loss';
      text = `Long lines lose ${r(n.loss)} kW`;
      fix = 'Fewer Nodes between Burners and towers';
    } else {
      text = peak > made ? `Jars carry the peak: ${r(n.stored)} kJ` : `${r(made - peak)} kW spare at full fire`;
      fix = towers > 0 ? 'Room for another tower' : 'No towers on it yet';
      if (peak > made) fix = `${r(n.stored / Math.max(1, peak - made))} s of full fire in the Jars`;
    }
    out.push({ net: n.id, name, made, demand: n.demand, peak, busiest, jarKw, stored: n.stored, neck, text, fix, at });
  }
  return out;
}

/** the line's Node or Hearth nearest the middle of everything on it */
function anchor(bs: Building[]) {
  let cx = 0, cy = 0;
  for (const b of bs) {
    cx += b.x + b.def.size / 2;
    cy += b.y + b.def.size / 2;
  }
  cx /= Math.max(1, bs.length);
  cy /= Math.max(1, bs.length);
  let best: Building | undefined;
  let bd = Infinity;
  for (const b of bs) {
    if (b.def.role !== 'node' && b.def.role !== 'core') continue;
    const d = (b.x + b.def.size / 2 - cx) ** 2 + (b.y + b.def.size / 2 - cy) ** 2;
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  const b = best ?? bs[0];
  return b ? { x: b.x + b.def.size / 2, y: b.y } : { x: cx, y: cy };
}
