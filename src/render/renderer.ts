// World rendering: baked ground, y-sorted buildings in their readability state, the darkness
// buffer with a light hole per powered thing (the primary read of grid state, STYLE.md), then
// everything that must read through the dark: wires, beams, enemies, effects.
import { BUILDINGS, type BuildingId } from '../data/buildings';
import { C, rgb, rgba } from '../data/palette';
import { RULES } from '../data/rules';
import { ENEMIES } from '../data/enemies';
import type { Game } from '../sim/Game';
import { covers, pointRectDist, touches } from '../sim/geom';
import type { Building, Enemy } from '../sim/types';
import type { LineReport, Neck } from '../sim/lines';
import { coneCatchers } from '../sim/systems/towers';
import { hash2 } from '../engine/rng';
import { drawFrame, frameIndex, SHEETS, type Variant } from './art';
import { drawText, textWidth } from '../ui/font';

export const TILE = 16;

export interface Light { x: number; y: number; r: number; i: number; c: string; flicker?: boolean; white?: boolean }

export interface Fx {
  kind: 'float' | 'puff' | 'spark' | 'ring' | 'burst';
  x: number;
  y: number;
  t: number;
  life: number;
  text?: string;
  color?: string;
  vx?: number;
  vy?: number;
}

export interface Overlay {
  /** build mode: the building being placed and where */
  ghost?: { id: BuildingId; x: number; y: number; ok: boolean };
  hover?: Building;
  selected?: Building;
  /** show where power reaches (build mode) */
  coverage?: boolean;
  /** the tutorial's suggested footprint */
  spot?: { x: number; y: number; size: number };
  /** which enemies' reach to show in red while placing (only once they matter) */
  danger?: { shade: boolean; snuffer: boolean };
  /** the Lines view (V): every network outlined in its own colour, with what holds it back */
  lines?: LineReport[];
}

/** a colour per power line in the Lines view, and a colour per bottleneck */
const LINE_COLORS = [C.gold, C.cyan, C.lime, C.orange, C.ice, C.tan];
const NECK_COLORS: Record<Neck, string> = { nopower: C.violet, fuel: C.ember, short: C.ember, peak: C.amber, waste: C.sky, loss: C.amber, ok: C.lime };

