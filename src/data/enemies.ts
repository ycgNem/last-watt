// The things of the Dim (DESIGN.md §5). Health is energy: kJ of delivered damage to kill.

export type EnemyId = 'moth' | 'flit' | 'shade' | 'veil' | 'snuffer' | 'pall';

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
  /** Pall: takes its Floodlight share and every share behind it */
  shadow?: boolean;
  /** fraction of a single (narrow) beam's damage that lands; the rest is drunk */
  narrowBeam?: number;
  why: Record<string, string>;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  moth: {
    id: 'moth', name: 'Moth', code: 'M', blurb: 'Drawn to light. Walks the path.',
    answer: 'Lamps at the inside of the bends.',
    health: 30, speed: 1.5, bounty: 5, leak: 1,
    why: {
      health: '§5 Moth: 30 kJ', speed: '§5 Moth: 1.5 t/s', bounty: '§1 bounty = round(health × 0.15) = 5 (§6 economy)', leak: '§5 Moth: 1 light',
    },
  },
  flit: {
    id: 'flit', name: 'Flit', code: 'F', blurb: 'Tiny and fast; comes in clumps of eight.',
    answer: 'Too many for single beams to keep up: a Floodlight cone, a Brazier or a Starshell burst.',
    health: 14, speed: 2.6, bounty: 2, leak: 1, packGap: 0.3,
    why: {
      health: '§5.1 Flit: 14 kJ', speed: '§5.1 Flit: 2.6 t/s', bounty: '§1 bounty = round(14 × 0.15) = 2', leak: '§5.1 Flit: 1 light',
      packGap: '§5.1 Flit: clumps 0.3 s apart (a clump of 8 brings 37 kJ/s, three Lamps)',
    },
  },
  shade: {
    id: 'shade', name: 'Shade', code: 'S', blurb: 'Cuts any Node within 2.5 tiles as it passes, for 10 s.',
    answer: 'Keep Nodes 3+ tiles from the path, or give power a second route.',
    health: 90, speed: 1.0, bounty: 14, leak: 2, knockRadius: 2.5, knockTime: 10,
    why: {
      health: '§5 Shade: 90 kJ', speed: '§5 Shade: 1.0 t/s', bounty: '§1 bounty = round(health × 0.15) = 14 (§6 economy)', leak: '§5 Shade: 2 lights',
      knockRadius: '§5 Shade: nodes within 2.5 tiles (was 1: §6, the critic\'s first review)', knockTime: '§5 Shade: offline 10 s (§3 Node)',
    },
  },
  veil: {
    id: 'veil', name: 'Veil', code: 'V', blurb: 'Hidden in dim light: only a tower above 60% power can find it.',
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
  pall: {
    id: 'pall', name: 'Pall', code: 'P', blurb: 'Slow, heavy dark. Drinks 3/4 of a narrow beam; in a Floodlight\'s cone it shadows everything behind it.',
    answer: 'Floodlights, Starshells, Braziers, and Overcharge. Lamps barely scratch it.',
    health: 400, speed: 0.6, bounty: 60, leak: 5, shadow: true, narrowBeam: 0.25,
    why: {
      health: '§5 Pall: 400 kJ', speed: '§5 Pall: 0.6 t/s', bounty: '§1 bounty = round(health × 0.15) = 60 (§6 economy)', leak: '§5 Pall: 5 lights', narrowBeam: '§5 Pall: a single beam lands 1/4 (§6: the Pall needs burst)',
    },
  },
};

export const ENEMY_ORDER: EnemyId[] = ['moth', 'flit', 'shade', 'veil', 'snuffer', 'pall'];

export const ENEMY_BY_CODE: Record<string, EnemyDef> = Object.fromEntries(Object.values(ENEMIES).map((e) => [e.code, e]));
