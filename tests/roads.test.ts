// The NEXT strip's per-road counts (§11) come from the spawner's own rule: check they agree.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/Game';
import { TWO_ROADS } from '../src/data/map';
import { waveDef } from '../src/data/waves';
import { roadsOf, startNextWave } from '../src/sim/systems/waves';

describe('roads', () => {
  it.each([4, 5, 8, 12])('Two Roads wave %i: every spawn takes the road the strip said', (n) => {
    const g = new Game({ map: TWO_ROADS });
    g.wave = n - 1;
    startNextWave(g);
    const seen: number[] = [];
    const ids = new Set<number>();
    for (let t = 0; t < 300 * 60 && g.spawners.length; t++) {
      g.step();
      g.drainEvents();
      for (const e of g.enemies) {
        if (ids.has(e.id)) continue;
        ids.add(e.id);
        seen.push(e.route);
        e.hp = -1; // out of the way, so nothing leaks and the run goes on
      }
      g.lights = 20;
    }
    const w = waveDef(n, TWO_ROADS)!;
    expect(seen).toEqual(roadsOf(w.seq, n, 2));
  });
});
