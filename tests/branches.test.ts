// Upgrade branches (ROADMAP Milestone 4) and the Flywheel (Milestone 3, DESIGN.md §3.2): a Jar's
// tier 2 is a Bank (deep, slow) or a Flywheel (small, fast, spins down), chosen once.
import { describe, expect, it } from 'vitest';
import { Game, park, put, settle } from './helpers';
import { upgrade, upgradeProblem } from '../src/sim/actions';
import { coneCatchers } from '../src/sim/systems/towers';

function fourLamps(g: Game) {
  put(g, 'node', 23, 10);
  for (const [x, y] of [[24, 7], [24, 13], [22, 7], [22, 16]]) put(g, 'lamp', x, y);
  park(g, 'moth', 28.5); park(g, 'moth', 35); park(g, 'moth', 22); park(g, 'moth', 40);
}

describe('upgrade branches', () => {
  it('a Jar becomes a Flywheel: 300 kJ, 60 kW in, 90 kW out, and keeps only what fits', () => {
    const g = new Game();
    g.money = 1000;
    g.research.done.add('flywheel');
    const j = put(g, 'jar', 22, 18);
    j.charge = 600;
    expect(upgradeProblem(g, j, 0)).toContain('Research Bank');
    expect(upgrade(g, j, 1)).toBeNull();
    expect(j.branch).toBe(1);
    expect(g.spec(j).capacity).toBe(300);
    expect(g.spec(j).maxDischarge).toBe(90);
    expect(j.charge).toBe(300);
    expect(upgradeProblem(g, j)).toBe('Fully upgraded');
  });

  it('a Bank cannot then become a Flywheel', () => {
    const g = new Game();
    g.money = 1000;
    g.research.done.add('bank');
    g.research.done.add('flywheel');
    const j = put(g, 'jar', 22, 18);
    expect(upgrade(g, j)).toBeNull();
    expect(j.branch).toBe(0);
    expect(g.spec(j).capacity).toBe(1500);
    expect(upgradeProblem(g, j, 1)).toBeTruthy();
  });

  it('a Flywheel carries the four-Lamp mistake a Jar cannot: 40 kW short is inside its 90 kW', () => {
    const jar = new Game();
    fourLamps(jar);
    put(jar, 'jar', 22, 18).charge = 600;
    settle(jar, 0.2);
    expect(jar.grid.wall.sat).toBeCloseTo((8 + 30) / 48, 2);

    const fly = new Game();
    fly.research.done.add('flywheel');
    fourLamps(fly);
    const f = put(fly, 'jar', 22, 18);
    upgrade(fly, f, 1);
    f.charge = 300;
    settle(fly, 0.2);
    expect(fly.grid.wall.sat).toBe(1);
  });

  it('a Flywheel spins down 2% a second, and the loss shows as wasted power', () => {
    const g = new Game();
    g.research.done.add('flywheel');
    const f = put(g, 'jar', 22, 18);
    upgrade(g, f, 1);
    f.off = true; // shed: it neither charges nor gives, but it still spins down
    f.charge = 300;
    const wasted = g.stats.wastedKj;
    settle(g, 1);
    expect(f.charge).toBeCloseTo(300 * Math.exp(-0.02), 0);
    expect(g.stats.wastedKj - wasted).toBeGreaterThan(5.5);
  });
});

describe('tier 3 (§4.2)', () => {
  it('a Lamp at tier 3 is an Arc or a Lantern', () => {
    const g = new Game();
    g.money = 1000;
    for (const r of ['lamp2', 'lamp3']) g.research.done.add(r);
    const a = put(g, 'lamp', 24, 7), l = put(g, 'lamp', 24, 13);
    upgrade(g, a); upgrade(g, a);
    upgrade(g, l); upgrade(g, l, 1);
    expect([g.spec(a).firingDraw, g.spec(a).efficiency, g.spec(a).range]).toEqual([27, 0.72, 3.5]);
    expect([g.spec(l).firingDraw, g.spec(l).efficiency, g.spec(l).range]).toEqual([20, 0.6, 5]);
    expect(upgradeProblem(g, l)).toBe('Fully upgraded');
  });

  it('beside a straight, a Wide Floodlight lights a body a Blaze misses', () => {
    const lit = (wide: boolean) => {
      const g = new Game();
      g.money = 1000;
      for (const r of ['flood2', 'flood3']) g.research.done.add(r);
      const f = put(g, 'floodlight', 10, 7);
      upgrade(g, f); upgrade(g, f, wide ? 1 : 0);
      const target = park(g, 'moth', 12); // (11, 6.5): straight across
      park(g, 'moth', 11.2); // 28° off
      park(g, 'moth', 10.5); // 45° off
      return coneCatchers(g, f, target).length;
    };
    expect(lit(false)).toBe(2);
    expect(lit(true)).toBe(3);
  });
});

describe('tier 3 for the other towers (§4.2)', () => {
  const tier3 = (id: 'beacon' | 'searchlight' | 'brazier' | 'starshell', r2: string, r3: string, branch: number) => {
    const g = new Game();
    g.money = 1000;
    for (const r of [id === 'beacon' ? '' : id, r2, r3]) if (r) g.research.done.add(r);
    const b = put(g, id, 22, 13);
    expect(upgrade(g, b)).toBeNull();
    expect(upgrade(g, b, branch)).toBeNull();
    return { g, b, s: g.spec(b) };
  };

  it('Beacon: Drag slows 73% at 9 kW; Halo reaches 6 at 8 kW', () => {
    expect(tier3('beacon', 'beacon2', 'beacon3', 0).s).toMatchObject({ constantDraw: 9, slow: 0.73, range: 4 });
    expect(tier3('beacon', 'beacon2', 'beacon3', 1).s).toMatchObject({ constantDraw: 8, slow: 0.6, range: 6 });
  });

  it('Searchlight: Lance 68 kW at 0.864; Long Eye reaches 9.5 at 50 kW', () => {
    expect(tier3('searchlight', 'search2', 'search3', 0).s).toMatchObject({ firingDraw: 68, efficiency: 0.864, range: 7 });
    expect(tier3('searchlight', 'search2', 'search3', 1).s).toMatchObject({ firingDraw: 50, efficiency: 0.72, range: 9.5 });
  });

  it('Brazier: Inferno 18 kW a body at 0.936; Bonfire reaches 3.5 at 13 kW a body', () => {
    expect(tier3('brazier', 'brazier2', 'brazier3', 0).s).toMatchObject({ perEnemyDraw: 18, efficiency: 0.936, range: 2.5 });
    expect(tier3('brazier', 'brazier2', 'brazier3', 1).s).toMatchObject({ perEnemyDraw: 13, efficiency: 0.78, range: 3.5 });
  });

  it('Starshell: Nova charges 105 kJ shells at 22.5 kW; Barrage banks six shells at 15 kW', () => {
    expect(tier3('starshell', 'star2', 'star3', 0).s).toMatchObject({ chargeDraw: 22.5, shellSize: 105, magazine: 3, efficiency: 0.96 });
    const { g, b, s } = tier3('starshell', 'star2', 'star3', 1);
    expect(s).toMatchObject({ chargeDraw: 15, shellSize: 70, magazine: 6, reload: 0.4 });
    // on the Hearth's 8 kW with nothing to shoot, it fills all six (420 kJ) in under a minute
    settle(g, 60);
    expect(b.shell).toBeCloseTo(420, 0);
  });
});
