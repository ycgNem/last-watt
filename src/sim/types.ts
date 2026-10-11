// Sim state types. Everything here is plain data: no DOM, canvas, audio or timers.
import type { BuildingDef, BuildingId } from '../data/buildings';
import type { EnemyDef } from '../data/enemies';

export interface Building {
  id: number;
  def: BuildingDef;
  /** top-left tile */
  x: number;
  y: number;
  /** priority tier 1–4 (consumers) */
  tier: number;
  /** shed by the player: draws nothing, does nothing (generators stop burning) */
  off: boolean;
  /** tower tier (1 or 2) */
  level: number;
  /** network id this tick, -1 = off every network (dark) */
  net: number;
  /** kW asked of the grid this tick */
  demand: number;
  /** satisfaction this tick (0..1); 0 when dark or shed */
  sat: number;
  /** generator: kW put on the grid this tick */
  output: number;
  /** burner: rocks held, seconds left on the burning rock */
  fuel: number;
  burnLeft: number;
  /** extractor: progress to the next rock (0..1), rocks waiting to hand over */
  progress: number;
  stock: number;
  /** jar: kJ stored, kW moved this tick (+ charge, − discharge) */
  charge: number;
  flow: number;
  /** tower: enemy id targeted this tick, kJ/s delivered this tick, Overcharge seconds left */
  target: number;
  dps: number;
  overcharge: number;
  /** node: seconds left knocked offline */
  offline: number;
}

export interface Enemy {
  id: number;
  def: EnemyDef;
  hp: number;
  /** tiles travelled along the path */
  dist: number;
  x: number;
  y: number;
  /** slow fraction applied this tick (0..1) */
  slow: number;
  /** last horizontal direction (for sprite flipping) */
  face: number;
  /** damage taken this tick (for hit flashes) */
  hit: number;
  /** which wave it came from */
  wave: number;
}

export interface TierStat {
  demand: number;
  served: number;
  sat: number;
}

export interface Network {
  id: number;
  /** building ids of online nodes (incl. the Hearth) on it */
  nodes: number[];
  members: number[];
  gen: number;
  demand: number;
  discharge: number;
  charged: number;
  wasted: number;
  stored: number;
  capacity: number;
  tiers: TierStat[];
  /** the towers and Beacons on this network */
  wall: TierStat;
  hasHearth: boolean;
}

export interface GridStats {
  gen: number;
  demand: number;
  supply: number;
  wasted: number;
  stored: number;
  capacity: number;
  /** index 1..4 */
  tiers: TierStat[];
  /** the towers and Beacons together, whatever tiers they sit on */
  wall: TierStat;
}

export type GameEvent =
  | { t: 'place'; id: number; def: BuildingId; x: number; y: number }
  | { t: 'sell'; x: number; y: number; money: number }
  | { t: 'kill'; x: number; y: number; money: number; enemy: string }
  | { t: 'leak'; x: number; y: number; lights: number; enemy: string }
  | { t: 'wave'; n: number; note?: string }
  | { t: 'brownout'; sat: number }
  | { t: 'recovered' }
  | { t: 'knock'; id: number; x: number; y: number }
  | { t: 'restore'; id: number }
  | { t: 'overcharge'; id: number; x: number; y: number }
  | { t: 'research'; id: string }
  | { t: 'starve'; id: number }
  | { t: 'dry'; id: number }
  | { t: 'win' }
  | { t: 'lose' }
  | { t: 'msg'; text: string };

export interface RunStats {
  kills: number;
  leaks: number;
  leaksByWave: number[];
  /** lights lost to each kind of enemy */
  lightsLostBy: Record<string, number>;
  moneyEarned: number;
  kjDelivered: number;
  wastedKj: number;
  brownoutSeconds: number;
  overcharges: number;
  knocks: number;
  /** first-time markers (tick numbers) for the moments that matter */
  firstBrownout: number;
  firstKnock: number;
  firstOvercharge: number;
}
