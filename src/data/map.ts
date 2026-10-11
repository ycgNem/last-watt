// The maps (DESIGN.md §6 slice map, §11 maps; ROADMAP Milestone 7). Each is 40 × 30 tiles with
// one or more roads that end at the Hearth, emberrock deposits, and its own wind and pace.
import { WAVES } from './waves';

export interface MapDef {
  id: string;
  name: string;
  /** one line for the map picker */
  blurb: string;
  w: number;
  h: number;
  /** top-left tile of the 4×4 Hearth */
  hearth: { x: number; y: number };
  /** road polylines in tile coordinates (cell (x, y) has its centre at x + 0.5, y + 0.5); each
   *  starts off the map edge (spawn) and ends touching the Hearth (leak). A wave's spawns take
   *  the roads in turn; a clump stays on one road. */
  paths: [number, number][][];
  /** emberrock deposit tiles, one Extractor each */
  deposits: [number, number][][];
  /** where the camera starts, in tiles */
  focus: [number, number];
  /** the FIRST STEPS card's first line, where this map's first Lamps go (the station's when left out) */
  firstLamps?: string;
  /** where the Spare Jar skill builds its Jar (beside the Hearth, clear of the tutorial and bot spots) */
  jarSpot: [number, number];
  /** the wind's mean on this map (a Vane's share of its rating), §3.2 */
  windMean: number;
  /** every wave's spacing × this (§11) */
  pace: number;
  /** reach this wave on any map to play it */
  unlockWave: number;
  /** tiles along each road where enemies come out of the dark (the road runs on to the edge) */
  spawnAt: number;
  /** this map's own sequences for some waves, in place of the table's (§11) */
  waves?: Record<number, string>;
  /** a short name for each road, when there are several (the NEXT strip says what takes which) */
  roadNames?: string[];
  /** a fork (§11 The Fork): roads 0 and 1 run together for `at` tiles, split, and meet again at
   *  `until[i]` along each; enemies choose their branch at the fork by its light (sim/fork.ts) */
  fork?: { at: number; until: [number, number]; names: [string, string] };
  why: Record<string, string>;
}

export const SLICE_MAP: MapDef = {
  id: 'station',
  name: 'The Last Station',
  blurb: 'One road that bends twice round the Hearth. Two near deposits.',
  w: 40,
  h: 30,
  hearth: { x: 18, y: 13 },
  paths: [[
    [-1, 6.5],
    [26.5, 6.5],
    [26.5, 15.5],
    [22, 15.5],
  ]],
  deposits: [
    // near, south-west of the Hearth: inside the Hearth's own radius
    [[15, 18], [16, 18], [15, 19], [16, 19], [17, 19]],
    // near, north-west of the Hearth
    [[16, 9], [15, 10], [16, 10], [15, 11], [16, 11]],
    // far, out by the first straight: needs a chain of Nodes past the path
    [[6, 8], [7, 8], [6, 9], [7, 9], [8, 9], [7, 10]],
  ],
  focus: [20, 13.5],
  jarSpot: [21, 17],
  windMean: 0.55,
  pace: 1,
  unlockWave: 0,
  spawnAt: 6,
  why: {
    w: '§6 / ROADMAP M0: 40 × 30 tiles', h: '§6 / ROADMAP M0: 40 × 30 tiles',
    hearth: '§6: the Hearth sits where both bends face it, so layout A costs one Node (§6 wave 1 budget)',
    paths: '§6 slice map: 41 tiles, two bends (east 27.5 / south 9 / west 4.5), bends within reach of the Hearth',
    deposits: '§3 / §6 supply ceiling: two near deposits of 5 tiles and one far of 6, one Extractor per tile',
    windMean: '§3.2 wind: 0.55 on the station map', pace: '§6: the waves were tuned on this map (the first map stays forgiving: §11 the fourth review)', unlockWave: '§11: always open', spawnAt: '§6: enemies appear 6 tiles in (the third review: 15 s of walking before contact every wave)',
  },
};

