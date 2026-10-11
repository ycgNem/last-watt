// The game state and the fixed-order tick. Pure: runs headless in tests.
import { BUILDINGS, type BuildingDef } from '../data/buildings';
import { SLICE_MAP, type MapDef } from '../data/map';
import { RULES } from '../data/rules';
import { Path, type Rect } from './geom';
import type { Building, Enemy, GameEvent, GridStats, Network, RunStats } from './types';
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

export interface Spawner { wave: number; seq: string; i: number; next: number; spacing: number }

export function emptyTiers() {
  return [0, 1, 2, 3, 4].map(() => ({ demand: 0, served: 0, sat: 1 }));
}

export class Game {
  map: MapDef;
  path: Path;
  tick = 0;
  money: number;
  lights: number;
  buildings = new Map<number, Building>();
  enemies: Enemy[] = [];
  nextId = 1;
  /** map cell -> deposit index + 1 (0 = none) */
  deposit: Uint8Array;
  /** map cell -> building id (0 = empty) */
  occupied: Int32Array;
  networks: Network[] = [];
  netDirty = true;
  /** bumped every time the networks are rebuilt (the renderer caches wires on it) */
  netVersion = 0;
  grid: GridStats = { gen: 0, demand: 0, supply: 0, wasted: 0, stored: 0, capacity: 0, tiers: emptyTiers(), wall: { demand: 0, served: 0, sat: 1 } };
  /** whole tiers shed from the HUD (index 1..4) */
  tierOff = [false, false, false, false, false];
  /** waves started so far (0 = before wave 1) */
  wave = 0;
  /** seconds of breather left before the next wave starts on its own (0 while a wave is on the field) */
  waveTimer = 0;
  spawners: Spawner[] = [];
  research = { active: null as string | null, progress: {} as Record<string, number>, done: new Set<string>() };
  /** towers' tier-1 satisfaction has fallen below the starved line */
  brownout = false;
  brownoutClock = 0;
  events: GameEvent[] = [];
  stats: RunStats = {
    kills: 0, leaks: 0, leaksByWave: [0, 0, 0, 0, 0, 0, 0, 0, 0], lightsLostBy: { moth: 0, shade: 0, pall: 0 }, moneyEarned: 0, kjDelivered: 0,
    wastedKj: 0, brownoutSeconds: 0, overcharges: 0, knocks: 0, firstBrownout: -1, firstKnock: -1, firstOvercharge: -1,
  };
  over: null | 'win' | 'lose' = null;
  hearthId = 0;

  constructor(opts: { map?: MapDef } = {}) {
    this.map = opts.map ?? SLICE_MAP;
    this.path = new Path(this.map);
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
      id: this.nextId++, def, x, y, tier: def.tier ?? 1, off: false, level: 1, net: -1, demand: 0, sat: 0,
      output: 0, fuel: 0, burnLeft: 0, progress: 0, stock: 0, charge: 0, flow: 0, target: -1, dps: 0,
      overcharge: 0, offline: 0,
    };
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
    return this.path.cells.has(y * this.map.w + x);
  }

  isDeposit(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.map.w && y < this.map.h && this.deposit[y * this.map.w + x] > 0;
  }

  enemyById(id: number): Enemy | undefined {
    return this.enemies.find((e) => e.id === id);
  }

  /** a tower's current firing draw and efficiency (tier upgrades apply) */
  towerStats(b: Building) {
    const up = b.level > 1 ? b.def.upgrades?.[b.level - 2] : undefined;
    return {
      firingDraw: up?.firingDraw ?? b.def.firingDraw ?? 0,
      efficiency: up?.efficiency ?? b.def.efficiency ?? 0,
    };
  }

  networkOf(b: Building): Network | undefined {
    return b.net >= 0 ? this.networks[b.net] : undefined;
  }
}
