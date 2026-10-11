// Upgrade branches (ROADMAP Milestone 4) and the Flywheel (Milestone 3, DESIGN.md §3.2): a Jar's
// tier 2 is a Bank (deep, slow) or a Flywheel (small, fast, spins down), chosen once.
import { describe, expect, it } from 'vitest';
import { Game, park, put, settle } from './helpers';
import { upgrade, upgradeProblem } from '../src/sim/actions';

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
