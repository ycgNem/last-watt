// Sim state types. Everything here is plain data: no DOM, canvas, audio or timers.
import type { BuildingDef, BuildingId } from '../data/buildings';
import type { EnemyDef, EnemyId } from '../data/enemies';

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
  /** tier (1 or 2) */
  level: number;
  /** which way it was upgraded where a tier has a choice: 0 the main line, 1.. the alternatives */
  branch: number;
  /** network id this tick, -1 = off every network (dark) */
  net: number;
  /** kW asked of the grid this tick */
  demand: number;
  /** satisfaction this tick (0..1); 0 when dark or shed */
  sat: number;
  /** satisfaction smoothed over about half a second (what a Veil's sight reads) */
  satAvg: number;
  /** generator: kW put on the grid this tick */
  output: number;
  /** burner: rocks held, seconds left on the burning rock, seconds it stays put out by a Snuffer */
  fuel: number;
  burnLeft: number;
  snuffed: number;
  /** extractor: progress to the next rock (0..1), rocks waiting to hand over */
  progress: number;
  stock: number;
  /** jar: kJ stored, kW moved this tick (+ charge, − discharge) */
  charge: number;
  flow: number;
  /** tower: enemy id targeted this tick, kJ/s delivered this tick, Overcharge seconds left,
   *  seconds before it can be Overcharged again */
  target: number;
  dps: number;
  /** node: seconds a Shade has been in reach without a break (Slow Fuse, §9), and seconds a
   *  Reroute still guards it from Shades (§8) */
  fuse: number;
  guard: number;
  overcharge: number;
  cool: number;
  /** searchlight: seconds left swinging onto its target */
  sweep: number;
  /** brazier: bodies in the fire this tick */
  bodies: number;
  /** starshell: kJ in the shell */
  shell: number;
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
  /** which road it walks (index into Game.paths) */
  route: number;
  /** a Veil some tower could see this tick */
  seen: boolean;
  /** a Siphon: the building whose line it drinks from this tick (0 or absent: none) */
  tap?: number;
  /** past the fork: its branch is chosen (§11 The Fork) */
  forked?: boolean;
}

/** a Starshell in the air */
export interface Shot {
  from: number;
  x0: number;
  y0: number;
  x: number;
  y: number;
  t: number;
  flight: number;
  /** kJ of light it bursts into */
  energy: number;
  radius: number;
  catch: number;
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
  /** kW lost on long lines */
  loss: number;
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
  /** kW Siphons ask of it this tick, and kW they got (§5.1) */
  drain: number;
  stolen: number;
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
  /** kW the whole wall would ask with every tower firing */
  peak: number;
}

export type GameEvent =
  | { t: 'place'; id: number; def: BuildingId; x: number; y: number }
  | { t: 'sell'; x: number; y: number; money: number }
  | { t: 'kill'; x: number; y: number; money: number; enemy: string }
  | { t: 'leak'; x: number; y: number; lights: number; enemy: string }
  | { t: 'wave'; n: number; note?: string }
  | { t: 'wavepay'; n: number; money: number; leaks: number }
  | { t: 'newenemy'; enemy: EnemyId }
  | { t: 'brownout'; sat: number }
  | { t: 'recovered' }
  | { t: 'knock'; id: number; x: number; y: number }
  | { t: 'tap'; id: number; x: number; y: number }
  | { t: 'restore'; id: number }
  | { t: 'snuff'; id: number; x: number; y: number }
  | { t: 'overcharge'; id: number; x: number; y: number }
  | { t: 'pulse'; at: { x: number; y: number }[]; kj: number; hit: number }
  | { t: 'reroute'; id: number; x: number; y: number }
  | { t: 'fork'; enemy: string; branch: number; turned: boolean }
  | { t: 'bait'; branch: number; towers: number }
  | { t: 'shoot'; id: number; x: number; y: number }
  | { t: 'burst'; x: number; y: number; r: number; hit: number }
  | { t: 'research'; id: string }
  | { t: 'upgrade'; id: number; x: number; y: number }
  | { t: 'starve'; id: number }
  | { t: 'dry'; id: number }
  | { t: 'win' }
  | { t: 'lose' }
  | { t: 'msg'; text: string };

export interface RunStats {
  kills: number;
  leaks: number;
  leaksByWave: number[];
  /** lights lost in each wave */
  lightsByWave: number[];
  /** every leak in order: what, in which wave, how many lights, and the wall's share of power then */
  leakLog: { enemy: string; wave: number; lights: number; wall: number; overcharged: boolean }[];
  /** lights lost to each kind of enemy */
  lightsLostBy: Record<string, number>;
  moneyEarned: number;
  wavePay: number;
  kjDelivered: number;
  wastedKj: number;
  brownoutSeconds: number;
  overcharges: number;
  pulses: number;
  knocks: number;
  snuffs: number;
  /** kJ Siphons drank */
  stolenKj: number;
  researched: number;
  /** first-time markers (tick numbers) for the moments that matter */
  firstBrownout: number;
  firstKnock: number;
  firstOvercharge: number;
}