export class Renderer {
  ctx: CanvasRenderingContext2D;
  W = 0;
  H = 0;
  cam = { x: 0, y: 0, z: 3 };
  time = 0;
  fx: Fx[] = [];
  /** red vignette after a leak, white after an Overcharge */
  flash = { red: 0, white: 0 };
  /** screen flashes on (a setting: off for anyone they bother) */
  flashOn = true;
  private ground: HTMLCanvasElement | null = null;
  private groundFor: Game | null = null;
  private light: HTMLCanvasElement;
  private glow: HTMLCanvasElement;
  private wires: { a: Building; b: Building }[] = [];
  private wiresVersion = -1;
  /** dim the whole scene (title screen) */
  dimAll = 0;
  /** a Vane's blade frame, advanced with the wind (render-only state) */
  private spins = new Map<number, number>();
  private frameDt = 0;
  /** short-lived lights: Starshell bursts */
  flashes: { x: number; y: number; r: number; t: number; life: number }[] = [];

  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.light = document.createElement('canvas');
    this.glow = document.createElement('canvas');
  }

  resize(w: number, h: number) {
    this.W = w;
    this.H = h;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  // ---- coordinates ----

  /** world px -> screen px */
  sx(wx: number) {
    return Math.round((wx - this.cam.x) * this.cam.z + this.W / 2);
  }
  sy(wy: number) {
    return Math.round((wy - this.cam.y) * this.cam.z + this.H / 2);
  }
  screenToTile(px: number, py: number) {
    const wx = (px - this.W / 2) / this.cam.z + this.cam.x;
    const wy = (py - this.H / 2) / this.cam.z + this.cam.y;
    return { x: Math.floor(wx / TILE), y: Math.floor(wy / TILE), fx: wx / TILE, fy: wy / TILE };
  }

  clampCamera(g: Game, hudTop = 0) {
    const mw = g.map.w * TILE, mh = g.map.h * TILE;
    const vw = this.W / this.cam.z, vh = this.H / this.cam.z;
    const pad = 2 * TILE;
    this.cam.x = vw >= mw + pad * 2 ? mw / 2 : Math.max(vw / 2 - pad, Math.min(mw - vw / 2 + pad, this.cam.x));
    this.cam.y = vh >= mh + pad * 2 ? mh / 2 : Math.max(vh / 2 - pad - hudTop / this.cam.z, Math.min(mh - vh / 2 + pad, this.cam.y));
    // snap so world pixels land on whole screen pixels
    this.cam.x = Math.round(this.cam.x * this.cam.z) / this.cam.z;
    this.cam.y = Math.round(this.cam.y * this.cam.z) / this.cam.z;
  }

  // ---- ground ----

  private bakeGround(g: Game) {
    const c = document.createElement('canvas');
    c.width = g.map.w * TILE;
    c.height = g.map.h * TILE;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = C.moss;
    ctx.fillRect(0, 0, c.width, c.height);
    const tiles = SHEETS.get('tiles');
    const idx = (n: string) => frameIndex('tiles', n);
    for (let y = 0; y < g.map.h; y++)
      for (let x = 0; x < g.map.w; x++) {
        const h = hash2(x, y, 7);
        let name = h < 0.55 ? 'ground0' : h < 0.8 ? 'ground1' : h < 0.93 ? 'ground2' : 'ground3';
        if (g.isPath(x, y)) name = hash2(x, y, 3) < 0.5 ? 'path0' : 'path1';
        else if (g.isDeposit(x, y)) name = hash2(x, y, 5) < 0.5 ? 'ember0' : 'ember1';
        if (tiles) drawFrame(ctx, 'tiles', idx(name), x * TILE, y * TILE, 1);
        else {
          ctx.fillStyle = g.isPath(x, y) ? C.steel : g.isDeposit(x, y) ? C.rust : C.moss;
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
        // decor on plain ground, away from the path and the Hearth
        if (tiles && !g.isPath(x, y) && !g.isDeposit(x, y) && hash2(x, y, 11) < 0.07) {
          const near = [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => g.isPath(x + dx, y + dy)));
          if (!near) drawFrame(ctx, 'tiles', idx(hash2(x, y, 13) < 0.6 ? 'decor0' : 'decor1'), x * TILE, y * TILE, 1);
        }
      }
    // the spawn mouth: the path fades in from the map edge
    this.ground = c;
    this.groundFor = g;
  }

  // ---- states ----

  /** the readability state of a building (STYLE.md rule 1) */
  stateOf(g: Game, b: Building): Variant {
    const r = b.def.role;
    if (r === 'core') return g.lights > 0 ? 'lit' : 'dark';
    if (b.off || b.net < 0) return 'dark';
    if (r === 'node') {
      if (b.offline > 0) return 'dark';
      const n = g.networks[b.net];
      if (!n || n.gen <= 0) return 'dark';
      return n.wall.sat < RULES.starvedBelow.v ? 'starved' : 'lit';
    }
    if (r === 'generator') return b.output > 0 ? 'lit' : 'starved';
    if (r === 'storage') return 'lit';
    if (r === 'lab' && !g.research.active) return 'lit';
    return b.sat < RULES.starvedBelow.v ? 'starved' : 'lit';
  }

  /** a starved light stutters like a failing bulb: on for about `sat` of the time */
  stutter(b: Building): boolean {
    const t = Math.floor(this.time * 9 + b.id * 7.3);
    return hash2(t, b.id, 99) < 0.25 + 0.7 * b.sat;
  }

  private spriteOf(b: Building): string {
    if (b.level > 1 && SHEETS.has(`${b.def.id}2`)) return `${b.def.id}2`;
    return b.def.id;
  }

  /** world-px position of a building's sprite top-left and its light anchor */
  private placeSprite(b: Building) {
    const slug = this.spriteOf(b);
    const m = SHEETS.get(slug)?.meta;
    const w = m?.w ?? b.def.size * TILE, h = m?.h ?? b.def.size * TILE;
    const x = b.x * TILE + (b.def.size * TILE) / 2 - w / 2;
    const y = (b.y + b.def.size) * TILE - h;
    const L = m?.light ?? [w / 2, h / 3];
    return { slug, x, y, w, h, lx: x + L[0], ly: y + L[1] };
  }

  centreOf(b: Building) {
    return { x: (b.x + b.def.size / 2) * TILE, y: (b.y + b.def.size / 2) * TILE };
  }

  // ---- lights ----

  lights(g: Game): Light[] {
    const out: Light[] = [];
    const t = this.time;
    for (const b of g.buildings.values()) {
      const st = this.stateOf(g, b);
      const c = this.centreOf(b);
      const p = this.placeSprite(b);
      const d = b.def;
      switch (d.role) {
        case 'core':
          // the Hearth burns its lights: every one lost shrinks its glow (§3)
          if (g.lights > 0) out.push({ x: p.lx, y: p.ly + 8, r: 7.5 * (0.45 + 0.55 * g.lights / RULES.startLights.v), i: 1, c: C.gold, flicker: true });
          break;
        case 'tower':
        case 'beacon': {
          if (st === 'dark') break;
          const s = g.spec(b);
          // a Searchlight's and a Starshell's reach is too long to light: they glow small and light where they hit
          const range = d.id === 'searchlight' ? 3 : d.id === 'starshell' ? 2.4 : s.range ?? 3;
          if (b.overcharge > 0) out.push({ x: c.x, y: c.y, r: range * 1.15, i: 1, c: C.bone, white: true });
          else {
            const on = st === 'lit' || this.stutter(b);
            const col = d.role === 'beacon' ? C.ember : d.id === 'brazier' ? C.orange : d.id === 'floodlight' || d.id === 'searchlight' ? C.gold : C.amber;
            out.push({ x: c.x, y: c.y, r: range * Math.max(0.22, b.sat), i: (0.55 + 0.45 * b.sat) * (on ? 1 : 0.35), c: col, flicker: b.sat >= RULES.starvedBelow.v });
          }
          // the Searchlight's spot on its target
          if (d.id === 'searchlight' && b.target >= 0 && b.dps > 0) {
            const t = g.enemyById(b.target);
            if (t) out.push({ x: t.x * TILE, y: t.y * TILE, r: 1.2, i: 0.9, c: C.bone });
          }
          break;
        }
        case 'node':
          if (st !== 'dark') out.push({ x: p.lx, y: p.ly, r: st === 'lit' ? 1.7 : 1.0, i: 0.7, c: C.gold });
          break;
        case 'generator':
          if (b.output > 0) out.push({ x: p.lx, y: p.ly, r: d.fuel === 'wind' ? 1.2 + 1.2 * (b.output / (g.spec(b).output ?? 1)) : 2.6, i: 0.85, c: d.fuel === 'wind' ? C.gold : C.orange, flicker: d.fuel !== 'wind' });
          break;
        case 'extractor':
          if (st !== 'dark' && b.demand > 0) out.push({ x: p.lx, y: p.ly, r: 1.1 * Math.max(0.3, b.sat), i: 0.6, c: C.ember });
          break;
        case 'storage': {
          const f = b.charge / (g.spec(b).capacity ?? 1);
          if (st !== 'dark' && f > 0.02) out.push({ x: p.lx, y: p.ly, r: 0.8 + 1.6 * f, i: 0.7, c: f > 0.85 ? C.bone : C.amber });
          break;
        }
        case 'lab':
          if (st === 'lit') out.push({ x: p.lx, y: p.ly, r: 2.2, i: 0.7, c: C.cyan });
          break;
      }
    }
    // Starshell bursts and shells in flight light the ground they cross
    for (const f of this.flashes) out.push({ x: f.x * TILE, y: f.y * TILE, r: f.r * (1 - f.t / f.life), i: 1, c: C.gold, white: f.t < 0.1 });
    for (const s of g.shots) {
      const p = this.shotPos(s);
      out.push({ x: p.x * TILE, y: p.y * TILE, r: 1.1, i: 0.9, c: C.gold });
    }
    for (const l of out) if (l.flicker) l.r *= 1 + Math.sin(t * 9 + l.x) * 0.02 + Math.sin(t * 23 + l.y) * 0.015;
    return out;
  }

  /** is a world-px point inside a light (enemies catch light, STYLE.md rule 5) */
  litAt(lights: Light[], wx: number, wy: number): boolean {
    for (const l of lights) if (Math.hypot(wx - l.x, wy - l.y) < l.r * TILE * 0.9) return true;
    return false;
  }

  // ---- the frame ----

  draw(g: Game, ov: Overlay) {
    const ctx = this.ctx;
    const z = this.cam.z;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0b16';
    ctx.fillRect(0, 0, this.W, this.H);
    if (this.groundFor !== g || !this.ground) this.bakeGround(g);
    const gx = this.sx(0), gy = this.sy(0);
    ctx.drawImage(this.ground!, gx, gy, this.ground!.width * z, this.ground!.height * z);

    // buildings, y-sorted by footprint bottom
    const bs = [...g.buildings.values()].sort((a, b) => a.y + a.def.size - (b.y + b.def.size) || a.x - b.x);
    for (const b of bs) this.drawBuilding(g, b);

    const lights = this.lights(g);
    this.drawDarkness(lights);

    // above the dark
    if (ov.coverage) this.drawCoverage(g, ov);
    this.drawWires(g);
    this.drawBeams(g);
    for (const b of bs) this.drawMarks(g, b);
    const es = [...g.enemies].sort((a, b) => a.y - b.y);
    for (const e of es) this.drawEnemy(e, lights);
    if (ov.selected && g.buildings.has(ov.selected.id)) this.drawSelection(g, ov.selected, C.gold);
    if (ov.hover && ov.hover !== ov.selected && g.buildings.has(ov.hover.id)) this.drawSelection(g, ov.hover, C.ash, true);
    if (ov.spot) this.drawSpot(ov.spot);
    if (ov.ghost) this.drawGhost(g, ov.ghost);
    if (ov.lines) this.drawLines(g, ov.lines);
    this.drawFx();
    if (this.flash.red > 0 && this.flashOn) {
      const gr = ctx.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.3, this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.7);
      gr.addColorStop(0, 'rgba(165,48,48,0)');
      gr.addColorStop(1, `rgba(165,48,48,${Math.min(0.45, this.flash.red)})`);
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, this.W, this.H);
    }
    if (this.flash.white > 0 && this.flashOn) {
      ctx.fillStyle = `rgba(235,237,233,${Math.min(0.25, this.flash.white)})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }
    if (this.dimAll > 0) {
      ctx.fillStyle = rgba(C.ink, this.dimAll);
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  private drawBuilding(g: Game, b: Building) {
    const z = this.cam.z;
    const p = this.placeSprite(b);
    const st = this.stateOf(g, b);
    const m = SHEETS.get(p.slug)?.meta;
    let f = 0;
    if (b.def.role === 'storage') {
      const ch = b.charge / (g.spec(b).capacity ?? 1);
      f = ch < 0.02 ? 0 : ch < 0.4 ? 1 : ch < 0.85 ? 2 : 3; // STYLE.md rule 3: dark → ember → amber → white-hot
    } else if (m && m.fps > 0 && st !== 'dark') {
      let fps = st === 'starved' ? m.fps * 0.35 : m.fps;
      if (b.def.fuel === 'wind') fps = m.fps * g.wind();
      const working = b.def.role === 'extractor' ? b.demand > 0 : b.def.role === 'generator' ? b.output > 0 : true;
      // a Vane's blades turn with the wind: its frame follows its own clock
      if (b.def.fuel === 'wind') {
        const spin = (this.spins.get(b.id) ?? b.id * 0.37) + fps * this.frameDt;
        this.spins.set(b.id, spin);
        f = Math.floor(spin);
      } else f = working ? Math.floor(this.time * fps + b.id * 0.37) : 0;
    }
    // a soft contact shadow so buildings sit on the ground
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(9,10,20,0.35)';
    ctx.fillRect(this.sx(b.x * TILE + 1), this.sy((b.y + b.def.size) * TILE - 2), (b.def.size * TILE - 2) * z, 2 * z);
    const shown: Variant = st === 'starved' && b.def.tier && !this.stutter(b) ? 'dark' : st;
    if (!drawFrame(ctx, p.slug, f, this.sx(p.x), this.sy(p.y), z, shown)) {
      ctx.fillStyle = st === 'lit' ? C.brass : st === 'starved' ? C.plum : C.slate;
      ctx.fillRect(this.sx(b.x * TILE + 2), this.sy(b.y * TILE + 2), (b.def.size * TILE - 4) * z, (b.def.size * TILE - 4) * z);
    }
  }

  /** the darkness buffer: one world pixel per light-map pixel, stepped falloff */
  private drawDarkness(lights: Light[]) {
    const z = this.cam.z;
    const w = Math.ceil(this.W / z) + 2, h = Math.ceil(this.H / z) + 2;
    for (const c of [this.light, this.glow])
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }
    // light-map origin in world px (aligned to the screen's top-left world pixel)
    const ox = this.cam.x - this.W / 2 / z, oy = this.cam.y - this.H / 2 / z;
    const fx = Math.floor(ox), fy = Math.floor(oy);
    const L = this.light.getContext('2d')!;
    L.globalCompositeOperation = 'source-over';
    L.clearRect(0, 0, w, h);
    L.fillStyle = 'rgba(10,10,28,0.8)';
    L.fillRect(0, 0, w, h);
    L.globalCompositeOperation = 'destination-out';
    const G = this.glow.getContext('2d')!;
    G.globalCompositeOperation = 'source-over';
    G.clearRect(0, 0, w, h);
    G.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const x = l.x - fx, y = l.y - fy, r = l.r * TILE;
      if (x + r < 0 || y + r < 0 || x - r > w || y - r > h) continue;
      const a = l.i;
      const gr = L.createRadialGradient(x, y, 0, x, y, r);
      // stepped bands so the edge of the light is the edge of the range
      gr.addColorStop(0, `rgba(0,0,0,${a})`);
      gr.addColorStop(0.45, `rgba(0,0,0,${a})`);
      gr.addColorStop(0.451, `rgba(0,0,0,${a * 0.82})`);
      gr.addColorStop(0.7, `rgba(0,0,0,${a * 0.82})`);
      gr.addColorStop(0.701, `rgba(0,0,0,${a * 0.6})`);
      gr.addColorStop(0.9, `rgba(0,0,0,${a * 0.6})`);
      gr.addColorStop(0.901, `rgba(0,0,0,${a * 0.38})`);
      gr.addColorStop(0.999, `rgba(0,0,0,${a * 0.38})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      L.fillStyle = gr;
      L.beginPath();
      L.arc(x, y, r, 0, Math.PI * 2);
      L.fill();
      const [cr, cg, cb] = rgb(l.c);
      const gg = G.createRadialGradient(x, y, 0, x, y, r);
      const ga = (l.white ? 0.5 : 0.2) * a;
      gg.addColorStop(0, `rgba(${cr},${cg},${cb},${ga})`);
      gg.addColorStop(0.6, `rgba(${cr},${cg},${cb},${ga * 0.45})`);
      gg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      G.fillStyle = gg;
      G.beginPath();
      G.arc(x, y, r, 0, Math.PI * 2);
      G.fill();
    }
    const ctx = this.ctx;
    const dx = this.sx(fx), dy = this.sy(fy);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.light, dx, dy, w * z, h * z);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(this.glow, dx, dy, w * z, h * z);
    ctx.restore();
  }

  /** a line of whole world pixels */
  private pixelLine(x0: number, y0: number, x1: number, y1: number, color: string, alpha = 1, thick = 1, dash = 0) {
    const ctx = this.ctx;
    const z = this.cam.z;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let i = 0; i <= n; i++) {
      if (dash && Math.floor((i + this.time * 30) / dash) % 2 === 1) continue;
      const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
      ctx.fillRect(this.sx(x), this.sy(y), z * thick, z * thick);
    }
    ctx.globalAlpha = 1;
  }

  private drawWires(g: Game) {
    if (this.wiresVersion !== g.netVersion) {
      this.wiresVersion = g.netVersion;
      const nodes = [...g.buildings.values()].filter((b) => b.def.role === 'node' || b.def.role === 'core');
      this.wires = [];
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          if (covers(g.rect(a), g.spec(a).nodeRadius ?? 0, g.rect(b)) || covers(g.rect(b), g.spec(b).nodeRadius ?? 0, g.rect(a))) this.wires.push({ a, b });
        }
    }
    for (const { a, b } of this.wires) {
      if (!g.buildings.has(a.id) || !g.buildings.has(b.id)) continue;
      const pa = this.placeSprite(a), pb = this.placeSprite(b);
      const ax = a.def.role === 'core' ? pa.lx : pa.lx, ay = a.def.role === 'core' ? pa.y + 20 : pa.ly + 1;
      const bx = pb.lx, by = b.def.role === 'core' ? pb.y + 20 : pb.ly + 1;
      const live = a.offline <= 0 && b.offline <= 0 && a.net >= 0 && a.net === b.net && (g.networks[a.net]?.gen ?? 0) > 0;
      if (live) {
        const sat = g.networks[a.net].wall.sat;
        this.pixelLine(ax, ay, bx, by, sat < RULES.starvedBelow.v ? C.violet : C.amber, 0.55 + 0.25 * Math.sin(this.time * 3 + a.id));
      } else this.pixelLine(ax, ay, bx, by, C.slate, 0.9); // a cut line goes dark along its whole length (STYLE.md rule 2)
    }
  }

  private drawBeams(g: Game) {
    for (const b of g.buildings.values()) {
      if (b.def.role !== 'tower' || b.target < 0) continue;
      const t = g.enemyById(b.target);
      if (!t) continue;
      const p = this.placeSprite(b);
      const oc = b.overcharge > 0;
      const starved = !oc && b.sat < RULES.starvedBelow.v;
      const kind = b.def.kind;
      const color = oc ? C.bone : starved ? C.violet : kind === 'cone' || b.def.id === 'searchlight' ? C.gold : kind === 'radial' ? C.orange : C.amber;
      const a = oc ? 1 : 0.45 + 0.55 * b.sat;
      const dash = starved ? 2 : 0;
      const wob = 0.8 + 0.2 * Math.sin(this.time * 40 + b.id);
      if (kind === 'mortar') continue;
      if (kind === 'beam') {
        if (b.sweep > 0) {
          // swinging onto a new target: a faint aim line
          this.pixelLine(p.lx, p.ly, t.x * TILE, t.y * TILE - 2, color, 0.25, 1, 3);
          continue;
        }
        if (b.dps <= 0) continue;
        this.pixelLine(p.lx, p.ly, t.x * TILE, t.y * TILE - 2, color, a * wob, oc || b.def.id === 'searchlight' ? 2 : 1, dash);
        continue;
      }
      if (b.dps <= 0) continue;
      if (kind === 'cone') {
        this.drawCone(g, b, t, color, a);
        for (const e of coneCatchers(g, b, t)) this.pixelLine(p.lx, p.ly, e.x * TILE, e.y * TILE - 2, color, a * wob * 0.7, oc ? 2 : 1, dash);
        continue;
      }
      if (kind === 'radial') {
        // tongues of fire to every body in it
        const cx = (b.x + b.def.size / 2) * TILE, cy = (b.y + b.def.size / 2) * TILE - 4;
        const r = g.spec(b).range ?? 0;
        for (const e of g.enemies) {
          if (Math.hypot(e.x - (b.x + b.def.size / 2), e.y - (b.y + b.def.size / 2)) > r) continue;
          this.pixelLine(cx, cy, e.x * TILE, e.y * TILE - 2, Math.floor(this.time * 12 + e.id) % 2 ? color : C.ember, a * 0.75, 1, 2);
        }
      }
    }
    this.drawShots(g);
  }

  /** a wedge from a point at an angle (the Floodlight ghost's preview) */
  private drawConeAt(cx: number, cy: number, a0: number, halfDeg: number, range: number, color: string) {
    const ctx = this.ctx;
    const half = (halfDeg * Math.PI) / 180;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(this.sx(cx * TILE), this.sy(cy * TILE));
    for (let i = 0; i <= 10; i++) {
      const ang = a0 - half + (2 * half * i) / 10;
      ctx.lineTo(this.sx(cx * TILE + Math.cos(ang) * range * TILE), this.sy(cy * TILE + Math.sin(ang) * range * TILE));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** a Floodlight's cone: a faint wedge of light from the glass toward its target */
  private drawCone(g: Game, b: Building, t: Enemy, color: string, a: number) {
    const s = g.spec(b);
    const p = this.placeSprite(b);
    const cx = (b.x + b.def.size / 2), cy = (b.y + b.def.size / 2);
    const a0 = Math.atan2(t.y - cy, t.x - cx);
    const half = ((s.halfAngle ?? 30) * Math.PI) / 180;
    const r = (s.range ?? 0) * TILE;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.13 * a;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(this.sx(p.lx), this.sy(p.ly));
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const ang = a0 - half + (2 * half * i) / steps;
      ctx.lineTo(this.sx(cx * TILE + Math.cos(ang) * r), this.sy(cy * TILE + Math.sin(ang) * r));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // the cone's two edges, in whole pixels
    for (const sgn of [-1, 1]) {
      const ang = a0 + sgn * half;
      this.pixelLine(p.lx, p.ly, cx * TILE + Math.cos(ang) * r, cy * TILE + Math.sin(ang) * r, color, 0.22 * a, 1, 3);
    }
  }

  /** where a Starshell is on its arc (tiles; it climbs about 2.5 tiles at the top) */
  shotPos(s: { x0: number; y0: number; x: number; y: number; t: number; flight: number }) {
    const u = Math.min(1, s.t / s.flight);
    return { x: s.x0 + (s.x - s.x0) * u, y: s.y0 + (s.y - s.y0) * u - 2.5 * 4 * u * (1 - u) };
  }

  private drawShots(g: Game) {
    const ctx = this.ctx;
    const z = this.cam.z;
    for (const s of g.shots) {
      for (let k = 3; k >= 0; k--) {
        const p = this.shotPos({ ...s, t: Math.max(0, s.t - k * 0.04) });
        ctx.globalAlpha = k === 0 ? 1 : 0.5 - k * 0.12;
        ctx.fillStyle = k === 0 ? C.bone : C.gold;
        const sz = k === 0 ? 2 : 1;
        ctx.fillRect(this.sx(Math.round(p.x * TILE) - (sz > 1 ? 1 : 0)), this.sy(Math.round(p.y * TILE) - (sz > 1 ? 1 : 0)), sz * z, sz * z);
      }
      ctx.globalAlpha = 1;
    }
  }

  /** small marks that read through the dark: the cold pixel, shed, knocked out, no fuel */
  private drawMarks(g: Game, b: Building) {
    const z = this.cam.z;
    const ctx = this.ctx;
    const p = this.placeSprite(b);
    const st = this.stateOf(g, b);
    if (st === 'dark') {
      // one cold pixel so a dark building can still be found (STYLE.md rule 1)
      ctx.fillStyle = C.cyan;
      ctx.fillRect(this.sx(Math.round(p.lx)), this.sy(Math.round(p.ly)), z, z);
    }
    const tag = (text: string, color: string) => {
      const w = textWidth(text);
      const x = Math.round(p.x + p.w / 2 - w / 2), y = Math.round(p.y - 9);
      ctx.fillStyle = 'rgba(9,10,20,0.75)';
      ctx.fillRect(this.sx(x - 1), this.sy(y - 1), (w + 2) * z, 9 * z);
      drawText(ctx, text, this.sx(x), this.sy(y), color, z);
    };
    if (b.off) tag('OFF', C.ash);
    else if (b.def.role === 'node' && b.guard > 0) tag(`GUARDED ${Math.ceil(b.guard)}s`, C.cyan);
    else if (b.def.role === 'node' && b.offline > 0) {
      tag(`CUT ${Math.ceil(b.offline)}s`, Math.floor(this.time * 6) % 2 === 0 ? C.ember : C.wine);
    } else if (b.snuffed > 0 && b.net >= 0) tag(`SNUFFED ${Math.ceil(b.snuffed)}s`, Math.floor(this.time * 6) % 2 === 0 ? C.ember : C.wine);
    else if (b.def.role === 'generator' && b.def.fuel === 'rock' && b.net >= 0 && b.output <= 0 && b.fuel <= 0) {
      const fed = [...g.buildings.values()].some((x) => x.def.role === 'extractor' && x.net >= 0 && !x.off && touches(g.rect(x), g.rect(b)));
      if (fed) tag('WAITING FOR ROCK', C.amber);
      else tag('NO FUEL', C.ember);
    }
    else if (b.net < 0 && b.def.role !== 'core') tag('NO POWER', C.violet);
    // a tier-2 building with no tier-2 sprite of its own wears a brass pip
    if (b.level > 1 && !SHEETS.has(`${b.def.id}2`)) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(this.sx(Math.round(p.x + p.w / 2) - 2), this.sy(Math.round(p.y) - 1), 4 * z, 4 * z);
      ctx.fillStyle = C.gold;
      ctx.fillRect(this.sx(Math.round(p.x + p.w / 2) - 1), this.sy(Math.round(p.y)), 2 * z, 2 * z);
    }
    // a Starshell's shell, filling: a brass bar under it
    if (b.def.kind === 'mortar' && b.net >= 0 && !b.off) {
      const f = b.shell / (g.spec(b).shellSize ?? 1);
      const bx = Math.round(p.x + p.w / 2 - 6), by = Math.round(p.y + p.h + 1);
      ctx.fillStyle = 'rgba(9,10,20,0.8)';
      ctx.fillRect(this.sx(bx), this.sy(by), 12 * z, z);
      ctx.fillStyle = f >= 1 ? C.bone : C.brass;
      ctx.fillRect(this.sx(bx), this.sy(by), Math.round(12 * f) * z, z);
    }
  }

  private drawEnemy(e: Enemy, lights: Light[]) {
    const z = this.cam.z;
    const slug = e.def.id;
    const m = SHEETS.get(slug)?.meta;
    const wx = e.x * TILE, wy = e.y * TILE;
    const lit = this.litAt(lights, wx, wy);
    const w = m?.w ?? 12, h = m?.h ?? 12;
    const bob = slug === 'moth' ? Math.round(Math.sin(this.time * 10 + e.id) * 1)
      : slug === 'flit' ? Math.round(Math.sin(this.time * 23 + e.id * 1.7) * 1.5)
      : slug === 'shade' || slug === 'veil' ? Math.round(Math.sin(this.time * 3 + e.id)) : 0;
    const x = Math.round(wx - w / 2), y = Math.round(wy - h + 4 + bob);
    const f = m ? Math.floor(this.time * m.fps * (1 - e.slow * 0.6) + e.id) : 0;
    const ctx = this.ctx;
    // a Veil no tower can find is only a shimmer (§5.1)
    const hidden = e.def.veiled && !e.seen;
    if (hidden) ctx.globalAlpha = 0.22 + 0.12 * Math.sin(this.time * 5 + e.id);
    // a shadow on the ground
    ctx.fillStyle = 'rgba(9,10,20,0.5)';
    ctx.fillRect(this.sx(Math.round(wx - w / 4)), this.sy(Math.round(wy + 2)), Math.round(w / 2) * z, z);
    if (!drawFrame(ctx, slug, f, this.sx(x), this.sy(y), z, 'lit', lit && !hidden ? 0 : 1, e.face < 0)) {
      ctx.fillStyle = lit ? C.mist : C.dim;
      ctx.fillRect(this.sx(x), this.sy(y), w * z, h * z);
    }
    ctx.globalAlpha = 1;
    if (hidden) return;
    if (e.hit > 0 && lit && Math.floor(this.time * 20 + e.id) % 3 === 0) {
      ctx.globalAlpha = 0.45;
      drawFrame(ctx, slug, f, this.sx(x), this.sy(y), z, 'white', 0, e.face < 0);
      ctx.globalAlpha = 1;
    }
    if (e.slow > 0.05) {
      ctx.fillStyle = rgba(C.ember, 0.8);
      ctx.fillRect(this.sx(x + w / 2 - 1), this.sy(y - 3), 2 * z, z);
    }
    // health in kJ: a thin bar once it has taken damage
    if (e.hp < e.def.health && e.hp > 0) {
      const bw = Math.max(8, Math.round(w * 0.7));
      const bx = Math.round(wx - bw / 2), by = y - 2;
      ctx.fillStyle = 'rgba(9,10,20,0.8)';
      ctx.fillRect(this.sx(bx), this.sy(by), bw * z, z);
      ctx.fillStyle = lit ? C.gold : C.steel;
      ctx.fillRect(this.sx(bx), this.sy(by), Math.max(1, Math.round((bw * e.hp) / e.def.health)) * z, z);
    }
  }

  /** the Lines view: members outlined in their line's colour, a label card on each line */
  private drawLines(g: Game, lines: LineReport[]) {
    const z = this.cam.z;
    const ctx = this.ctx;
    lines.forEach((l, i) => {
      const color = LINE_COLORS[i % LINE_COLORS.length];
      const n = g.networks[l.net];
      if (!n) return;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      for (const id of n.members) {
        const b = g.buildings.get(id);
        if (!b) continue;
        const x = b.x * TILE, y = b.y * TILE, s = b.def.size * TILE;
        ctx.fillRect(this.sx(x), this.sy(y), s * z, z);
        ctx.fillRect(this.sx(x), this.sy(y + s - 1), s * z, z);
        ctx.fillRect(this.sx(x), this.sy(y), z, s * z);
        ctx.fillRect(this.sx(x + s - 1), this.sy(y), z, s * z);
      }
      ctx.globalAlpha = 1;
    });
    // the cards last, so no outline crosses one
    lines.forEach((l, i) => {
      const color = LINE_COLORS[i % LINE_COLORS.length];
      const head = `${l.name}: ${Math.round(l.made)} kW in, ${Math.round(l.peak)} at full fire`;
      const w = Math.max(textWidth(head), textWidth(l.text), textWidth(l.fix)) + 6;
      // kept on screen however the camera sits
      const px = Math.max(4, Math.min(this.W - w * z - 4, this.sx(Math.round(l.at.x * TILE - w / 2))));
      const py = Math.max(4, Math.min(this.H - 31 * z - 4, this.sy(Math.round(l.at.y * TILE - 31))));
      ctx.fillStyle = 'rgba(9,10,20,0.88)';
      ctx.fillRect(px, py, w * z, 30 * z);
      ctx.fillStyle = color;
      ctx.fillRect(px, py, z, 30 * z);
      drawText(ctx, head, px + 3 * z, py + 2 * z, color, z);
      drawText(ctx, l.text, px + 3 * z, py + 11 * z, NECK_COLORS[l.neck], z);
      drawText(ctx, l.fix, px + 3 * z, py + 20 * z, C.ash, z);
    });
  }

  private drawSelection(g: Game, b: Building, color: string, faint = false) {
    const z = this.cam.z;
    const ctx = this.ctx;
    const x = b.x * TILE, y = b.y * TILE, s = b.def.size * TILE;
    ctx.globalAlpha = faint ? 0.6 : 1;
    ctx.fillStyle = color;
    for (const [cx, cy] of [[x - 1, y - 1], [x + s, y - 1], [x - 1, y + s], [x + s, y + s]]) {
      ctx.fillRect(this.sx(cx - (cx > x ? 2 : 0)), this.sy(cy), 3 * z, z);
      ctx.fillRect(this.sx(cx), this.sy(cy - (cy > y ? 2 : 0)), z, 3 * z);
    }
    ctx.globalAlpha = 1;
    const sp = g.spec(b);
    const r = sp.range ?? (b.def.role === 'node' || b.def.role === 'core' ? sp.nodeRadius : 0);
    if (r && !faint) {
      if (b.def.role === 'node' || b.def.role === 'core') this.drawReach(g, sp, b.x, b.y, rgba(C.gold, 0.16));
      else {
        this.pixelCircle((b.x + b.def.size / 2) * TILE, (b.y + b.def.size / 2) * TILE, r * TILE, color, 0.7);
        if (sp.minRange) this.pixelCircle((b.x + b.def.size / 2) * TILE, (b.y + b.def.size / 2) * TILE, sp.minRange * TILE, C.ember, 0.5);
      }
    }
  }

  private pixelCircle(cx: number, cy: number, r: number, color: string, alpha: number) {
    const ctx = this.ctx;
    const z = this.cam.z;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    const n = Math.ceil(r * 2 * Math.PI / 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ctx.fillRect(this.sx(Math.round(cx + Math.cos(a) * r)), this.sy(Math.round(cy + Math.sin(a) * r)), z, z);
    }
    ctx.globalAlpha = 1;
  }

  /** tiles a node-like footprint reaches */
  private drawReach(g: Game, def: { size: number; nodeRadius?: number }, x: number, y: number, color: string) {
    const ctx = this.ctx;
    const z = this.cam.z;
    const r = def.nodeRadius ?? 0;
    const rect = { x, y, w: def.size, h: def.size };
    ctx.fillStyle = color;
    for (let ty = Math.floor(y - r - 1); ty <= y + def.size + r; ty++)
      for (let tx = Math.floor(x - r - 1); tx <= x + def.size + r; tx++) {
        if (tx < 0 || ty < 0 || tx >= g.map.w || ty >= g.map.h) continue;
        if (pointRectDist(tx + 0.5, ty + 0.5, rect) <= r) ctx.fillRect(this.sx(tx * TILE), this.sy(ty * TILE), TILE * z, TILE * z);
      }
  }

  private reachMasks = new Map<string, Uint8Array>();
  /** is a tile within `r` of the path? (what a Shade or a Snuffer reaches; cached per map and radius) */
  pathReach(g: Game, r: number, tx: number, ty: number): boolean {
    const key = `${g.map.name}:${r}`;
    let m = this.reachMasks.get(key);
    if (!m) {
      m = new Uint8Array(g.map.w * g.map.h);
      const pts: { x: number; y: number }[] = [];
      for (const path of g.paths) for (let d = 0; d <= path.length; d += 0.25) pts.push(path.at(d));
      for (let y = 0; y < g.map.h; y++)
        for (let x = 0; x < g.map.w; x++) {
          const rect = { x, y, w: 1, h: 1 };
          if (pts.some((p) => pointRectDist(p.x, p.y, rect) <= r)) m[y * g.map.w + x] = 1;
        }
      this.reachMasks.set(key, m);
    }
    return m[ty * g.map.w + tx] === 1;
  }

  /** build mode: where power reaches now (live networks only) */
  private drawCoverage(g: Game, ov: Overlay) {
    const ctx = this.ctx;
    const z = this.cam.z;
    const cond = [...g.buildings.values()].filter((b) => (b.def.role === 'core' || (b.def.role === 'node' && b.offline <= 0)) && b.net >= 0);
    ctx.fillStyle = rgba(C.amber, 0.1);
    for (let ty = 0; ty < g.map.h; ty++)
      for (let tx = 0; tx < g.map.w; tx++) {
        let on = false;
        for (const c of cond) if (pointRectDist(tx + 0.5, ty + 0.5, g.rect(c)) <= (g.spec(c).nodeRadius ?? 0)) { on = true; break; }
        if (on) ctx.fillRect(this.sx(tx * TILE), this.sy(ty * TILE), TILE * z, TILE * z);
      }
    const role = ov.ghost ? BUILDINGS[ov.ghost.id] : null;
    // where a passing Shade would cut a Node, or a Snuffer put out a Burner
    const danger = role?.role === 'node' && ov.danger?.shade !== false ? ENEMIES.shade.knockRadius : role?.fuel === 'rock' && ov.danger?.snuffer !== false ? ENEMIES.snuffer.snuffRadius : 0;
    if (ov.ghost && danger) {
      ctx.fillStyle = rgba(C.red, 0.2);
      for (let ty = 0; ty < g.map.h; ty++)
        for (let tx = 0; tx < g.map.w; tx++) if (this.pathReach(g, danger, tx, ty)) ctx.fillRect(this.sx(tx * TILE), this.sy(ty * TILE), TILE * z, TILE * z);
    }
    if (ov.ghost && role?.role === 'node') this.drawReach(g, BUILDINGS.node, ov.ghost.x, ov.ghost.y, rgba(C.gold, 0.14));
  }

  /** the tutorial's suggested spot: a pulsing gold square and an arrow bobbing above it */
  private drawSpot(sp: { x: number; y: number; size: number }) {
    const ctx = this.ctx;
    const z = this.cam.z;
    const on = Math.sin(this.time * 6) > 0;
    const x = sp.x * TILE, y = sp.y * TILE, s = sp.size * TILE;
    ctx.fillStyle = rgba(C.gold, on ? 0.3 : 0.16);
    ctx.fillRect(this.sx(x), this.sy(y), s * z, s * z);
    ctx.fillStyle = on ? C.gold : C.amber;
    ctx.fillRect(this.sx(x), this.sy(y), s * z, z);
    ctx.fillRect(this.sx(x), this.sy(y + s - 1), s * z, z);
    ctx.fillRect(this.sx(x), this.sy(y), z, s * z);
    ctx.fillRect(this.sx(x + s - 1), this.sy(y), z, s * z);
    // the arrow
    const ax = Math.round(x + s / 2), ay = Math.round(y - 6 + Math.sin(this.time * 4) * 2);
    for (let i = 0; i < 4; i++) ctx.fillRect(this.sx(ax - 3 + i), this.sy(ay - 4 + i), (7 - 2 * i) * z, z);
    ctx.fillRect(this.sx(ax - 1), this.sy(ay - 8), 2 * z, 4 * z);
  }

  private drawGhost(g: Game, gh: NonNullable<Overlay['ghost']>) {
    const ctx = this.ctx;
    const z = this.cam.z;
    const def = BUILDINGS[gh.id];
    const fake = { def, x: gh.x, y: gh.y, level: 1 } as Building;
    const p = this.placeSprite(fake);
    ctx.globalAlpha = 0.65;
    drawFrame(ctx, p.slug, 0, this.sx(p.x), this.sy(p.y), z, 'lit');
    ctx.globalAlpha = 1;
    ctx.fillStyle = gh.ok ? rgba(C.lime, 0.28) : rgba(C.red, 0.4);
    ctx.fillRect(this.sx(gh.x * TILE), this.sy(gh.y * TILE), def.size * TILE * z, def.size * TILE * z);
    if (def.range) this.pixelCircle((gh.x + def.size / 2) * TILE, (gh.y + def.size / 2) * TILE, def.range * TILE, gh.ok ? C.gold : C.ember, 0.8);
    // a cone shows its wedge aimed at the nearest road, so where enemies line up in it can be seen
    if (def.kind === 'cone') {
      const cx = gh.x + def.size / 2, cy = gh.y + def.size / 2;
      let best = { x: cx + 1, y: cy, d: Infinity };
      for (const path of g.paths)
        for (let d = 0; d <= path.length; d += 0.5) {
          const p = path.at(d);
          const dd = Math.hypot(p.x - cx, p.y - cy);
          if (dd < best.d) best = { x: p.x, y: p.y, d: dd };
        }
      this.drawConeAt(cx, cy, Math.atan2(best.y - cy, best.x - cx), def.halfAngle ?? 30, def.range ?? 0, gh.ok ? C.gold : C.ember);
    }
    // does it land on a network?
    if (def.role !== 'node') {
      const cond = [...g.buildings.values()].filter((b) => (b.def.role === 'core' || (b.def.role === 'node' && b.offline <= 0)));
      const onNet = cond.some((c) => covers(g.rect(c), g.spec(c).nodeRadius ?? 0, { x: gh.x, y: gh.y, w: def.size, h: def.size }));
      if (!onNet) {
        const w = textWidth('NO POWER HERE');
        const tx = Math.round((gh.x + def.size / 2) * TILE - w / 2), ty = gh.y * TILE - 12;
        ctx.fillStyle = 'rgba(9,10,20,0.8)';
        ctx.fillRect(this.sx(tx - 2), this.sy(ty - 1), (w + 4) * z, 9 * z);
        drawText(ctx, 'NO POWER HERE', this.sx(tx), this.sy(ty), C.violet, z);
      }
    }
  }

  private drawFx() {
    const ctx = this.ctx;
    const z = this.cam.z;
    for (const f of this.fx) {
      const k = f.t / f.life;
      switch (f.kind) {
        case 'float': {
          const w = textWidth(f.text ?? '');
          const x = Math.round(f.x * TILE - w / 2), y = Math.round(f.y * TILE - 10 - k * 12);
          ctx.globalAlpha = 1 - k * k;
          drawText(ctx, f.text ?? '', this.sx(x), this.sy(y), f.color ?? C.gold, z, C.ink);
          ctx.globalAlpha = 1;
          break;
        }
        case 'puff':
        case 'spark':
        case 'burst': {
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = f.color ?? C.mist;
          const x = f.x * TILE + (f.vx ?? 0) * f.t * TILE, y = f.y * TILE + (f.vy ?? 0) * f.t * TILE;
          ctx.fillRect(this.sx(Math.round(x)), this.sy(Math.round(y)), z, z);
          ctx.globalAlpha = 1;
          break;
        }
        case 'ring':
          this.pixelCircle(f.x * TILE, f.y * TILE, (0.5 + k * 3) * TILE, f.color ?? C.bone, 1 - k);
          break;
      }
    }
  }

  step(dt: number) {
    this.time += dt;
    this.frameDt = dt;
    for (const f of this.flashes) f.t += dt;
    this.flashes = this.flashes.filter((f) => f.t < f.life);
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.life);
    this.flash.red = Math.max(0, this.flash.red - dt * 1.2);
    this.flash.white = Math.max(0, this.flash.white - dt * 1.5);
  }

  burst(x: number, y: number, n: number, color: string, speed = 1.2, life = 0.6, kind: Fx['kind'] = 'puff') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      this.fx.push({ kind, x, y, t: 0, life: life * (0.6 + Math.random() * 0.6), color, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (kind === 'puff' ? 0.6 : 0) });
    }
  }
}
