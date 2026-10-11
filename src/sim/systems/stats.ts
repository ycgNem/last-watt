// Run end: the station loses when its lights run out (§5). Each line's busiest moment this wave
// is remembered for the Lines view.
import type { Game } from '../Game';

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
  if (g.lights <= 0 && !g.over) {
    g.over = 'lose';
    g.emit({ t: 'lose' });
  }
}
