// Lesson cards (ROADMAP Milestone 10): the first time something happens to the grid, a card says
// what it was and what answers it, once per profile, in the same place and style as the card for a
// new enemy. Afterwards the message feed's shorter hints carry it. Text only: the numbers they
// quote are read from the data where they could drift.
import { BUILDINGS, type BuildingId } from '../data/buildings';
import { ENEMIES } from '../data/enemies';
import { RULES } from '../data/rules';

export type LessonId = 'brownout' | 'waste' | 'knock' | 'full';

export interface Lesson {
  title: string;
  /** the building drawn on the card */
  icon: BuildingId;
  body: string;
  answer: string;
}

export const LESSONS: Record<LessonId, Lesson> = {
  brownout: {
    title: 'BROWNOUT',
    icon: 'lamp',
    body: `Your towers ask for more watts than you make, so every one fires slower: the WALL bar (top) is their share. Under ${Math.round(RULES.starvedBelow.v * 100)}% they flicker violet, and Veils walk past.`,
    answer: 'More Burners, a charged Jar, or shed something (X). V shows each power line and what it lacks.',
  },
  waste: {
    title: 'WASTED POWER',
    icon: 'jar',
    body: 'Power nobody asks for is gone: the WASTED number (top). Between waves almost all of it is.',
    answer: 'A Jar (-) stores it and gives it back at the peaks; a Lab (=) turns it into research.',
  },
  knock: {
    title: 'A NODE CUT',
    icon: 'node',
    body: `A Shade passed within ${ENEMIES.shade.knockRadius} tiles of a Node and cut it for ${ENEMIES.shade.knockTime} s: everything that drew through it went dark.`,
    answer: 'Nodes further from the road (red shows a Shade\'s reach as you place one), a second route, or Reroute (G).',
  },
  full: {
    title: 'A FULL NODE',
    icon: 'node',
    body: `A Node carries at most ${BUILDINGS.node.carryKw} kW. Past that the towers behind it share what fits: the link flashes violet and says FULL.`,
    answer: 'A second route from the Hearth, a Jar past the Node, Burners on the far side, or a Busbar (Wiring).',
  },
};
