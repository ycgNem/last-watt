// The sprite sheets drawn by pixel-art-studio (pixel-art/<slug>/build.py → src/assets/art/).
// Each sheet is loaded once, and for buildings the starved and dark variants (STYLE.md rule 1,
// maths in pixel-art/README.md) are baked at load time.

export interface SheetMeta { w: number; h: number; frames: number; rows: number; fps: number; light?: [number, number]; names?: string[] }

export interface Sheet {
  meta: SheetMeta;
  img: HTMLCanvasElement;
  starved?: HTMLCanvasElement;
  dark?: HTMLCanvasElement;
  /** white silhouette for flashes */
  white?: HTMLCanvasElement;
}

const pngs = import.meta.glob('../assets/art/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const metas = import.meta.glob('../assets/art/*.json', { eager: true, import: 'default' }) as Record<string, SheetMeta>;

export const SHEETS = new Map<string, Sheet>();

function slugOf(path: string) {
  return path.split('/').pop()!.replace(/\.(png|json)$/, '');
}

function remap(src: HTMLCanvasElement, fn: (r: number, g: number, b: number) => [number, number, number]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    const [r, g, b] = fn(p[i], p[i + 1], p[i + 2]);
    p[i] = r;
    p[i + 1] = g;
    p[i + 2] = b;
  }
  ctx.putImageData(d, 0, 0);
  return c;
}

const STARVED = (r: number, g: number, b: number): [number, number, number] => [
  Math.round((r + (0x40 - r) * 0.45) * 0.8), Math.round((g + (0x27 - g) * 0.45) * 0.8), Math.round((b + (0x51 - b) * 0.45) * 0.8),
];
const DARK = (r: number, g: number, b: number): [number, number, number] => [
  Math.round(r + (0x15 - r) * 0.82), Math.round(g + (0x1d - g) * 0.82), Math.round(b + (0x28 - b) * 0.82),
];

const BUILDING_SLUGS = new Set([
  'hearth', 'lamp', 'lamp2', 'floodlight', 'floodlight2', 'beacon', 'beacon2', 'node', 'extractor', 'burner', 'burner2', 'jar', 'lab',
  'searchlight', 'searchlight2', 'brazier', 'brazier2', 'starshell', 'starshell2', 'vane',
]);

export async function loadArt(): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const [path, url] of Object.entries(pngs)) {
    const slug = slugOf(path);
    const meta = Object.entries(metas).find(([p]) => slugOf(p) === slug)?.[1];
    if (!meta) continue;
    jobs.push(
      new Promise<void>((resolve) => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement('canvas');
          c.width = im.width;
          c.height = im.height;
          c.getContext('2d')!.drawImage(im, 0, 0);
          const sheet: Sheet = { meta, img: c };
          if (BUILDING_SLUGS.has(slug)) {
            sheet.starved = remap(c, STARVED);
            sheet.dark = remap(c, DARK);
          }
          sheet.white = remap(c, () => [235, 237, 233]);
          SHEETS.set(slug, sheet);
          resolve();
        };
        im.onerror = () => resolve();
        im.src = url;
      }),
    );
  }
  await Promise.all(jobs);
}

export type Variant = 'lit' | 'starved' | 'dark' | 'white';

/** draw frame `f` (row `row`) of a sheet with its top-left at screen (x, y), scaled by integer z */
export function drawFrame(ctx: CanvasRenderingContext2D, slug: string, f: number, x: number, y: number, z: number, variant: Variant = 'lit', row = 0, flip = false): boolean {
  const s = SHEETS.get(slug);
  if (!s) return false;
  const m = s.meta;
  const src = variant === 'starved' ? s.starved ?? s.img : variant === 'dark' ? s.dark ?? s.img : variant === 'white' ? s.white ?? s.img : s.img;
  const fi = ((f % m.frames) + m.frames) % m.frames;
  if (flip) {
    ctx.save();
    ctx.translate(Math.round(x + m.w * z), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(src, fi * m.w, row * m.h, m.w, m.h, 0, 0, m.w * z, m.h * z);
    ctx.restore();
  } else ctx.drawImage(src, fi * m.w, row * m.h, m.w, m.h, Math.round(x), Math.round(y), m.w * z, m.h * z);
  return true;
}

/** a named frame of a sheet (tiles, icons) */
export function frameIndex(slug: string, name: string): number {
  return SHEETS.get(slug)?.meta.names?.indexOf(name) ?? -1;
}

export function drawIcon(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, z = 1): boolean {
  const i = frameIndex('icons', name);
  if (i < 0) return false;
  return drawFrame(ctx, 'icons', i, x, y, z);
}
