// The game state and the fixed-order tick. Pure: runs headless in tests.
import { BUILDINGS, specOf, type BuildingDef } from '../data/buildings';
import { SLICE_MAP, type MapDef } from '../data/map';
import { RULES } from '../data/rules';
import { RESEARCH } from '../data/research';
import { SKILL_RULES } from '../data/skills';
import type { EnemyId } from '../data/enemies';
import { Path, type Rect } from './geom';
import type { Building, Enemy, GameEvent, GridStats, Network, RunStats, Shot } from './types';
import type { LogEntry } from './commands';
import { wavesSystem } from './systems/waves';
import { enemiesSystem } from './systems/enemies';
import { targetingSystem } from './systems/targeting';
import { gridSystem } from './systems/grid';
import { towersSystem } from './systems/towers';
import { abilitiesSystem } from './systems/abilities';
import { researchSystem } from './systems/research';
import { economySystem } from './systems/economy';
import { statsSystem } from './systems/stats';

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

export interface Spawner { wave: number; seq: string; i: number; next: number; spacing: number; /** the road each kind's next spawn takes, so every road sees its share of every kind */ routes: Record<string, number> }

export function emptyTiers() {
  return [0, 1, 2, 3].map(() => ({ demand: 0, served: 0, sat: 1 }));
}

export class Game {
  map: MapDef;
  /** one Path per road; enemies carry the index of theirs (`route`) */
  paths: Path[];
  /** the cells any road runs over, as y * w + x */
  pathCells = new Set<number>();
  /** weather seed: the wind's phase (fixed by default so tests are repeatable) */
  seed: number;
  tick = 0;
  money: number;
  lights: number;
  buildings = new Map<number, Building>();
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  nextId = 1;
  /** map cell -> deposit index + 1 (0 = none) */
  deposit: Uint8Array;
  /** map cell -> building id (0 = empty) */
  occupied: Int32Array;
  networks: Network[] = [];
  netDirty = true;
  /** bumped every time the networks are rebuilt (the renderer caches wires on it) */
  netVersion = 0;
  grid: GridStats = { gen: 0, demand: 0, supply: 0, wasted: 0, stored: 0, capacity: 0, tiers: emptyTiers(), wall: { demand: 0, served: 0, sat: 1 }, peak: 0 };
  /** per line (keyed by its first conductor's id), this wave so far: the most it asked and the
   *  wall's lowest share, for the Lines view (§3.2, the fourth review) */
  lineMemo = new Map<number, { wave: number; peak: number; low: number }>();
  /** Dark Bait (§8): the branch whose towers are put out (-1: none), and the towers it put out */
  bait = -1;
  baitIds: number[] = [];
  /** whole tiers shed from the HUD (index 1..3) */
  tierOff = [false, false, false, false];
  /** waves started so far (0 = before wave 1) */
  wave = 0;
  /** past the last wave, waves keep coming (chosen on the win screen) */
  endless = false;
  /** seconds of breather left before the next wave starts on its own (0 while a wave is on the field) */
  waveTimer = 0;
  spawners: Spawner[] = [];
  /** waves that have started, and those whose pay has been paid */
  waveStarted = new Set<number>();
  wavePaid = new Set<number>();
  /** enemy kinds seen this run (for the intel card the first time) */
  seenKinds = new Set<EnemyId>();
  /** every player command so far, with the tick it came before (sim/commands.ts; saves replay it) */
  log: LogEntry[] = [];
  /** research (§7): the project the Labs work on, progress per project, what is done, and the
   *  projects queued to start, in order, as each one finishes (Milestone 5) */
  research = { active: null as string | null, progress: {} as Record<string, number>, done: new Set<string>(), queue: [] as string[] };
  /** towers' tier-1 satisfaction has fallen below the starved line */
  brownout = false;
  brownoutClock = 0;
  events: GameEvent[] = [];
  stats: RunStats = {
    kills: 0, leaks: 0, leaksByWave: [], lightsByWave: [], leakLog: [], lightsLostBy: {}, moneyEarned: 0, wavePay: 0, kjDelivered: 0,
    wastedKj: 0, brownoutSeconds: 0, overcharges: 0, pulses: 0, knocks: 0, snuffs: 0, stolenKj: 0, researched: 0, firstBrownout: -1, firstKnock: -1, firstOvercharge: -1,
  };
  over: null | 'win' | 'lose' = null;
  hearthId = 0;

  /** the gaffer's skills this run (§9), fixed at the start */
  skills: Set<string>;
  /** Banked Spark: the first Jar of the run has been filled */
  sparked = false;

  constructor(opts: { map?: MapDef; seed?: number; skills?: string[] } = {}) {
    this.map = opts.map ?? SLICE_MAP;
    this.seed = opts.seed ?? 1;
    this.skills = new Set(opts.skills ?? []);
    this.paths = this.map.paths.map((p) => new Path(this.map, p));
    for (const p of this.paths) for (const c of p.cells) this.pathCells.add(c);
    this.money = RULES.startMoney.v;
    this.lights = RULES.startLights.v;
    const n = this.map.w * this.map.h;
    this.deposit = new Uint8Array(n);
    this.occupied = new Int32Array(n);
    this.map.deposits.forEach((tiles, k) => {
      for (const [x, y] of tiles) this.deposit[y * this.map.w + x] = k + 1;
    });
    const hearth = this.addBuilding(BUILDINGS.hearth, this.map.hearth.x, this.map.hearth.y);
    this.hearthId = hearth.id;
    if (this.skills.has('spareJar')) this.addBuilding(BUILDINGS.jar, this.map.jarSpot[0], this.map.jarSpot[1]);
  }

