// Every player action as plain data (CLAUDE.md: saves are seed + deltas). The UI turns input into
// a Command and runs it here; a successful one goes on the run's log with the tick it happened on,
// so a run can be rebuilt from its map, seed, skills and log (app/runsave.ts).
import type { BuildingId } from '../data/buildings';
import type { Game } from './Game';
import type { Building } from './types';
import { endless, nextWave, overcharge, place, pulse, sell, setTier, startResearch, toggleOff, toggleTier, upgrade } from './actions';
import { rebuildNetworks } from './systems/grid';

export type Command =
  | { k: 'place'; id: BuildingId; x: number; y: number }
  | { k: 'sell'; b: number }
  | { k: 'off'; b: number }
  | { k: 'tier'; b: number; t: number }
  | { k: 'shedTier'; t: number }
  | { k: 'up'; b: number }
  | { k: 'oc'; b: number }
  | { k: 'pulse' }
  | { k: 'research'; id: string }
  | { k: 'wave' }
  | { k: 'endless' };

export interface LogEntry {
  /** the tick it happened before */
  t: number;
  c: Command;
}

/** run a command; on success it is logged. Returns the reason it was refused, or null (or the
 *  new Building for a place). Networks are rebuilt at once, so the next tick sees the same grid
 *  whether the game is played live or replayed. */
export function run(g: Game, c: Command): Building | string | null {
  const r = exec(g, c);
  if (typeof r !== 'string') {
    g.log.push({ t: g.tick, c });
    if (g.netDirty) rebuildNetworks(g);
  }
  return r;
}

function exec(g: Game, c: Command): Building | string | null {
  const b = 'b' in c ? g.buildings.get(c.b) : undefined;
  if ('b' in c && !b) return 'It is gone';
  switch (c.k) {
    case 'place': return place(g, c.id, c.x, c.y);
    case 'sell': return sell(g, b!);
    case 'off': return toggleOff(g, b!);
    case 'tier': return setTier(g, b!, c.t);
    case 'shedTier':
      toggleTier(g, c.t);
      return null;
    case 'up': return upgrade(g, b!);
    case 'oc': return overcharge(g, b!);
    case 'pulse': return pulse(g);
    case 'research': return startResearch(g, c.id);
    case 'wave': return nextWave(g);
    case 'endless': return endless(g);
  }
}

/** rebuild a run: play its log back tick by tick up to `tick` (events are drained and dropped) */
export function replay(g: Game, log: LogEntry[], tick: number): string | null {
  let i = 0;
  while (g.tick <= tick) {
    while (i < log.length && log[i].t === g.tick) {
      const r = run(g, log[i].c);
      if (typeof r === 'string') return `step ${i} (${log[i].c.k}) at tick ${g.tick}: ${r}`;
      i++;
    }
    if (g.tick === tick || g.over) break;
    g.step();
    g.drainEvents();
  }
  return i < log.length ? `${log.length - i} commands were never reached` : null;
}
