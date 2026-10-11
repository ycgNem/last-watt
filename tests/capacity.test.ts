// Transmission with capacity (DESIGN.md §3.3; the fourth review's C1): a Node carries at most
// 40 kW either way; the branch past a full Node gets what fits and the rest of the network does
// not pay for it; a second route, a Jar past the Node or a Burner on the far side are the answers.
import { describe, expect, it } from 'vitest';
import { Game, put, settle } from './helpers';
import { run } from '../src/sim/commands';
import type { Building } from '../src/sim/types';

/** four fuelled Burners beside the Hearth: 80 kW + the Hearth's 8 */
function strongHearth(g: Game) {
  for (const [x, y] of [[19, 18], [21, 18], [14, 13], [14, 16]]) put(g, 'burner', x, y).fuel = 5;
}

/** five Labs (10 kW each while a project runs) past a chain Hearth → N1 (24,10) → N2 (28,10) */
function farLabs(g: Game): { n1: Building; n2: Building; labs: Building[] } {
  const n1 = put(g, 'node', 24, 10);
  const n2 = put(g, 'node', 28, 10);
  const labs = [[30, 7], [30, 9], [30, 11], [30, 13], [32, 9]].map(([x, y]) => put(g, 'lab', x, y));
  g.research.active = 'vane';
  return { n1, n2, labs };
}

describe('Node capacity (§3.3)', () => {
  it('a branch asking 50 kW past one Node gets 40; a Lamp on the Hearth stays at full power', () => {
    const g = new Game();
    strongHearth(g);
    const { n1, labs } = farLabs(g);
    const lamp = put(g, 'lamp', 22, 10);
    settle(g, 0.2);
    for (const l of labs) expect(l.sat).toBeCloseTo(0.8, 3);
    expect(lamp.sat).toBe(1);
    expect(n1.carry).toBeCloseTo(40, 3);
    expect(n1.full).toBe(true);
    // the power that couldn't get through is spare at the Hearth, not lost to the far side
    expect(g.networks[0].wasted).toBeGreaterThan(30);
  });

  it('under the limit nothing changes: every consumer on a tier gets the same share', () => {
    const g = new Game();
    strongHearth(g);
    const { n1 } = farLabs(g);
    put(g, 'lab', 19, 10).off = false;
    g.research.active = 'vane';
    // 88 kW made, 60 asked: everyone full, 40 kW is not reached? 50 past N1 is: shed one far Lab
    run(g, { k: 'off', b: [...g.buildings.values()].find((b) => b.def.id === 'lab' && b.x === 32)!.id });
    settle(g, 0.2);
    expect(n1.carry).toBeCloseTo(40, 3);
    expect(n1.full).toBe(true);
    for (const b of g.buildings.values()) if (b.def.id === 'lab' && !b.off) expect(b.sat).toBe(1);
  });

  it('a second route splits the branch: Labs nearer a Node of their own draw through it', () => {
    const g = new Game();
    strongHearth(g);
    const { labs } = farLabs(g);
    // Hearth → N3 (25,16) → N4 (29,14): the lowest Lab is nearer N4 and draws through it
    put(g, 'node', 25, 16);
    put(g, 'node', 29, 14);
    settle(g, 0.2);
    for (const l of labs) expect(l.sat).toBe(1);
  });

  it('a Jar past the Node carries the branch over the limit', () => {
    const g = new Game();
    strongHearth(g);
    const { labs } = farLabs(g);
    const jar = put(g, 'jar', 32, 12);
    jar.charge = 600;
    settle(g, 0.2);
    for (const l of labs) expect(l.sat).toBeCloseTo(1, 3);
    expect(jar.flow).toBeCloseTo(-10, 1);
  });

  it('Burners past a Node send at most 40 kW home; the rest of their power is wasted there', () => {
    const g = new Game();
    put(g, 'node', 24, 10);
    put(g, 'node', 28, 10);
    for (const [x, y] of [[30, 7], [30, 9], [30, 11]]) put(g, 'burner', x, y).fuel = 5;
    const labs = [[14, 13], [14, 16], [19, 18], [21, 18], [19, 10]].map(([x, y]) => put(g, 'lab', x, y));
    g.research.active = 'vane';
    settle(g, 0.2);
    // 8 at the Hearth + 40 through the Nodes for 50 asked
    for (const l of labs) expect(l.sat).toBeCloseTo(48 / 50, 3);
    expect(g.networks[0].wasted).toBeCloseTo(20, 1);
  });

  it('a Heavy line carries 80 kW', () => {
    const g = new Game();
    strongHearth(g);
    const { n1, n2, labs } = farLabs(g);
    g.research.done.add('longline');
    g.money = 1000;
    expect(run(g, { k: 'up', b: n1.id, branch: 1 })).toBeNull();
    expect(run(g, { k: 'up', b: n2.id, branch: 1 })).toBeNull();
    settle(g, 0.2);
    for (const l of labs) expect(l.sat).toBe(1);
    expect(n1.carry).toBeCloseTo(50, 3);
    expect(n1.full).toBe(false);
  });

  it('past a full Node a Flywheel carries a peak a Jar cannot: 90 kW out against 30 (§3.2, the fourth review M5)', () => {
    const peak = (fly: boolean) => {
      const g = new Game();
      strongHearth(g);
      farLabs(g);
      // eight Labs past two Nodes: 80 kW asked through a 40 kW link
      for (const [x, y] of [[32, 7], [32, 11], [30, 5]]) put(g, 'lab', x, y);
      const jar = put(g, 'jar', 29, 14);
      if (fly) {
        g.research.done.add('flywheel');
        g.money = 1000;
        expect(run(g, { k: 'up', b: jar.id, branch: 1 })).toBeNull();
      }
      jar.charge = g.spec(jar).capacity!;
      settle(g, 0.1);
      const before = jar.charge;
      g.step();
      const labs = [...g.buildings.values()].filter((b) => b.def.id === 'lab');
      // what it gave came out of its charge (a branch that covers itself was once fed for free);
      // a Flywheel also spins down 2% a second
      expect(before - jar.charge).toBeCloseTo((-jar.flow + (g.spec(jar).spinDown ?? 0) * before) / 60, 2);
      return { sat: labs.reduce((a, l) => a + l.demand * l.sat, 0) / labs.reduce((a, l) => a + l.demand, 0), out: -jar.flow };
    };
    // a Jar: 40 through the link + 30 = 70 of 80
    expect(peak(false).sat).toBeCloseTo(70 / 80, 2);
    expect(peak(false).out).toBeCloseTo(30, 2);
    // a Flywheel: 40 + 40 = all of it
    expect(peak(true).sat).toBeCloseTo(1, 2);
    expect(peak(true).out).toBeCloseTo(40, 2);
  });

  it('a Shade that cuts one route sends the branch through the other', () => {
    const g = new Game();
    strongHearth(g);
    const { n1, labs } = farLabs(g);
    const n3 = put(g, 'node', 25, 16);
    put(g, 'node', 29, 14);
    settle(g, 0.2);
    for (const l of labs) expect(l.sat).toBe(1);
    n1.offline = 6;
    g.netDirty = true;
    settle(g, 0.2);
    // N2 now hangs off N4 and N3: all five Labs through N3's 40 kW
    expect(n3.full).toBe(true);
    const sum = labs.reduce((a, l) => a + l.demand * l.sat, 0);
    expect(sum).toBeCloseTo(40, 1);
  });
});