  /** kJ a research project costs this run (Head Start halves the first, §9) */
  researchCost(id: string): number {
    const c = RESEARCH[id]?.cost ?? 0;
    return this.skills.has('headStart') && this.research.done.size === 0 ? c * SKILL_RULES.headStart.v : c;
  }

  /** the first road (most maps have one) */
  get path(): Path {
    return this.paths[0];
  }

  /** tiles an enemy still has to walk to the Hearth (lower = nearer the station) */
  left(e: Enemy): number {
    return this.paths[e.route].length - e.dist;
  }

  get hearth(): Building {
    return this.buildings.get(this.hearthId)!;
  }

  /** advance one fixed tick, systems in the order CLAUDE.md fixes */
  step() {
    if (this.over) return;
    wavesSystem(this);
    enemiesSystem(this);
    targetingSystem(this);
    gridSystem(this);
    towersSystem(this);
    abilitiesSystem(this);
    researchSystem(this);
    economySystem(this);
    statsSystem(this);
    this.tick++;
  }

  /** run n seconds of sim */
  run(seconds: number) {
    const n = Math.round(seconds * TICK_RATE);
    for (let i = 0; i < n && !this.over; i++) this.step();
  }

  get time() {
    return this.tick / TICK_RATE;
  }

  /** the wind, 0.1..1 of a Vane's rating: three slow swells that never line up the same way (§3.2) */
  wind(t = this.time): number {
    const s = this.seed;
    const v = this.map.windMean + 0.28 * Math.sin((2 * Math.PI * t) / 53 + s) + 0.17 * Math.sin((2 * Math.PI * t) / 19 + s * 2.3) + 0.08 * Math.sin((2 * Math.PI * t) / 7.1 + s * 5.1);
    return Math.max(0.1, Math.min(1, v));
  }

  /** the Hearth's output: 8 kW at full lights, 0.4 kW less for every light lost (§3) */
  hearthOutput(): number {
    const full = this.skills.has('hotHearth') ? SKILL_RULES.hotHearth.v : BUILDINGS.hearth.output ?? 0;
    return (full * this.lights) / RULES.startLights.v;
  }

  emit(e: GameEvent) {
    this.events.push(e);
    if (this.events.length > 600) this.events.splice(0, this.events.length - 600);
  }

  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  addBuilding(def: BuildingDef, x: number, y: number): Building {
    const b: Building = {
      id: this.nextId++, def, x, y, tier: def.tier ?? 1, off: false, level: 1, branch: 0, net: -1, demand: 0, sat: 0, satAvg: 1,
      output: 0, fuel: 0, burnLeft: 0, snuffed: 0, progress: 0, stock: 0, charge: 0, flow: 0, target: -1, dps: 0,
      overcharge: 0, cool: 0, sweep: 0, bodies: 0, shell: 0, offline: 0, fuse: 0, guard: 0, carry: 0, full: false,
    };
    // skills that act on a new building (§9)
    if (def.role === 'generator' && def.fuel === 'rock' && this.skills.has('kindling')) b.fuel = SKILL_RULES.kindling.v;
    if (def.role === 'storage' && this.skills.has('bankedSpark') && !this.sparked) {
      b.charge = def.capacity ?? 0;
      this.sparked = true;
    }
    this.buildings.set(b.id, b);
    for (let yy = y; yy < y + def.size; yy++)
      for (let xx = x; xx < x + def.size; xx++) this.occupied[yy * this.map.w + xx] = b.id;
    this.netDirty = true;
    return b;
  }

  removeBuilding(b: Building) {
    this.buildings.delete(b.id);
    for (let yy = b.y; yy < b.y + b.def.size; yy++)
      for (let xx = b.x; xx < b.x + b.def.size; xx++) this.occupied[yy * this.map.w + xx] = 0;
    this.netDirty = true;
  }

  rect(b: Building): Rect {
    return { x: b.x, y: b.y, w: b.def.size, h: b.def.size };
  }

  centre(b: Building) {
    return { x: b.x + b.def.size / 2, y: b.y + b.def.size / 2 };
  }

  buildingAt(x: number, y: number): Building | undefined {
    if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) return undefined;
    const id = this.occupied[y * this.map.w + x];
    return id ? this.buildings.get(id) : undefined;
  }

  isPath(x: number, y: number) {
    return this.pathCells.has(y * this.map.w + x);
  }

  isDeposit(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.map.w && y < this.map.h && this.deposit[y * this.map.w + x] > 0;
  }

  enemyById(id: number): Enemy | undefined {
    return this.enemies.find((e) => e.id === id);
  }

  /** a building's stats at its tier (upgrades applied) */
  spec(b: Building): BuildingDef {
    return specOf(b.def, b.level, b.branch);
  }

  /** a tower's current firing draw and efficiency (tier upgrades apply) */
  towerStats(b: Building) {
    const s = this.spec(b);
    return { firingDraw: s.firingDraw ?? 0, efficiency: s.efficiency ?? 0 };
  }

  networkOf(b: Building): Network | undefined {
    return b.net >= 0 ? this.networks[b.net] : undefined;
  }
}
