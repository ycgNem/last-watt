// Research projects (DESIGN.md §7): priced in kJ, paid by Labs drawing power at 1:1. A project
// unlocks a building or a tier; some need another project first.

export interface ResearchDef {
  id: string;
  name: string;
  blurb: string;
  /** which column of the research board it sits in */
  branch: 'light' | 'power';
  cost: number;
  requires?: string;
  /** it takes its prerequisite's row on the board once that is done (tier 3 after tier 2) */
  stacks?: boolean;
  why: Record<string, string>;
}

export const RESEARCH: Record<string, ResearchDef> = {
  lamp2: {
    id: 'lamp2', name: 'Lamp tier 2', branch: 'light', cost: 900,
    blurb: 'Lamps can be upgraded: 18 kW firing at 0.6 = 10.8 kJ/s.',
    why: { cost: '§7 Lamp tier 2: 900 kJ' },
  },
  searchlight: {
    id: 'searchlight', name: 'Searchlight', branch: 'light', cost: 800,
    blurb: 'A 7-tile narrow beam on the heaviest enemy in reach: 30 kW for 18 kJ/s.',
    why: { cost: '§7 unlocks: 800 kJ (80 s on one Lab)' },
  },
  brazier: {
    id: 'brazier', name: 'Brazier', branch: 'light', cost: 700,
    blurb: 'Burns every enemy within 2.5 tiles; 8 kW for each body in the fire. Finds Veils.',
    why: { cost: '§7 unlocks: 700 kJ' },
  },
  starshell: {
    id: 'starshell', name: 'Starshell', branch: 'light', cost: 1200,
    blurb: 'Charges three 70 kJ shells on spare power and lobs them at crowds 2–7 tiles away.',
    why: { cost: '§7 unlocks: 1200 kJ (the strongest crowd answer costs the most)' },
  },
  lamp3: {
    id: 'lamp3', name: 'Lamp tier 3', branch: 'light', cost: 1350, requires: 'lamp2', stacks: true,
    blurb: 'Lamps can take a third tier, one way or the other: Arc lamp (27 kW, brighter) or Lantern (reach 5, 20 kW).',
    why: { cost: '§7 tier 3: 1.5 × its tier-2 project (900)' },
  },
  flood3: {
    id: 'flood3', name: 'Floodlight tier 3', branch: 'light', cost: 1500, requires: 'flood2', stacks: true,
    blurb: 'Floodlights can take a third tier, one way or the other: Blaze (54 kW, brighter) or Wide (a 100° cone for beside a road).',
    why: { cost: '§7 tier 3: 1.5 × its tier-2 project (1000)' },
  },
  beacon3: {
    id: 'beacon3', name: 'Beacon tier 3', branch: 'light', cost: 900, requires: 'beacon2', stacks: true,
    blurb: 'Beacons can take a third tier, one way or the other: Drag (slows 73%, 9 kW) or Halo (reach 6, 8 kW).',
    why: { cost: '§7 tier 3: 1.5 × its tier-2 project (600)' },
  },
  search3: {
    id: 'search3', name: 'Searchlight tier 3', branch: 'light', cost: 1650, requires: 'search2', stacks: true,
    blurb: 'Searchlights can take a third tier: Lance (68 kW, 58.8 kJ/s) or Long Eye (reach 9.5, 50 kW).',
    why: { cost: '§7 tier 3: 1.5 × its tier-2 project (1100)' },
  },
  brazier3: {
    id: 'brazier3', name: 'Brazier tier 3', branch: 'light', cost: 1350, requires: 'brazier2', stacks: true,
    blurb: 'Braziers can take a third tier: Inferno (18 kW a body, 16.8 kJ/s each) or Bonfire (reach 3.5, 13 kW a body).',
    why: { cost: '§7 tier 3: 1.5 × its tier-2 project (900)' },
  },
  star3: {
    id: 'star3', name: 'Starshell tier 3', branch: 'light', cost: 1800, requires: 'star2', stacks: true,
    blurb: 'Starshells can take a third tier: Nova (105 kJ shells, 22.5 kW) or Barrage (six shells in the magazine).',
    why: { cost: '§7 tier 3: 1.5 × its tier-2 project (1200)' },
  },
  flood2: {
    id: 'flood2', name: 'Floodlight tier 2', branch: 'light', cost: 1000,
    blurb: 'Floodlights can be upgraded: 36 kW at 0.72 → 25.9 kJ/s across the cone.',
    why: { cost: '§7 tier 2: 1000 kJ' },
  },
  beacon2: {
    id: 'beacon2', name: 'Beacon tier 2', branch: 'light', cost: 600,
    blurb: 'Beacons can be upgraded: slow 60% at 6 kW.',
    why: { cost: '§7 tier 2: 600 kJ' },
  },
  search2: {
    id: 'search2', name: 'Searchlight tier 2', branch: 'light', cost: 1100, requires: 'searchlight',
    blurb: 'Searchlights can be upgraded: 45 kW at 0.72 → 32.4 kJ/s.',
    why: { cost: '§7 tier 2: 1100 kJ' },
  },
  brazier2: {
    id: 'brazier2', name: 'Brazier tier 2', branch: 'light', cost: 900, requires: 'brazier',
    blurb: 'Braziers can be upgraded: 12 kW per body at 0.78 → 9.4 kJ/s each.',
    why: { cost: '§7 tier 2: 900 kJ' },
  },
  star2: {
    id: 'star2', name: 'Starshell tier 2', branch: 'light', cost: 1200, requires: 'starshell',
    blurb: 'Starshells can be upgraded: charge at 15 kW, 0.96 efficiency.',
    why: { cost: '§7 tier 2: 1200 kJ' },
  },
  vane: {
    id: 'vane', name: 'Vane', branch: 'power', cost: 600,
    blurb: 'Wind power anywhere on the grid: up to 15 kW, no fuel, varies with the wind.',
    why: { cost: '§7 unlocks: 600 kJ' },
  },
  bellows: {
    id: 'bellows', name: 'Bellows', branch: 'power', cost: 1000,
    blurb: 'Burners can be upgraded: 30 kW at 0.6 efficiency (more power from every rock).',
    why: { cost: '§7 Burner tier 2: 1000 kJ' },
  },
  deepbit: {
    id: 'deepbit', name: 'Mining', branch: 'power', cost: 700,
    blurb: 'Extractors can take a Deep bit (a rock every 5 s for 4 kW) or a Coker (coke, 2.5 rocks of heat each, for 10 kW: it pays with three Burners touching).',
    why: { cost: '§7 Extractor tier 2: 700 kJ' },
  },
  bank: {
    id: 'bank', name: 'Bank', branch: 'power', cost: 800,
    blurb: 'Jars can be upgraded: 1500 kJ, charge 25 kW, discharge 45 kW.',
    why: { cost: '§7 Jar tier 2: 800 kJ' },
  },
  flywheel: {
    id: 'flywheel', name: 'Flywheel', branch: 'power', cost: 700,
    blurb: 'Jars can become Flywheels instead of Banks: 300 kJ, but 60 kW in and 90 kW out. It spins down, so it is for a peak behind a full Node, not for carrying a wave: keep your Banks.',
    why: { cost: '§7 / §3.2 Flywheel: 700 kJ (the other Jar tier 2; Bank is 800 because it holds five times as much)' },
  },
  pulse: {
    id: 'pulse', name: 'Pulse', branch: 'power', cost: 900,
    blurb: 'A gaffer verb (Q): every Jar empties at once; 60% of it lands, split across the enemies within 3 tiles of a lit tower.',
    why: { cost: '§7 / §8 Pulse: 900 kJ (a verb that spends storage, priced like a tier 2)' },
  },
  reroute: {
    id: 'reroute', name: 'Reroute', branch: 'power', cost: 600,
    blurb: 'A gaffer verb (G): pay 100 kJ from your Jars to bring a cut Node back at once and guard it from Shades for 8 s.',
    why: { cost: '§7 / §8 Reroute: 600 kJ (a cheaper verb than Pulse: it saves a branch, not a wave)' },
  },
  longline: {
    id: 'longline', name: 'Wiring', branch: 'power', cost: 500,
    blurb: 'Nodes can be upgraded, one way or the other: a Long line reaches 6 tiles (losing 1 kW); a Busbar carries 120 kW but reaches only 2.5.',
    why: { cost: '§7 Node tier 2: 500 kJ' },
  },
};

export const RESEARCH_ORDER = [
  'lamp2', 'searchlight', 'brazier', 'starshell', 'flood2', 'beacon2', 'search2', 'brazier2', 'star2', 'lamp3', 'flood3', 'beacon3', 'search3', 'brazier3', 'star3',
  'vane', 'bellows', 'deepbit', 'bank', 'flywheel', 'pulse', 'reroute', 'longline',
];
