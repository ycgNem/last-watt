// The Fork (DESIGN.md §11) and Dark Bait (§8): enemies choose a branch by the light down each,
// and putting out one branch's towers turns the light-drawn to the other.
import { describe, expect, it } from 'vitest';
import { Game, put, settle } from './helpers';
import { THE_FORK } from '../src/data/map';
import { ENEMIES, type EnemyId } from '../src/data/enemies';
import { branchLight, branchesOf } from '../src/sim/fork';
import { replay, run } from '../src/sim/commands';
import type { Enemy } from '../src/sim/types';

/** an enemy walking at its own speed from `dist` along `route`, too tough to die */
function walker(g: Game, kind: EnemyId, dist: number, route: number): Enemy {
  const def = ENEMIES[kind];
  const p = g.paths[route].at(dist);
  const e: Enemy = { id: g.nextId++, def, hp: 1e9, dist, x: p.x, y: p.y, slow: 0, face: 1, hit: 0, wave: 0, seen: false, route };
  g.enemies.push(e);
  return e;
}

/** two Nodes off the Hearth, one Lamp that lights only the Cut and two that light only the Loop */
function layout(g: Game) {
  put(g, 'node', 17, 18);
  put(g, 'node', 22, 18);
  const cut = put(g, 'lamp', 13, 17);
  const loopA = put(g, 'lamp', 25, 17);
  const loopB = put(g, 'lamp', 22, 16);
  settle(g, 0.2);
  return { cut, loopA, loopB };
}

describe('The Fork (§11)', () => {
  it('the roads share the trunk and the last stretch', () => {
    const g = new Game({ map: THE_FORK });
    const f = THE_FORK.fork!;
    for (let d = 0; d <= f.at; d += 0.5) expect(g.paths[0].at(d)).toEqual(g.paths[1].at(d));
    const tail0 = g.paths[0].length - f.until[0], tail1 = g.paths[1].length - f.until[1];
    expect(tail0).toBeCloseTo(tail1, 6);
    for (let s = 0; s <= tail0; s += 0.5) {
      const a = g.paths[0].at(f.until[0] + s), b = g.paths[1].at(f.until[1] + s);
      expect(a.x).toBeCloseTo(b.x, 6);
      expect(a.y).toBeCloseTo(b.y, 6);
    }
  });

  it('counts lit towers down each branch', () => {
    const g = new Game({ map: THE_FORK });
    const { cut, loopA } = layout(g);
    expect(branchesOf(g, cut)).toBe(2);
    expect(branchesOf(g, loopA)).toBe(1);
    expect(branchLight(g)).toEqual([2, 1]);
  });

  it('Moths take the brighter branch, Veils the darker, Shades keep their road', () => {
    const g = new Game({ map: THE_FORK });
    layout(g);
    const moth = walker(g, 'moth', 8, 1);
    const flit = walker(g, 'flit', 8, 1);
    const veil = walker(g, 'veil', 8, 0);
    const shade = walker(g, 'shade', 8, 1);
    settle(g, 1);
    expect([moth.route, flit.route, veil.route, shade.route]).toEqual([0, 0, 1, 1]);
    expect(moth.forked && veil.forked && shade.forked).toBe(true);
  });

  it('on a tie everything keeps the road the spawner gave it', () => {
    const g = new Game({ map: THE_FORK });
    const { loopB } = layout(g);
    run(g, { k: 'off', b: loopB.id });
    settle(g, 0.2);
    expect(branchLight(g)).toEqual([1, 1]);
    const a = walker(g, 'moth', 8, 0), b = walker(g, 'moth', 8, 1), v = walker(g, 'veil', 8, 1);
    settle(g, 1);
    expect([a.route, b.route, v.route]).toEqual([0, 1, 1]);
  });

  it('Dark Bait (§8) puts out the towers lighting only that branch, and the Moths turn', () => {
    const g = new Game({ map: THE_FORK });
    const { cut, loopA, loopB } = layout(g);
    expect(run(g, { k: 'bait', branch: 0 })).toBeNull();
    expect([cut.off, loopA.off, loopB.off]).toEqual([false, true, true]);
    settle(g, 0.2);
    expect(branchLight(g)).toEqual([0, 1]);
    const moth = walker(g, 'moth', 8, 0);
    settle(g, 1);
    expect(moth.route).toBe(1);
    // the same branch again lights them back
    expect(run(g, { k: 'bait', branch: 0 })).toBeNull();
    expect([loopA.off, loopB.off]).toEqual([false, false]);
    expect(g.bait).toBe(-1);
  });

  it('a tower the player shed stays shed when the bait is lifted', () => {
    const g = new Game({ map: THE_FORK });
    const { loopA, loopB } = layout(g);
    run(g, { k: 'off', b: loopB.id });
    run(g, { k: 'bait', branch: 0 });
    expect(g.baitIds).toEqual([loopA.id]);
    run(g, { k: 'bait', branch: 0 });
    expect([loopA.off, loopB.off]).toEqual([false, true]);
  });

  it('baiting the other branch lights the first again; nothing to put out is refused', () => {
    const g = new Game({ map: THE_FORK });
    const { cut, loopA } = layout(g);
    run(g, { k: 'bait', branch: 0 });
    run(g, { k: 'bait', branch: 1 });
    expect([cut.off, loopA.off]).toEqual([true, false]);
    const h = new Game({ map: THE_FORK });
    expect(run(h, { k: 'bait', branch: 0 })).toMatch(/No tower lights only the LOOP/);
    expect(run(new Game(), { k: 'bait', branch: 0 })).toMatch(/No fork/);
  });

  it('a run with Dark Bait replays to the same roads', () => {
    const play = (g: Game) => {
      run(g, { k: 'place', id: 'node', x: 17, y: 18 });
      run(g, { k: 'place', id: 'node', x: 22, y: 18 });
      run(g, { k: 'place', id: 'lamp', x: 13, y: 17 });
      run(g, { k: 'place', id: 'lamp', x: 25, y: 17 });
      run(g, { k: 'wave' });
      settle(g, 3);
      run(g, { k: 'bait', branch: 0 });
      settle(g, 6);
      run(g, { k: 'bait', branch: 0 });
      settle(g, 10);
    };
    const g = new Game({ map: THE_FORK });
    play(g);
    const h = new Game({ map: THE_FORK });
    expect(replay(h, g.log, g.tick)).toBeNull();
    expect(h.enemies.map((e) => [e.id, e.route, Math.round(e.dist * 100)])).toEqual(g.enemies.map((e) => [e.id, e.route, Math.round(e.dist * 100)]));
  });
});
