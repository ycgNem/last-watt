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
  /** a Node: kW its link carries at most, either way (§3.3) */
  carryKw?: number;
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
    blurb: 'Wind power: up to 15 kW, no fuel, goes anywhere on the grid. The wind comes and goes; a Jar evens it out. Each other Vane within 7 tiles takes 30% of its wind.',
    output: 15,
    why: { size: '§3.2 Vane (2x2 mast)', cost: '§3.2 Vane: 50 (6.1 money per average kW vs the Burner\'s 3.2)', output: '§3.2 Vane: 15 kW at full wind (average 0.55 → 8.2 kW)' },
  },
  node: {
    id: 'node', name: 'Node', role: 'node', group: 'power', size: 1, cost: 10,
    blurb: 'Carries power to anything within 4 tiles, at most 60 kW through it. Past that: a second route, a Jar past it, Burners on the far side, or a Busbar. A Shade passing within 3.5 tiles cuts it for 6 s.',
    nodeRadius: 4, carryKw: 60,
    upgrades: [{
      name: 'Long line', cost: 13, research: 'longline', blurb: 'Long line: reaches 6 tiles, but the line loses 1 kW while it carries power. Still 60 kW through it.',
      stats: { nodeRadius: 6, lineLoss: 1 },
      why: { cost: '§4 upgrade rule: 10 × 1.25 = 12.5 → 13', nodeRadius: '§3.2 long line: 4 → 6 tiles', lineLoss: '§3.2 long line: 1 kW lost per long Node' },
      alts: [{
        name: 'Busbar', cost: 13, research: 'longline', blurb: 'Busbar: carries 120 kW instead of 60, but reaches only 2.5 tiles. Anything it alone reached past that loses power.',
        stats: { carryKw: 120, nodeRadius: 2.5 },
        why: {
          cost: '§4 upgrade rule: 10 × 1.25 = 12.5 → 13', carryKw: '§3.3 Busbar: 60 → 120 kW, a late bend at full fire (three tier-2 Floodlights firing ask 108)',
          nodeRadius: '§3.3 Busbar: 4 → 2.5 tiles (the fifth review: weight costs reach, so a Busbar feeding towers 1.5 off a road sits inside a Shade\'s 3.5 of it)',
        },
      }],
    }],
    why: { size: '§3 Node; STYLE.md (1x1 post)', cost: '§3 Node: 10', nodeRadius: '§3 Node: radius 4 tiles', carryKw: '§3.3 transmission: 60 kW through a Node, the output of three Burners (the fifth review: at 40 the Busbar was bought on every Node, so capacity was a tax)' },
  },
  jar: {
    id: 'jar', name: 'Jar', role: 'storage', group: 'power', size: 1, cost: 60,
    blurb: 'Stores spare power and gives it back when your towers ask more than you make. Pays for Pulse and Reroute; never for an Overcharge.',
    capacity: 600, maxCharge: 15, maxDischarge: 30,
    upgrades: [{
      name: 'Bank', cost: 75, research: 'bank', blurb: 'Bank: 1500 kJ, charges at 25 kW, gives back 45 kW. Deep and slow: carries a long wave.',
      stats: { capacity: 1500, maxCharge: 25, maxDischarge: 45 },
      why: { cost: '§4 upgrade rule: 60 × 1.25 = 75', capacity: '§3.2 bank: 600 → 1500 kJ', maxCharge: '§3.2 bank: 15 → 25 kW', maxDischarge: '§3.2 bank: 30 → 45 kW' },
      alts: [{
        name: 'Flywheel', cost: 75, research: 'flywheel', blurb: 'Flywheel: only 300 kJ, but charges at 60 kW and gives back 90 kW. It spins down: 2% of its charge a second.',
        stats: { capacity: 300, maxCharge: 60, maxDischarge: 90, spinDown: 0.02 },
        why: {
          cost: '§4 upgrade rule: 60 × 1.25 = 75', capacity: '§3.2 Flywheel: 300 kJ, a pack passing a full Node (40-60 kW short for 5-7 s; re-derived in the fourth review)',
          maxCharge: '§3.2 Flywheel: charges at 60 kW, full in 5 s of surplus', maxDischarge: '§3.2 Flywheel: gives 90 kW, all a branch past a full Node lacks at its peak (a Jar gives 30)',
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
    }, {
      name: 'Arc lamp', cost: 50, research: 'lamp3', blurb: 'Arc lamp: 27 kW firing at 0.72 → 19.4 kJ/s. Brighter, hungrier: the tier rule again.',
      stats: { firingDraw: 27, efficiency: 0.72 },
      why: { cost: '§4 upgrade rule: 20 × 1.25 × (3 − 1) = 50', firingDraw: '§4.2 Arc: 18 × 1.5 = 27 kW', efficiency: '§4.2 Arc: 0.6 × 1.2 = 0.72 → 19.4 kJ/s' },
      alts: [{
        name: 'Lantern', cost: 50, research: 'lamp3', blurb: 'Lantern: reach 5 instead of 3.5, at 20 kW and 0.6 → 12 kJ/s. Dimmer, but each enemy is in its light half as long again, for 7 kW less than an Arc lamp.',
        stats: { firingDraw: 20, efficiency: 0.6, range: 5 },
        why: {
          cost: '§4 upgrade rule: 20 × 1.25 × (3 − 1) = 50', firingDraw: '§4.2 Lantern: 20 kW (the tier still raises demand, by a little)',
          efficiency: '§4.2 Lantern: 0.6, tier 2 kept: the tier goes into reach', range: '§4.2 Lantern: reach 5, the chord 1.5 tiles off a road from 6.3 to 9.5 tiles (×1.5)',
        },
      }],
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
    }, {
      name: 'Blaze', cost: 200, research: 'flood3', blurb: 'Blaze: 54 kW at 0.86 → 46.7 kJ/s across the cone. The tier rule again: a crowd killer that needs a factory behind it.',
      stats: { firingDraw: 54, efficiency: 0.864 },
      why: { cost: '§4 upgrade rule: 80 × 1.25 × (3 − 1) = 200', firingDraw: '§4.2 Blaze: 36 × 1.5 = 54 kW', efficiency: '§4.2 Blaze: 0.72 × 1.2 = 0.864 → 46.7 kJ/s' },
      alts: [{
        name: 'Wide', cost: 200, research: 'flood3', blurb: 'Wide: a 100° cone (was 60°) for beside a road, where it lights twice the stretch; each enemy catches 30%. 40 kW at 0.72.',
        stats: { firingDraw: 40, efficiency: 0.72, halfAngle: 50, catch: 0.3 },
        why: {
          cost: '§4 upgrade rule: 80 × 1.25 × (3 − 1) = 200', firingDraw: '§4.2 Wide: 40 kW (a smaller step than Blaze: the tier goes into angle)',
          efficiency: '§4.2 Wide: 0.72, tier 2 kept', halfAngle: '§4.2 Wide: 50° either side; 1.5 tiles off a road it lights 2 × 1.5 × tan 50° = 3.6 tiles of it, against 1.7 at 30°',
          catch: '§4.2 Wide: each enemy catches 0.3, four or more share all of it',
        },
      }],
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
    }, {
      name: 'Drag', cost: 125, research: 'beacon3', blurb: 'Drag: slows 73% at 9 kW. An enemy spends 3.75× as long in its reach.',
      stats: { constantDraw: 9, slow: 0.73 },
      why: { cost: '§4 upgrade rule: 50 × 1.25 × (3 − 1) = 125', constantDraw: '§4.2 Drag: 6 × 1.5 = 9 kW', slow: '§4.2 Drag: exposure 2.5 × 1.5 = 3.75 → s = 1 − 1/3.75 = 0.73' },
      alts: [{
        name: 'Halo', cost: 125, research: 'beacon3', blurb: 'Halo: reach 6 instead of 4 at 8 kW, still slowing 60%. A road 1.5 tiles off is slowed for 11.6 tiles, not 7.4.',
        stats: { constantDraw: 8, range: 6 },
        why: { cost: '§4 upgrade rule: 50 × 1.25 × (3 − 1) = 125', constantDraw: '§4.2 Halo: 8 kW (a smaller step: the tier goes into reach)', range: '§4.2 Halo: reach 6, the chord 1.5 off a road from 7.4 to 11.6 tiles (×1.57)' },
      }],
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
    }, {
      name: 'Lance', cost: 175, research: 'search3', blurb: 'Lance: 68 kW at 0.86 → 58.8 kJ/s on the heaviest thing in reach. The hungriest tower there is.',
      stats: { firingDraw: 68, efficiency: 0.864 },
      why: { cost: '§4 upgrade rule: 70 × 1.25 × (3 − 1) = 175', firingDraw: '§4.2 Lance: 45 × 1.5 = 67.5 → 68 kW', efficiency: '§4.2 Lance: 0.72 × 1.2 = 0.864 → 58.8 kJ/s' },
      alts: [{
        name: 'Long Eye', cost: 175, research: 'search3', blurb: 'Long Eye: reach 9.5 instead of 7 at 50 kW and 0.72 → 36 kJ/s. A straight 1.5 tiles off is in its beam for 18.8 tiles.',
        stats: { firingDraw: 50, efficiency: 0.72, range: 9.5 },
        why: {
          cost: '§4 upgrade rule: 70 × 1.25 × (3 − 1) = 175', firingDraw: '§4.2 Long Eye: 50 kW (a smaller step: the tier goes into reach)',
          efficiency: '§4.2 Long Eye: 0.72, tier 2 kept', range: '§4.2 Long Eye: reach 9.5, the chord 1.5 off a straight from 13.7 to 18.8 tiles (×1.37)',
        },
      }],
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
    }, {
      name: 'Inferno', cost: 150, research: 'brazier3', blurb: 'Inferno: 18 kW per body at 0.94 → 16.8 kJ/s on each. Eight bodies ask 144 kW: put it on tier 3.',
      stats: { perEnemyDraw: 18, efficiency: 0.936 },
      why: { cost: '§4 upgrade rule: 60 × 1.25 × (3 − 1) = 150', perEnemyDraw: '§4.2 Inferno: 12 × 1.5 = 18 kW per body', efficiency: '§4.2 Inferno: 0.78 × 1.2 = 0.936 → 16.8 kJ/s each' },
      alts: [{
        name: 'Bonfire', cost: 150, research: 'brazier3', blurb: 'Bonfire: burns everything within 3.5 tiles instead of 2.5, at 13 kW per body and 0.78. Each body burns 1.6× as long.',
        stats: { perEnemyDraw: 13, efficiency: 0.78, range: 3.5 },
        why: {
          cost: '§4 upgrade rule: 60 × 1.25 × (3 − 1) = 150', perEnemyDraw: '§4.2 Bonfire: 13 kW per body (a smaller step: the tier goes into reach)',
          efficiency: '§4.2 Bonfire: 0.78, tier 2 kept', range: '§4.2 Bonfire: 3.5, the chord 1.5 off a road from 4.0 to 6.3 tiles (×1.6)',
        },
      }],
    }],
    why: {
      size: '§4; STYLE.md tower footprint 2x2', cost: '§4.1 Brazier: 60', tier: '§2.3 default tiers: 2 Wall (towers)',
      idleDraw: '§4.1 Brazier: idle 1 kW', perEnemyDraw: '§4.1 Brazier: 8 kW per enemy in range', maxBodies: '§4.1 Brazier: at most 8 bodies (64 kW, 65 with its idle 1)',
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
    }, {
      name: 'Nova', cost: 225, research: 'star3', blurb: 'Nova: 105 kJ shells charged at 22.5 kW. Each burst lands half again as much.',
      stats: { chargeDraw: 22.5, shellSize: 105 },
      why: { cost: '§4 upgrade rule: 90 × 1.25 × (3 − 1) = 225', chargeDraw: '§4.2 Nova: 15 × 1.5 = 22.5 kW', shellSize: '§4.2 Nova: 70 × 1.5 = 105 kJ (efficiency is held at 0.96: a shell cannot land more than it holds)' },
      alts: [{
        name: 'Barrage', cost: 225, research: 'star3', blurb: 'Barrage: holds six shells instead of three, lobbed 0.4 s apart, still charging at 15 kW. A breather fills it for a long wave.',
        stats: { chargeDraw: 15, magazine: 6, reload: 0.4 },
        why: {
          cost: '§4 upgrade rule: 90 × 1.25 × (3 − 1) = 225', chargeDraw: '§4.2 Barrage: 15 kW, tier 2 kept (the tier goes into storage)',
          magazine: '§4.2 Barrage: six shells, 420 kJ banked (28 s at 15 kW: the breather and the walk)', reload: '§4.2 Barrage: 0.4 s between lobs (six shells inside a 2.4 s clump)',
        },
      }],
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
  'lineLoss', 'carryKw', 'capacity', 'maxCharge', 'maxDischarge', 'spinDown',
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
