// The gaffer's skill tree (DESIGN.md §9, ROADMAP Milestone 8): bought with embers between runs.
// Three columns of three; each node needs the one above it. Every node changes a rule on the
// energy side (PLAN.md: no flat percentage boosts), and says so in `watt`.

export interface SkillDef {
  id: string;
  name: string;
  /** which column of the tree */
  column: 'storage' | 'supply' | 'gaffer';
  /** 1 (top) to 3 */
  row: number;
  cost: number;
  /** the node above it in its column */
  requires?: string;
  blurb: string;
  /** what it changes on the energy side, in numbers */
  watt: string;
  why: Record<string, string>;
}

export const SKILLS: Record<string, SkillDef> = {
  spareJar: {
    id: 'spareJar', name: 'Spare Jar', column: 'storage', row: 1, cost: 4,
    blurb: 'Every run starts with a Jar already built beside the Hearth.',
    watt: '600 kJ of storage from the first second, and 60 money not spent on it.',
    why: { cost: '§9: a first-row node costs 4 embers (a lost run at wave 5 pays 4)' },
  },
  wideMouth: {
    id: 'wideMouth', name: 'Wide Mouth', column: 'storage', row: 2, cost: 8, requires: 'spareJar',
    blurb: 'Jars charge half again as fast.',
    watt: 'Jars take 22.5 kW of spare power (was 15): a Jar fills in 27 s, not 40.',
    why: { cost: '§9: a second-row node costs 8 embers' },
  },
  bankedSpark: {
    id: 'bankedSpark', name: 'Banked Spark', column: 'storage', row: 3, cost: 12, requires: 'wideMouth',
    blurb: 'The first Jar of every run comes full.',
    watt: '600 kJ stored at once: five Lamp Overcharges, or a Pulse, before any spare power.',
    why: { cost: '§9: a third-row node costs 12 embers' },
  },
  hotHearth: {
    id: 'hotHearth', name: 'Hot Hearth', column: 'supply', row: 1, cost: 4,
    blurb: 'The Hearth burns hotter.',
    watt: 'The Hearth makes 10 kW at 20 lights (was 8): 0.5 kW a light.',
    why: { cost: '§9: a first-row node costs 4 embers' },
  },
  kindling: {
    id: 'kindling', name: 'Kindling', column: 'supply', row: 2, cost: 8, requires: 'hotHearth',
    blurb: 'Every Burner is built with three rocks already in it.',
    watt: 'A new Burner makes its 20 kW for 30 s before its Extractor has dug a rock.',
    why: { cost: '§9: a second-row node costs 8 embers' },
  },
  quickRelight: {
    id: 'quickRelight', name: 'Quick Relight', column: 'supply', row: 3, cost: 12, requires: 'kindling',
    blurb: 'A Burner put out by a Snuffer relights twice as fast.',
    watt: 'A snuffed Burner is cold 4 s after the Snuffer leaves (was 8): half the generation lost.',
    why: { cost: '§9: a third-row node costs 12 embers' },
  },
  headStart: {
    id: 'headStart', name: 'Head Start', column: 'gaffer', row: 1, cost: 4,
    blurb: 'The first research project of every run costs half.',
    watt: 'About 400 kJ less Lab draw for the first unlock (350 for a Brazier, 600 for a Starshell).',
    why: { cost: '§9: a first-row node costs 4 embers' },
  },
  coolGlass: {
    id: 'coolGlass', name: 'Cool Glass', column: 'gaffer', row: 2, cost: 8, requires: 'headStart',
    blurb: 'An Overcharge asks less of the grid for the same burst.',
    watt: 'An Overcharge asks 2.5× its draw (was 3×) and still fires 3×: an Overcharged Lamp asks 30 kW, not 36.',
    why: { cost: '§9: a second-row node costs 8 embers' },
  },
  slowFuse: {
    id: 'slowFuse', name: 'Slow Fuse', column: 'gaffer', row: 3, cost: 12, requires: 'coolGlass',
    blurb: 'A Shade has to linger before it cuts a Node.',
    watt: 'A Node stays lit until a Shade has been in reach for 1.5 s: a Shade walking past a Node\'s corner cuts nothing.',
    why: { cost: '§9: a third-row node costs 12 embers' },
  },
};

export const SKILL_ORDER = ['spareJar', 'wideMouth', 'bankedSpark', 'hotHearth', 'kindling', 'quickRelight', 'headStart', 'coolGlass', 'slowFuse'];

/** the numbers the nodes change (DESIGN.md §9) */
export const SKILL_RULES = {
  hotHearth: { v: 10, why: '§9 Hot Hearth: 10 kW at 20 lights' },
  wideMouth: { v: 1.5, why: '§9 Wide Mouth: Jars charge 1.5× as fast (22.5 kW)' },
  kindling: { v: 3, why: '§9 Kindling: three rocks in a new Burner (30 s)' },
  quickRelight: { v: 0.5, why: '§9 Quick Relight: half the Snuffer\'s 8 s' },
  headStart: { v: 0.5, why: '§9 Head Start: the first project at half its kJ' },
  coolGlass: { v: 2.5, why: '§9 Cool Glass: an Overcharge asks 2.5× its draw' },
  slowFuse: { v: 1.5, why: '§9 Slow Fuse: 1.5 s in reach before a Node is cut' },
};

/** embers a run pays (§9): one for every wave cleared, and half the lights left on a win, rounded up */
export function embersFor(wavesCleared: number, won: boolean, lights: number): number {
  return wavesCleared + (won ? Math.ceil(lights / 2) : 0);
}

/** can this node be bought now? (null when it can) */
export function skillProblem(id: string, owned: string[], embers: number): string | null {
  const s = SKILLS[id];
  if (!s) return 'No such skill';
  if (owned.includes(id)) return 'Already learned';
  if (s.requires && !owned.includes(s.requires)) return `Needs ${SKILLS[s.requires].name} first`;
  if (embers < s.cost) return `Needs ${s.cost} embers`;
  return null;
}
