// The pace tests of DESIGN.md §6: the slice's lessons, asserted on the real slice map.
// Layouts are named by where the Lamps stand (A: inside the bends, S: on straights, B: four
// Lamps and no factory). Positions are top-left tiles on SLICE_MAP.
import { describe, expect, it } from 'vitest';
import { Game, put, playWave, settle } from './helpers';
import { place } from '../src/sim/actions';
import { RULES } from '../src/data/rules';
import { startNextWave } from '../src/sim/systems/waves';

/** the wave-1 factory a player can afford: one Extractor touching one Burner, both on the Hearth */
function wave1Factory(g: Game) {
  put(g, 'extractor', 16, 19);
  put(g, 'burner', 16, 20);
}

export function layoutA(g: Game) {
  wave1Factory(g);
  put(g, 'node', 23, 10);
  put(g, 'lamp', 24, 7); // inside bend A
  put(g, 'lamp', 24, 13); // inside bend B
}

export function layoutS(g: Game) {
  wave1Factory(g);
  put(g, 'node', 16, 12);
  put(g, 'node', 24, 11);
  put(g, 'lamp', 14, 7); // below the first straight
  put(g, 'lamp', 27, 9); // east of the second straight
}

export function layoutB(g: Game) {
  put(g, 'node', 23, 10);
  put(g, 'lamp', 24, 7);
  put(g, 'lamp', 24, 13);
  put(g, 'lamp', 22, 7);
  put(g, 'lamp', 22, 16);
}

function wave1(build: (g: Game) => void) {
  const g = new Game();
  build(g);
  settle(g, 10); // the player builds, the Extractor digs its first rock, then wave 1 is called
  return { g, leaks: playWave(g) };
}

describe('pace tests (§6)', () => {
  it('every layout is affordable from the 120 starting money where §6 says so', () => {
    for (const [build, cost] of [[layoutA, 120], [layoutB, 90]] as const) {
      const g = new Game();
      let spent = 0;
      const real = (id: any, x: number, y: number) => {
        const b = place(g, id, x, y);
        if (typeof b === 'string') throw new Error(b);
        spent += b.def.cost;
      };
      // replay the layout with real money
      const probe = new Game();
      build(probe);
      for (const b of probe.buildings.values()) if (b.def.role !== 'core') real(b.def.id, b.x, b.y);
      expect(spent).toBe(cost);
      expect(g.money).toBe(RULES.startMoney.v - cost);
    }
  });

  it('wave 1: layout A leaks ≤ 2; layout S leaks at least 2 more; layout B leaks ≥ 5', () => {
    const a = wave1(layoutA).leaks;
    const s = wave1(layoutS).leaks;
    const b = wave1(layoutB).leaks;
    console.log(`wave 1 leaks: A ${a}, S ${s}, B ${b}`);
    expect(a).toBeLessThanOrEqual(2);
    expect(s).toBeGreaterThanOrEqual(a + 2);
    expect(b).toBeGreaterThanOrEqual(5);
  });

  it('wave 2: three Lamps on one Burner leak fewer than two Lamps', () => {
    const two = new Game();
    layoutA(two);
    settle(two, 10);
    playWave(two);
    const three = new Game();
    layoutA(three);
    put(three, 'lamp', 22, 16); // the third Lamp, bought with wave 1's bounty
    settle(three, 10);
    playWave(three);
    const l2 = playWave(two), l3 = playWave(three);
    console.log(`wave 2 leaks: two Lamps ${l2}, three Lamps ${l3}`);
    expect(l3).toBeLessThan(l2);
  });

  it('a Jar charges at its 15 kW limit in a breather: two Lamp Overcharges (144 kJ each) in one 20 s gap (§6)', () => {
    // two Burners on the Hearth between waves: 48 kW, towers idle at a few kW, so the Jar
    // charges at 15 kW: 300 kJ in the 20 s breather, full in two
    const g = new Game();
    layoutA(g);
    put(g, 'extractor', 15, 19);
    put(g, 'burner', 13, 18);
    settle(g, 10);
    const jar = put(g, 'jar', 22, 18);
    settle(g, RULES.breather.v);
    expect(jar.charge).toBeGreaterThanOrEqual(2 * RULES.overchargeMult.v * 12 * RULES.overchargeTime.v);
    settle(g, RULES.breather.v);
    expect(jar.charge).toBeCloseTo(600, 0);
  });

  it('wave 3: a far Lamp fed by Nodes inside a Shade\'s reach loses ≥ 10 s of uptime; fed from out of reach, none', () => {
    // the far wall: a Lamp beside the first straight, west of anything the Hearth reaches
    const farWall = (g: Game, back: boolean) => {
      wave1Factory(g);
      put(g, 'node', 17, 10); // 3.5 tiles from the path: safe
      if (back) {
        put(g, 'node', 13, 11); // 4.5 tiles back: safe
        put(g, 'node', 10, 11);
      } else {
        put(g, 'node', 13, 9); // 2.5 tiles: inside a Shade's reach
        put(g, 'node', 10, 9);
      }
      return [put(g, 'lamp', 8, 7)];
    };
    const downtime = (back: boolean) => {
      const g = new Game();
      const lamps = farWall(g, back);
      settle(g, 10);
      g.wave = 2;
      let dark = 0;
      startNextWave(g);
      for (let t = 0; t < 60 * 60 && !g.over; t++) {
        g.step();
        g.drainEvents();
        if (lamps.some((l) => l.net < 0)) dark += 1 / 60;
        if (!g.spawners.length && !g.enemies.length) break;
      }
      return dark;
    };
    const near = downtime(false), back = downtime(true);
    console.log(`wave 3 far-wall downtime: Nodes in reach ${near.toFixed(1)} s, out of reach ${back.toFixed(1)} s`);
    expect(near).toBeGreaterThanOrEqual(10);
    expect(back).toBe(0);
  });
});
