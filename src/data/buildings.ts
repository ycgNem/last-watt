// Every building and tower (DESIGN.md §3, §4). Each numeric field has a `why` entry naming the
// DESIGN.md section it derives from; tests/data.test.ts enforces that. Tiers (upgrades) change
// stats through `stats`, and every upgrade must change something on the energy side.

export type BuildingId =
  | 'hearth' | 'extractor' | 'burner' | 'vane' | 'node' | 'jar' | 'lab'
  | 'lamp' | 'floodlight' | 'beacon' | 'searchlight' | 'brazier' | 'starshell';

export type Role = 'core' | 'extractor' | 'generator' | 'node' | 'storage' | 'lab' | 'tower' | 'beacon';

/** how a tower turns watts into damage (§4) */
export type TowerKind = 'beam' | 'cone' | 'radial' | 'mortar';

/** the build bar's two groups: damage (LIGHT) and the grid that feeds it (POWER) */
export type Group = 'light' | 'power' | 'core';

/** the stats a tier can change */
export interface Stats {
  output?: number;
  idleDraw?: number;
  firingDraw?: number;
  constantDraw?: number;
  workDraw?: number;
  /** radial: kW asked for each enemy in range */
  perEnemyDraw?: number;
  maxBodies?: number;
  /** mortar: kW asked while the shell is charging, kJ in a full shell */
  chargeDraw?: number;
  shellSize?: number;
  /** mortar: shells it can hold, and seconds between two lobs */
  magazine?: number;
  reload?: number;
  burstRadius?: number;
  minRange?: number;
  flightTime?: number;
  efficiency?: number;
  range?: number;
  nodeRadius?: number;
  /** node: kW lost on the line while it carries power */
  lineLoss?: number;
  /** extractor: seconds per rock at full satisfaction; rocks it holds */
  rockInterval?: number;
  stockCap?: number;
  /** burner: kJ of heat in one rock, rocks held */
  rockHeat?: number;
  fuelCap?: number;
  /** jar */
  capacity?: number;
  maxCharge?: number;
  maxDischarge?: number;
  /** storage: fraction of its charge lost each second (a Flywheel spins down) */
  spinDown?: number;
  /** cone: half-angle in degrees, and the fraction of the beam one enemy catches */
  halfAngle?: number;
  catch?: number;
  /** searchlight: seconds to swing onto a new target */
  sweepTime?: number;
  /** beacon */
  slow?: number;
}

export interface UpgradeDef {
  /** its name on the panel, when the tier has a choice (Bank or Flywheel) */
  name?: string;
  /** money to reach this tier */
  cost: number;
  /** research project that unlocks it */
  research: string;
  /** one line for the button tooltip */
  blurb: string;
  stats: Stats;
  why: Record<string, string>;
  /** the other ways to take this tier: a branch, chosen once (ROADMAP Milestone 4) */
  alts?: UpgradeDef[];
}

