// Run end: the station loses when its lights run out (§5). Each line's busiest moment this wave
// is remembered for the Lines view.
import { DT, type Game } from '../Game';
import type { LossCause } from '../types';
import { fullDraw } from './grid';

/** the key a line is remembered by: its first conductor, which survives most rebuilds */
export function lineKey(nodes: number[]): number {
  return nodes.length ? Math.min(...nodes) : -1;
}

export function statsSystem(g: Game) {
  for (const n of g.networks) {
    const k = lineKey(n.nodes);
    let m = g.lineMemo.get(k);
    if (!m || m.wave !== g.wave) {
      m = { wave: g.wave, peak: 0, low: 1 };
      g.lineMemo.set(k, m);
    }
    m.peak = Math.max(m.peak, n.demand);
    if (n.wall.demand > 0) m.low = Math.min(m.low, n.wall.sat);
  }
  // the supply-loss ledger (the sixth review M1): while enemies are on the field, what the wave's
  // power was lost to, so the loss screen can name a snuffed factory rather than its symptom
  if (g.wave > 0 && g.enemies.length) {
    const led = (g.stats.lossByWave[g.wave] ??= {});
    const add = (k: LossCause, kw: number) => {
      if (kw > 0) led[k] = (led[k] ?? 0) + kw * DT;
    };
    let snuff = 0, dry = 0, dark = 0;
    const cut = [...g.buildings.values()].some((b) => b.def.role === 'node' && b.offline > 0);
    for (const b of g.buildings.values()) {
      if (b.def.role === 'generator' && b.def.fuel === 'rock' && !b.off && b.net >= 0) {
        if (b.snuffed > 0) snuff += g.spec(b).output ?? 0;
        else if (b.output <= 0 && b.fuel + b.coke <= 0) dry += g.spec(b).output ?? 0;
      } else if (cut && (b.def.role === 'tower' || b.def.role === 'beacon') && !b.off && b.target >= 0) {
        const n = g.networks[b.net];
        if (!n || n.gen + n.stored <= 0) dark += fullDraw(g, b);
      }
    }
    add('snuff', snuff);
    add('dry', dry);
    add('cut', dark);
    add('siphon', g.grid.stolen);
    add('held', g.grid.held);
    const short = Math.max(0, g.grid.wall.demand - g.grid.wall.served);
    const oc = [...g.buildings.values()].some((b) => b.overcharge > 0);
    add(oc ? 'overcharge' : 'short', oc ? short : Math.max(0, short - g.grid.held));
    g.stats.wastedLiveKj += g.grid.wasted * DT;
  }
  if (g.lights <= 0 && !g.over) {
    g.over = 'lose';
    g.emit({ t: 'lose' });
  }
}
