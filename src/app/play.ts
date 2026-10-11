// The play screen: input → actions, build mode, selection, camera, events → effects and
// messages, and the immediate-mode HUD. The sim is stepped by the loop in main.ts.
import { BUILDINGS, BUILD_ORDER, type BuildingId } from '../data/buildings';
import { C } from '../data/palette';
import { RESEARCH, RESEARCH_ORDER } from '../data/research';
import { RULES } from '../data/rules';
import { WAVES } from '../data/waves';
import { ENEMIES } from '../data/enemies';
import type { Audio } from '../engine/audio';
import type { Input } from '../engine/input';
import { TILE, type Renderer } from '../render/renderer';
import {
  nextWave, overcharge, overchargeProblem, place, placeProblem, sell, sellValue, setTier, startResearch, toggleOff,
  toggleTier, upgrade, upgradeProblem,
} from '../sim/actions';
import { Game } from '../sim/Game';
import { touches } from '../sim/geom';
import { callEarlyBonus } from '../sim/systems/waves';
import type { Building, GameEvent } from '../sim/types';
import { UI } from '../ui/ui';
import { textWidth } from '../ui/font';
import type { Bot } from './bot';

interface Msg { text: string; color: string; t: number; life: number }

const HUD_H = 30;
const BAR_H = 36;
const TIER_NAMES = ['', 'Wall', 'Fuel', 'Labs', 'Spare'];

export class Play {
  game: Game;
  buildId: BuildingId | null = null;
  selectedId = 0;
  hoverId = 0;
  hoverTile = { x: -1, y: -1 };
  msgs: Msg[] = [];
  paused = false;
  speed = 1;
  help = false;
  bot: Bot | null = null;
  private cool = new Map<string, number>();
  private hintClock = 0;
  /** right edge of the first-steps card (UI px), so the message feed stays clear of it */
  stepsRight = 0;
  /** wall-clock seconds since this run began (for message ages) */
  clock = 0;

  constructor(public r: Renderer, public ui: UI, public input: Input, public audio: Audio, public onRestart: () => void) {
    this.game = new Game();
    const [fx, fy] = this.game.map.focus;
    r.cam.x = fx * TILE;
    r.cam.y = fy * TILE;
    this.say('Keep the Hearth lit for 8 waves. Lamps fire on watts, not money.', C.gold, 8);
  }

  get selected(): Building | undefined {
    return this.game.buildings.get(this.selectedId);
  }

  say(text: string, color: string = C.mist, life = 6) {
    this.msgs.push({ text, color, t: 0, life });
    if (this.msgs.length > 5) this.msgs.shift();
  }

  /** say something at most once per `cd` seconds per key */
  sayOnce(key: string, cd: number, text: string, color?: string, life?: number) {
    const last = this.cool.get(key);
    if (last !== undefined && this.clock - last < cd) return;
    this.cool.set(key, this.clock);
    this.say(text, color, life);
  }

  /** one fixed sim tick (called by the loop) */
  tick() {
    if (this.paused || this.game.over) return;
    if (this.bot && this.game.tick % 6 === 0) this.bot.act(this.game);
    this.game.step();
  }

  // ---- per frame ----

  frame(dt: number) {
    this.clock += dt;
    for (const m of this.msgs) m.t += dt;
    this.msgs = this.msgs.filter((m) => m.t < m.life);
    this.handleEvents();
    this.handleInput(dt);
    this.hints(dt);
    const g = this.game;
    this.audio.setHum(Math.min(1, g.grid.demand / 120), g.grid.tiers[1].sat);
  }

  private handleEvents() {
    const g = this.game, r = this.r, a = this.audio;
    for (const e of g.drainEvents()) this.onEvent(e, g, r, a);
  }