export interface BuildingDef extends Stats {
  id: BuildingId;
  name: string;
  role: Role;
  group: Group;
  /** footprint is size × size tiles */
  size: number;
  cost: number;
  /** one-line description for tooltips */
  blurb: string;
  /** default priority tier for consumers (DESIGN.md §2.3) */
  tier?: number;
  kind?: TowerKind;
  /** whom a tower picks: the enemy nearest the Hearth, or the one with the most health left */
  targeting?: 'first' | 'heaviest';
  /** generator fuel: emberrock from an Extractor, or the wind */
  fuel?: 'rock' | 'wind';
  /** research project needed before it can be built */
  research?: string;
  upgrades?: UpgradeDef[];
  why: Record<string, string>;
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  hearth: {
    id: 'hearth', name: 'Hearth', role: 'core', group: 'core', size: 4, cost: 0,
    blurb: 'The station. 8 kW at full lights, no fuel. Every light it loses dims it; at 0 the run ends.',
    output: 8, nodeRadius: 4,
    why: {
      size: '§3 Hearth; STYLE.md sizes (4x4)', cost: '§3 Hearth (free, one)',
      output: '§3 Hearth: 8 kW at 20 lights, 0.4 kW per light', nodeRadius: '§3 Hearth: node radius 4 tiles',
    },
  },
  extractor: {
    id: 'extractor', name: 'Extractor', role: 'extractor', group: 'power', size: 1, cost: 30, tier: 1,
    blurb: 'Sits on emberrock. Digs 1 rock / 8 s at full power and hands it to a Burner touching it.',
    workDraw: 2, rockInterval: 8, stockCap: 3,
    upgrades: [{
      cost: 38, research: 'deepbit', blurb: 'Deep bit: 1 rock / 5 s, asks 4 kW. One Extractor feeds a Bellows Burner and a half.',
      stats: { rockInterval: 5, workDraw: 4 },
      why: { cost: '§4 upgrade rule: 30 × 1.25 = 37.5 → 38', rockInterval: '§3.2 deep bit: 8 s → 5 s per rock', workDraw: '§3.2 deep bit: 2 → 4 kW (more rock costs watts)' },
    }],
    why: {
      size: '§3 slice map: one Extractor per deposit tile', cost: '§3 Extractor: 30', tier: '§2.3 default tiers: 1 Works (extractors)',
      workDraw: '§3 Extractor: draws 2 kW', rockInterval: '§3 Extractor: 1 emberrock / 8 s at full satisfaction',
      stockCap: '§3 adjacency feed: holds 3 rocks (24 s) so a handoff never stalls it',
    },
  },
  burner: {
    id: 'burner', name: 'Burner', role: 'generator', group: 'power', size: 2, cost: 40, fuel: 'rock',
    blurb: 'Burns emberrock handed over by an Extractor touching it. One rock lasts 10 s; holds 5.',
    output: 20, efficiency: 0.5, rockHeat: 400, fuelCap: 5,
    upgrades: [{
      cost: 50, research: 'bellows', blurb: 'Bellows: 30 kW at 0.6 efficiency. A rock gives 240 kJ instead of 200, but lasts 8 s.',
      stats: { output: 30, efficiency: 0.6 },
      why: { cost: '§4 upgrade rule: 40 × 1.25 = 50', output: '§3.2 bellows: 20 → 30 kW', efficiency: '§3.2 bellows: 0.5 → 0.6 (400 kJ × 0.6 / 30 kW = 8 s a rock)' },
    }],
    why: {
      size: '§3 Burner (2x2 so two Extractors can touch it)', cost: '§3 Burner: 40', output: '§3 Burner: 20 kW output',
      efficiency: '§3 Burner: 0.5 efficiency', rockHeat: '§3 Burner: 400 kJ per emberrock', fuelCap: '§3 Burner: holds 5',
    },
  },
  vane: {
    id: 'vane', name: 'Vane', role: 'generator', group: 'power', size: 2, cost: 50, fuel: 'wind', research: 'vane',
    blurb: 'Wind power: up to 15 kW, no fuel, goes anywhere on the grid. The wind comes and goes; a Jar evens it out.',
    output: 15,
    why: { size: '§3.2 Vane (2x2 mast)', cost: '§3.2 Vane: 50 (6.1 money per average kW vs the Burner\'s 3.2)', output: '§3.2 Vane: 15 kW at full wind (average 0.55 → 8.2 kW)' },
  },
  node: {
    id: 'node', name: 'Node', role: 'node', group: 'power', size: 1, cost: 10,
    blurb: 'Carries power to anything within 4 tiles. A Shade passing within 2.5 tiles cuts it for 10 s.',
    nodeRadius: 4,
    upgrades: [{
      cost: 13, research: 'longline', blurb: 'Long line: reaches 6 tiles, but the line loses 1 kW while it carries power.',
      stats: { nodeRadius: 6, lineLoss: 1 },
      why: { cost: '§4 upgrade rule: 10 × 1.25 = 12.5 → 13', nodeRadius: '§3.2 long line: 4 → 6 tiles', lineLoss: '§3.2 long line: 1 kW lost per long Node' },
    }],
    why: { size: '§3 Node; STYLE.md (1x1 post)', cost: '§3 Node: 10', nodeRadius: '§3 Node: radius 4 tiles' },
  },
  jar: {
    id: 'jar', name: 'Jar', role: 'storage', group: 'power', size: 1, cost: 60,
    blurb: 'Stores wasted power and gives it back when demand beats supply. Pays for Overcharge.',
    capacity: 600, maxCharge: 15, maxDischarge: 30,
    upgrades: [{
      name: 'Bank', cost: 75, research: 'bank', blurb: 'Bank: 1500 kJ, charges at 25 kW, gives back 45 kW. Deep and slow: carries a long wave.',
      stats: { capacity: 1500, maxCharge: 25, maxDischarge: 45 },
      why: { cost: '§4 upgrade rule: 60 × 1.25 = 75', capacity: '§3.2 bank: 600 → 1500 kJ', maxCharge: '§3.2 bank: 15 → 25 kW', maxDischarge: '§3.2 bank: 30 → 45 kW' },
      alts: [{
        name: 'Flywheel', cost: 75, research: 'flywheel', blurb: 'Flywheel: only 300 kJ, but charges at 60 kW and gives back 90 kW. It spins down: 2% of its charge a second.',
        stats: { capacity: 300, maxCharge: 60, maxDischarge: 90, spinDown: 0.02 },
        why: {
          cost: '§4 upgrade rule: 60 × 1.25 = 75', capacity: '§3.2 Flywheel: 300 kJ, one tier-2 Floodlight Overcharge (72 kW × 4 s = 288 kJ)',
          maxCharge: '§3.2 Flywheel: charges at 60 kW, full in 5 s of surplus', maxDischarge: '§3.2 Flywheel: gives 90 kW, a tier-2 Floodlight Overcharge (+72 kW) alone',
          spinDown: '§3.2 Flywheel: loses 2% of its charge a second (half gone in 35 s): a wave tool, not a bank',
        },
      }],
    }],
    why: {
      size: '§3 Jar; STYLE.md (1x1)', cost: '§3 Jar: 60', capacity: '§3 Jar: 600 kJ',
      maxCharge: '§3 Jar: charge ≤ 15 kW', maxDischarge: '§3 Jar: discharge ≤ 30 kW',
    },
  },
  lab: {
    id: 'lab', name: 'Lab', role: 'lab', group: 'power', size: 2, cost: 50, tier: 3,
    blurb: 'Turns power into research while a project runs. Tier 3: it starves before your towers do.',
    workDraw: 10,
    why: { size: '§3 Lab (2x2)', cost: '§3 Lab: 50', tier: '§2.3 default tiers: 3 labs', workDraw: '§3, §7 Lab: draws 10 kW while a project is active' },
  },
  lamp: {
    id: 'lamp', name: 'Lamp', role: 'tower', group: 'light', kind: 'beam', targeting: 'first', size: 2, cost: 20, tier: 2,
    blurb: 'A single beam on the enemy nearest the Hearth. Cheap; hungry while it fires. A Pall drinks most of a narrow beam.',
    idleDraw: 1, firingDraw: 12, efficiency: 0.5, range: 3.5,
    upgrades: [{
      cost: 25, research: 'lamp2', blurb: '18 kW firing at 0.6 → 10.8 kJ/s. More damage, and more watts.',
      stats: { firingDraw: 18, efficiency: 0.6 },
      why: {
        cost: '§4 upgrade rule: 20 × 1.25 × (2 − 1) = 25', firingDraw: '§4 tier rule: 12 × 1.5 = 18 kW',
        efficiency: '§4 tier rule: 0.5 × 1.2 = 0.6 (damage 6 × 1.8 = 10.8 kJ/s)',
      },
    }],
    why: {
      size: '§4; STYLE.md tower footprint 2x2', cost: '§4 Lamp: 20', tier: '§2.3 default tiers: 2 Wall (towers)',
      idleDraw: '§4 Lamp: idle 1 kW', firingDraw: '§4 Lamp: firing 12 kW (why 12, not 6: §4)',
      efficiency: '§4 Lamp: 0.50 (6 kJ/s at full power)', range: '§4 Lamp: range 3.5',
    },
  },
  floodlight: {
    id: 'floodlight', name: 'Floodlight', role: 'tower', group: 'light', kind: 'cone', targeting: 'first', size: 2, cost: 80, tier: 2,
    blurb: 'Throws a wide cone at the enemy nearest the Hearth. Each enemy in it catches 40% of the beam, so it shines on crowds and wastes light on a lone Moth. A Pall in the cone shadows everything behind it.',
    idleDraw: 2, firingDraw: 24, efficiency: 0.6, range: 5, halfAngle: 30, catch: 0.4,
    upgrades: [{
      cost: 100, research: 'flood2', blurb: '36 kW firing at 0.72 → 25.9 kJ/s across the cone.',
      stats: { firingDraw: 36, efficiency: 0.72 },
      why: { cost: '§4 upgrade rule: 80 × 1.25 = 100', firingDraw: '§4 tier rule: 24 × 1.5 = 36 kW', efficiency: '§4 tier rule: 0.6 × 1.2 = 0.72' },
    }],
    why: {
      size: '§4; STYLE.md tower footprint 2x2', cost: '§4 Floodlight: 80', tier: '§2.3 default tiers: 2 Wall (towers)',
      idleDraw: '§4 Floodlight: idle 2 kW', firingDraw: '§4 Floodlight: firing 24 kW', efficiency: '§4 Floodlight: 0.60',
      range: '§4 Floodlight: range 5.0', halfAngle: '§4 Floodlight cone: 30° either side of its target',
      catch: '§4 Floodlight cone: each enemy catches 0.4 of the beam, three or more share all of it',
    },
  },
  beacon: {
    id: 'beacon', name: 'Beacon', role: 'beacon', group: 'light', size: 2, cost: 50, tier: 2,
    blurb: 'Slows everything in range by 40% × its share of power, so every tower near it gets longer on each enemy. Draws power even when nothing is near.',
    constantDraw: 4, range: 4, slow: 0.4,
    upgrades: [{
      cost: 63, research: 'beacon2', blurb: 'Slows 60% at 6 kW: the time an enemy spends in range rises from 1.7× to 2.5×.',
      stats: { constantDraw: 6, slow: 0.6 },
      why: { cost: '§4 upgrade rule: 50 × 1.25 = 62.5 → 63', constantDraw: '§4 tier rule: 4 × 1.5 = 6 kW', slow: '§4 Beacon tier 2: exposure 1/(1 − s) × 1.5 → s = 0.6' },
    }],
    why: {
      size: '§4; STYLE.md tower footprint 2x2', cost: '§4 Beacon: 50', tier: '§2.3 default tiers: 2 Wall (towers)',
      constantDraw: '§4 Beacon: 4 kW constant', range: '§4 Beacon: range 4.0', slow: '§4 Beacon: slows 40% × satisfaction',
    },
  },
  searchlight: {
    id: 'searchlight', name: 'Searchlight', role: 'tower', group: 'light', kind: 'beam', targeting: 'heaviest', size: 2, cost: 70, tier: 2, research: 'searchlight',
    blurb: 'A long narrow beam on the enemy with the most health left in reach. Covers a whole straight; takes half a second to swing to a new target. Very hungry.',
    idleDraw: 2, firingDraw: 30, efficiency: 0.6, range: 7, sweepTime: 0.5,
    upgrades: [{
      cost: 88, research: 'search2', blurb: '45 kW firing at 0.72 → 32.4 kJ/s.',
      stats: { firingDraw: 45, efficiency: 0.72 },
      why: { cost: '§4 upgrade rule: 70 × 1.25 = 87.5 → 88', firingDraw: '§4 tier rule: 30 × 1.5 = 45 kW', efficiency: '§4 tier rule: 0.6 × 1.2 = 0.72' },
    }],
    why: {
      size: '§4; STYLE.md tower footprint 2x2', cost: '§4.1 Searchlight: 70', tier: '§2.3 default tiers: 2 Wall (towers)',
      idleDraw: '§4.1 Searchlight: idle 2 kW', firingDraw: '§4.1 Searchlight: firing 30 kW', efficiency: '§4.1 Searchlight: 0.60 → 18 kJ/s',
      range: '§4.1 Searchlight: range 7 (13.7 tiles of a straight)', sweepTime: '§4.1 Searchlight: 0.5 s to swing onto a new target',
    },
  },
  brazier: {
    id: 'brazier', name: 'Brazier', role: 'tower', group: 'light', kind: 'radial', targeting: 'first', size: 2, cost: 60, tier: 2, research: 'brazier',
    blurb: 'Burns every enemy within 2.5 tiles at once. Asks 8 kW for each body in the fire, so a crowd spikes your demand. Heat needs no sight: it burns Veils, and a Pall can\'t drink it.',
    idleDraw: 1, perEnemyDraw: 8, maxBodies: 8, efficiency: 0.65, range: 2.5,
    upgrades: [{
      cost: 75, research: 'brazier2', blurb: '12 kW per body at 0.78 → 9.4 kJ/s on each enemy in the fire.',
      stats: { perEnemyDraw: 12, efficiency: 0.78 },
      why: { cost: '§4 upgrade rule: 60 × 1.25 = 75', perEnemyDraw: '§4 tier rule: 8 × 1.5 = 12 kW per body', efficiency: '§4 tier rule: 0.65 × 1.2 = 0.78' },
    }],
    why: {
      size: '§4; STYLE.md tower footprint 2x2', cost: '§4.1 Brazier: 60', tier: '§2.3 default tiers: 2 Wall (towers)',
      idleDraw: '§4.1 Brazier: idle 1 kW', perEnemyDraw: '§4.1 Brazier: 8 kW per enemy in range', maxBodies: '§4.1 Brazier: at most 8 bodies (64 kW)',
      efficiency: '§4.1 Brazier: 0.65 → 5.2 kJ/s on each (a Flit crossing a bend fire for 2.7 s must take its 14 kJ)', range: '§4.1 Brazier: range 2.5',
    },
  },
  starshell: {
    id: 'starshell', name: 'Starshell', role: 'tower', group: 'light', kind: 'mortar', targeting: 'first', size: 2, cost: 90, tier: 2, research: 'starshell',
    blurb: 'Charges up to three 70 kJ shells at 10 kW and lobs them at the thickest crowd in reach (2–7 tiles). Each burst lands on everything within 1.5 tiles. It fills on spare power between waves, so each wave opens with three.',
    chargeDraw: 10, shellSize: 70, magazine: 3, reload: 0.6, efficiency: 0.8, range: 7, minRange: 2, burstRadius: 1.5, catch: 0.3, flightTime: 0.8,
    upgrades: [{
      cost: 113, research: 'star2', blurb: 'Charges at 15 kW with 0.96 efficiency: half again as many shells, each 20% brighter.',
      stats: { chargeDraw: 15, efficiency: 0.96 },
      why: { cost: '§4 upgrade rule: 90 × 1.25 = 112.5 → 113', chargeDraw: '§4 tier rule: 10 × 1.5 = 15 kW', efficiency: '§4 tier rule: 0.8 × 1.2 = 0.96' },
    }],
    why: {
      size: '§4; STYLE.md tower footprint 2x2', cost: '§4.1 Starshell: 90', tier: '§2.3 default tiers: 2 Wall (towers)',
      chargeDraw: '§4.1 Starshell: charges at 10 kW', shellSize: '§4.1 Starshell: 70 kJ shell (a four-Flit clump needs 4 × 14 = 56 kJ landed; 56 / 0.8 = 70)',
      magazine: '§4.1 Starshell: holds three shells (210 kJ, 21 s at 10 kW: full inside the breather and the walk)', reload: '§4.1 Starshell: 0.6 s between lobs (a Flit clump spans 2.4 s)',
      efficiency: '§4.1 Starshell: 0.8 → 56 kJ of light a shell', range: '§4.1 Starshell: range 7', minRange: '§4.1 Starshell: not within 2 tiles',
      burstRadius: '§4.1 Starshell: burst 1.5 tiles', catch: '§4.1 Starshell: each enemy catches 0.3 of a burst', flightTime: '§4.1 Starshell: 0.8 s in the air (it leads its target)',
    },
  },
};

