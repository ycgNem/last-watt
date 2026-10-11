// The loss screen's line (src/app/diagnose.ts) and the supply ledger behind it (the sixth review
// M1): a run whose wall starved because Snuffers put its Burners out is told so, not blamed on the
// Veils that walked through, and Pulse is named only if the run used it.
import { describe, expect, it } from 'vitest';
import { Game, park, put } from './helpers';
import { diagnose } from '../src/app/diagnose';

describe('why a run was lost (the sixth review M1)', () => {
  it('a starved wall with its Burners snuffed names the Snuffers, and no Pulse that was never used', () => {
    const g = new Game();
    g.stats.leakLog = [
      { enemy: 'veil', wave: 9, lights: 2, wall: 0.15, overcharged: false },
      { enemy: 'veil', wave: 9, lights: 2, wall: 0.2, overcharged: false },
      { enemy: 'flit', wave: 9, lights: 1, wall: 0.1, overcharged: false },
    ];
    g.stats.lightsLostBy = { veil: 4, flit: 1 };
    g.stats.lossByWave[9] = { snuff: 1200, short: 500, siphon: 200 };
    const why = diagnose(g);
    expect(why).toMatch(/Snuffers put out your Burners/);
    expect(why).not.toMatch(/Pulse/);
  });

  it('with the wall fed when the lights went, the ledger is not the cause', () => {
    const g = new Game();
    g.stats.leakLog = [{ enemy: 'pall', wave: 8, lights: 5, wall: 1, overcharged: false }];
    g.stats.lightsLostBy = { pall: 5 };
    g.stats.lossByWave[8] = { snuff: 1200 };
    expect(diagnose(g)).toMatch(/Palls/);
  });

  it('the ledger counts a snuffed Burner at its output while enemies are on the field', () => {
    const g = new Game();
    const b = put(g, 'burner', 19, 18);
    b.fuel = 5;
    park(g, 'moth', 30);
    g.wave = 1;
    b.snuffed = 100;
    for (let i = 0; i < 60; i++) g.step();
    expect(g.stats.lossByWave[1].snuff).toBeCloseTo(20, 0);
  });

  it("the end screen's wave-by-wave record: what the wall asked and got while enemies were on the field", () => {
    const g = new Game();
    const lamp = put(g, 'lamp', 24, 13);
    park(g, 'moth', 35);
    g.wave = 1;
    for (let i = 0; i < 120; i++) g.step();
    const f = g.stats.flowByWave[1];
    expect(lamp.demand).toBe(12);
    // a firing Lamp on the Hearth's 8 kW: 12 asked, 8 got, for two seconds
    expect(f.ask).toBeCloseTo(24, 0);
    expect(f.got).toBeCloseTo(16, 0);
    expect(f.made).toBeCloseTo(16, 0);
  });
});
