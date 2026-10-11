// The Coker (DESIGN.md §3.2, ROADMAP Milestone 3's Refiner): the Extractor's other tier 2. It still
// digs a rock every 8 s, but hands it over as coke, 2.5 rocks of heat, for 10 kW. A Deep bit digs
// faster for 4 kW. Which pays depends on how many Burners can touch the Extractor.
import { describe, expect, it } from 'vitest';
import { Game, put } from './helpers';
import { run } from '../src/sim/commands';
import { RULES } from '../src/data/rules';

/** an Extractor at (16, 19) with Burners touching it on `sides` of left, right, below, above */
function deposit(branch: number | null, burners: number) {
  const g = new Game();
  g.research.done.add('deepbit');
  g.money = 1000;
  const ex = put(g, 'extractor', 16, 19);
  if (branch !== null) expect(run(g, { k: 'up', b: ex.id, branch })).toBeNull();
  const bs = [[14, 19], [17, 18], [16, 20], [15, 17]].slice(0, burners).map(([x, y]) => put(g, 'burner', x, y));
  // warm up, then the average output of the Burners over 120 s
  for (let i = 0; i < 60 * 120; i++) g.step();
  let kj = 0;
  for (let i = 0; i < 60 * 120; i++) {
    g.step();
    kj += bs.reduce((a, b) => a + b.output, 0) / 60;
  }
  return { g, ex, bs, kw: kj / 120 };
}

describe('the Coker (§3.2)', () => {
  it('coke is 2.5 rocks of heat: 25 s in a Burner', () => {
    expect(RULES.cokeDensity.v).toBe(2.5);
    const g = new Game();
    const b = put(g, 'burner', 19, 18);
    b.coke = 1;
    g.step();
    expect(b.coke).toBe(0);
    expect(b.burnLeft).toBeCloseTo(25 - 1 / 60, 3);
  });

  it('with three Burners touching, a Coker runs all three; a Deep bit two; a plain Extractor one and a quarter', () => {
    expect(deposit(1, 3).kw).toBeCloseTo(60, 0);
    expect(deposit(0, 3).kw).toBeCloseTo(40, 0);
    expect(deposit(null, 3).kw).toBeCloseTo(25, 0);
  });

  it('with two Burners touching, the Deep bit nets more: the same 40 kW for 4 kW, not 10', () => {
    const coke = deposit(1, 2), deep = deposit(0, 2);
    expect(coke.kw).toBeCloseTo(40, 0);
    expect(deep.kw).toBeCloseTo(40, 0);
    expect(coke.g.spec(coke.ex).workDraw).toBe(10);
    expect(deep.g.spec(deep.ex).workDraw).toBe(4);
  });

  it('a Burner stocked with coke holds out two and a half times as long when its Extractor stops', () => {
    const { g, ex, bs } = deposit(1, 3);
    ex.off = true;
    const held = bs[0].fuel + bs[0].coke;
    expect(bs[0].coke).toBe(held);
    let t = 0;
    while (bs[0].output > 0 && t < 600) {
      g.step();
      t += 1 / 60;
    }
    // what it held, 25 s each, plus what was burning
    expect(t).toBeGreaterThan(held * 25 - 1);
  });
});
