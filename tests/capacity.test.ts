// Transmission with capacity (DESIGN.md §3.3; the fourth review's C1, re-set by the fifth): a Node
// carries at most 60 kW either way; the branch past a full Node gets what fits and the rest of the
// network does not pay for it; a second route, a Jar past the Node, Burners on the far side or a
// Busbar (120 kW, but only 2.5 tiles of reach) are the answers.
import { describe, expect, it } from 'vitest';
import { Game, put, settle } from './helpers';
import { run } from '../src/sim/commands';
import type { Building } from '../src/sim/types';
import { linkRoom, strandedBy } from '../src/sim/lines';
import { BUILDINGS } from '../src/data/buildings';

const CAP = BUILDINGS.node.carryKw!;

/** six fuelled Burners beside the Hearth: 120 kW + the Hearth's 8 */
function strongHearth(g: Game) {
  for (const [x, y] of [[19, 18], [21, 18], [14, 13], [14, 16], [23, 18], [16, 15]]) put(g, 'burner', x, y).fuel = 5;
}

/** spots for Labs (10 kW each while a project runs) past N2 (28,10) and out of N1's reach: ten of them */
const FAR = [[30, 5], [30, 7], [30, 9], [30, 11], [30, 13], [32, 7], [32, 9], [32, 11], [28, 6], [28, 13]];

/** `n` Labs past a chain Hearth → N1 (24,10) → N2 (28,10) */
function farLabs(g: Game, n: number): { n1: Building; n2: Building; labs: Building[] } {
  const n1 = put(g, 'node', 24, 10);
  const n2 = put(g, 'node', 28, 10);
  const labs = FAR.slice(0, n).map(([x, y]) => put(g, 'lab', x, y));
  g.research.active = 'vane';
  return { n1, n2, labs };
}

const served = (labs: Building[]) => labs.reduce((a, l) => a + l.demand * l.sat, 0);

