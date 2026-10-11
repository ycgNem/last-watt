// The maps (DESIGN.md §6 slice map, §11 maps; ROADMAP Milestone 7). Each is 40 × 30 tiles with
// one or more roads that end at the Hearth, emberrock deposits, and its own wind and pace.

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
  why: {
    w: '§6 / ROADMAP M0: 40 × 30 tiles', h: '§6 / ROADMAP M0: 40 × 30 tiles',
    hearth: '§6: the Hearth sits where both bends face it, so layout A costs one Node (§6 wave 1 budget)',
    paths: '§6 slice map: 41 tiles, two bends (east 27.5 / south 9 / west 4.5), bends within reach of the Hearth',
    deposits: '§3 / §6 supply ceiling: two near deposits of 5 tiles and one far of 6, one Extractor per tile',
    windMean: '§3.2 wind: 0.55 on the station map', pace: '§6: the waves were tuned on this map', unlockWave: '§11: always open',
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
  pace: 1,
  unlockWave: 4,
  why: {
    w: '§11: 40 × 30 tiles', h: '§11: 40 × 30 tiles',
    hearth: '§11 Switchback: the Hearth under the last two legs',
    paths: '§11 Switchback: 72 tiles, five bends; the strip between legs 2 and 4 is 7 tiles deep',
    deposits: '§11 Switchback: one near deposit, one in the exposed strip, one far',
    windMean: '§11 Switchback: an open plateau, wind mean 0.7 (a Vane averages 10.5 kW)',
    pace: '§11 Switchback: 1.0 (a longer road adds exposure, not throughput; the bot finds the station pace fits)',
    unlockWave: '§11: reach wave 4 anywhere',
  },
};

export const TWO_ROADS: MapDef = {
  id: 'tworoads',
  name: 'Two Roads',
  blurb: 'Two roads come down either side of a narrow ridge to the Hearth. The ridge sees both, and both can reach it.',
  w: 40,
  h: 30,
  hearth: { x: 17, y: 19 },
  paths: [
    [[-1, 4.5], [7.5, 4.5], [7.5, 12.5], [16.5, 12.5], [16.5, 20.5], [16.9, 20.5]],
    [[41, 6.5], [30.5, 6.5], [30.5, 12.5], [20.5, 12.5], [20.5, 18.9]],
  ],
  deposits: [
    // south of the Hearth, safe from Shades
    [[17, 24], [18, 24], [19, 24], [18, 25], [19, 25]],
    // north of the ridge, out of reach of both roads but far from the Hearth
    [[18, 7], [19, 7], [18, 8], [19, 8], [20, 8]],
    // far west, past the west road
    [[2, 15], [3, 15], [2, 16], [3, 16]],
  ],
  focus: [19.5, 18.5],
  firstLamps: 'Two Lamps (1) on the ridge between the two last legs',
  jarSpot: [21, 22],
  windMean: 0.55,
  pace: 1.8,
  unlockWave: 8,
  why: {
    w: '§11: 40 × 30 tiles', h: '§11: 40 × 30 tiles',
    hearth: '§11 Two Roads: the Hearth at the foot of the ridge, between the two last legs',
    paths: '§11 Two Roads: 34 and 33 tiles, four and three bends; the last legs run either side of a 3-wide ridge, so a tower on it sees both roads; spawns alternate roads per kind, a clump keeps to one',
    deposits: '§11 Two Roads: one safe south, one north of the ridge behind exposed Nodes, one far west',
    windMean: '§3.2 wind: 0.55', pace: '§11 Two Roads: spacing × 1.8 (each road sees half the spawns; the Palls are limited by exposure, so the pace is set by the crowds of waves 8–12: the bot wins with 5 lights)',
    unlockWave: '§11: reach wave 8 anywhere',
  },
};

export const MAPS: MapDef[] = [SLICE_MAP, SWITCHBACK, TWO_ROADS];

export function mapById(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? SLICE_MAP;
}
