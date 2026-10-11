// The NEXT strip's telegraph (src/sim/pressure.ts; DESIGN.md §6, the fifth review's M6): a wave's
// kJ over its span against the kJ/s the wall deals all firing on the power the grid makes.
import { describe, expect, it } from 'vitest';
import { Game, put, settle } from './helpers';
import { waveDef } from '../src/data/waves';
import { wavePressure } from '../src/sim/pressure';

describe('wave pressure (§6)', () => {
  it("wave 3 brings 536 kJ over 29.7 s, 18 kJ/s (§5's arithmetic), its Flit clump on its own gap", () => {
    const g = new Game();
    const p = wavePressure(g, waveDef(3, g.map)!);
    expect(p.kj).toBe(536);
    // 15 gaps: 12 at 2.4 s, 3 inside the Flit clump at 0.3 s
    expect(p.span).toBeCloseTo(12 * 2.4 + 3 * 0.3, 6);
    expect(p.inflow).toBeCloseTo(536 / 29.7, 3);
  });

  it("the wall is its towers' firing draw × efficiency, scaled to the power the grid makes after the Works", () => {
    const g = new Game();
    put(g, 'lamp', 24, 13);
    put(g, 'lamp', 24, 7);
    put(g, 'node', 21, 10);
    settle(g, 0.1);
    // two Lamps ask 24 kW of the Hearth's 8: a third of their 12 kJ/s
    const p = wavePressure(g, waveDef(1, g.map)!);
    expect(p.wallFull).toBeCloseTo(12, 6);
    expect(p.wall).toBeCloseTo(12 * (g.hearthOutput() / 24), 6);
    // a fuelled Burner and its Extractor: 28 kW for the 24 the Lamps ask, after the Extractor's 2
    put(g, 'extractor', 16, 19);
    put(g, 'burner', 16, 20).fuel = 5;
    settle(g, 0.1);
    expect(wavePressure(g, waveDef(1, g.map)!).wall).toBeCloseTo(12, 6);
  });
});
