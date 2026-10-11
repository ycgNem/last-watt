// The slice map (DESIGN.md §6 slice map, ROADMAP Milestone 1): 40 × 30 tiles, one path with
// two bends that hook around the Hearth, two emberrock deposits near it and one far out.

export interface MapDef {
  name: string;
  w: number;
  h: number;
  /** top-left tile of the 4×4 Hearth */
  hearth: { x: number; y: number };
  /** path polyline in tile coordinates (cell (x, y) has its centre at x + 0.5, y + 0.5);
   *  the first point is off the map edge (spawn), the last touches the Hearth (leak) */
  path: [number, number][];
  /** emberrock deposit tiles, one Extractor each */
  deposits: [number, number][][];
  /** where the camera starts, in tiles */
  focus: [number, number];
  why: Record<string, string>;
}

export const SLICE_MAP: MapDef = {
  name: 'The Last Station',
  w: 40,
  h: 30,
  hearth: { x: 18, y: 13 },
  path: [
    [-1, 6.5],
    [26.5, 6.5],
    [26.5, 15.5],
    [22, 15.5],
  ],
  deposits: [
    // near, south-west of the Hearth: inside the Hearth's own radius
    [[15, 18], [16, 18], [15, 19], [16, 19], [17, 19]],
    // near, north-west of the Hearth
    [[16, 9], [15, 10], [16, 10], [15, 11], [16, 11]],
    // far, out by the first straight: needs a chain of Nodes past the path
    [[6, 8], [7, 8], [6, 9], [7, 9], [8, 9], [7, 10]],
  ],
  focus: [20, 14],
  why: {
    w: '§6 / ROADMAP M0: 40 × 30 tiles', h: '§6 / ROADMAP M0: 40 × 30 tiles',
    hearth: '§6: the Hearth sits where both bends face it, so layout A costs one Node (§6 wave 1 budget)',
    path: '§6 slice map: 41 tiles, two bends (east 27.5 / south 9 / west 4.5), bends within reach of the Hearth',
    deposits: '§3 / §6 supply ceiling: two near deposits of 5 tiles and one far of 6, one Extractor per tile',
  },
};