describe('Node capacity (§3.3)', () => {
  it('the limit is 60 kW, the output of three Burners', () => {
    expect(CAP).toBe(60);
  });

  it('a branch asking 70 kW past one Node gets 60; a Lamp on the Hearth stays at full power', () => {
    const g = new Game();
    strongHearth(g);
    const { n1, labs } = farLabs(g, 7);
    const lamp = put(g, 'lamp', 22, 10);
    settle(g, 0.2);
    for (const l of labs) expect(l.sat).toBeCloseTo(60 / 70, 3);
    expect(lamp.sat).toBe(1);
    expect(n1.carry).toBeCloseTo(60, 3);
    expect(n1.full).toBe(true);
    // the power that couldn't get through is spare at the Hearth, not lost to the far side
    expect(g.networks[0].wasted).toBeGreaterThan(30);
  });

  it('under the limit nothing changes: every consumer gets its share and the Node is not full', () => {
    const g = new Game();
    strongHearth(g);
    const { n1, labs } = farLabs(g, 5);
    settle(g, 0.2);
    for (const l of labs) expect(l.sat).toBe(1);
    expect(n1.carry).toBeCloseTo(50, 3);
    expect(n1.full).toBe(false);
  });

  it('a second route splits the branch: Labs nearer a Node of their own draw through it', () => {
    const g = new Game();
    strongHearth(g);
    const { labs } = farLabs(g, 7);
    // Hearth → N3 (25,16) → N4 (29,14): the lower Labs are nearer N4 and draw through it
    put(g, 'node', 25, 16);
    put(g, 'node', 29, 14);
    settle(g, 0.2);
    for (const l of labs) expect(l.sat).toBe(1);
  });

  it('a Jar past the Node carries the branch over the limit', () => {
    const g = new Game();
    strongHearth(g);
    const { labs } = farLabs(g, 7);
    const jar = put(g, 'jar', 29, 9);
    jar.charge = 600;
    settle(g, 0.2);
    for (const l of labs) expect(l.sat).toBeCloseTo(1, 3);
    expect(jar.flow).toBeCloseTo(-10, 1);
  });

  it('Burners past a Node send at most 60 kW home; the rest of their power is wasted there', () => {
    const g = new Game();
    put(g, 'node', 24, 10);
    put(g, 'node', 28, 10);
    for (const [x, y] of [[30, 5], [30, 7], [30, 9], [30, 11]]) put(g, 'burner', x, y).fuel = 5;
    const labs = [[14, 13], [14, 16], [19, 18], [21, 18], [19, 10], [23, 18], [24, 16]].map(([x, y]) => put(g, 'lab', x, y));
    g.research.active = 'vane';
    settle(g, 0.2);
    // 8 at the Hearth + 60 through the Nodes for 70 asked
    for (const l of labs) expect(l.sat).toBeCloseTo(68 / 70, 3);
    expect(g.networks[0].wasted).toBeCloseTo(20, 1);
  });

  it('a Busbar carries 120 kW over 2.5 tiles: a chain of them takes 70 past where one Node takes 60', () => {
    const g = new Game();
    strongHearth(g);
    g.research.done.add('longline');
    g.money = 1000;
    // Busbars 2.5 apart across the road, seven Labs (70 kW) round the last
    const bus = [put(g, 'node', 24, 10), put(g, 'node', 27, 10), put(g, 'node', 30, 10)];
    for (const n of bus) expect(run(g, { k: 'up', b: n.id, branch: 1 })).toBeNull();
    const labs = [[32, 9], [32, 11], [30, 12], [30, 7], [28, 12], [32, 7], [28, 7]].map(([x, y]) => put(g, 'lab', x, y));
    g.research.active = 'vane';
    settle(g, 0.2);
    for (const l of labs) expect(l.sat).toBeCloseTo(1, 6);
    expect(Math.abs(bus[0].carry)).toBeCloseTo(70, 3);
    const t = g.networks[bus[0].net].tree!;
    expect(t.cap[t.ids.indexOf(bus[0].id)]).toBe(120);
    expect(g.spec(bus[0]).nodeRadius).toBe(2.5);
  });

  it('a shorter reach strands what only that Node reached, and the panel can say so (§3.3)', () => {
    const g = new Game();
    const n1 = put(g, 'node', 24, 10);
    const lab = put(g, 'lab', 27, 7); // 2.9 tiles from the Node, far from the Hearth
    settle(g, 0.1);
    expect(lab.net).toBeGreaterThanOrEqual(0);
    expect(strandedBy(g, n1, 4)).toEqual([]);
    expect(strandedBy(g, n1, 2.5).map((b) => b.id)).toContain(lab.id);
    // a second Node beside the Lab carries it: nothing stranded
    put(g, 'node', 27, 10);
    settle(g, 0.1);
    expect(strandedBy(g, n1, 2.5).map((b) => b.id)).not.toContain(lab.id);
  });

  it('past a full Node a Flywheel carries a peak a Jar cannot: 40 kW short, a Jar gives 30 and a Flywheel all 40 (§3.2)', () => {
    const peak = (fly: boolean) => {
      const g = new Game();
      strongHearth(g);
      // ten Labs past two Nodes: 100 kW asked through a 60 kW link
      farLabs(g, 10);
      const jar = put(g, 'jar', 29, 9);
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
      return { sat: served(labs) / labs.reduce((a, l) => a + l.demand, 0), out: -jar.flow };
    };
    expect(peak(false).sat).toBeCloseTo(90 / 100, 2);
    expect(peak(false).out).toBeCloseTo(30, 2);
    expect(peak(true).sat).toBeCloseTo(1, 2);
    expect(peak(true).out).toBeCloseTo(40, 2);
  });

  it("linkRoom: what more the links on a building's way can carry (the Overcharge tip reads it)", () => {
    const g = new Game();
    strongHearth(g);
    const { labs } = farLabs(g, 7);
    const near = put(g, 'lamp', 22, 10);
    settle(g, 0.2);
    expect(linkRoom(g, labs[0])).toBeCloseTo(0, 3);
    expect(linkRoom(g, near)).toBe(Infinity);
    for (const l of labs.slice(4)) run(g, { k: 'off', b: l.id });
    settle(g, 0.2);
    // four Labs on, 40 kW through a 60 kW link
    expect(linkRoom(g, labs[0])).toBeCloseTo(20, 3);
  });

  it('a Shade that cuts one route sends the branch through the other', () => {
    const g = new Game();
    strongHearth(g);
    const { n1, labs } = farLabs(g, 7);
    const n3 = put(g, 'node', 25, 16);
    put(g, 'node', 29, 14);
    settle(g, 0.2);
    for (const l of labs) expect(l.sat).toBe(1);
    n1.offline = 6;
    g.netDirty = true;
    settle(g, 0.2);
    // N2 now hangs off N4 and N3: all seven Labs through N3's 60 kW
    expect(n3.full).toBe(true);
    expect(served(labs)).toBeCloseTo(60, 1);
  });
});