export const SWITCHBACK: MapDef = {
  id: 'switchback',
  name: 'The Switchback',
  blurb: 'A long road that doubles back on itself. One near deposit, a strong wind, and a rich strip between two legs that Shades can always reach.',
  w: 40,
  h: 30,
  hearth: { x: 18, y: 20 },
  paths: [[
    [8.5, -1],
    [8.5, 5.5],
    [31.5, 5.5],
    [31.5, 12.5],
    [11.5, 12.5],
    [11.5, 21.5],
    [17.9, 21.5],
  ]],
  deposits: [
    // near, south-east of the Hearth
    [[23, 24], [24, 24], [23, 25], [24, 25], [25, 25]],
    // in the strip between the first two legs: rich, and every Node there is in a Shade's reach
    [[18, 8], [19, 8], [18, 9], [19, 9], [20, 9], [19, 10]],
    // far, east past the third leg
    [[34, 15], [35, 15], [34, 16], [35, 16], [35, 17]],
  ],
  focus: [21, 18.5],
  firstLamps: 'Two Lamps (1) inside the bends by the Hearth (a Node, 7, carries power)',
  jarSpot: [22, 22],
  windMean: 0.7,
  pace: 0.9,
  unlockWave: 4,
  spawnAt: 4,
  // the long road kills Palls by exposure alone, so its late waves bring more of them, and waves
  // 9-12 half again (the third review: the plan won 20/20 with 930 left and no verb mattered; the
  // sixth: wave 9 heavier and wave 10 a Pall lighter, so the step into wave 10 is not ×2.3)
  waves: {
    8: WAVES[7].seq + 'PP',
    9: WAVES[8].seq + WAVES[8].seq.slice(0, WAVES[8].seq.length >> 1) + 'P',
    10: WAVES[9].seq + WAVES[9].seq.slice(0, WAVES[9].seq.length >> 1) + 'P',
    11: WAVES[10].seq + WAVES[10].seq.slice(0, WAVES[10].seq.length >> 1) + 'PP',
    12: WAVES[11].seq + WAVES[11].seq.slice(0, WAVES[11].seq.length >> 1) + 'PPP',
  },
  why: {
    w: '§11: 40 × 30 tiles', h: '§11: 40 × 30 tiles',
    hearth: '§11 Switchback: the Hearth under the last two legs',
    paths: '§11 Switchback: 72 tiles, five bends; the strip between legs 2 and 4 is 7 tiles deep',
    deposits: '§11 Switchback: one near deposit, one in the exposed strip, one far',
    windMean: '§11 Switchback: an open plateau, wind mean 0.7 (a Vane averages 10.5 kW)',
    pace: '§11 Switchback: 0.9 (the third review: at 1.0 the plan won 20/20 with 930 money left and no Jars)',
    unlockWave: '§11: reach wave 4 anywhere', spawnAt: '§11 Switchback: 4 tiles in (its first leg is 6.5 long)',
  },
};

export const TWO_ROADS: MapDef = {
  id: 'tworoads',
  name: 'Two Roads',
  blurb: 'Two roads from either edge meet at a junction far above the Hearth and come down as one. Everything passes the long last stretch; towers up at the junction need a chain of Nodes past where the Hearth reaches.',
  w: 40,
  h: 30,
  hearth: { x: 17, y: 19 },
  paths: [
    [[-1, 4.5], [7.5, 4.5], [7.5, 9.5], [18.5, 9.5], [18.5, 18.9]],
    [[41, 6.5], [30.5, 6.5], [30.5, 9.5], [18.5, 9.5], [18.5, 18.9]],
  ],
  deposits: [
    // south of the Hearth, safe from Shades
    [[17, 24], [18, 24], [19, 24], [18, 25], [19, 25]],
    // north of the junction, 4.5 tiles from the roads: inside a Snuffer's 5, far from the Hearth
    [[18, 3], [19, 3], [18, 4], [19, 4], [20, 4]],
    // far west, past the west road
    [[2, 15], [3, 15], [2, 16], [3, 16]],
  ],
  focus: [19.5, 17],
  firstLamps: 'Two Lamps (1) beside the last stretch, where both roads come down as one',
  roadNames: ['W', 'E'],
  jarSpot: [21, 22],
  windMean: 0.55,
  pace: 1.4,
  unlockWave: 8,
  spawnAt: 4,
  why: {
    w: '§11: 40 × 30 tiles', h: '§11: 40 × 30 tiles',
    hearth: '§11 Two Roads: the Hearth under the shared last stretch',
    paths: '§11 Two Roads: 34 and 35 tiles; they meet at a junction 9.4 tiles above the Hearth (the fourth review: at 7.4 one Node beside the Hearth fed the junction) and share the last stretch, so it sees every enemy (the third review: two separate last legs halved the wall and lost every human-speed run)',
    deposits: '§11 Two Roads: one safe south, one north of the junction (4.5 tiles from the roads), one far west',
    windMean: '§3.2 wind: 0.55', pace: '§11 Two Roads: spacing × 1.4 (two roads bring the waves in from two sides; the bot sweep in §11)',
    unlockWave: '§11: reach wave 8 anywhere', spawnAt: '§11 Two Roads: 4 tiles in (its first legs are 8.5 and 10.5 long)',
  },
};

