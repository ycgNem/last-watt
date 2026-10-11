// Immediate-mode UI kit drawn on the canvas in UI pixels (screen px / scale). Every text and
// panel is recorded each frame so the screens check (e2e/screens.mjs) can look for overlaps.
import { C, rgba } from '../data/palette';
import type { Input } from '../engine/input';
import { drawText, textWidth, wrapText, LINE_H } from './font';
import { drawIcon } from '../render/art';

export interface Rect { x: number; y: number; w: number; h: number }
export interface Rec { kind: 'text' | 'panel' | 'button'; x: number; y: number; w: number; h: number; s?: string; layer: number }

export class UI {
  ctx!: CanvasRenderingContext2D;
  input!: Input;
  scale = 2;
  w = 0;
  h = 0;
  mx = -1;
  my = -1;
  clicked = false;
  rclicked = false;
  /** the mouse is over UI drawn last frame (so world clicks don't fall through) */
  overUI = false;
  private blocks: Rect[] = [];
  private prev: Rect[] = [];
  tip: { lines: { text: string; color?: string }[]; x: number; y: number } | null = null;
  recs: Rec[] = [];
  lastRecs: Rec[] = [];
  layer = 0;
  sfx: (id: string) => void = () => {};

  begin(ctx: CanvasRenderingContext2D, input: Input, scale: number) {
    this.ctx = ctx;
    this.input = input;
    this.scale = scale;
    this.w = Math.floor(ctx.canvas.width / scale);
    this.h = Math.floor(ctx.canvas.height / scale);
    this.mx = Math.floor(input.mouse.x / scale);
    this.my = Math.floor(input.mouse.y / scale);
    this.prev = this.blocks;
    this.blocks = [];
    this.overUI = this.prev.some((b) => this.inside(b));
    this.clicked = input.mouse.pressed[0];
    this.rclicked = input.mouse.pressed[2];
    this.tip = null;
    // begin() can run twice a frame (input first, drawing second): keep the last frame that drew
    if (this.recs.length) this.lastRecs = this.recs;
    this.recs = [];
    this.layer = 0;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  inside(r: Rect) {
    return this.mx >= r.x && this.my >= r.y && this.mx < r.x + r.w && this.my < r.y + r.h;
  }

  hover(x: number, y: number, w: number, h: number) {
    return this.mx >= x && this.my >= y && this.mx < x + w && this.my < y + h;
  }

  block(x: number, y: number, w: number, h: number) {
    this.blocks.push({ x, y, w, h });
  }

  eat() {
    this.clicked = false;
    this.input.mouse.pressed[0] = false;
  }

  fill(x: number, y: number, w: number, h: number, color: string, a = 1) {
    this.ctx.fillStyle = a >= 1 ? color : rgba(color, a);
    this.ctx.fillRect(x, y, w, h);
  }

  panel(x: number, y: number, w: number, h: number, opts: { blocking?: boolean; border?: string; bg?: string; alpha?: number } = {}) {
    x = Math.round(x);
    y = Math.round(y);
    if (opts.blocking !== false) this.block(x, y, w, h);
    this.recs.push({ kind: 'panel', x, y, w, h, layer: this.layer });
    this.fill(x, y, w, h, opts.bg ?? C.soot, opts.alpha ?? 0.92);
    const b = opts.border ?? C.iron;
    this.fill(x, y, w, 1, b);
    this.fill(x, y + h - 1, w, 1, b);
    this.fill(x, y, 1, h, b);
    this.fill(x + w - 1, y, 1, h, b);
    this.fill(x + 1, y + 1, w - 2, 1, C.slate);
  }

  text(s: string, x: number, y: number, color: string = C.mist, shadow: string | null = C.ink): number {
    x = Math.round(x);
    y = Math.round(y);
    const w = textWidth(s);
    this.recs.push({ kind: 'text', x, y, w, h: 7, s, layer: this.layer });
    drawText(this.ctx, s, x, y, color, 1, shadow);
    return w;
  }

  textR(s: string, right: number, y: number, color?: string) {
    return this.text(s, right - textWidth(s), y, color);
  }

  textC(s: string, cx: number, y: number, color?: string) {
    return this.text(s, cx - textWidth(s) / 2, y, color);
  }

  big(s: string, cx: number, y: number, scale: number, color: string, shadow: string = C.ink) {
    const w = textWidth(s) * scale;
    const x = Math.round(cx - w / 2);
    this.recs.push({ kind: 'text', x, y, w, h: 7 * scale, s, layer: this.layer });
    drawText(this.ctx, s, x, y, color, scale, shadow);
  }

  wrap(s: string, x: number, y: number, maxW: number, color?: string): number {
    const lines = wrapText(s, maxW);
    lines.forEach((l, i) => this.text(l, x, y + i * LINE_H, color));
    return lines.length * LINE_H;
  }

  icon(name: string, x: number, y: number) {
    return drawIcon(this.ctx, name, Math.round(x), Math.round(y), 1);
  }

  /** a button; returns true when clicked */
  button(label: string, x: number, y: number, w: number, h: number, opts: { active?: boolean; disabled?: boolean; color?: string; tip?: string[] } = {}): boolean {
    x = Math.round(x);
    y = Math.round(y);
    this.block(x, y, w, h);
    const hov = this.hover(x, y, w, h);
    this.recs.push({ kind: 'button', x, y, w, h, s: label, layer: this.layer });
    const bg = opts.active ? C.copper : hov && !opts.disabled ? C.iron : C.slate;
    this.fill(x, y, w, h, C.ink);
    this.fill(x + 1, y + 1, w - 2, h - 2, bg);
    this.fill(x + 1, y + 1, w - 2, 1, opts.active ? C.brass : hov && !opts.disabled ? C.steel : C.iron);
    const tw = textWidth(label);
    drawText(this.ctx, label, Math.round(x + (w - tw) / 2), Math.round(y + (h - 7) / 2), opts.disabled ? C.steel : opts.color ?? C.bone, 1, C.ink);
    if (hov && opts.tip) this.tooltip(opts.tip.map((t) => ({ text: t })));
    if (hov && this.clicked && !opts.disabled) {
      this.eat();
      this.sfx('click');
      return true;
    }
    return false;
  }

  /** a horizontal bar: fraction f filled */
  bar(x: number, y: number, w: number, h: number, f: number, color: string, bg: string = C.night) {
    this.fill(x, y, w, h, C.ink);
    this.fill(x + 1, y + 1, w - 2, h - 2, bg);
    const fw = Math.round((w - 2) * Math.max(0, Math.min(1, f)));
    if (fw > 0) this.fill(x + 1, y + 1, fw, h - 2, color);
  }

  tooltip(lines: { text: string; color?: string }[]) {
    this.tip = { lines, x: this.mx, y: this.my };
  }

  /** draw the tooltip last, kept on screen */
  end() {
    if (!this.tip) return;
    this.layer = 9;
    const maxW = 190;
    const wrapped: { text: string; color?: string }[] = [];
    for (const l of this.tip.lines) for (const t of wrapText(l.text, maxW)) wrapped.push({ text: t, color: l.color });
    const w = Math.min(maxW, Math.max(...wrapped.map((l) => textWidth(l.text)))) + 8;
    const h = wrapped.length * LINE_H + 5;
    let x = this.tip.x + 10, y = this.tip.y + 12;
    if (x + w > this.w - 2) x = this.tip.x - w - 4;
    if (y + h > this.h - 2) y = this.tip.y - h - 4;
    x = Math.max(2, x);
    y = Math.max(2, y);
    this.panel(x, y, w, h, { blocking: false, border: C.steel, alpha: 0.97 });
    wrapped.forEach((l, i) => this.text(l.text, x + 4, y + 3 + i * LINE_H, l.color ?? (i === 0 ? C.gold : C.mist)));
  }
}