/** The build bar: LIGHT (damage) then POWER, on the number row 1–9, 0, -, = */
export const BUILD_ORDER: BuildingId[] = [
  'lamp', 'floodlight', 'beacon', 'searchlight', 'brazier', 'starshell',
  'node', 'extractor', 'burner', 'vane', 'jar', 'lab',
];
export const BUILD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
export const BUILD_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'];

/** Fraction of the money paid back on selling (DESIGN.md §3, sell). */
export const SELL_REFUND = { v: 0.5, why: '§3 selling: half back, so a placement is a commitment but a mistake is not a run-ender' };

/** stat keys that count as the energy side of an upgrade (CLAUDE.md: every node has a wattage column) */
export const ENERGY_KEYS: (keyof Stats)[] = [
  'output', 'idleDraw', 'firingDraw', 'constantDraw', 'workDraw', 'perEnemyDraw', 'chargeDraw', 'efficiency',
  'lineLoss', 'capacity', 'maxCharge', 'maxDischarge', 'spinDown',
];

/** the upgrade that takes a building from `level` to `level + 1` on its branch (0 = the main line) */
export function upgradeAt(def: BuildingDef, level: number, branch = 0): UpgradeDef | undefined {
  const u = def.upgrades?.[level - 1];
  return branch > 0 && u?.alts?.[branch - 1] ? u.alts[branch - 1] : u;
}

const specCache = new Map<string, BuildingDef>();

/** a building's stats at a tier: the base def with every upgrade up to that tier applied */
export function specOf(def: BuildingDef, level: number, branch = 0): BuildingDef {
  if (level <= 1 || !def.upgrades?.length) return def;
  const key = `${def.id}:${level}:${branch}`;
  let s = specCache.get(key);
  if (!s) {
    s = { ...def };
    for (let l = 2; l <= level; l++) Object.assign(s, upgradeAt(def, l - 1, branch)?.stats ?? {});
    specCache.set(key, s);
  }
  return s;
}
