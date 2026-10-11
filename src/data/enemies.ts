// The slice's enemies (DESIGN.md §5). Health is energy: kJ of delivered damage to kill.

export type EnemyId = 'moth' | 'shade' | 'pall';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  /** one letter used in wave sequences */
  code: string;
  blurb: string;
  health: number;
  speed: number;
  bounty: number;
  leak: number;
  /** Shade: knocks nodes offline within this many tiles of its position, for knockTime s */
  knockRadius?: number;
  knockTime?: number;
  /** Pall: takes its Floodlight share and every share after it */
  shadow?: boolean;
  why: Record<string, string>;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  moth: {
    id: 'moth', name: 'Moth', code: 'M', blurb: 'Drawn to light. Walks the path.',
    health: 30, speed: 1.5, bounty: 5, leak: 1,
    why: {
      health: '§5 Moth: 30 kJ', speed: '§5 Moth: 1.5 t/s', bounty: '§1 bounty = round(health × 0.15) = 5 (§6 economy)', leak: '§5 Moth: 1 light',
    },
  },
  shade: {
    id: 'shade', name: 'Shade', code: 'S', blurb: 'Knocks out any Node right beside the path as it passes, for 10 s.',
    health: 90, speed: 1.0, bounty: 14, leak: 2, knockRadius: 1, knockTime: 10,
    why: {
      health: '§5 Shade: 90 kJ', speed: '§5 Shade: 1.0 t/s', bounty: '§1 bounty = round(health × 0.15) = 14 (§6 economy)', leak: '§5 Shade: 2 lights',
      knockRadius: '§5 Shade: nodes within 1 tile', knockTime: '§5 Shade: offline 10 s (§3 Node)',
    },
  },
  pall: {
    id: 'pall', name: 'Pall', code: 'P', blurb: 'Slow, heavy dark. In a Floodlight beam it drinks every share after its own.',
    health: 400, speed: 0.6, bounty: 60, leak: 5, shadow: true,
    why: {
      health: '§5 Pall: 400 kJ', speed: '§5 Pall: 0.6 t/s', bounty: '§1 bounty = round(health × 0.15) = 60 (§6 economy)', leak: '§5 Pall: 5 lights',
    },
  },
};

export const ENEMY_BY_CODE: Record<string, EnemyDef> = Object.fromEntries(Object.values(ENEMIES).map((e) => [e.code, e]));
