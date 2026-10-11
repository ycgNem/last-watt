// Every building and tower in the slice (DESIGN.md §3, §4). Each numeric field has a `why`
// entry naming the DESIGN.md section it derives from; tests/data.test.ts enforces that.

export type BuildingId =
  | 'hearth' | 'extractor' | 'burner' | 'node' | 'jar' | 'lab'
  | 'lamp' | 'floodlight' | 'beacon';

export type Role = 'core' | 'extractor' | 'generator' | 'node' | 'storage' | 'lab' | 'tower' | 'beacon';

export interface UpgradeDef {
  /** money to reach this tier */
  cost: number;
  firingDraw: number;
  efficiency: number;
  /** research project that unlocks it */
  research: string;
  why: Record<string, string>;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  role: Role;
  /** footprint is size × size tiles */
  size: number;
  cost: number;
  /** one-line description for tooltips */
  blurb: string;
  /** default priority tier for consumers (DESIGN.md §2.3) */
  tier?: number;
  output?: number;
  idleDraw?: number;
  firingDraw?: number;
  constantDraw?: number;
  workDraw?: number;
  efficiency?: number;
  range?: number;
  nodeRadius?: number;
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
  /** floodlight spill */
  spillRadius?: number;
  shares?: number[];
  /** beacon */
  slow?: number;
  /** research project needed before it can be built */
  research?: string;
  upgrades?: UpgradeDef[];
  why: Record<string, string>;
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  hearth: {
    id: 'hearth', name: 'Hearth', role: 'core', size: 4, cost: 0,
    blurb: 'The station. 8 kW, always on, no fuel. Lose its lights and the run ends.',
    output: 8, nodeRadius: 4,
    why: {
      size: '§3 Hearth; STYLE.md sizes (4x4)', cost: '§3 Hearth (free, one)',
      output: '§3 Hearth: 8 kW always on, no fuel', nodeRadius: '§3 Hearth: node radius 4 tiles',
    },
  },
  extractor: {
    id: 'extractor', name: 'Extractor', role: 'extractor', size: 1, cost: 30, tier: 1,
    blurb: 'Sits on emberrock. Digs 1 rock / 8 s at full power and hands it to a Burner touching it.',
    workDraw: 2, rockInterval: 8, stockCap: 3,
    why: {
      size: '§3 slice map: one Extractor per deposit tile', cost: '§3 Extractor: 30', tier: '§2.3 default tiers: 1 Works (extractors)',
      workDraw: '§3 Extractor: draws 2 kW', rockInterval: '§3 Extractor: 1 emberrock / 8 s at full satisfaction',
      stockCap: '§3 adjacency feed: holds 3 rocks (24 s) so a handoff never stalls it',
    },
  },
  burner: {
    id: 'burner', name: 'Burner', role: 'generator', size: 2, cost: 40,
    blurb: 'Burns emberrock handed over by an Extractor touching it. One rock lasts 10 s; holds 5.',
    output: 20, efficiency: 0.5, rockHeat: 400, fuelCap: 5,
    why: {
      size: '§3 Burner (2x2 so two Extractors can touch it)', cost: '§3 Burner: 40', output: '§3 Burner: 20 kW output',
      efficiency: '§3 Burner: 0.5 efficiency', rockHeat: '§3 Burner: 400 kJ per emberrock', fuelCap: '§3 Burner: holds 5',
    },
  },
  node: {
    id: 'node', name: 'Node', role: 'node', size: 1, cost: 10,
    blurb: 'Carries power to anything within 4 tiles. A Shade passing within 2.5 tiles cuts it for 10 s.',
    nodeRadius: 4,
    why: { size: '§3 Node; STYLE.md (1x1 post)', cost: '§3 Node: 10', nodeRadius: '§3 Node: radius 4 tiles' },
  },
  jar: {
    id: 'jar', name: 'Jar', role: 'storage', size: 1, cost: 60,
    blurb: 'Stores wasted power and gives it back when demand beats supply. Pays for Overcharge.',
    capacity: 600, maxCharge: 15, maxDischarge: 30,
    why: {
      size: '§3 Jar; STYLE.md (1x1)', cost: '§3 Jar: 60', capacity: '§3 Jar: 600 kJ',
      maxCharge: '§3 Jar: charge ≤ 15 kW', maxDischarge: '§3 Jar: discharge ≤ 30 kW',
    },
  },
  lab: {
    id: 'lab', name: 'Lab', role: 'lab', size: 2, cost: 50, tier: 3,
    blurb: 'Turns power into research while a project runs. Tier 3: it starves before your towers do.',
    workDraw: 10,
    why: { size: '§3 Lab (2x2)', cost: '§3 Lab: 50', tier: '§2.3 default tiers: 3 labs', workDraw: '§3, §7 Lab: draws 10 kW while a project is active' },
  },
  lamp: {
    id: 'lamp', name: 'Lamp', role: 'tower', size: 2, cost: 20, tier: 2,
    blurb: 'A single beam on the enemy nearest the Hearth. Cheap; hungry while it fires. A Pall drinks most of a narrow beam.',
    idleDraw: 1, firingDraw: 12, efficiency: 0.5, range: 3.5,
    upgrades: [{
      cost: 25, firingDraw: 18, efficiency: 0.6, research: 'lamp2',
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
    id: 'floodlight', name: 'Floodlight', role: 'tower', size: 2, cost: 80, tier: 2,
    blurb: 'Lights its target and spills onto 2 more nearby, split 4:2:1. A Pall in the beam drinks every later share.',
    idleDraw: 2, firingDraw: 24, efficiency: 0.6, range: 5, spillRadius: 1.5, shares: [4, 2, 1],
    why: {
      size: '§4; STYLE.md tower footprint 2x2', cost: '§4 Floodlight: 80', tier: '§2.3 default tiers: 2 Wall (towers)',
      idleDraw: '§4 Floodlight: idle 2 kW', firingDraw: '§4 Floodlight: firing 24 kW', efficiency: '§4 Floodlight: 0.60',
      range: '§4 Floodlight: range 5.0', spillRadius: '§4 Floodlight: spills within 1.5 tiles', shares: '§4 Floodlight: split 4 : 2 : 1',
    },
  },
  beacon: {
    id: 'beacon', name: 'Beacon', role: 'beacon', size: 2, cost: 50, tier: 2,
    blurb: 'Slows everything in range by 40% × its share of power. Draws power even when nothing is near.',
    constantDraw: 4, range: 4, slow: 0.4,
    why: {
      size: '§4; STYLE.md tower footprint 2x2', cost: '§4 Beacon: 50', tier: '§2.3 default tiers: 2 Wall (towers)',
      constantDraw: '§4 Beacon: 4 kW constant', range: '§4 Beacon: range 4.0', slow: '§4 Beacon: slows 40% × satisfaction',
    },
  },
};

/** The build bar, in hotkey order (1–8). */
export const BUILD_ORDER: BuildingId[] = ['lamp', 'floodlight', 'beacon', 'node', 'extractor', 'burner', 'jar', 'lab'];

/** Fraction of the money paid back on selling (DESIGN.md §3, sell). */
export const SELL_REFUND = { v: 0.5, why: '§3 selling: half back, so a placement is a commitment but a mistake is not a run-ender' };
