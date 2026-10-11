// The things of the Dim (DESIGN.md §5). Health is energy: kJ of delivered damage to kill.

export type EnemyId = 'moth' | 'flit' | 'shade' | 'veil' | 'snuffer' | 'pall' | 'siphon';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  /** one letter used in wave sequences */
  code: string;
  blurb: string;
  /** what answers it, for the intel card the first time it appears */
  answer: string;
  health: number;
  speed: number;
  bounty: number;
  leak: number;
  /** Flit: seconds to the next spawn when the next one is the same kind (they come in clumps) */
  packGap?: number;
  /** Shade: knocks nodes offline within this many tiles of its position, for knockTime s */
  knockRadius?: number;
  knockTime?: number;
  /** Snuffer: puts out Burners within this many tiles, for snuffTime s */
  snuffRadius?: number;
  snuffTime?: number;
  /** Veil: only a tower above the sight line (or Overcharged, or a Brazier's heat) can find it */
  veiled?: boolean;
  /** Siphon: taps the nearest building on a network within this many tiles and drinks drainKw
   *  from that line, ahead of every tier */
  drainRadius?: number;
  drainKw?: number;
  /** Pall: takes its Floodlight share and every share behind it */
  shadow?: boolean;
  /** fraction of a single (narrow) beam's damage that lands; the rest is drunk */
  narrowBeam?: number;
  /** where a road forks (§11 The Fork): 'light' takes the branch with more lit towers, 'dark'
   *  the one with fewer; without a lean it keeps the road the spawner gave it */
  lean?: 'light' | 'dark';
  why: Record<string, string>;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  moth: {
    id: 'moth', name: 'Moth', code: 'M', blurb: 'Drawn to light. Walks the path; where it forks, takes the brighter way.', lean: 'light',
    answer: 'Lamps at the inside of the bends.',
    health: 30, speed: 1.5, bounty: 5, leak: 1,
    why: {
      health: '§5 Moth: 30 kJ', speed: '§5 Moth: 1.5 t/s', bounty: '§1 bounty = round(health × 0.15) = 5 (§6 economy)', leak: '§5 Moth: 1 light',
    },
  },
  flit: {
    id: 'flit', name: 'Flit', code: 'F', blurb: 'Tiny and fast; comes in clumps of eight. Drawn to light like a Moth.', lean: 'light',
    answer: 'A Floodlight looking down a straight, a Starshell burst, or Lamps behind a Beacon. A Brazier needs a Beacon or tier 2.',
    health: 14, speed: 2.6, bounty: 2, leak: 1, packGap: 0.3,
    why: {
      health: '§5.1 Flit: 14 kJ', speed: '§5.1 Flit: 2.6 t/s', bounty: '§1 bounty = round(14 × 0.15) = 2', leak: '§5.1 Flit: 1 light',
      packGap: '§5.1 Flit: clumps 0.3 s apart (a clump of 8 brings 14 / 0.3 = 46.7 kJ/s, about eight Lamps)',
    },
  },
  shade: {
    id: 'shade', name: 'Shade', code: 'S', blurb: 'Cuts any Node within 3.5 tiles as it passes, for 6 s.',
    answer: 'Give power a second route (two Nodes, or the reach of the Hearth itself), Reroute a cut Node, or kill the Shade before it reaches your Nodes.',
    health: 90, speed: 1.0, bounty: 14, leak: 2, knockRadius: 3.5, knockTime: 6,
    why: {
      health: '§5 Shade: 90 kJ', speed: '§5 Shade: 1.0 t/s', bounty: '§1 bounty = round(health × 0.15) = 14 (§6 economy)', leak: '§5 Shade: 2 lights',
      knockRadius: '§5 Shade: nodes within 3.5 tiles (the third review: at 2.5 every Node could hide; at 4.5 none could, and a 12-Shade wave cut a bend for its whole length)', knockTime: '§5 Shade: offline 6 s (an outage to manage mid-wave, not a run-ender)',
    },
  },
  veil: {
    id: 'veil', name: 'Veil', code: 'V', blurb: 'Hidden in dim light: only a tower above 60% power can find it. Where a road forks, it keeps to the dark.', lean: 'dark',
    answer: 'Keep the wall out of brownout. Overcharged towers and Braziers always find it.',
    health: 70, speed: 1.3, bounty: 11, leak: 2, veiled: true,
    why: {
      health: '§5.1 Veil: 70 kJ', speed: '§5.1 Veil: 1.3 t/s', bounty: '§1 bounty = round(70 × 0.15) = 11', leak: '§5.1 Veil: 2 lights',
    },
  },
  snuffer: {
    id: 'snuffer', name: 'Snuffer', code: 'N', blurb: 'Puts out any Burner within 3.5 tiles: its burning rock is lost and it stays cold for 8 s.',
    answer: 'Keep Burners back from the path, or have Jars to carry the gap.',
    health: 160, speed: 0.8, bounty: 24, leak: 3, snuffRadius: 3.5, snuffTime: 8,
    why: {
      health: '§5.1 Snuffer: 160 kJ', speed: '§5.1 Snuffer: 0.8 t/s', bounty: '§1 bounty = round(160 × 0.15) = 24', leak: '§5.1 Snuffer: 3 lights',
      snuffRadius: '§5.1 Snuffer: Burners within 3.5 tiles (the north deposit is in reach, the south is not)', snuffTime: '§5.1 Snuffer: cold for 8 s',
    },
  },
  siphon: {
    id: 'siphon', name: 'Siphon', code: 'D', blurb: 'Taps any powered building within 2 tiles as it walks and drinks 12 kW from that line, ahead of every tower.', lean: 'light',
    answer: 'Kill it where it drinks: Overcharge it, or burn it in a Brazier. Spare kW or a charged Jar on that line shrugs it off; a tight line browns out.',
    health: 120, speed: 0.9, bounty: 18, leak: 2, drainRadius: 2, drainKw: 12,
    why: {
      health: '§5.1 Siphon: 120 kJ (between the Shade and the Snuffer: it lives long enough at a bend to cost something)', speed: '§5.1 Siphon: 0.9 t/s',
      bounty: '§1 bounty = round(120 × 0.15) = 18', leak: '§5.1 Siphon: 2 lights',
      drainRadius: '§5.1 Siphon: 2 tiles from a footprint (every tower at a bend is in reach)', drainKw: '§5.1 Siphon: 12 kW, one firing Lamp, served before every tier',
    },
  },
  pall: {
    id: 'pall', name: 'Pall', code: 'P', blurb: 'Slow, heavy dark. Drinks 3/4 of a narrow beam; in a Floodlight\'s cone it shadows everything behind it.',
    answer: 'Fire and bursts: a Brazier burns it in full, a Starshell burst lands on it whole. A Floodlight works only while the Pall is alone in its cone (Moths overtake it), so early on the road; Overcharge it there. Lamps and Searchlights barely scratch it.',
    health: 400, speed: 0.6, bounty: 60, leak: 5, shadow: true, narrowBeam: 0.25,
    why: {
      health: '§5 Pall: 400 kJ', speed: '§5 Pall: 0.6 t/s', bounty: '§1 bounty = round(health × 0.15) = 60 (§6 economy)', leak: '§5 Pall: 5 lights', narrowBeam: '§5 Pall: a single beam lands 1/4 (§6: the Pall needs burst)',
    },
  },
};

export const ENEMY_ORDER: EnemyId[] = ['moth', 'flit', 'shade', 'siphon', 'veil', 'snuffer', 'pall'];

export const ENEMY_BY_CODE: Record<string, EnemyDef> = Object.fromEntries(Object.values(ENEMIES).map((e) => [e.code, e]));
