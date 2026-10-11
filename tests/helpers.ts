// Shared test helpers: build layouts, park enemies, run waves headlessly.
import { Game } from '../src/sim/Game';
import { place } from '../src/sim/actions';
import type { BuildingId } from '../src/data/buildings';
import { ENEMIES, type EnemyId } from '../src/data/enemies';
import { startNextWave } from '../src/sim/systems/waves';
import type { Building, Enemy } from '../src/sim/types';

export function put(g: Game, id: BuildingId, x: number, y: number): Building {
  const b = place(g, id, x, y, true);
  if (typeof b === 'string') throw new Error(`${id} at ${x},${y}: ${b}`);
  return b;
}

/** an enemy that never moves (speed 0) parked at a distance along the path */
export function park(g: Game, kind: EnemyId, dist: number, hp = 1e9): Enemy {
  const def = { ...ENEMIES[kind], speed: 0, health: hp, knockRadius: undefined };
  const p = g.path.at(dist);
  const e: Enemy = { id: g.nextId++, def, hp, dist, x: p.x, y: p.y, slow: 0, face: 1, hit: 0, wave: 0, seen: false };
  g.enemies.push(e);
  return e;
}

/** a Burner fed by an Extractor on the south-west deposit, pre-stocked so it is lit at once */
export function factory(g: Game, which = 0): { burner: Building; extractor: Building } {
  const spots = [
    { ex: [16, 19], bu: [16, 20] },
    { ex: [15, 19], bu: [13, 18] },
    { ex: [16, 10], bu: [17, 10] },
  ][which];
  const extractor = put(g, 'extractor', spots.ex[0], spots.ex[1]);
  const burner = put(g, 'burner', spots.bu[0], spots.bu[1]);
  burner.fuel = 5;
  return { burner, extractor };
}

/** start the next wave and run until all of it has spawned and left the map (or died) */
export function playWave(g: Game, maxSeconds = 120): number {
  const before = g.stats.leaks;
  startNextWave(g);
  const n = g.wave;
  for (let t = 0; t < maxSeconds * 60 && !g.over; t++) {
    g.step();
    g.drainEvents();
    if (!g.spawners.some((s) => s.wave === n) && !g.enemies.some((e) => e.wave === n)) break;
  }
  return g.stats.leaks - before;
}

export function settle(g: Game, seconds: number) {
  for (let t = 0; t < seconds * 60; t++) {
    g.step();
    g.drainEvents();
  }
}

export { Game };
