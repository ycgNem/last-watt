// A run is its map, seed, skills and command log (CLAUDE.md: seed + deltas): replaying the log
// on a fresh game must land on exactly the same state, tick for tick.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/Game';
import { replay, run, type Command } from '../src/sim/commands';
import { MAPS } from '../src/data/map';

function fingerprint(g: Game) {
  return {
    tick: g.tick, wave: g.wave, money: g.money, lights: g.lights, kills: g.stats.kills, leaks: g.stats.leaks,
    research: [...g.research.done].sort(), active: g.research.active,
    buildings: [...g.buildings.values()].map((b) => `${b.id}:${b.def.id}@${b.x},${b.y} L${b.level} T${b.tier}${b.off ? ' off' : ''} f${b.fuel} c${Math.round(b.charge)}`),
    enemies: g.enemies.map((e) => `${e.id}:${e.def.id} ${e.dist.toFixed(3)} ${e.hp.toFixed(3)}`),
  };
}

/** a scripted player: commands at set ticks, plus an Overcharge whenever a Shade is in a Lamp's beam */
function play(g: Game, script: [number, Command][], until: number) {
  let i = 0;
  while (g.tick < until && !g.over) {
    while (i < script.length && script[i][0] <= g.tick) run(g, script[i++][1]);
    if (g.tick % 30 === 0)
      for (const b of g.buildings.values()) {
        const t = b.def.id === 'lamp' && b.target >= 0 ? g.enemyById(b.target) : undefined;
        if (t?.def.id === 'shade' && b.overcharge <= 0) run(g, { k: 'oc', b: b.id });
      }
    g.step();
    g.drainEvents();
  }
}

describe('commands and replay', () => {
  it('a building placed while the game stands still shows the grid the next tick will (the fifth review C1)', () => {
    const g = new Game();
    g.money = 1000;
    run(g, { k: 'place', id: 'extractor', x: 16, y: 19 });
    run(g, { k: 'place', id: 'burner', x: 16, y: 20 });
    const lamp = run(g, { k: 'place', id: 'lamp', x: 24, y: 13 }) as any;
    // no tick has run: the Hearth's 8 kW is on the network and the idle Lamp is fully served
    expect(g.networks[lamp.net].gen).toBeGreaterThan(0);
    expect(lamp.sat).toBe(1);
  });

  it('replaying the log rebuilds the same run, to the tick', () => {
    const g = new Game({ map: MAPS[0], seed: 7, skills: ['spareJar', 'kindling'] });
    const script: [number, Command][] = [
      [0, { k: 'place', id: 'extractor', x: 16, y: 19 }],
      [0, { k: 'place', id: 'burner', x: 16, y: 20 }],
      [0, { k: 'place', id: 'node', x: 21, y: 10 }],
      [0, { k: 'place', id: 'lamp', x: 24, y: 7 }],
      [0, { k: 'place', id: 'lamp', x: 24, y: 13 }],
      [1, { k: 'wave' }],
      [1500, { k: 'place', id: 'lamp', x: 22, y: 16 }],
      [1600, { k: 'place', id: 'lab', x: 19, y: 18 }],
      [1601, { k: 'research', id: 'brazier' }],
      [2500, { k: 'tier', b: 6, t: 1 }],
      [2600, { k: 'off', b: 9 }],
      [2700, { k: 'off', b: 9 }],
      [3000, { k: 'shedTier', t: 3 }],
      [3200, { k: 'shedTier', t: 3 }],
      [4000, { k: 'place', id: 'extractor', x: 15, y: 19 }],
      [4001, { k: 'place', id: 'burner', x: 13, y: 18 }],
      [5000, { k: 'sell', b: 7 }],
    ];
    play(g, script, 60 * 160);
    expect(g.log.length).toBeGreaterThan(8);
    const copy = new Game({ map: MAPS[0], seed: 7, skills: ['spareJar', 'kindling'] });
    expect(replay(copy, g.log, g.tick)).toBeNull();
    expect(fingerprint(copy)).toEqual(fingerprint(g));
  });

  it('a refused command is not logged, and a log that no longer fits is reported, not half-played', () => {
    const g = new Game();
    expect(run(g, { k: 'place', id: 'lamp', x: 0, y: 6 })).toMatch(/path/);
    expect(g.log).toEqual([]);
    const bad = new Game();
    expect(replay(bad, [{ t: 0, c: { k: 'place', id: 'lamp', x: 0, y: 6 } }], 10)).toMatch(/path/);
  });
});
