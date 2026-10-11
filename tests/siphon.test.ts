// The Siphon (DESIGN.md §5.1): it taps the nearest building on a line within 2 tiles and drinks
// 12 kW from that line before any tier.
import { describe, expect, it } from 'vitest';
import { Game, park, put, factory, settle } from './helpers';
import { lineReports } from '../src/sim/lines';

describe('Siphon (§5.1)', () => {
  it('drinks 12 kW from the line it taps, ahead of the wall', () => {
    const g = new Game();
    factory(g);
    put(g, 'node', 23, 10);
    const a = put(g, 'lamp', 24, 7), b = put(g, 'lamp', 24, 13);
    park(g, 'moth', 28.5); park(g, 'moth', 35);
    settle(g, 0.2);
    expect(g.grid.wall.sat).toBe(1); // 28 kW in, 26 asked
    const s = park(g, 'siphon', 31); // (26.5, 10.5): beside both bend Lamps
    settle(g, 0.2);
    expect([a.id, b.id]).toContain(s.tap);
    const h = g.networks[a.net];
    expect(h.drain).toBe(12);
    expect(h.stolen).toBe(12);
    // 28 − 12 = 16 kW left for 26 asked
    expect(g.grid.wall.sat).toBeCloseTo((28 - 12 - 2) / 24, 1);
    expect(lineReports(g)[0].neck).toBe('siphon');
  });

  it('a charged Jar on the line covers it', () => {
    const g = new Game();
    factory(g);
    put(g, 'node', 23, 10);
    put(g, 'lamp', 24, 7); put(g, 'lamp', 24, 13);
    put(g, 'jar', 22, 18).charge = 600;
    park(g, 'moth', 28.5); park(g, 'moth', 35);
    park(g, 'siphon', 31);
    settle(g, 0.2);
    expect(g.grid.wall.sat).toBe(1);
    expect(g.stats.stolenKj).toBeGreaterThan(0);
  });
});
