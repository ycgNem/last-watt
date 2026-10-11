// Geometry helpers shared by the systems: footprints, coverage, the path polyline.
import type { MapDef } from '../data/map';

export interface Rect { x: number; y: number; w: number; h: number }

/** distance from a point to a rectangle (0 inside) */
export function pointRectDist(px: number, py: number, r: Rect): number {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** does any tile of footprint `b` have its centre within `radius` of footprint `a`? */
export function covers(a: Rect, radius: number, b: Rect): boolean {
  for (let y = b.y; y < b.y + b.h; y++)
    for (let x = b.x; x < b.x + b.w; x++) if (pointRectDist(x + 0.5, y + 0.5, a) <= radius) return true;
  return false;
}

/** footprints share an edge or a corner */
export function touches(a: Rect, b: Rect): boolean {
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h &&
    !(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h);
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export class Path {
  pts: [number, number][];
  seg: number[] = [];
  length = 0;
  /** tiles the path runs over, as y * w + x */
  cells = new Set<number>();

  constructor(map: MapDef) {
    this.pts = map.path;
    for (let i = 1; i < this.pts.length; i++) {
      const [ax, ay] = this.pts[i - 1], [bx, by] = this.pts[i];
      const l = Math.hypot(bx - ax, by - ay);
      this.seg.push(l);
      this.length += l;
      const steps = Math.ceil(l * 4);
      for (let s = 0; s <= steps; s++) {
        const x = ax + ((bx - ax) * s) / steps, y = ay + ((by - ay) * s) / steps;
        const cx = Math.floor(x), cy = Math.floor(y);
        if (cx >= 0 && cy >= 0 && cx < map.w && cy < map.h) this.cells.add(cy * map.w + cx);
      }
    }
  }

  /** point at distance d along the path */
  at(d: number): { x: number; y: number; dx: number; dy: number } {
    let rem = Math.max(0, d);
    for (let i = 0; i < this.seg.length; i++) {
      const [ax, ay] = this.pts[i], [bx, by] = this.pts[i + 1];
      const l = this.seg[i];
      if (rem <= l || i === this.seg.length - 1) {
        const t = l > 0 ? Math.min(1, rem / l) : 0;
        return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, dx: Math.sign(bx - ax), dy: Math.sign(by - ay) };
      }
      rem -= l;
    }
    const [x, y] = this.pts[this.pts.length - 1];
    return { x, y, dx: 0, dy: 0 };
  }
}