// The Fork: one road in from the west splits at a fork. The Loop runs a long way round the north
// and comes back along the same line; the Cut goes straight on. They meet above the Hearth and
// come down together.
const FORK_TRUNK: [number, number][] = [[-1, 15.5], [7.5, 15.5]];
const FORK_LOOP: [number, number][] = [[7.5, 6.5], [31.5, 6.5], [31.5, 15.5], [19.5, 15.5]];
const FORK_CUT: [number, number][] = [[19.5, 15.5]];
const FORK_DOWN: [number, number][] = [[19.5, 21.9]];

export const THE_FORK: MapDef = {
  id: 'fork',
  name: 'The Fork',
  blurb: 'The road splits: a long Loop round the north, or the short Cut. Moths take the branch with more light on it, Veils the darker. B darkens a branch to turn them.',
  w: 40,
  h: 30,
  hearth: { x: 18, y: 22 },
  paths: [
    [...FORK_TRUNK, ...FORK_LOOP, ...FORK_DOWN],
    [...FORK_TRUNK, ...FORK_CUT, ...FORK_DOWN],
  ],
  fork: { at: 8.5, until: [62.5, 20.5], names: ['LOOP', 'CUT'] },
  deposits: [
    // south-west of the Hearth, safe
    [[14, 24], [15, 24], [14, 25], [15, 25], [16, 25]],
    // inside the Loop: rich, and a Snuffer on the Loop can reach it
    [[18, 9], [19, 9], [20, 9], [18, 10], [19, 10], [20, 10]],
    // far east, past the Loop's last leg
    [[35, 22], [36, 22], [35, 23], [36, 23]],
  ],
  focus: [16, 17.5],
  firstLamps: 'Two Lamps (1) beside the road above the Hearth, where both ways come down as one. At the fork Moths take the way with more lit towers',
  jarSpot: [22, 24],
  windMean: 0.55,
  pace: 1,
  unlockWave: 6,
  spawnAt: 3,
  why: {
    w: '§11: 40 × 30 tiles', h: '§11: 40 × 30 tiles',
    hearth: '§11 The Fork: the Hearth under the shared last stretch',
    paths: '§11 The Fork: a trunk of 8.5 tiles, the Loop 54 and the Cut 12, then 6.4 shared down to the Hearth (69 or 27 tiles in all)',
    fork: '§11 The Fork: the roads share the trunk (8.5) and split; the Loop rejoins at 62.5, the Cut at 20.5',
    deposits: '§11 The Fork: one safe south-west, one rich inside the Loop, one far east',
    windMean: '§3.2 wind: 0.55', pace: '§11 The Fork: the table\'s spacing (the bot sweep in §11)',
    unlockWave: '§11: reach wave 6 anywhere', spawnAt: '§11 The Fork: 3 tiles in, 5.5 before the fork',
  },
};

export const MAPS: MapDef[] = [SLICE_MAP, SWITCHBACK, THE_FORK, TWO_ROADS];

export function mapById(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? SLICE_MAP;
}