  private onEvent(e: GameEvent, g: Game, r: Renderer, a: Audio) {
    switch (e.t) {
      case 'place': {
        const d = BUILDINGS[e.def];
        r.burst(e.x + d.size / 2, e.y + d.size, 8, C.ash, 1, 0.4, 'spark');
        a.sfx('place');
        break;
      }
      case 'sell':
        r.fx.push({ kind: 'float', x: e.x, y: e.y, t: 0, life: 1.2, text: `+${e.money}`, color: C.gold });
        a.sfx('sell');
        break;
      case 'kill':
        this.float(e.x, e.y, e.money, C.gold, '+', '');
        r.burst(e.x, e.y, e.enemy === 'pall' ? 24 : 7, e.enemy === 'pall' ? C.violet : C.mist, e.enemy === 'pall' ? 2 : 1.2, 0.7);
        a.sfx('kill');
        break;
      case 'leak': {
        const h = r.centreOf(g.hearth);
        this.float(h.x / TILE, h.y / TILE - 1.5, e.lights, C.ember, '-', ' LIGHT', 1.4);
        r.burst(e.x, e.y, 12, C.ember, 1.5, 0.6, 'spark');
        r.flash.red = 0.5;
        a.sfx('leak');
        if (g.lights <= 5 && g.lights > 0) this.sayOnce('lowlights', 30, `Only ${g.lights} lights left.`, C.ember);
        break;
      }
      case 'wave': {
        const w = WAVES[e.n - 1];
        this.say(`WAVE ${e.n} of ${WAVES.length}${w.note ? ': ' + w.note : ''}`, C.gold, 7);
        if (e.bonus) this.say(`+${e.bonus} money for calling it early.`, C.gold, 4);
        a.sfx('wave');
        break;
      }
      case 'brownout': {
        this.sayOnce('brownout', 20, 'BROWNOUT: your towers ask for more watts than you make, so every one of them fires slower (tier 1 bar, top). More Burners, or shed something.', C.violet, 8);
        a.sfx('brownout');
        break;
      }
      case 'recovered':
        this.sayOnce('recovered', 20, 'The wall is back on full power.', C.amber, 3);
        a.sfx('recovered');
        break;
      case 'knock':
        r.burst(e.x, e.y, 14, C.ice, 2, 0.5, 'spark');
        a.sfx('knock');
        this.sayOnce('knock', 40, 'A Shade cut a Node beside the path: everything past it is dark for 10 s. Keep Nodes a tile back from the path, or give power two routes.', C.ice, 9);
        break;
      case 'restore':
        break;
      case 'overcharge':
        r.fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.6, color: C.bone });
        r.flash.white = 0.3;
        a.sfx('overcharge');
        break;
      case 'research':
        this.say(`Research done: ${RESEARCH[e.id].name}. ${e.id === 'jar' ? 'Build Jars (7); Overcharge a tower with E.' : 'Select a Lamp and upgrade it (U).'}`, C.cyan, 8);
        a.sfx('research');
        break;
      case 'dry':
        this.sayOnce('dry', 15, 'A Burner ran out of emberrock and went cold.', C.ember, 5);
        a.sfx('dry');
        break;
      case 'win':
        a.sfx('win');
        break;
      case 'lose':
        a.sfx('lose');
        break;
      case 'msg':
        this.say(e.text);
        break;
    }
  }

  /** a floating number; one that lands near a fresh one adds to it instead of stacking */
  private float(x: number, y: number, n: number, color: string, sign: string, unit: string, life = 0.9) {
    const near = this.r.fx.find((f) => f.kind === 'float' && f.color === color && f.t < 0.35 && Math.hypot(f.x - x, f.y - y) < 1.5);
    if (near) {
      near.vx = (near.vx ?? 0) + n;
      near.text = `${sign}${near.vx}${unit}${unit && near.vx > 1 ? 'S' : ''}`;
      near.t = Math.min(near.t, 0.1);
      return;
    }
    this.r.fx.push({ kind: 'float', x, y, t: 0, life, vx: n, text: `${sign}${n}${unit}${unit && n > 1 ? 'S' : ''}`, color });
  }

  /** contextual hints: the brownout spiral, the Jar, wasted power */
  private hints(dt: number) {
    this.hintClock += dt;
    if (this.hintClock < 1) return;
    this.hintClock = 0;
    const g = this.game;
    const bs = [...g.buildings.values()];
    for (const b of bs) {
      if (b.def.role !== 'generator' || b.fuel > 1 || b.off) continue;
      const feeders = bs.filter((x) => x.def.role === 'extractor' && touches(g.rect(x), g.rect(b)));
      if (feeders.length === 0 && b.net >= 0 && b.output <= 0) {
        this.sayOnce('nofeed', 25, 'A Burner has no Extractor touching it: put one on emberrock right next to it.', C.ember, 7);
        break;
      }
      if (feeders.length && feeders.every((x) => x.sat < 0.3 && !x.off && x.stock === 0)) {
        this.sayOnce('spiral', 25, 'Your Extractors are starved (tier 2) and the Burners are running out. Select an Extractor and set it to tier 1.', C.violet, 9);
        break;
      }
    }
    if (g.grid.wasted > 12 && g.wave >= 2 && !g.research.done.has('jar'))
      this.sayOnce('waste', 60, `${Math.round(g.grid.wasted)} kW is being wasted. A Lab (8) turns spare power into research.`, C.amber, 7);
  }

  private handleInput(dt: number) {
    const inp = this.input, r = this.r, g = this.game;
    const k = (c: string) => inp.key(c);
    if (k('KeyH') || k('F1')) this.help = !this.help;
    if (k('KeyM')) this.audio.setMuted(!this.audio.muted);
    if (g.over) {
      if (k('KeyR') || k('Enter')) this.onRestart();
      return;
    }
    if (k('KeyP')) this.paused = !this.paused;
    if (k('KeyF')) this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
    if (k('Escape')) {
      if (this.help) this.help = false;
      else if (this.buildId) this.buildId = null;
      else if (this.selectedId) this.selectedId = 0;
      else this.paused = !this.paused;
    }
    BUILD_ORDER.forEach((id, i) => {
      if (k(`Digit${i + 1}`) || k(`Numpad${i + 1}`)) this.pickBuild(id);
    });
    if (k('Space')) this.callWave();
    // camera
    const pan = (inp.shift ? 600 : 300) * dt / Math.max(1, r.cam.z / 2);
    if (inp.held('KeyW') || inp.held('ArrowUp')) r.cam.y -= pan;
    if (inp.held('KeyS') || inp.held('ArrowDown')) r.cam.y += pan;
    if (inp.held('KeyA') || inp.held('ArrowLeft')) r.cam.x -= pan;
    if (inp.held('KeyD') || inp.held('ArrowRight')) r.cam.x += pan;
    if (inp.mouse.down[1] && inp.dragFrom) {
      r.cam.x -= (inp.mouse.x - inp.dragFrom.x) / r.cam.z;
      r.cam.y -= (inp.mouse.y - inp.dragFrom.y) / r.cam.z;
      inp.dragFrom = { x: inp.mouse.x, y: inp.mouse.y };
    }
    if (inp.mouse.wheel && !this.ui.overUI) {
      const before = r.screenToTile(inp.mouse.x, inp.mouse.y);
      r.cam.z = Math.max(1, Math.min(6, r.cam.z - Math.sign(inp.mouse.wheel)));
      const after = r.screenToTile(inp.mouse.x, inp.mouse.y);
      r.cam.x += (before.fx - after.fx) * TILE;
      r.cam.y += (before.fy - after.fy) * TILE;
    }
    if (k('KeyC') || k('Home')) {
      const [fx, fy] = g.map.focus;
      r.cam.x = fx * TILE;
      r.cam.y = fy * TILE;
    }
    r.clampCamera(g, HUD_H * this.ui.scale);

    // hover
    const t = r.screenToTile(inp.mouse.x, inp.mouse.y);
    this.hoverTile = { x: t.x, y: t.y };
    const overUI = this.ui.overUI;
    const hb = overUI ? undefined : g.buildingAt(t.x, t.y);
    this.hoverId = hb?.id ?? 0;
    const target = hb ?? this.selected;
    if (k('KeyX') && target) this.act(toggleOff(g, target));
    if (k('KeyE') && target) this.act(overcharge(g, target));
    if (k('KeyT') && target && target.def.tier) this.act(setTier(g, target, (target.tier % 4) + 1), 'click');
    if (k('KeyU') && target) this.act(upgrade(g, target), 'place');
    if ((k('Delete') || k('Backspace')) && this.selected) {
      const s = this.selected;
      if (!this.act(sell(g, s))) this.selectedId = 0;
    }

    // mouse on the world
    if (!overUI) {
      if (inp.mouse.pressed[2]) {
        if (this.buildId) this.buildId = null;
        else this.selectedId = 0;
      }
      if (inp.mouse.pressed[0]) {
        if (this.buildId) {
          const gx = this.ghostXY();
          const res = place(g, this.buildId, gx.x, gx.y);
          if (typeof res === 'string') {
            this.say(res, C.ember, 3);
            this.audio.sfx('error');
          } else {
            this.selectedId = res.id;
            if (!inp.shift) this.buildId = null;
          }
        } else this.selectedId = hb?.id ?? 0;
      }
    }
  }

  /** a short message for a refused action; returns the reason (null on success) */
  private act(why: string | null, ok = 'click'): string | null {
    if (why) {
      this.say(why, C.ember, 3);
      this.audio.sfx('error');
    } else this.audio.sfx(ok);
    return why;
  }

  pickBuild(id: BuildingId) {
    this.buildId = this.buildId === id ? null : id;
    this.selectedId = 0;
    this.audio.sfx('click');
  }

  callWave() {
    const g = this.game;
    if (g.wave >= WAVES.length) return;
    this.act(nextWave(g), 'click');
  }

  /** the ghost's top-left: footprint centred on the mouse */
  ghostXY() {
    const d = BUILDINGS[this.buildId!];
    const t = this.r.screenToTile(this.input.mouse.x, this.input.mouse.y);
    return { x: Math.floor(t.fx - d.size / 2 + 0.5), y: Math.floor(t.fy - d.size / 2 + 0.5) };
  }

  overlay() {
    const g = this.game;
    const ov: Parameters<Renderer['draw']>[1] = {
      hover: g.buildings.get(this.hoverId),
      selected: this.selected,
      coverage: !!this.buildId,
    };
    if (this.buildId && !this.ui.overUI) {
      const p = this.ghostXY();
      ov.ghost = { id: this.buildId, x: p.x, y: p.y, ok: !placeProblem(g, this.buildId, p.x, p.y) };
    }
    return ov;
  }

  // ---- HUD ----

  drawUI() {
    const ui = this.ui, g = this.game;
    this.drawTop(ui, g);
    this.drawBuildBar(ui, g);
    if (this.selected) this.drawSelected(ui, g, this.selected);
    else if (this.hoverId && !this.buildId) this.hoverTip(ui, g, g.buildings.get(this.hoverId)!);
    if (g.wave === 0) this.drawFirstSteps(ui, g);
    this.drawMessages(ui);
    if (this.help) this.drawHelp(ui);
    if (this.paused && !g.over) {
      ui.layer = 5;
      ui.panel(ui.w / 2 - 60, ui.h / 2 - 16, 120, 28);
      ui.textC('PAUSED', ui.w / 2, ui.h / 2 - 11, C.gold);
      ui.textC('P to resume', ui.w / 2, ui.h / 2 - 1, C.ash);
    }
    if (g.over) this.drawEnd(ui, g);
    ui.end();
  }

  private drawTop(ui: UI, g: Game) {
    ui.layer = 1;
    ui.panel(0, 0, ui.w, HUD_H, { alpha: 0.94 });
    // lights and money
    ui.icon('light', 4, 7);
    ui.text(`${g.lights}`, 22, 6, g.lights <= 5 ? C.ember : C.gold);
    ui.text('LIGHTS', 22, 16, C.steel);
    ui.icon('money', 58, 7);
    ui.text(`${g.money}`, 76, 6, C.gold);
    ui.text('MONEY', 76, 16, C.steel);
    if (ui.hover(0, 0, 110, HUD_H))
      ui.tooltip([
        { text: 'Lights and money' },
        { text: `Lights: the station's life. A Moth that reaches the Hearth costs 1, a Shade 2, a Pall 5. At 0 the run ends.` },
        { text: 'Money: kills pay bounty (Moth 5, Shade 14, Pall 60). It buys what you own; watts decide what runs.' },
      ]);
    // power
    const gr = g.grid;
    let x = 116;
    ui.icon('kw', x, 7);
    x += 19;
    const supply = Math.round(gr.supply), demand = Math.round(gr.demand), wasted = Math.round(gr.wasted);
    const short = gr.demand > gr.supply + 0.5;
    x += ui.text(`${supply} kW`, x, 6, C.gold) + 3;
    ui.text('SUPPLY', 135, 16, C.steel);
    const dx = Math.max(x + 6, 190);
    const dw = ui.text(`${demand} kW`, dx, 6, short ? C.violet : C.mist);
    ui.text('DEMAND', dx, 16, C.steel);
    const wx = Math.max(dx + dw + 10, 236);
    const ww = ui.text(`${wasted} kW`, wx, 6, wasted > 0 ? C.amber : C.steel);
    ui.text('WASTED', wx, 16, C.steel);
    let tx = Math.max(wx + ww + 12, 282);
    if (gr.capacity > 0) {
      const jw = ui.text(`${Math.round(gr.stored)} kJ`, tx, 6, C.gold);
      ui.text(`JARS/${gr.capacity}`, tx, 16, C.steel);
      tx += Math.max(jw, textWidth(`JARS/${gr.capacity}`)) + 10;
    }
    if (ui.hover(112, 0, tx - 112, HUD_H))
      ui.tooltip([
        { text: 'The grid, right now' },
        { text: `Supply ${supply} kW: the Hearth's 8 kW plus every lit Burner (20 kW each), plus Jars when they discharge.` },
        { text: `Demand ${demand} kW: towers ask 12+ kW while firing and 1 kW idle; Extractors 2 kW; Labs 10 kW.` },
        { text: 'When demand beats supply everything in a tier slows together: satisfaction = supply / demand.' },
        { text: `Wasted ${wasted} kW: power nobody asked for. Jars store it; Labs turn it into research.` },
      ]);
    // tiers
    for (let t = 1; t <= 4; t++) {
      const ts = gr.tiers[t];
      const bx = tx + (t - 1) * 41;
      if (bx + 38 > ui.w - 124) break;
      const off = g.tierOff[t];
      const col = off ? C.slate : ts.sat < RULES.starvedBelow.v ? C.violet : C.amber;
      ui.text(`${t} ${TIER_NAMES[t]}`, bx, 5, off ? C.steel : C.mist);
      ui.bar(bx, 15, 37, 6, off ? 0 : ts.demand > 0 ? ts.sat : 1, col);
      ui.text(off ? 'OFF' : ts.demand > 0 ? `${Math.round(ts.sat * 100)}%` : '-', bx + 2, 22 - 0, off ? C.ember : C.steel);
      if (ui.hover(bx - 2, 0, 41, HUD_H)) {
        const members = [...g.buildings.values()].filter((b) => b.def.tier && b.tier === t).map((b) => b.def.name);
        const counts = new Map<string, number>();
        for (const m of members) counts.set(m, (counts.get(m) ?? 0) + 1);
        ui.tooltip([
          { text: `Tier ${t}: ${off ? 'SHED (off)' : `${Math.round(ts.served)} of ${Math.round(ts.demand)} kW served`}` },
          { text: [...counts].map(([n, c]) => `${c} ${n}${c > 1 ? 's' : ''}`).join(', ') || 'Nothing on this tier.' },
          { text: 'Tier 1 is served in full before tier 2 sees a watt, and so on. Click to shed (or restore) the whole tier.', color: C.ash },
        ]);
        if (ui.clicked) {
          ui.eat();
          toggleTier(g, t);
          this.audio.sfx('click');
        }
      }
    }
    // wave
    const rx = ui.w - 4;
    const wv = g.wave === 0 ? 'BEFORE WAVE 1' : `WAVE ${g.wave} / ${WAVES.length}`;
    ui.textR(wv, rx, 4, C.mist);
    let label: string, tip: string[];
    if (g.wave === 0) {
      label = 'START [SPACE]';
      tip = ['Start wave 1', 'Build first. Wave 1 waits for you.'];
    } else if (g.wave < WAVES.length) {
      const bonus = callEarlyBonus(g);
      ui.text(`${Math.ceil(g.waveTimer)}s`, rx - 118, 4 + 10, C.steel);
      label = `NEXT +${bonus} [SPACE]`;
      tip = [`Call wave ${g.wave + 1} now`, `Pays 25% of its bounty × the time left: +${bonus} now. Waves overlap if you call while one is running.`];
    } else {
      label = '';
      tip = [];
      const left = g.enemies.length + g.spawners.reduce((a, s) => a + s.seq.length - s.i, 0);
      ui.textR(`${left} left`, rx, 15, C.steel);
    }
    if (label && !g.over && ui.button(label, rx - 92, 13, 92, 14, { tip, color: C.gold })) this.callWave();
  }

  private drawBuildBar(ui: UI, g: Game) {
    ui.layer = 1;
    const n = BUILD_ORDER.length;
    const sw = 34;
    const w = n * sw + 4;
    const x0 = Math.round(ui.w / 2 - w / 2), y0 = ui.h - BAR_H;
    ui.panel(x0, y0, w, BAR_H);
    BUILD_ORDER.forEach((id, i) => {
      const d = BUILDINGS[id];
      const x = x0 + 2 + i * sw, y = y0 + 2;
      const locked = !!d.research && !g.research.done.has(d.research);
      const poor = g.money < d.cost;
      const active = this.buildId === id;
      const hov = ui.hover(x, y, sw - 2, BAR_H - 4);
      ui.fill(x, y, sw - 2, BAR_H - 4, active ? C.copper : hov ? C.iron : C.slate);
      ui.fill(x, y, sw - 2, 1, active ? C.brass : C.iron);
      ui.ctx.globalAlpha = locked ? 0.35 : 1;
      ui.icon(d.id, x + (sw - 2) / 2 - 8, y + 3);
      ui.ctx.globalAlpha = 1;
      ui.text(`${i + 1}`, x + 2, y + 1, C.steel, null);
      ui.textC(locked ? 'LAB' : `${d.cost}`, x + (sw - 2) / 2, y + 22, locked ? C.cyan : poor ? C.ember : C.gold);
      if (hov) {
        const lines: { text: string; color?: string }[] = [{ text: `${d.name}  (${i + 1})  ${d.cost} money` }, { text: d.blurb }];
        lines.push({ text: this.wattLine(id), color: C.amber });
        if (locked) lines.push({ text: `Needs research: ${RESEARCH[d.research!].name} (build a Lab).`, color: C.cyan });
        ui.tooltip(lines);
        if (ui.clicked) {
          ui.eat();
          this.pickBuild(id);
        }
      }
    });
    // speed and help, beside the bar
    const bx = x0 + w + 6;
    if (bx + 60 < ui.w) {
      if (ui.button(this.paused ? 'PAUSED' : `SPEED x${this.speed}`, bx, y0 + 4, 60, 13, { tip: ['Speed (F) / pause (P)'], active: this.paused })) this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
      if (ui.button('HELP [H]', bx, y0 + 19, 60, 13)) this.help = !this.help;
    }
    if (this.buildId) {
      const d = BUILDINGS[this.buildId];
      ui.textC(`Placing ${d.name}: click to build, right-click to cancel, hold Shift to place several`, ui.w / 2, y0 - 10, C.ash);
    }
  }

  private wattLine(id: BuildingId): string {
    const d = BUILDINGS[id];
    switch (d.role) {
      case 'tower': return `${d.firingDraw} kW firing, ${d.idleDraw} kW idle, efficiency ${d.efficiency} → ${(d.firingDraw! * d.efficiency!).toFixed(1)} kJ/s at full power. Range ${d.range}.`;
      case 'beacon': return `${d.constantDraw} kW always. Range ${d.range}.`;
      case 'extractor': return `${d.workDraw} kW while digging (tier 2).`;
      case 'generator': return `+${d.output} kW while it has emberrock.`;
      case 'node': return `Draws nothing. Reach ${d.nodeRadius} tiles.`;
      case 'storage': return `${d.capacity} kJ; charges ≤ ${d.maxCharge} kW, discharges ≤ ${d.maxDischarge} kW.`;
      case 'lab': return `${d.workDraw} kW while researching (tier 3).`;
      default: return '';
    }
  }

  private stateWord(g: Game, b: Building): { text: string; color: string } {
    const st = this.r.stateOf(g, b);
    if (b.off) return { text: 'SHED (OFF)', color: C.ash };
    if (b.def.role === 'node' && b.offline > 0) return { text: `CUT ${Math.ceil(b.offline)}s`, color: C.ember };
    if (b.net < 0 && b.def.role !== 'core') return { text: 'NO POWER (off every network)', color: C.violet };
    if (b.def.role === 'generator') return b.output > 0 ? { text: 'LIT', color: C.gold } : { text: 'COLD: no emberrock', color: C.ember };
    if (b.def.role === 'lab' && !g.research.active) return { text: 'IDLE: pick a project below', color: C.cyan };
    if (st === 'starved') return { text: `STARVED ${Math.round(b.sat * 100)}%`, color: C.violet };
    return { text: b.def.role === 'core' ? 'ALWAYS ON' : `POWERED ${b.def.tier ? Math.round(b.sat * 100) + '%' : ''}`, color: C.gold };
  }

  private infoLines(g: Game, b: Building): { text: string; color?: string }[] {
    const d = b.def;
    const out: { text: string; color?: string }[] = [];
    switch (d.role) {
      case 'core':
        out.push({ text: '8 kW, always on, no fuel.' }, { text: `Carries power ${d.nodeRadius} tiles. Lights ${g.lights}/${RULES.startLights.v}.` });
        break;
      case 'tower': {
        const s = g.towerStats(b);
        const dps = b.overcharge > 0 ? s.firingDraw * RULES.overchargeMult.v * s.efficiency : s.firingDraw * s.efficiency * b.sat;
        out.push({ text: `Asks ${s.firingDraw} kW firing, ${d.idleDraw} kW idle.` });
        out.push({ text: `${b.target >= 0 ? 'Firing' : 'Would fire'}: ${dps.toFixed(1)} of ${(s.firingDraw * s.efficiency).toFixed(1)} kJ/s.`, color: b.sat < RULES.starvedBelow.v ? C.violet : C.amber });
        if (b.overcharge > 0) out.push({ text: `OVERCHARGED ${b.overcharge.toFixed(1)}s`, color: C.bone });
        out.push({ text: `Range ${d.range}. Targets the enemy nearest the Hearth.` });
        break;
      }
      case 'beacon':
        out.push({ text: `Asks ${d.constantDraw} kW always.` }, { text: `Slows by ${Math.round((d.slow ?? 0) * b.sat * 100)}% (40% × satisfaction).`, color: C.amber });
        break;
      case 'extractor': {
        const feeds = [...g.buildings.values()].some((u) => u.def.role === 'generator' && touches(g.rect(u), g.rect(b)));
        out.push({ text: `Asks ${d.workDraw} kW while digging. 1 rock / ${d.rockInterval} s at full power.` });
        out.push({ text: `Holding ${b.stock}/${d.stockCap} rocks. Next ${Math.round(b.progress * 100)}%.` });
        out.push(feeds ? { text: 'Feeding a Burner next to it.', color: C.amber } : { text: 'No Burner touching it: its rock goes nowhere.', color: C.ember });
        break;
      }
      case 'generator': {
        const fed = [...g.buildings.values()].filter((u) => u.def.role === 'extractor' && touches(g.rect(u), g.rect(b))).length;
        out.push({ text: `Makes ${d.output} kW while lit. One rock lasts 10 s.` });
        out.push({ text: `Fuel: ${b.fuel}/${d.fuelCap} rocks${b.burnLeft > 0 ? ` + ${Math.ceil(b.burnLeft)}s burning` : ''}.` });
        out.push(fed ? { text: `Fed by ${fed} Extractor${fed > 1 ? 's' : ''}.`, color: C.amber } : { text: 'No Extractor touching it.', color: C.ember });
        break;
      }
      case 'node':
        out.push({ text: `Carries power ${d.nodeRadius} tiles.` }, { text: 'A Shade passing right beside it cuts it for 10 s.' });
        break;
      case 'storage':
        out.push({ text: `Stored ${Math.round(b.charge)}/${d.capacity} kJ.` });
        out.push({ text: b.flow > 0.1 ? `Charging ${b.flow.toFixed(0)} kW` : b.flow < -0.1 ? `Discharging ${(-b.flow).toFixed(0)} kW` : 'Idle', color: C.amber });
        out.push({ text: `Overcharge costs ${RULES.overchargeCost.v} kJ from Jars on the tower's network.` });
        break;
      case 'lab':
        out.push({ text: `Asks ${d.workDraw} kW while a project runs: 1 kW = 1 kJ of research per second.` });
        break;
    }
    return out;
  }

  private hoverTip(ui: UI, g: Game, b: Building) {
    if (!b) return;
    const sw = this.stateWord(g, b);
    ui.tooltip([{ text: `${b.def.name}${b.level > 1 ? ' (tier 2)' : ''}` }, { text: sw.text, color: sw.color }, ...this.infoLines(g, b), { text: 'Click for controls.', color: C.steel }]);
  }

  private drawSelected(ui: UI, g: Game, b: Building) {
    ui.layer = 2;
    const w = 158;
    const x = ui.w - w - 4, y0 = HUD_H + 4;
    const lines = this.infoLines(g, b);
    // measure
    const inner = w - 10;
    let h = 26;
    for (const l of lines) h += Math.ceil(textWidth(l.text) / inner + 0.01) * 10;
    const isTower = b.def.role === 'tower';
    if (b.def.tier) h += 30;
    if (b.def.role !== 'core' && b.def.role !== 'node') h += 16;
    if (isTower) h += 16;
    if (b.def.upgrades && b.level <= b.def.upgrades.length) h += 16;
    if (b.def.role === 'lab') h += RESEARCH_ORDER.length * 22 + 4;
    if (b.def.role !== 'core') h += 16;
    h += 4;
    ui.panel(x, y0, w, h, { border: C.steel });
    let y = y0 + 4;
    ui.text(`${b.def.name}${b.level > 1 ? ' (tier 2)' : ''}`, x + 5, y, C.gold);
    if (ui.button('x', x + w - 13, y - 1, 10, 10)) this.selectedId = 0;
    y += 10;
    const sw = this.stateWord(g, b);
    ui.text(sw.text, x + 5, y, sw.color);
    y += 12;
    for (const l of lines) y += ui.wrap(l.text, x + 5, y, inner, l.color ?? C.mist);
    y += 2;
    if (b.def.tier) {
      ui.text('Priority tier (T)', x + 5, y, C.ash);
      y += 10;
      for (let t = 1; t <= 4; t++) {
        if (ui.button(`${t}`, x + 5 + (t - 1) * 22, y, 20, 14, { active: b.tier === t, tip: [`Tier ${t}`, 'Tier 1 is served in full before tier 2 sees a watt.'] })) setTier(g, b, t);
      }
      y += 20;
    }
    if (b.def.role !== 'core' && b.def.role !== 'node') {
      if (ui.button(b.off ? 'TURN ON (X)' : 'SHED (X)', x + 5, y, w - 10, 14, { active: b.off, tip: ['Shed', 'Turn it off: it asks for nothing and does nothing. A shed Burner keeps its fuel.'] })) this.act(toggleOff(g, b));
      y += 16;
    }
    if (isTower) {
      const why = overchargeProblem(g, b);
      if (ui.button(`OVERCHARGE (E) ${RULES.overchargeCost.v} kJ`, x + 5, y, w - 10, 14, { disabled: !!why, color: C.bone, tip: ['Overcharge', `${RULES.overchargeCost.v} kJ straight from the Jars: 3× firing draw for 4 s at full power, whatever the grid is doing.`, ...(why ? [why] : [])] })) this.act(overcharge(g, b));
      y += 16;
    }
    if (b.def.upgrades && b.level <= b.def.upgrades.length) {
      const up = b.def.upgrades[b.level - 1];
      const why = upgradeProblem(g, b);
      if (ui.button(`UPGRADE (U) ${up.cost}`, x + 5, y, w - 10, 14, { disabled: !!why, tip: ['Tier 2', `${up.firingDraw} kW firing at ${up.efficiency} → ${(up.firingDraw * up.efficiency).toFixed(1)} kJ/s. More damage, and more watts.`, ...(why ? [why] : [])] })) this.act(upgrade(g, b), 'place');
      y += 16;
    }
    if (b.def.role === 'lab') {
      y += 2;
      for (const id of RESEARCH_ORDER) {
        const r = RESEARCH[id];
        const done = g.research.done.has(id);
        const p = (g.research.progress[id] ?? 0) / r.cost;
        const active = g.research.active === id;
        if (ui.button(done ? `${r.name}: done` : `${active ? 'RESEARCHING ' : ''}${r.name} ${r.cost} kJ`, x + 5, y, w - 10, 13, { active, disabled: done, tip: [r.name, r.blurb, `${r.cost} kJ: ${Math.round(r.cost / 10)} s on one Lab at full power.`] })) this.act(startResearch(g, id));
        ui.bar(x + 5, y + 14, w - 10, 5, done ? 1 : p, done ? C.steel : C.cyan);
        y += 22;
      }
    }
    if (b.def.role !== 'core') {
      if (ui.button(`SELL +${sellValue(b)} (DEL)`, x + 5, y, w - 10, 14)) {
        if (!this.act(sell(g, b))) this.selectedId = 0;
      }
    }
  }

  private drawMessages(ui: UI) {
    ui.layer = 3;
    let y = HUD_H + 6;
    // centre the feed in the space the first-steps card and the selected panel leave free
    const left = this.game.wave === 0 ? this.stepsRight + 6 : 4;
    const right = this.selected ? ui.w - 166 : ui.w - 4;
    const cx = (left + right) / 2;
    const maxW = Math.max(120, Math.min(360, right - left - 12));
    for (const m of this.msgs.slice(-4)) {
      const a = Math.min(1, (m.life - m.t) * 1.5);
      ui.ctx.globalAlpha = a;
      const lines = Math.max(1, Math.ceil(textWidth(m.text) / maxW + 0.01));
      const bw = Math.min(maxW, textWidth(m.text)) + 10;
      ui.panel(cx - bw / 2, y, bw, lines * 10 + 5, { blocking: false, alpha: 0.85, border: C.slate });
      ui.wrap(m.text, cx - bw / 2 + 5, y + 3, maxW, m.color);
      ui.ctx.globalAlpha = 1;
      y += lines * 10 + 8;
    }
  }

  private drawFirstSteps(ui: UI, g: Game) {
    ui.layer = 2;
    const bs = [...g.buildings.values()];
    const lamps = bs.filter((b) => b.def.id === 'lamp').length;
    const ex = bs.some((b) => b.def.role === 'extractor');
    const burner = bs.some((b) => b.def.role === 'generator' && bs.some((x) => x.def.role === 'extractor' && touches(g.rect(x), g.rect(b))));
    const steps: [boolean, string][] = [
      [lamps >= 2, 'Two Lamps (1) inside the bends; a Node (4) carries power on'],
      [ex, 'An Extractor (5) on glowing emberrock near the Hearth'],
      [burner, 'A Burner (6) touching the Extractor: +20 kW'],
      [false, 'SPACE starts wave 1 when you are ready'],
    ];
    const w = Math.max(...steps.map(([, t]) => textWidth(t))) + 22, h = 16 + steps.length * 11 + 13;
    const x = 4, y = HUD_H + 4;
    this.stepsRight = x + w;
    ui.panel(x, y, w, h);
    ui.text('FIRST STEPS', x + 5, y + 4, C.gold);
    steps.forEach(([done, text], i) => {
      ui.text(done ? '+' : '-', x + 5, y + 16 + i * 11, done ? C.lime : C.steel);
      ui.text(text, x + 13, y + 16 + i * 11, done ? C.steel : C.mist);
    });
    ui.text('Lamps only reach a powered network (lit area).', x + 5, y + 16 + steps.length * 11 + 1, C.ash);
  }

  private drawHelp(ui: UI) {
    ui.layer = 6;
    const lines: [string, string][] = [
      ['1-8', 'pick a building (click the bar too)'],
      ['Click', 'place it / select a building'],
      ['Right-click, Esc', 'cancel / deselect'],
      ['X', 'shed (turn off) the building under the mouse'],
      ['T', 'cycle its priority tier'],
      ['E', 'Overcharge a tower (needs a charged Jar)'],
      ['U', 'upgrade a Lamp (after research)'],
      ['Del', 'sell the selected building (half back)'],
      ['Space', 'start wave 1 / call the next wave early'],
      ['WASD, middle-drag', 'pan; wheel zooms; C recentres'],
      ['F / P / M', 'speed / pause / mute'],
    ];
    const w = 300, h = 28 + lines.length * 10 + 46;
    const x = ui.w / 2 - w / 2, y = ui.h / 2 - h / 2;
    ui.panel(x, y, w, h, { border: C.steel });
    ui.textC('HOW TO KEEP THE LIGHTS ON', ui.w / 2, y + 5, C.gold);
    lines.forEach(([k, t], i) => {
      ui.text(k, x + 8, y + 20 + i * 10, C.amber);
      ui.text(t, x + 98, y + 20 + i * 10, C.mist);
    });
    const yy = y + 24 + lines.length * 10;
    ui.wrap('Every tower fires at its base rate × satisfaction (supply ÷ demand). Buying more Lamps than your Burners can run makes the whole wall weaker. Bright = powered, dim purple = starved, dark with one blue pixel = no power.', x + 8, yy, w - 16, C.ash);
    if (ui.button('x', x + w - 13, y + 3, 10, 10)) this.help = false;
  }

  private drawEnd(ui: UI, g: Game) {
    ui.layer = 7;
    const win = g.over === 'win';
    const s = g.stats;
    const w = 260, h = 132;
    const x = ui.w / 2 - w / 2, y = ui.h / 2 - h / 2;
    ui.panel(x, y, w, h, { border: win ? C.gold : C.ember, alpha: 0.96 });
    ui.big(win ? 'THE LIGHTS HELD' : 'THE HEARTH WENT DARK', ui.w / 2, y + 8, 2, win ? C.gold : C.ember);
    const rows: [string, string][] = [
      ['Waves', win ? `all ${WAVES.length}` : `reached ${g.wave} of ${WAVES.length}`],
      ['Lights left', `${g.lights} of ${RULES.startLights.v}`],
      ['Kills / leaks', `${s.kills} / ${s.leaks}`],
      ['Damage delivered', `${Math.round(s.kjDelivered)} kJ`],
      ['Power wasted', `${Math.round(s.wastedKj)} kJ`],
      ['Time in brownout', `${Math.round(s.brownoutSeconds)} s`],
      ['Overcharges', `${s.overcharges}`],
    ];
    rows.forEach(([k, v], i) => {
      ui.text(k, x + 20, y + 32 + i * 10, C.ash);
      ui.textR(v, x + w - 20, y + 32 + i * 10, C.mist);
    });
    if (ui.button('PLAY AGAIN (R)', ui.w / 2 - 50, y + h - 22, 100, 15, { color: C.gold })) this.onRestart();
  }
}

export { HUD_H, BAR_H, ENEMIES };
