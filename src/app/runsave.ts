// The run in progress, saved as its map, seed, skills and command log (CLAUDE.md: seed + deltas;
// ROADMAP Milestone 7: save mid-run). Loading replays the log (sim/commands.ts). A save made by a
// different version of the game's data can't be replayed faithfully, so it carries a hash of the
// data and is dropped when that changes. Every read and write survives blocked localStorage.
import { BUILDINGS } from '../data/buildings';
import { ENEMIES } from '../data/enemies';
import { MAPS } from '../data/map';
import { RESEARCH } from '../data/research';
import { RULES } from '../data/rules';
import { SKILLS, SKILL_RULES } from '../data/skills';
import { WAVES } from '../data/waves';
import type { LogEntry } from '../sim/commands';

export const RUN_VERSION = 1;
const KEY = 'lastwatt.run';

export interface RunSave {
  v: number;
  /** hash of the game's data when it was saved */
  hash: string;
  map: string;
  seed: number;
  skills: string[];
  /** ticks played */
  tick: number;
  /** for the CONTINUE button */
  wave: number;
  lights: number;
  log: LogEntry[];
}

let cached = '';
/** FNV-1a over the data every rule reads (the numbers, the waves, the maps) */
export function dataHash(): string {
  if (cached) return cached;
  const s = JSON.stringify([BUILDINGS, ENEMIES, MAPS, RESEARCH, RULES, SKILLS, SKILL_RULES, WAVES]);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  cached = h.toString(16);
  return cached;
}

export function saveRun(r: Omit<RunSave, 'v' | 'hash'>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ v: RUN_VERSION, hash: dataHash(), ...r }));
  } catch {
    // blocked storage: the run just isn't saved
  }
}

/** the saved run, or why there isn't a usable one */
export function loadRun(): { run: RunSave | null; problem: string | null } {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { run: null, problem: null };
    const r = JSON.parse(raw) as RunSave;
    if (r.v !== RUN_VERSION || r.hash !== dataHash() || !Array.isArray(r.log)) {
      clearRun();
      return { run: null, problem: 'The game has changed since your last run was saved, so it could not be continued.' };
    }
    return { run: r, problem: null };
  } catch {
    return { run: null, problem: null };
  }
}

export function clearRun() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
