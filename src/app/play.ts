// The play screen: input → actions, build mode, selection, camera, events → effects and
// messages, the tutorial and intel cards, and the immediate-mode HUD. The sim is stepped by the
// loop in main.ts.
import { BUILDINGS, BUILD_CODES, BUILD_KEYS, BUILD_ORDER, specOf, upgradeAt, type BuildingDef, type BuildingId, type Stats } from '../data/buildings';
import { C } from '../data/palette';
import { RESEARCH, RESEARCH_ORDER } from '../data/research';
import { RULES } from '../data/rules';
import { LAST_WAVE, seqHealth, waveDef } from '../data/waves';
import { ENEMIES, ENEMY_BY_CODE, ENEMY_ORDER, type EnemyId } from '../data/enemies';
import type { Audio } from '../engine/audio';
import type { Input } from '../engine/input';
import { TILE, type Renderer } from '../render/renderer';
import { drawFrame } from '../render/art';
import { overchargeProblem, pulseProblem, placeProblem, queueProblem, rerouteProblem, researchProblem, sellValue, upgradeProblem } from '../sim/actions';
import { DT, Game } from '../sim/Game';
import { covers, touches } from '../sim/geom';
import { coneCatchers } from '../sim/systems/towers';
import { windShade } from '../sim/systems/economy';
import { fullDraw, gridSystem, rebuildNetworks } from '../sim/systems/grid';
import { spacingOf, wavePay, roadsOf } from '../sim/systems/waves';
import type { Building, GameEvent } from '../sim/types';
import { UI } from '../ui/ui';
import { textWidth, wrapText, LINE_H } from '../ui/font';
import type { Bot } from './bot';
import { STEPS, Tutorial } from './tutorial';
import { clearRun, saveRun } from './runsave';
import { drawSettings } from './settings';
import { fullOnTheWay, lineReports, linkRoom, strandedBy } from '../sim/lines';
import { wavePressure } from '../sim/pressure';
import { baitable, branchLight, mothsGo } from '../sim/fork';
import { run, type Command } from '../sim/commands';
import { noBest, type Profile } from './save';
import { embersFor } from '../data/skills';
import type { MapDef } from '../data/map';

interface Msg { text: string; color: string; t: number; life: number }
interface Intel { enemy: EnemyId; t: number }

const HUD_H = 30;
const BAR_H = 36;
/** the group tabs that sit on top of the build bar */
const TAB_H = 9;
const TIER_NAMES = ['', 'Works', 'Wall', 'Labs', 'Spare'];
const SLOT_W = 30;

export interface PlayOpts {
  tutorial?: boolean;
  /** the map (the station when left out; the tutorial is always on the station) */
  map?: MapDef;
  /** a game already rebuilt from a saved run (CONTINUE) */
  game?: Game;
  seed?: number;
  profile?: Profile;
  onProfile?: (p: Profile) => void;
  /** settings changed: apply them (volume, scale, flashes) */
  onSettings?: () => void;
  /** back to the title (the run is saved first; CONTINUE picks it up) */
  onTitle?: () => void;
}

export class Play {
  game: Game;
  buildId: BuildingId | null = null;
  selectedId = 0;
  hoverId = 0;
  hoverTile = { x: -1, y: -1 };
  msgs: Msg[] = [];
  intel: Intel[] = [];
  paused = false;
  speed = 1;
  help = false;
  board = false;
  settingsOpen = false;
  /** the Esc menu (holds the game) */
  menu = false;
  /** the Lines view (V) */
  lines = false;
  bot: Bot | null = null;
  tutorial: Tutorial | null = null;
  profile: Profile | null;
  private cool = new Map<string, number>();
  private hintClock = 0;
  /** where the left-hand cards end (UI px), so the message feed stays clear of them */
  leftRight = 0;
  leftBottom = 0;
  /** wall-clock seconds since this run began (for message ages) */
  clock = 0;
  /** the build-bar slot rects drawn last frame (for the tutorial's highlight) */
  private slotRects = new Map<BuildingId, { x: number; y: number; w: number; h: number }>();
  private recorded = false;
  /** autosave: seconds to the next save, the tick last saved, the save cleared at the end */
  private saveSoon = 3;
  private savedTick = -1;
  private cleared = false;
  /** the run is in the profile's run count (endless records again without counting again) */
  private counted = false;
  /** waves already paid in embers, whether the win's bonus was paid, and the last award */
  private emberWaves = 0;
  private emberWin = false;
  embersEarned = 0;
  /** left edge of the next-wave strip (UI px) */
  private stripLeft = 0;

  constructor(public r: Renderer, public ui: UI, public input: Input, public audio: Audio, public onRestart: () => void, public opts: PlayOpts = {}) {
    this.game = opts.game ?? new Game({ seed: opts.seed, map: opts.tutorial ? undefined : opts.map, skills: opts.profile?.skills });
    this.profile = opts.profile ?? null;
    const [fx, fy] = this.game.map.focus;
    r.cam.x = fx * TILE;
    r.cam.y = fy * TILE;
    if (opts.tutorial) this.tutorial = new Tutorial();
    else this.say(`Keep the Hearth lit for ${LAST_WAVE} waves. Towers fire on watts, not money.`, C.gold, 8);
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

  /** the tutorial step that holds the game still while it is read */
  get holding(): boolean {
    return !!this.tutorial?.step?.hold;
  }

  /** one fixed sim tick (called by the loop) */
  tick() {
    if (this.paused || this.game.over || this.holding || this.board || this.settingsOpen || this.menu) return;
    if (this.bot && this.game.tick % 6 === 0) this.bot.act(this.game);
    // a tutorial build step holds the breather, so the player isn't racing the next wave
    if (this.tutorial?.step?.spot && this.game.waveTimer > 0) this.game.waveTimer += DT;
    this.game.step();
  }

  // ---- per frame ----

  frame(dt: number) {
    this.clock += dt;
    for (const m of this.msgs) m.t += dt;
    this.msgs = this.msgs.filter((m) => m.t < m.life);
    if (!this.paused && !this.holding) for (const c of this.intel) c.t += dt;
    this.intel = this.intel.filter((c) => c.t < 14);
    this.handleEvents();
    this.handleInput(dt);
    this.hints(dt);
    this.autosave(dt);
    this.tutorial?.update(this.game);
    const g = this.game;
    this.audio.setHum(Math.min(1, g.grid.demand / 160), g.grid.wall.sat);
    // building while the sim stands still: show the network and the share the next tick will see
    if (g.netDirty) {
      if (this.paused || this.holding || this.board || this.menu || this.settingsOpen || g.over) gridSystem(g, true);
      else rebuildNetworks(g);
    }
    if (g.over && !this.recorded) this.record();
    // the tutorial counts as done once its steps are through (or skipped), not at game over
    if (this.tutorial?.finished && this.profile && !this.profile.tutorialDone) {
      this.profile.tutorialDone = true;
      this.opts.onProfile?.(this.profile);
    }
  }

  /** the run's result into the profile */
  private record() {
    this.recorded = true;
    const p = this.profile;
    if (!p) return;
    const g = this.game;
    if (!this.counted) p.runs++;
    this.counted = true;
    const reached = g.over === 'win' ? LAST_WAVE : g.wave;
    for (const b of [p.best, (p.maps[g.map.id] ??= noBest())]) {
      if (g.endless) b.endless = Math.max(b.endless, g.wave);
      b.wave = Math.max(b.wave, reached);
      if (g.over === 'win') {
        b.won = true;
        b.lights = Math.max(b.lights, g.lights);
      }
    }
    if (this.tutorial) p.tutorialDone = true;
    // embers (§9): a wave cleared is one, a win adds half the lights left; endless pays its waves too
    const cleared = g.wavePaid.size;
    const win = g.over === 'win' && !this.emberWin;
    const e = embersFor(cleared - this.emberWaves, win, g.lights);
    this.emberWaves = cleared;
    if (win) this.emberWin = true;
    this.embersEarned += e;
    p.embers += e;
    this.opts.onProfile?.(p);
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
      case 'upgrade':
        r.fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.5, color: C.gold });
        r.burst(e.x, e.y, 12, C.gold, 1.4, 0.6, 'spark');
        a.sfx('upgrade');
        break;
      case 'kill':
        this.float(e.x, e.y, e.money, C.gold, '+', '');
        r.burst(e.x, e.y, e.enemy === 'pall' ? 24 : e.enemy === 'flit' ? 4 : 7, e.enemy === 'pall' ? C.violet : C.mist, e.enemy === 'pall' ? 2 : 1.2, 0.7);
        a.sfx('kill');
        break;
      case 'leak': {
        const h = r.centreOf(g.hearth);
        this.float(h.x / TILE, h.y / TILE - 1.5, e.lights, C.ember, '-', ' LIGHT', 1.4);
        r.burst(e.x, e.y, 12, C.ember, 1.5, 0.6, 'spark');
        r.flash.red = 0.5;
        a.sfx('leak');
        if (g.lights <= 5 && g.lights > 0) this.sayOnce('lowlights', 30, `Only ${g.lights} light${g.lights === 1 ? '' : 's'} left. The Hearth makes ${g.hearthOutput().toFixed(1)} kW now.`, C.ember);
        else this.sayOnce('leakdim', 90, 'Every light the Hearth loses dims it: 0.4 kW less supply each.', C.ember, 5);
        break;
      }
      case 'wave': {
        const w = waveDef(e.n, g.map)!;
        if (this.profile && !this.bot) {
          const reached = Math.min(e.n, LAST_WAVE);
          for (const b of [this.profile.best, (this.profile.maps[g.map.id] ??= noBest())]) b.wave = Math.max(b.wave, reached);
          this.opts.onProfile?.(this.profile);
        }
        this.say(`WAVE ${e.n}${g.endless ? '' : ` of ${LAST_WAVE}`}${w.note ? ': ' + w.note : ''}`, C.gold, 7);
        // money in the bank lights nothing (the fourth review: the tutorial graduate met wave 4
        // with 155 unspent); the first enemies are still a walk away
        if (!this.bot && e.n > 1 && g.money >= 100) this.say(`${g.money} money unspent: what you build now still meets this wave.`, C.ember, 6);
        a.sfx('wave');
        break;
      }
      case 'wavepay': {
        const h = r.centreOf(g.hearth);
        r.fx.push({ kind: 'float', x: h.x / TILE, y: h.y / TILE - 2.5, t: 0, life: 2, text: `+${e.money} WAVE PAY`, color: C.gold });
        this.say(`Wave ${e.n} cleared${e.leaks ? '' : ' clean'}: +${e.money} money.`, C.gold, 4);
        a.sfx('wavepay');
        break;
      }
      case 'newenemy':
        if (e.enemy !== 'moth' || this.tutorial) this.intel.push({ enemy: e.enemy, t: 0 });
        if (this.profile && !this.profile.met.includes(e.enemy)) {
          this.profile.met.push(e.enemy);
          this.opts.onProfile?.(this.profile);
        }
        a.sfx('newenemy');
        break;
      case 'brownout': {
        // name an Overcharge when it is the cause (the third review)
        const oc = [...g.buildings.values()].filter((b) => b.overcharge > 0);
        if (oc.length) this.sayOnce('ocbrownout', 20, `BROWNOUT from your Overcharge: ${oc.length > 1 ? `${oc.length} towers ask` : `the ${oc[0].def.name} asks`} ${Math.round(oc.reduce((a, b) => a + b.demand, 0))} kW ahead of everything, so the rest of the wall gets what is left for 4 s. Jars don't pay for an Overcharge.`, C.violet, 8);
        else this.sayOnce('brownout', 25, 'BROWNOUT: your towers ask for more watts than you make, so every one of them fires slower (the Wall bar, top). More Burners, a charged Jar, or shed something. V shows each power line and what it lacks.', C.violet, 8);
        a.sfx('brownout');
        break;
      }
      case 'recovered':
        this.sayOnce('recovered', 25, 'Brownout over: the wall is back above 75%.', C.amber, 3);
        a.sfx('recovered');
        break;
      case 'tap':
        r.fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.4, color: C.violet });
        this.sayOnce('tap', 40, 'A Siphon is drinking from that line: 12 kW, before any tower. Kill it there, or have spare kW and Jars to cover it.', C.violet, 7);
        break;
      case 'reroute':
        r.fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.5, color: C.cyan });
        a.sfx('upgrade');
        break;
      case 'fork': {
        const f = g.map.fork!;
        if (e.enemy === 'veil') this.sayOnce('forkveil', 60, `A Veil took the ${f.names[e.branch]}: Veils keep to the darker way. Light it, or bait the other way dark as it comes.`, C.violet, 7);
        else this.sayOnce('fork', 60, `The Moths took the ${f.names[e.branch]}: it has more lit towers on it. The fork sign says who goes where; B (or a click on a branch) puts its towers out so they turn.`, C.amber, 9);
        break;
      }
      case 'bait': {
        const f = g.map.fork!;
        if (e.branch < 0) this.say('Dark Bait lifted: the towers are lit again.', C.amber, 2);
        else {
          // say what the fork does now, not what the bait hoped for: towers over both ways still count
          const go = mothsGo(g);
          const then = go === 1 - e.branch ? `The light-drawn turn to the ${f.names[go]}.` : go < 0 ? 'The fork is even now: each keeps the road it came on. Put out more, or light the other way.' : `The ${f.names[e.branch]} is still the brighter way.`;
          this.say(`Dark Bait: ${e.towers} tower${e.towers === 1 ? '' : 's'} on the ${f.names[e.branch]} put out. ${then}`, C.violet, 4);
        }
        a.sfx(e.branch < 0 ? 'recovered' : 'dry');
        break;
      }
      case 'knock':
        r.burst(e.x, e.y, 14, C.ice, 2, 0.5, 'spark');
        a.sfx('knock');
        if (g.research.done.has('reroute')) this.sayOnce('reroute', 40, 'A Node was cut: select it and press G to Reroute it (100 kJ from your Jars).', C.cyan, 6);
        this.sayOnce('knock', 40, 'A Shade cut a Node near the path: everything that hung off it is dark for 6 s. Build Nodes further back (red shows the Shade\'s reach when you place one), give power a second route, or Reroute it.', C.ice, 9);
        break;
      case 'snuff':
        r.burst(e.x, e.y, 16, C.ash, 1.5, 0.8, 'puff');
        a.sfx('snuff');
        this.sayOnce('snuff', 40, 'A Snuffer put out a Burner: its burning rock is lost and it stays cold 8 s. Burners more than 5 tiles from the path are safe (red shows the reach when you place one).', C.ember, 9);
        break;
      case 'restore':
        break;
      case 'overcharge':
        r.fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.6, color: C.bone });
        r.flash.white = 0.3;
        a.sfx('overcharge');
        break;
      case 'shoot':
        r.burst(e.x, e.y - 0.6, 5, C.gold, 1, 0.4, 'spark');
        a.sfx('shoot');
        break;
      case 'pulse':
        for (const p of e.at) {
          r.flashes.push({ x: p.x, y: p.y, r: RULES.pulseRadius.v + 1, t: 0, life: 0.7 });
          r.fx.push({ kind: 'ring', x: p.x, y: p.y, t: 0, life: 0.5, color: C.bone });
        }
        r.flash.white = 0.3;
        a.sfx('pulse');
        this.say(`PULSE: ${Math.round(e.kj)} kJ out of the Jars through ${e.at.length} towers, ${e.hit} hits.`, C.bone, 4);
        break;
      case 'burst':
        r.flashes.push({ x: e.x, y: e.y, r: e.r + 1.2, t: 0, life: 0.5 });
        r.fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.35, color: C.gold });
        r.burst(e.x, e.y, 14, C.gold, 2, 0.5, 'spark');
        a.sfx('burst');
        break;
      case 'research': {
        const res = RESEARCH[e.id];
        const unlocks = Object.values(BUILDINGS).find((b) => b.research === e.id);
        const next = g.research.active ? ` Next: ${RESEARCH[g.research.active].name}.` : '';
        this.say(`Research done: ${res.name}. ${unlocks ? `${unlocks.name} is on the build bar (${BUILD_KEYS[BUILD_ORDER.indexOf(unlocks.id)]}).` : 'Select a building and upgrade it (U).'}${next}`, C.cyan, 8);
        a.sfx('research');
        break;
      }
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
    const near = this.r.fx.find((f) => f.kind === 'float' && f.color === color && f.t < 0.35 && Math.hypot(f.x - x, f.y - y) < 1.5 && f.vy === undefined);
    if (near) {
      near.vx = (near.vx ?? 0) + n;
      near.text = `${sign}${near.vx}${unit}${unit && near.vx > 1 ? 'S' : ''}`;
      near.t = Math.min(near.t, 0.1);
      return;
    }
    this.r.fx.push({ kind: 'float', x, y, t: 0, life, vx: n, text: `${sign}${n}${unit}${unit && n > 1 ? 'S' : ''}`, color });
  }

  /** contextual hints: the brownout spiral, the Jar, wasted power, Veils */
  private hints(dt: number) {
    this.hintClock += dt;
    if (this.hintClock < 1) return;
    this.hintClock = 0;
    const g = this.game;
    if (g.wave === 0 || this.paused || g.over) return;
    const bs = [...g.buildings.values()];
    const hot = bs.find((b) => b.def.kind === 'radial' && b.tier <= 2 && b.demand > 20 && b.sat < RULES.starvedBelow.v);
    if (hot && g.brownout)
      this.sayOnce('brazier', 60, `A Brazier asked ${Math.round(hot.demand)} kW for ${hot.bodies} bodies and starved the wall. Put it on tier 3 (select it, Shift+T) so it burns only spare power.`, C.violet, 8);
    for (const b of bs) {
      if (b.def.role !== 'generator' || b.def.fuel !== 'rock' || b.fuel > 1 || b.off || b.snuffed > 0) continue;
      const feeders = bs.filter((x) => x.def.role === 'extractor' && touches(g.rect(x), g.rect(b)));
      if (feeders.length === 0 && b.net >= 0 && b.output <= 0) {
        this.sayOnce('nofeed', 25, 'A Burner has no Extractor touching it: put one on emberrock right next to it.', C.ember, 7);
        break;
      }
      const starved = feeders.filter((x) => x.sat < 0.3 && !x.off && x.stock === 0);
      if (feeders.length && starved.length === feeders.length) {
        const low = starved.some((x) => x.tier > 1 || g.tierOff[x.tier]);
        const oc = bs.filter((x) => x.overcharge > 0);
        if (oc.length) {
          this.sayOnce('ocspiral', 25, `An Overcharge goes ahead of your Extractors: the ${oc[0].def.name}'s ${Math.round(oc[0].demand)} kW starved them, and the Burners are running out of rock. Fewer Overcharges at once, or more Burners.`, C.violet, 9);
          break;
        }
        this.sayOnce('spiral', 25, low
          ? 'Your Extractors are starved and the Burners are running out. Their tier is below the towers: select one and press T (or click tier 1).'
          : 'Your Extractors are starved even on the first tier: there is not enough power for anything. Shed some towers (X) so the Burners can refuel.', C.violet, 9);
        break;
      }
    }
    if (g.grid.wasted > 12 && g.wave >= 2 && g.grid.capacity === 0)
      this.sayOnce('waste', 60, `${Math.round(g.grid.wasted)} kW is being wasted. A Jar (-) stores it; a Lab (=) turns it into research; anything on tier 4 (Spare) runs on it alone.`, C.amber, 7);
    if (g.enemies.some((e) => e.def.veiled && !e.seen && e.dist > g.paths[e.route].length * 0.5))
      this.sayOnce('veil', 40, 'A Veil is walking past unseen: your towers near it are below 60% power. Ease the load, Overcharge, or burn it with a Brazier.', C.violet, 7);
    if (!g.research.active && bs.some((b) => b.def.role === 'lab') && g.research.done.size < RESEARCH_ORDER.length)
      this.sayOnce('labidle', 45, 'Your Lab is idle: press L and pick a project.', C.cyan, 5);
  }

  private handleInput(dt: number) {
    const inp = this.input, r = this.r, g = this.game;
    const k = (c: string) => inp.key(c);
    if (k('KeyH') || k('F1')) this.help = !this.help;
    if (k('KeyO') && this.profile) this.settingsOpen = !this.settingsOpen;
    if (k('KeyV')) this.lines = !this.lines;
    if (k('KeyM')) {
      this.audio.setMuted(!this.audio.muted);
      if (this.profile) {
        this.profile.muted = this.audio.muted;
        this.opts.onProfile?.(this.profile);
      }
    }
    if (g.over) {
      if (k('KeyR') || k('Enter')) this.onRestart();
      else if (k('KeyT')) this.opts.onTitle?.();
      return;
    }
    if (k('KeyP')) this.paused = !this.paused;
    if (k('KeyF')) this.cycleSpeed();
    if (k('KeyL')) this.board = !this.board;
    if (k('Escape')) {
      if (this.help) this.help = false;
      else if (this.settingsOpen) this.settingsOpen = false;
      else if (this.board) this.board = false;
      else if (this.buildId) this.buildId = null;
      else if (this.selectedId) this.selectedId = 0;
      else this.menu = !this.menu;
    }
    // the menu and the settings hold the game: nothing reaches the map behind them (the fourth
    // review: a Lamp was placed and Space started wave 1 behind PAUSED)
    if (this.menu || this.settingsOpen) return;
    if (this.tutorial?.step?.next && (k('Enter') || (this.holding && k('Space')))) {
      this.tutorial.advance();
      return;
    }
    BUILD_CODES.forEach((code, i) => {
      if (k(code) || (i < 9 && k(`Numpad${i + 1}`))) this.pickBuild(BUILD_ORDER[i]);
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
    if (k('KeyX') && target) this.act(this.cmd({ k: 'off', b: target.id }));
    if (k('KeyE') && target) this.act(this.cmd({ k: 'oc', b: target.id }));
    if (k('KeyQ') && g.research.done.has('pulse')) this.act(this.cmd({ k: 'pulse' }));
    if (k('KeyG') && target?.def.role === 'node') this.act(this.cmd({ k: 'reroute', b: target.id }));
    // Dark Bait (§8): B puts out the branch the Moths take, so they turn; B again lights it
    if (k('KeyB') && g.map.fork) {
      const branch = g.bait >= 0 ? g.bait : mothsGo(g);
      if (branch < 0) this.act('The fork is even: everything keeps its road. Light one way more than the other first.');
      else this.act(this.cmd({ k: 'bait', branch }));
    }
    // T raises a building's priority one tier, Shift+T lowers it (no wrapping)
    if (k('KeyT') && target && target.def.tier) this.act(this.cmd({ k: 'tier', b: target.id, t: inp.shift ? Math.min(4, target.tier + 1) : Math.max(1, target.tier - 1) }), 'click');
    if (k('KeyU') && target) this.act(this.cmd({ k: 'up', b: target.id }), 'place');
    if (k('KeyY') && target?.def.upgrades?.[target.level - 1]?.alts) this.act(this.cmd({ k: 'up', b: target.id, branch: 1 }), 'place');
    if ((k('Delete') || k('Backspace')) && this.selected) {
      const s = this.selected;
      if (!this.act(this.cmd({ k: 'sell', b: s.id }))) this.selectedId = 0;
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
          const res = run(g, { k: 'place', id: this.buildId, x: gx.x, y: gx.y });
          if (typeof res === 'string') {
            this.say(res, C.ember, 3);
            this.audio.sfx('error');
          } else if (res) {
            this.selectedId = res.id;
            if (!inp.shift) this.buildId = null;
          }
        } else this.selectedId = hb?.id ?? 0;
      }
    }
  }

  cycleSpeed() {
    this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
  }

  /** run a player command through the log (sim/commands.ts); the reason it was refused, or null */
  private cmd(c: Command): string | null {
    const r = run(this.game, c);
    if (typeof r === 'string') return r;
    this.saveSoon = 0;
    return null;
  }

  /** the Esc menu: resume, settings, help, or back to the title with the run saved */
  private drawMenu(ui: UI) {
    ui.layer = 7;
    const w = 150, h = 92;
    const x = Math.round(ui.w / 2 - w / 2), y = Math.round((ui.h - BAR_H) / 2 - h / 2);
    ui.panel(x, y, w, h, { border: C.gold, alpha: 0.97 });
    ui.textC('PAUSED', ui.w / 2, y + 5, C.gold);
    const bw = w - 16;
    if (ui.button('RESUME (ESC)', x + 8, y + 17, bw, 14, { color: C.gold })) this.menu = false;
    if (ui.button('SETTINGS (O)', x + 8, y + 34, bw, 14)) {
      this.menu = false;
      this.settingsOpen = true;
    }
    if (ui.button('KEYS AND HELP (H)', x + 8, y + 51, bw, 14)) {
      this.menu = false;
      this.help = true;
    }
    const saves = !this.tutorial && !this.bot && !!this.profile;
    if (ui.button('TO THE TITLE', x + 8, y + 70, bw, 14, { color: C.ember, tip: ['To the title', saves ? 'The run is saved: CONTINUE on the title picks it up where you left it.' : 'This run is not saved (the tutorial).'] })) {
      if (saves) this.saveNow();
      this.opts.onTitle?.();
    }
  }

  /** save the run now (leaving for the title) */
  saveNow() {
    const g = this.game;
    if (this.tutorial || this.bot || !this.profile || g.over) return;
    this.savedTick = g.tick;
    saveRun({ map: g.map.id, seed: g.seed, skills: [...g.skills], tick: g.tick, wave: g.wave, lights: g.lights, log: g.log });
  }

  /** the run in progress into localStorage: its seed, skills and command log (app/runsave.ts) */
  private autosave(dt: number) {
    const g = this.game;
    if (this.tutorial || this.bot || !this.profile) return;
    if (g.over) {
      if (!this.cleared) clearRun();
      this.cleared = true;
      return;
    }
    this.saveSoon -= dt;
    if (this.saveSoon > 0 || g.tick === this.savedTick) return;
    this.saveSoon = 3;
    this.savedTick = g.tick;
    saveRun({ map: g.map.id, seed: g.seed, skills: [...g.skills], tick: g.tick, wave: g.wave, lights: g.lights, log: g.log });
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
    const d = BUILDINGS[id];
    if (d.research && !this.game.research.done.has(d.research)) {
      this.act(`${d.name}: research it in a Lab first (L).`);
      return;
    }
    this.buildId = this.buildId === id ? null : id;
    this.selectedId = 0;
    this.audio.sfx('click');
  }

  callWave() {
    const g = this.game;
    if (!g.endless && g.wave >= LAST_WAVE) return;
    if (this.tutorial?.step && this.tutorial.i < 6) {
      this.say('Finish the tutorial steps first (or SKIP), then start the wave.', C.ash, 3);
      return;
    }
    this.act(this.cmd({ k: 'wave' }), 'click');
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
    const spot = this.tutorial?.step?.spot;
    if (spot) ov.spot = spot;
    // the Shade's and Snuffer's reach only once they have come, or come next (or in the tutorial's Node step)
    const n = g.waveTimer > 0 || g.wave === 0 ? g.wave + 1 : g.wave;
    const next = waveDef(n, g.map)?.seq ?? '';
    if (this.lines) ov.lines = lineReports(g);
    ov.danger = {
      shade: g.seenKinds.has('shade') || next.includes(ENEMIES.shade.code) || this.tutorial?.step?.slot === 'node',
      snuffer: g.seenKinds.has('snuffer') || next.includes(ENEMIES.snuffer.code),
    };
    return ov;
  }

  // ---- power forecasts (the core idea, said in numbers) ----

  /** seconds until the first enemy walks into a lit tower's reach, while none is in reach (null otherwise) */
  private contactIn(): number | null {
    const g = this.game;
    if (!g.enemies.length) return null;
    const towers = [...g.buildings.values()].filter((b) => b.def.role === 'tower' && b.net >= 0 && !b.off);
    if (!towers.length) return null;
    const reaches = (x: number, y: number) => towers.some((b) => Math.hypot(x - b.x - b.def.size / 2, y - b.y - b.def.size / 2) <= (g.spec(b).range ?? 0));
    let best = Infinity;
    // only the leaders can make first contact: the two with the least road left on each road
    const leaders = g.paths.flatMap((_, r) => g.enemies.filter((e) => e.route === r).sort((a, b) => g.left(a) - g.left(b)).slice(0, 2));
    for (const e of leaders) {
      if (reaches(e.x, e.y)) return null;
      const path = g.paths[e.route];
      for (let d = e.dist; d <= path.length; d += 0.5) {
        const p = path.at(d);
        if (reaches(p.x, p.y)) {
          best = Math.min(best, (d - e.dist) / Math.max(0.1, e.def.speed * (1 - e.slow)));
          break;
        }
      }
    }
    return Number.isFinite(best) && best >= 2 ? Math.round(best) : null;
  }

  /** kW a tower asks while Overcharged (3× its firing draw; a Brazier counts a crowd of three) */
  private overchargeAsk(b: Building): number {
    const d = this.game.spec(b);
    const base = d.kind === 'radial' ? (d.idleDraw ?? 0) + (d.perEnemyDraw ?? 0) * Math.max(1, b.bodies || 3) : d.kind === 'mortar' ? d.chargeDraw ?? 0 : d.firingDraw ?? 0;
    return Math.round(base * RULES.overchargeMult.v);
  }

  /** about how much more an Overcharge would land on what the tower is aiming at, in 4 s */
  private overchargeYield(b: Building): string {
    const g = this.game, d = g.spec(b);
    const t = b.target >= 0 ? g.enemyById(b.target) : undefined;
    const extra = (RULES.overchargeMult.v - 1) * RULES.overchargeTime.v;
    if (d.kind === 'mortar') return `Charges its shells ${RULES.overchargeMult.v}× as fast: about ${Math.floor((extra * (d.chargeDraw ?? 0)) / (d.shellSize ?? 1))} more shells.`;
    if (!t) return 'No target now: it would idle at 3× its idle draw.';
    const per0 = d.kind === 'radial' ? (d.perEnemyDraw ?? 0) * Math.max(1, b.bodies) : d.firingDraw ?? 0;
    // the extra has to come through the links on its way (§3.3): a full Node caps the burst
    const room = linkRoom(g, b), extraKw = per0 * (RULES.overchargeMult.v - 1);
    const capped = room < extraKw;
    const per = capped ? (per0 * room) / extraKw : per0;
    const cap = capped ? ` A Node on its way has room for only ${Math.round(room)} of the ${Math.round(extraKw)} kW more.` : '';
    let catchK = 1, note = '';
    if (d.kind === 'beam' && t.def.narrowBeam) {
      catchK = t.def.narrowBeam;
      note = ` (a ${t.def.name} drinks ${Math.round((1 - catchK) * 100)}% of a narrow beam)`;
    } else if (d.kind === 'cone' && !t.def.shadow) {
      // the cone's catch: each of n catches min(0.4, 1/n), so the whole cone lands that × n
      const n = coneCatchers(g, b, t).length;
      catchK = Math.min(d.catch ?? 0.4, 1 / Math.max(1, n)) * n;
      if (n > 1) return `About +${Math.round(per * (d.efficiency ?? 0) * extra * catchK)} kJ across the ${n} in its cone, at full service.${cap}`;
    }
    return `About +${Math.round(per * (d.efficiency ?? 0) * extra * catchK)} kJ on the ${t.def.name}${note}, at full service.${cap}`;
  }

  /** supply the grid makes now (without Jars), and what the wall and works would ask at full fire */
  budget(extra = 0) {
    const g = this.game;
    let peak = extra, make = 0;
    for (const b of g.buildings.values()) {
      if (b.net < 0) continue;
      peak += fullDraw(g, b);
      if (b.def.role === 'core' || b.def.role === 'generator') make += b.def.fuel === 'wind' ? (g.spec(b).output ?? 0) * g.map.windMean * windShade(g, b) : b.def.role === 'core' ? g.hearthOutput() : g.spec(b).output ?? 0;
    }
    return { make, peak, share: peak > 0 ? Math.min(1, make / peak) : 1 };
  }

  private forecastLine(def: BuildingDef): { text: string; color: string } | null {
    const before = this.budget();
    let extra = 0, add = 0;
    switch (def.role) {
      case 'tower':
      case 'beacon':
      case 'extractor':
      case 'lab': {
        const fake = { def, level: 1, off: false } as Building;
        extra = fullDraw(this.game, fake) || (def.workDraw ?? 0);
        break;
      }
      case 'generator':
        add = def.fuel === 'wind' ? (def.output ?? 0) * this.game.map.windMean : def.output ?? 0;
        break;
      default:
        return null;
    }
    const make = before.make + add, peak = before.peak + extra;
    const share = peak > 0 ? Math.min(1, make / peak) : 1;
    const pct = Math.round(share * 100);
    const txt = `You make ${Math.round(make)} kW; everything firing would ask ${Math.round(peak)} kW → towers at ${pct}% power${add ? ' with it' : ''}.`;
    return { text: txt, color: share < RULES.starvedBelow.v ? C.violet : share < 1 ? C.amber : C.lime };
  }

  // ---- HUD ----

  drawUI() {
    const ui = this.ui, g = this.game;
    this.drawTop(ui, g);
    this.drawNextWave(ui, g);
    this.drawFork(ui, g);
    this.drawBuildBar(ui, g);
    if (this.selected) this.drawSelected(ui, g, this.selected);
    else if (this.hoverId && !this.buildId && !g.over && !this.help) this.hoverTip(ui, g, g.buildings.get(this.hoverId)!);
    else if (!this.buildId && !g.over && !this.help) this.enemyTip(ui, g);
    this.leftRight = 0;
    this.leftBottom = HUD_H + 2;
    if (this.tutorial?.step) this.drawTutorial(ui, g);
    else if (g.wave === 0 && !this.bot && !g.over) this.drawFirstSteps(ui, g);
    this.drawIntel(ui);
    if (!g.over) this.drawMessages(ui);
    if (this.board) this.drawBoard(ui, g);
    if (this.help) this.drawHelp(ui);
    if (this.menu && !g.over) this.drawMenu(ui);
    if (this.settingsOpen && this.profile) {
      this.settingsOpen = drawSettings(ui, this.profile, this.audio.muted, (s, mute) => {
        this.profile!.settings = s;
        if (mute !== undefined) {
          this.audio.setMuted(mute);
          this.profile!.muted = mute;
        }
        this.opts.onProfile?.(this.profile!);
        this.opts.onSettings?.();
      });
    }
    if (this.lines && !g.over) {
      ui.layer = 1;
      const lw = 236, ly = ui.h - BAR_H - TAB_H - (this.paused ? 40 : 26);
      ui.panel(ui.w / 2 - lw / 2, ly, lw, 12, { alpha: 0.9, border: C.cyan, blocking: false });
      ui.textC('LINES: what holds each power line back (V to close)', ui.w / 2, ly + 2, C.cyan);
    }
    if (this.paused && !g.over && !this.board && !this.help) {
      // a banner just above the bar: it blocks no clicks and sits clear of the cards and feed
      ui.layer = 1;
      const pw = 132, py = ui.h - BAR_H - TAB_H - 26;
      ui.panel(ui.w / 2 - pw / 2, py, pw, 12, { alpha: 0.9, border: C.gold, blocking: false });
      ui.textC('PAUSED: P to resume', ui.w / 2, py + 2, C.gold);
    }
    if (g.over) this.drawEnd(ui, g);
    ui.end();
  }

  /** the fork's sign (§11 The Fork): lit towers down each branch and who takes it; a click on a
   *  branch is Dark Bait on it (§8), and B baits the one the Moths take */
  private drawFork(ui: UI, g: Game) {
    const f = g.map.fork;
    if (!f || g.over) return;
    const s = ui.scale;
    const at = g.paths[0].at(f.at);
    const ax = this.r.sx(at.x * TILE) / s, ay = this.r.sy(at.y * TILE) / s;
    if (ax < -40 || ay < 0 || ax > ui.w + 120 || ay > ui.h) return;
    ui.layer = 1;
    const light = branchLight(g), go = mothsGo(g, light);
    const w = 116, h = 35;
    // below and left of the fork, kept on screen
    const x = Math.round(Math.max(2, Math.min(ui.w - w - 2, ax - w - 6)));
    const y = Math.round(Math.max(HUD_H + 2, Math.min(ui.h - BAR_H - TAB_H - h - 2, ay + 12)));
    ui.panel(x, y, w, h, { alpha: 0.9, border: g.bait >= 0 ? C.violet : C.steel });
    ui.text('THE FORK', x + 4, y + 3, C.ash);
    ui.textR('B DARK BAIT', x + w - 4, y + 3, C.steel);
    for (const i of [0, 1]) {
      const baited = g.bait === i;
      const who = baited ? 'BAITED' : go < 0 ? 'EVEN' : go === i ? 'MOTHS' : 'VEILS';
      const color = baited ? C.bone : go < 0 ? C.ash : go === i ? C.amber : C.violet;
      const n = baitable(g, i).length;
      const tip = [
        `${f.names[i]}: ${light[i]} lit tower${light[i] === 1 ? '' : 's'} reach it`,
        go < 0 ? 'Both ways are as bright: everything keeps the road it came on.' : go === i ? 'Moths, Flits and Siphons take the brighter way: this one.' : 'Veils keep to the darker way: this one. Moths take the other.',
        baited ? `Dark Bait: ${g.baitIds.length} tower${g.baitIds.length === 1 ? '' : 's'} put out. Click (or B) to light them again.`
          : n ? `Click for Dark Bait: put out the ${n} tower${n === 1 ? '' : 's'} lighting only the ${f.names[i]}, so the light-drawn turn the other way.` : `No tower lights only the ${f.names[i]}: nothing to put out.`,
      ];
      if (ui.button(`${f.names[i]} ${light[i]} LIT  ${who}`, x + 3, y + 13 + i * 11, w - 6, 10, { color, active: baited, tip })) this.act(this.cmd({ k: 'bait', branch: i }));
    }
  }

  private drawTop(ui: UI, g: Game) {
    ui.layer = 1;
    ui.panel(0, 0, ui.w, HUD_H, { alpha: 0.94 });
    // lights and money
    ui.icon('light', 3, 7);
    ui.text(`${g.lights}`, 20, 6, g.lights <= 5 ? C.ember : C.gold);
    ui.text('LIGHTS', 20, 16, C.steel);
    ui.icon('money', 52, 7);
    ui.text(`${g.money}`, 69, 6, C.gold);
    ui.text('MONEY', 69, 16, C.steel);
    if (ui.hover(0, 0, 102, HUD_H))
      ui.tooltip([
        { text: 'Lights and money' },
        { text: `Lights: the station's life. A Moth that reaches the Hearth costs 1 light, bigger things more. Each light lost also dims the Hearth by 0.4 kW. At 0 the run ends.` },
        { text: `Money: kills pay bounty, and every cleared wave pays 15 + 5 × the wave. It buys what you own; watts decide what runs.` },
      ]);
    // power
    const gr = g.grid;
    let x = 106;
    ui.icon('kw', x, 7);
    x += 18;
    const supply = Math.round(gr.supply), demand = Math.round(gr.demand), wasted = Math.round(gr.wasted);
    const short = gr.demand > gr.supply + 0.5;
    const sw = ui.text(`${supply} kW`, x, 6, C.gold);
    ui.text('SUPPLY', x, 16, C.steel);
    const dx = x + Math.max(sw, textWidth('SUPPLY')) + 7;
    const dw = ui.text(`${demand} kW`, dx, 6, short ? C.violet : C.mist);
    ui.text('DEMAND', dx, 16, C.steel);
    const wx = dx + Math.max(dw, textWidth('DEMAND')) + 7;
    const ww = ui.text(`${wasted} kW`, wx, 6, wasted > 0 && g.wave > 0 ? C.amber : C.steel);
    ui.text('WASTED', wx, 16, C.steel);
    let tx = wx + Math.max(ww, textWidth('WASTED')) + 8;
    if (gr.capacity > 0) {
      // stored kJ: the Jar icon, the number and a fill bar
      ui.icon('jar', tx - 3, 6);
      const jw = Math.max(ui.text(`${Math.round(gr.stored)}`, tx + 12, 6, C.gold), 22);
      ui.bar(tx + 12, 16, jw, 5, gr.stored / gr.capacity, C.gold);
      if (ui.hover(tx - 3, 0, jw + 16, HUD_H)) ui.tooltip([{ text: `Stored: ${Math.round(gr.stored)} of ${gr.capacity} kJ` }, { text: 'Jars fill from wasted power and give it back when demand beats supply. They never pay for an Overcharge (E).' }]);
      tx += 12 + jw + 8;
    }
    const pb = this.budget();
    const hasVane = [...g.buildings.values()].some((b) => b.def.fuel === 'wind');
    if (ui.hover(102, 0, wx + Math.max(ww, textWidth('WASTED')) - 102, HUD_H))
      ui.tooltip([
        { text: 'The grid, right now' },
        ...(hasVane ? [{ text: `Wind ${Math.round(g.wind() * 100)}%: each Vane makes ${(15 * g.wind()).toFixed(1)} kW now.`, color: C.ice }] : []),
        { text: `Supply ${supply} kW: the Hearth (${g.hearthOutput().toFixed(1)} kW) plus every lit Burner and Vane, plus Jars when they discharge.` },
        { text: `Demand ${demand} kW: towers ask their firing draw while they have a target and a little when idle; Extractors 2 kW; Labs 10 kW.` },
        { text: `At full fire everything would ask about ${Math.round(pb.peak)} kW of the ${Math.round(pb.make)} kW you make: ${Math.round(pb.share * 100)}% power.`, color: pb.share < RULES.starvedBelow.v ? C.violet : pb.share < 1 ? C.amber : C.lime },
        { text: 'When demand beats supply, everything in a tier slows together, to its share of the power.' },
        { text: `Wasted ${wasted} kW: power nobody asked for. Jars store it; Labs turn it into research.` },
      ]);
    // the wave block, right
    const rx = ui.w - 4;
    const wv = g.wave === 0 ? 'BEFORE WAVE 1' : g.endless ? `WAVE ${g.wave} ENDLESS` : `WAVE ${g.wave} / ${LAST_WAVE}`;
    ui.textR(wv, rx, 4, C.mist);
    let label: string, tip: string[];
    const more = g.endless || g.wave < LAST_WAVE;
    const left = g.enemies.length + g.spawners.reduce((a, s) => a + s.seq.length - s.i, 0);
    const bw = ui.w < 600 ? 62 : 74;
    const key = ui.w < 600 ? '[SPC]' : '[SPACE]';
    if (g.wave === 0) {
      label = `START ${key}`;
      tip = ['Start wave 1', 'Build first. Wave 1 waits for you.'];
    } else if (more) {
      if (g.waveTimer > 0) {
        ui.textR(`${Math.ceil(g.waveTimer)}s`, rx - bw - 3, 17, C.gold);
        label = `NEXT ${key}`;
        tip = [`Wave ${g.wave + 1} in ${Math.ceil(g.waveTimer)} s`, 'The field is clear: Jars charge and Labs research on spare power. Space starts the next wave now.'];
      } else {
        // mid-wave there is nothing to call (the next wave comes 20 s after this one clears): just
        // the walk to contact, then what is left
        const c = this.contactIn();
        ui.textR(c !== null ? `contact ${c}s` : `${left} left`, rx, 16, c !== null ? C.gold : C.steel);
        label = '';
        tip = [];
      }
    } else {
      label = '';
      tip = [];
      ui.textR(`${left} left`, rx, 16, C.steel);
    }
    const waveX = label ? rx - bw - 3 - textWidth('99 left') - 4 : rx - textWidth(wv) - 6;
    if (label && !g.over && ui.button(label, rx - bw, 14, bw, 13, { tip, color: C.gold })) this.callWave();
    // tiers, in the space between: 1 Works, 2 Wall, 3 Labs (4 only when something sits on it)
    const tiers = g.grid.tiers[4].demand > 0 || g.tierOff[4] || [...g.buildings.values()].some((b) => b.def.tier && b.tier === 4) ? [1, 2, 3, 4] : [1, 2, 3];
    const room = Math.min(waveX, ui.w - 130) - tx;
    const tw = Math.max(24, Math.min(40, Math.floor(room / tiers.length) - 3));
    tiers.forEach((t, i) => {
      const ts = gr.tiers[t];
      const bx = tx + i * (tw + 3);
      if (bx + tw > waveX) return;
      const off = g.tierOff[t];
      const col = off ? C.slate : ts.sat < RULES.starvedBelow.v ? C.violet : C.amber;
      ui.text(tw >= 36 ? `${t} ${TIER_NAMES[t]}` : tw >= 28 ? TIER_NAMES[t] : `T${t}`, bx, 4, off ? C.steel : C.mist);
      ui.bar(bx, 13, tw, 6, off ? 0 : ts.demand > 0 ? ts.sat : 1, col);
      ui.text(off ? 'OFF' : ts.demand > 0 ? `${Math.round(ts.sat * 100)}%` : '-', bx + 1, 21, off ? C.ember : C.steel);
      if (ui.hover(bx - 1, 0, tw + 3, HUD_H)) {
        const members = [...g.buildings.values()].filter((b) => b.def.tier && b.tier === t).map((b) => b.def.name);
        const counts = new Map<string, number>();
        for (const m of members) counts.set(m, (counts.get(m) ?? 0) + 1);
        ui.tooltip([
          { text: `Tier ${t} (${TIER_NAMES[t]}): ${off ? 'SHED (off)' : `${Math.round(ts.served)} of ${Math.round(ts.demand)} kW served`}` },
          { text: [...counts].map(([n, c]) => `${c} ${n}${c > 1 ? 's' : ''}`).join(', ') || 'Nothing on this tier.' },
          { text: t === 4 ? 'Spare runs only on power that would be wasted, after the Jars have charged; a Jar never pays for it. Select a building and use its tier buttons. Shift-click to shed (or restore) the whole tier.' : 'Tier 1 is served in full before tier 2 sees a watt, and so on. Select a building and press T to raise it. Shift-click to shed (or restore) the whole tier.', color: C.ash },
        ]);
        if (ui.clicked) {
          ui.eat();
          if (this.input.shift || off) {
            this.cmd({ k: 'shedTier', t });
            this.audio.sfx('click');
          } else this.say(`Shift-click the ${TIER_NAMES[t]} bar to shed the whole tier.`, C.ash, 3);
        }
      }
    });
  }

  /** what the next wave brings, under the wave block */
  private drawNextWave(ui: UI, g: Game) {
    this.stripLeft = ui.w;
    if (g.over) return;
    const n = g.waveTimer > 0 || g.wave === 0 ? g.wave + 1 : g.wave;
    const w = waveDef(n, g.map);
    if (!w || (!g.endless && n > LAST_WAVE)) return;
    const counts = new Map<string, number>();
    for (const c of w.seq) counts.set(c, (counts.get(c) ?? 0) + 1);
    const kinds = ENEMY_ORDER.filter((id) => counts.has(ENEMIES[id].code));
    // on a map with several roads, what comes down each one (the spawner's own rule)
    const names = g.map.roadNames;
    const per: Map<string, number>[] = [];
    if (names && g.paths.length > 1) {
      const roads = roadsOf(w.seq, n, g.paths.length);
      for (let r = 0; r < g.paths.length; r++) per.push(new Map());
      [...w.seq].forEach((c, i) => per[roads[i]].set(c, (per[roads[i]].get(c) ?? 0) + 1));
    }
    const groups = per.length ? per : [counts];
    const label = n === g.wave ? 'THIS WAVE' : 'NEXT';
    const groupW = (m: Map<string, number>) => kinds.filter((id) => m.has(ENEMIES[id].code)).reduce((a, id) => a + 17 + textWidth(`${m.get(ENEMIES[id].code)}`) + 4, 0);
    // the telegraph (the fifth review's M6): the wave's kJ and its step over the last one, so wave
    // 11's ×1.5 is on screen before it comes, not after
    const pr = wavePressure(g, w);
    const prev = n > 1 ? waveDef(n - 1, g.map) : undefined;
    const step = prev ? pr.kj / seqHealth(prev.seq) : 0;
    const kjText = `${pr.kj} kJ`, stepText = step >= 1.05 ? `×${step.toFixed(1)}` : '';
    const kjW = 6 + textWidth(kjText) + (stepText ? 3 + textWidth(stepText) : 0);
    const width = textWidth(label) + 8 + groups.reduce((a, m, i) => a + groupW(m) + (per.length ? textWidth(names![i]) + 4 + (i ? 6 : 0) : 0), 0) + kjW;
    const x = ui.w - width - 4, y = HUD_H + 2;
    this.stripLeft = x;
    ui.layer = 1;
    ui.panel(x, y, width, 18, { alpha: 0.88 });
    ui.text(label, x + 4, y + 6, C.steel);
    let cx = x + 4 + textWidth(label) + 4;
    groups.forEach((m, gi) => {
      if (per.length) {
        if (gi) cx += 6;
        cx += ui.text(names![gi], cx, y + 6, C.gold) + 4;
      }
      for (const id of kinds) {
        const c = m.get(ENEMIES[id].code);
        if (!c) continue;
        ui.icon(id, cx, y + 1);
        cx += 17 + ui.text(`${c}`, cx + 16, y + 6, C.mist) + 4;
      }
    });
    cx += 2 + ui.text(kjText, cx + 2, y + 6, C.steel);
    if (stepText) ui.text(stepText, cx + 3, y + 6, step >= 1.4 ? C.amber : C.steel);
    if (ui.hover(x, y, width, 18)) {
      const kj = pr.kj;
      const palls = counts.get(ENEMIES.pall.code) ?? 0;
      const roadLine = (m: Map<string, number>, i: number) => `${names![i] === 'W' ? 'West' : names![i] === 'E' ? 'East' : names![i]} road: ${kinds.filter((id) => m.has(ENEMIES[id].code)).map((id) => `${m.get(ENEMIES[id].code)} ${ENEMIES[id].name}${m.get(ENEMIES[id].code)! > 1 ? 's' : ''}`).join(', ')}`;
      ui.tooltip([
        { text: `Wave ${n}: ${kj} kJ of dark${prev ? `, ${step.toFixed(1)}× the last` : ''}, one every ${spacingOf(g, w).toFixed(2)} s` },
        { text: `Over ${Math.round(pr.span)} s: ${Math.round(pr.inflow)} kJ/s, against your towers' ${Math.round(pr.wall)} all firing${pr.wallFull > pr.wall + 0.5 ? ` (${Math.round(pr.wallFull)} at full power)` : ''}. Enemies stay in reach for seconds: a wall holds more than it deals.`, color: pr.wall < pr.wallFull * 0.75 ? C.amber : C.mist },
        ...(palls ? [{ text: `${palls} Pall${palls > 1 ? 's' : ''}: what costs lights late. Burst (E), fire or shells.`, color: C.violet }] : []),
        ...per.map((m, i) => ({ text: roadLine(m, i), color: C.gold })),
        ...kinds.map((id) => ({ text: `${ENEMIES[id].name} (${ENEMIES[id].health} kJ): ${ENEMIES[id].blurb}`, color: C.mist })),
        { text: `Clearing it pays ${wavePay(n)}.`, color: C.gold },
      ]);
    }
  }

  private drawBuildBar(ui: UI, g: Game) {
    ui.layer = 1;
    this.slotRects.clear();
    const half = 6 * SLOT_W + 4;
    const gap = 6;
    const side = 62;
    const w = half * 2 + gap + 6 + side;
    const x0 = Math.round(ui.w / 2 - w / 2), y0 = ui.h - BAR_H;
    const groups: { name: string; sub: string; color: string; ids: BuildingId[]; x: number }[] = [
      { name: 'LIGHT', sub: 'damage  1-6', color: C.amber, ids: BUILD_ORDER.slice(0, 6), x: x0 },
      { name: 'POWER', sub: 'grid  7-=', color: C.cyan, ids: BUILD_ORDER.slice(6), x: x0 + half + gap },
    ];
    for (const grp of groups) {
      const tabW = textWidth(grp.name) + textWidth(grp.sub) + 14;
      ui.panel(grp.x, y0 - TAB_H, tabW, TAB_H + 1, { border: grp.color, alpha: 0.95 });
      ui.text(grp.name, grp.x + 4, y0 - TAB_H + 1, grp.color);
      ui.text(grp.sub, grp.x + 8 + textWidth(grp.name), y0 - TAB_H + 1, C.steel);
      ui.panel(grp.x, y0, half, BAR_H, { border: grp.color });
      grp.ids.forEach((id, j) => {
        const i = BUILD_ORDER.indexOf(id);
        const d = BUILDINGS[id];
        const x = grp.x + 2 + j * SLOT_W, y = y0 + 2;
        const locked = !!d.research && !g.research.done.has(d.research);
        const poor = g.money < d.cost;
        const active = this.buildId === id;
        const hov = ui.hover(x, y, SLOT_W - 2, BAR_H - 4);
        this.slotRects.set(id, { x, y, w: SLOT_W - 2, h: BAR_H - 4 });
        ui.fill(x, y, SLOT_W - 2, BAR_H - 4, active ? C.copper : hov ? C.iron : C.slate);
        ui.fill(x, y, SLOT_W - 2, 1, active ? C.brass : C.iron);
        ui.ctx.globalAlpha = locked ? 0.3 : 1;
        ui.icon(d.id, x + (SLOT_W - 2) / 2 - 8, y + 4);
        ui.ctx.globalAlpha = 1;
        if (locked) ui.icon('lock', x + (SLOT_W - 2) / 2 - 8, y + 4);
        ui.text(BUILD_KEYS[i], x + 2, y + 1, C.steel, null);
        ui.textC(locked ? 'LAB' : `${d.cost}`, x + (SLOT_W - 2) / 2, y + 23, locked ? C.cyan : poor ? C.ember : C.gold);
        if (hov) {
          const lines: { text: string; color?: string }[] = [{ text: `${d.name}  [${BUILD_KEYS[i]}]  ${d.cost} money` }, { text: d.blurb }];
          lines.push({ text: this.wattLine(d), color: C.amber });
          if (locked) lines.push({ text: `Locked: research ${RESEARCH[d.research!].name} in a Lab (L opens the board).`, color: C.cyan });
          else {
            const f = this.forecastLine(d);
            if (f) lines.push(f);
          }
          ui.tooltip(lines);
          if (ui.clicked) {
            ui.eat();
            this.pickBuild(id);
          }
        }
      });
    }
    // speed, research and help beside the bar
    const bx = x0 + half * 2 + gap + 6;
    if (bx + side <= ui.w) {
      if (ui.button(this.paused ? 'PAUSED' : `SPEED x${this.speed}`, bx, y0 + 1, side, 11, { tip: ['Speed (F) / pause (P)'], active: this.paused })) this.cycleSpeed();
      const labs = [...g.buildings.values()].some((b) => b.def.role === 'lab');
      if (ui.button('RESEARCH [L]', bx, y0 + 13, side, 11, { active: this.board, color: labs ? C.cyan : C.bone, tip: ['Research board (L)', 'Labs turn spare power into new towers, generators and upgrades.'] })) this.board = !this.board;
      const hw = Math.floor(side / 2) - 1;
      if (ui.button('LINES', bx, y0 + 25, hw, 10, { active: this.lines, color: C.cyan, tip: ['Lines view (V)', 'Every power line outlined in its own colour, with what holds it back: no rock, too few Burners, power going to waste.'] })) this.lines = !this.lines;
      if (ui.button('HELP', bx + side - hw, y0 + 25, hw, 10, { active: this.help, tip: ['Help (H)', 'Every key, and how power works.'] })) this.help = !this.help;
      if (g.research.done.has('pulse')) {
        const why = pulseProblem(g);
        const stored = Math.round(g.grid.stored);
        const lit = [...g.buildings.values()].filter((b) => b.def.role === 'tower' && !b.off && b.sat > 0).length;
        const near = g.enemies.filter((e) => [...g.buildings.values()].some((t) => t.def.role === 'tower' && !t.off && t.sat > 0 && Math.hypot(e.x - t.x - t.def.size / 2, e.y - t.y - t.def.size / 2) <= RULES.pulseRadius.v)).length;
        const tip = ['Pulse (Q)', `Every Jar empties at once in a flash from every lit tower. ${Math.round(RULES.pulseEff.v * 100)}% of the stored kJ lands, split evenly across every enemy within ${RULES.pulseRadius.v} tiles of a lit tower. No shadows: a Pall takes its share.`,
          lit ? `Now: ${stored} kJ makes ${Math.round(stored * RULES.pulseEff.v)} kJ of light${near ? `, ${Math.round((stored * RULES.pulseEff.v) / near)} on each of the ${near} in reach` : ''}.` : 'No tower is lit.', ...(why ? [why] : ['Fewer enemies in reach, more on each: a Pall alone at the wall takes all of it.'])];
        if (ui.button('PULSE [Q]', bx, y0 - TAB_H - 1, side, TAB_H + 1, { disabled: !!why, color: why ? C.steel : C.bone, active: !why, tip })) this.act(this.cmd({ k: 'pulse' }));
      }
    }
    if (this.buildId) {
      const d = BUILDINGS[this.buildId];
      ui.textC(`Placing ${d.name}: click to build, right-click to cancel, hold Shift to place several`, ui.w / 2, y0 - TAB_H - 10, C.ash);
    }
  }

  private wattLine(d: BuildingDef): string {
    switch (d.role) {
      case 'tower':
        switch (d.kind) {
          case 'radial': return `${d.perEnemyDraw} kW per body in range (up to ${d.maxBodies}), ${d.idleDraw} kW idle, efficiency ${d.efficiency} → ${((d.perEnemyDraw ?? 0) * (d.efficiency ?? 0)).toFixed(1)} kJ/s on each. Range ${d.range}.`;
          case 'mortar': return `${d.chargeDraw} kW while the ${d.shellSize} kJ shell charges, nothing when full. Efficiency ${d.efficiency} → ${((d.shellSize ?? 0) * (d.efficiency ?? 0)).toFixed(0)} kJ a burst. Range ${d.minRange}-${d.range}.`;
          case 'cone': return `${d.firingDraw} kW firing, ${d.idleDraw} kW idle, efficiency ${d.efficiency} → ${((d.firingDraw ?? 0) * (d.efficiency ?? 0)).toFixed(1)} kJ/s over the cone (40% on a lone enemy). Range ${d.range}.`;
          default: return `${d.firingDraw} kW firing, ${d.idleDraw} kW idle, efficiency ${d.efficiency} → ${((d.firingDraw ?? 0) * (d.efficiency ?? 0)).toFixed(1)} kJ/s at full power. Range ${d.range}.`;
        }
      case 'beacon': return `${d.constantDraw} kW always. Range ${d.range}.`;
      case 'extractor': return `${d.workDraw} kW while digging. Tier 1 (Works): fed before the towers.`;
      case 'generator': return d.fuel === 'wind' ? `+${d.output} kW at full wind (about ${((d.output ?? 0) * RULES.windMean.v).toFixed(0)} on average). No fuel.` : `+${d.output} kW while it has emberrock.`;
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
    if (b.snuffed > 0) return { text: `SNUFFED ${Math.ceil(b.snuffed)}s`, color: C.ember };
    if (b.def.role === 'generator') {
      if (b.def.fuel === 'wind') return { text: `TURNING: ${b.output.toFixed(1)} kW (wind ${Math.round(g.wind() * 100)}%)`, color: C.gold };
      if (b.output > 0) return { text: 'LIT', color: C.gold };
      const fed = [...g.buildings.values()].some((x) => x.def.role === 'extractor' && x.net >= 0 && !x.off && touches(g.rect(x), g.rect(b)));
      return fed ? { text: 'WAITING FOR ROCK: its Extractor is digging', color: C.amber } : { text: 'COLD: no Extractor touching it', color: C.ember };
    }
    if (b.def.role === 'lab' && !g.research.active) return { text: 'IDLE: pick a project (L)', color: C.cyan };
    // on Spare it runs on spill alone: little or none is the rule, not a fault (§2.3)
    if (b.tier === 4 && b.overcharge <= 0 && b.sat < 0.99) return { text: `ON SPILL ${Math.round(b.sat * 100)}% (tier 4)`, color: C.ash };
    if (st === 'starved') return { text: `STARVED ${Math.round(b.sat * 100)}%${fullOnTheWay(g, b) ? ': a Node on its way is full' : ''}`, color: C.violet };
    return { text: b.def.role === 'core' ? `BURNING ${g.hearthOutput().toFixed(1)} kW` : `POWERED ${b.def.tier ? Math.round(b.sat * 100) + '%' : ''}`, color: C.gold };
  }

  private infoLines(g: Game, b: Building): { text: string; color?: string }[] {
    const d = g.spec(b);
    const out: { text: string; color?: string }[] = [];
    const oc = b.overcharge > 0;
    switch (d.role) {
      case 'core':
        out.push({ text: `${g.hearthOutput().toFixed(1)} kW (8 at full lights, 0.4 less per light lost).` }, { text: `Carries power ${d.nodeRadius} tiles. Lights ${g.lights}/${RULES.startLights.v}.` });
        break;
      case 'tower': {
        const p = oc ? RULES.overchargeMult.v : b.sat;
        if (d.kind === 'radial') {
          out.push({ text: `Asks ${d.perEnemyDraw} kW per body in the fire (${b.bodies} now), ${d.idleDraw} kW idle.` });
          out.push({ text: `Burning each at ${((d.perEnemyDraw ?? 0) * (d.efficiency ?? 0) * p).toFixed(1)} of ${((d.perEnemyDraw ?? 0) * (d.efficiency ?? 0)).toFixed(1)} kJ/s.`, color: b.sat < RULES.starvedBelow.v && !oc ? C.violet : C.amber });
          out.push({ text: `Range ${d.range}. Heat: finds Veils, and a Pall can't drink it.` });
        } else if (d.kind === 'mortar') {
          out.push({ text: `Asks ${d.chargeDraw} kW while charging. Shell ${Math.floor(b.shell)}/${d.shellSize} kJ.` });
          out.push({ text: `A burst: ${((d.shellSize ?? 0) * (d.efficiency ?? 0)).toFixed(0)} kJ of light; each enemy within ${d.burstRadius} tiles catches 30%.`, color: C.amber });
          out.push({ text: `Range ${d.minRange}-${d.range}. Aims at the thickest crowd.` });
        } else {
          out.push({ text: `Asks ${d.firingDraw} kW firing, ${d.idleDraw} kW idle.` });
          const full = (d.firingDraw ?? 0) * (d.efficiency ?? 0);
          out.push({ text: b.target >= 0 ? `Landing ${b.dps.toFixed(1)} kJ/s now (${full.toFixed(1)} at full power${d.kind === 'cone' ? '; a lone enemy in the cone catches 40%' : ''}).` : `Would fire ${(full * p).toFixed(1)} of ${(full * (oc ? RULES.overchargeMult.v : 1)).toFixed(1)} kJ/s.`, color: b.sat < RULES.starvedBelow.v && !oc ? C.violet : C.amber });
          if (d.kind === 'cone') out.push({ text: 'Best where enemies line up in the cone: the outside of a bend, or looking down a straight.', color: C.ash });
          out.push({ text: `Range ${d.range}. ${d.targeting === 'heaviest' ? 'Locks onto the heaviest enemy in reach.' : 'Targets the enemy nearest the Hearth.'}` });
        }
        if (oc) out.push({ text: `OVERCHARGED ${b.overcharge.toFixed(1)}s: asking ${b.demand.toFixed(0)} kW ahead of the wall, getting ${Math.round(b.sat * 100)}%`, color: C.bone });
        if (b.satAvg < RULES.veilSight.v && !oc && d.kind !== 'radial') out.push({ text: 'Below 60%: it cannot see Veils.', color: C.violet });
        break;
      }
      case 'beacon':
        out.push({ text: `Asks ${d.constantDraw} kW always.` }, { text: `Slows by ${Math.round((d.slow ?? 0) * b.sat * 100)}% (${Math.round((d.slow ?? 0) * 100)}% × its share of power).`, color: C.amber });
        break;
      case 'extractor': {
        const feeds = [...g.buildings.values()].some((u) => u.def.role === 'generator' && u.def.fuel === 'rock' && touches(g.rect(u), g.rect(b)));
        out.push({ text: `Asks ${d.workDraw} kW while digging. 1 rock / ${d.rockInterval} s at full power.` });
        out.push({ text: `Holding ${b.stock}/${d.stockCap} rocks. Next ${Math.round(b.progress * 100)}%.` });
        out.push(feeds ? { text: 'Feeding a Burner next to it.', color: C.amber } : { text: 'No Burner touching it: its rock goes nowhere.', color: C.ember });
        break;
      }
      case 'generator': {
        if (d.fuel === 'wind') {
          out.push({ text: `Makes ${d.output} kW × the wind: ${b.output.toFixed(1)} kW now.` }, { text: 'No fuel. A Jar evens out the gusts.' });
          const shade = windShade(g, b);
          if (shade < 1) out.push({ text: `In the wake of ${Math.round(Math.log(shade) / Math.log(1 - RULES.windShadow.v))} other Vane(s) within ${RULES.windShadowRadius.v} tiles: it catches ${Math.round(shade * 100)}% of the wind. Spread Vanes out.`, color: C.amber });
          break;
        }
        const fed = [...g.buildings.values()].filter((u) => u.def.role === 'extractor' && touches(g.rect(u), g.rect(b))).length;
        const per = ((d.rockHeat ?? 0) * (d.efficiency ?? 0)) / (d.output ?? 1);
        out.push({ text: `Makes ${d.output} kW while lit. One rock lasts ${per.toFixed(0)} s.` });
        out.push({ text: `Fuel: ${b.fuel}/${d.fuelCap} rocks${b.burnLeft > 0 ? ` + ${Math.ceil(b.burnLeft)}s burning` : ''}.` });
        out.push(fed ? { text: `Fed by ${fed} Extractor${fed > 1 ? 's' : ''}.`, color: C.amber } : { text: 'No Extractor touching it.', color: C.ember });
        break;
      }
      case 'node':
        out.push({ text: `Carries power ${d.nodeRadius} tiles${d.lineLoss ? `, losing ${d.lineLoss} kW on the line` : ''}.` }, { text: `A Shade passing within ${ENEMIES.shade.knockRadius} tiles cuts it for ${ENEMIES.shade.knockTime} s.` });
        if (b.net >= 0 && b.id !== g.hearthId) {
          const cap = d.carryKw ?? 0;
          const kw = Math.round(Math.abs(b.carry));
          out.push(b.full
            ? { text: `FULL: carries all ${cap} kW it can${b.carry < 0 ? ' home from the Burners past it' : ' to what is past it'}. A second route, a Jar past it, or a Busbar.`, color: C.violet }
            : { text: `Carries ${kw} of ${cap} kW${b.carry < 0 ? ' home' : ''}.`, color: kw > cap * 0.75 ? C.gold : C.ash });
        }
        break;
      case 'storage':
        out.push({ text: `Stored ${Math.round(b.charge)}/${d.capacity} kJ.` });
        out.push({ text: b.flow > 0.1 ? `Charging ${b.flow.toFixed(0)} kW` : b.flow < -0.1 ? `Discharging ${(-b.flow).toFixed(0)} kW` : 'Idle', color: C.amber });
        if (d.spinDown) out.push({ text: `Spins down ${(b.charge * d.spinDown).toFixed(1)} kW (${Math.round(d.spinDown * 100)}% of its charge a second): spend it in the wave.`, color: C.ice });
        out.push({ text: `In ≤ ${d.maxCharge} kW, out ≤ ${d.maxDischarge} kW. It carries the wall through a deficit and pays for Pulse and Reroute; it never pays for an Overcharge.` });
        break;
      case 'lab': {
        const id = g.research.active;
        out.push({ text: `Asks ${d.workDraw} kW while a project runs: 1 kW = 1 kJ of research per second.` });
        if (id) out.push({ text: `On: ${RESEARCH[id].name}, ${Math.floor(g.research.progress[id] ?? 0)}/${Math.round(g.researchCost(id))} kJ.`, color: C.cyan });
        break;
      }
    }
    return out;
  }

  private hoverTip(ui: UI, g: Game, b: Building) {
    if (!b) return;
    const sw = this.stateWord(g, b);
    ui.tooltip([{ text: this.titleOf(b) }, { text: sw.text, color: sw.color }, ...this.infoLines(g, b), { text: 'Click for controls.', color: C.steel }]);
  }

  /** hovering an enemy: what it is */
  private enemyTip(ui: UI, g: Game) {
    if (ui.overUI) return;
    const t = this.r.screenToTile(this.input.mouse.x, this.input.mouse.y);
    let best = null as null | (typeof g.enemies)[number], bd = 0.9;
    for (const e of g.enemies) {
      const d = Math.hypot(e.x - t.fx, e.y - 0.4 - t.fy);
      if (d < bd && (!e.def.veiled || e.seen)) {
        bd = d;
        best = e;
      }
    }
    if (!best) return;
    ui.tooltip([
      { text: `${best.def.name}: ${Math.max(0, Math.ceil(best.hp))} of ${best.def.health} kJ` },
      { text: best.def.blurb },
      { text: `Speed ${best.def.speed} tiles/s${best.slow > 0 ? ` (slowed ${Math.round(best.slow * 100)}%)` : ''}. Costs ${best.def.leak} light${best.def.leak > 1 ? 's' : ''} if it reaches the Hearth; pays ${best.def.bounty}.`, color: C.ash },
      { text: best.def.answer, color: C.amber },
    ]);
  }

  private drawSelected(ui: UI, g: Game, b: Building) {
    ui.layer = 2;
    const w = 162;
    const x = ui.w - w - 4, y0 = HUD_H + 22;
    const lines = this.infoLines(g, b);
    // measure
    const inner = w - 10;
    // the state word wraps too (the fifth review: "WAITING FOR ROCK: its Extractor is di")
    const sw = this.stateWord(g, b);
    let h = 16 + wrapText(sw.text, inner).length * LINE_H;
    for (const l of lines) h += wrapText(l.text, inner).length * LINE_H;
    const isTower = b.def.role === 'tower';
    const up = b.def.upgrades?.[b.level - 1];
    if (b.def.tier) h += 30;
    if (b.def.role !== 'core' && b.def.role !== 'node') h += 16;
    if (isTower) h += 16;
    if (up) h += 16;
    if (b.def.role === 'lab') h += 16;
    if (b.def.role === 'node' && g.research.done.has('reroute')) h += 16;
    if (b.def.role !== 'core') h += 16;
    h += 4;
    ui.panel(x, y0, w, h, { border: C.steel });
    let y = y0 + 4;
    ui.text(this.titleOf(b), x + 5, y, C.gold);
    if (ui.button('x', x + w - 13, y - 1, 10, 10)) this.selectedId = 0;
    y += 10;
    y += ui.wrap(sw.text, x + 5, y, inner, sw.color) + 2;
    for (const l of lines) y += ui.wrap(l.text, x + 5, y, inner, l.color ?? C.mist);
    y += 2;
    if (b.def.tier) {
      ui.text('Priority tier (T)', x + 5, y, C.ash);
      y += 10;
      for (let t = 1; t <= 4; t++) {
        const tip = t === 4 ? 'Runs only on power that would be wasted, after the Jars have charged. A Jar never pays for it, and it is not part of the wall a brownout is read from.' : 'Tier 1 is served in full before tier 2 sees a watt.';
        if (ui.button(`${t}`, x + 5 + (t - 1) * 22, y, 20, 14, { active: b.tier === t, tip: [`Tier ${t}: ${TIER_NAMES[t]}`, tip] })) this.cmd({ k: 'tier', b: b.id, t });
      }
      y += 20;
    }
    if (b.def.role !== 'core' && b.def.role !== 'node') {
      if (ui.button(b.off ? 'TURN ON (X)' : 'SHED (X)', x + 5, y, w - 10, 14, { active: b.off, tip: ['Shed', 'Turn it off: it asks for nothing and does nothing. A shed Burner keeps its fuel.'] })) this.act(this.cmd({ k: 'off', b: b.id }));
      y += 16;
    }
    if (isTower) {
      const why = overchargeProblem(g, b);
      const ask = this.overchargeAsk(b);
      const label = `OVERCHARGE (E) ${ask} kW`;
      if (ui.button(label, x + 5, y, w - 10, 14, { disabled: !!why, color: C.bone, tip: ['Overcharge', `For ${RULES.overchargeTime.v} s it asks ${RULES.overchargeMult.v}× its draw (${ask} kW) and is served right after your Extractors, ahead of the rest of the wall: spare power first, then whatever the other towers were getting. Jars don't pay for it, so with nothing spare the other towers dim for those ${RULES.overchargeTime.v} s.`, this.overchargeYield(b), ...(why ? [why] : [])] })) this.act(this.cmd({ k: 'oc', b: b.id }));
      y += 16;
    }
    if (up && up.alts?.length && b.branch === 0) {
      // a tier with a choice: the main line on U, the other way on Y
      const ways = [up, ...up.alts];
      const bw = Math.floor((w - 10) / ways.length) - 1;
      ways.forEach((u, i) => {
        const why = upgradeProblem(g, b, i);
        const next = specOf(b.def, b.level + 1, i);
        const label = `${(u.name ?? 'TIER 2').toUpperCase()} (${i === 0 ? 'U' : 'Y'}) ${u.cost}`;
        // a shorter reach strands what only this Node carried (the Busbar, §3.3): say so before the click
        const lost = (next.nodeRadius ?? 0) < (g.spec(b).nodeRadius ?? 0) ? strandedBy(g, b, next.nodeRadius ?? 0) : [];
        const strand = lost.length ? [`It would cut off ${lost.length}: ${lost.slice(0, 4).map((x) => x.def.name).join(', ')}${lost.length > 4 ? '...' : ''}. Another Node near them first.`] : [];
        if (ui.button(label, x + 5 + i * (bw + 2), y, bw, 14, { disabled: !!why, tip: [`${u.name ?? 'Tier 2'}: one way or the other`, u.blurb, ...this.statDiff(g.spec(b), next), ...strand, ...(why ? [why] : [])] }))
          this.act(this.cmd({ k: 'up', b: b.id, branch: i }), 'place');
      });
      y += 16;
    } else if (up) {
      const nu = upgradeAt(b.def, b.level, b.branch)!;
      const why = upgradeProblem(g, b);
      const next = specOf(b.def, b.level + 1, b.branch);
      if (ui.button(`UPGRADE (U) ${nu.cost}`, x + 5, y, w - 10, 14, { disabled: !!why, tip: [nu.name ?? 'Tier 2', nu.blurb, ...this.statDiff(g.spec(b), next), ...(why ? [why] : [])] })) this.act(this.cmd({ k: 'up', b: b.id }), 'place');
      y += 16;
    }
    if (b.def.role === 'lab') {
      if (ui.button('RESEARCH BOARD (L)', x + 5, y, w - 10, 14, { color: C.cyan, active: this.board })) this.board = !this.board;
      y += 16;
    }
    if (b.def.role === 'node' && g.research.done.has('reroute')) {
      const why = rerouteProblem(g, b);
      if (ui.button(`REROUTE (G) ${RULES.rerouteCost.v} kJ`, x + 5, y, w - 10, 14, { disabled: !!why, color: b.offline > 0 ? C.gold : C.bone, active: b.offline > 0 && !why, tip: ['Reroute', `${RULES.rerouteCost.v} kJ from your Jars: a cut Node is back at once, and no Shade can cut it for ${RULES.rerouteTime.v} s.`, ...(why ? [why] : [b.offline > 0 ? 'It is cut now: everything hanging off it is dark.' : 'Use it before a Shade arrives, or after one cuts it.'])] })) this.act(this.cmd({ k: 'reroute', b: b.id }));
      y += 16;
    }
    if (b.def.role !== 'core') {
      if (ui.button(`SELL +${sellValue(b)} (DEL)`, x + 5, y, w - 10, 14)) {
        if (!this.act(this.cmd({ k: 'sell', b: b.id }))) this.selectedId = 0;
      }
    }
  }

  /** a building's name with its tier, or the name of the way it was upgraded */
  private titleOf(b: Building) {
    if (b.level <= 1) return b.def.name;
    const u = upgradeAt(b.def, b.level - 1, b.branch);
    return u?.name ? `${b.def.name} (${u.name})` : `${b.def.name} (tier 2)`;
  }

  /** "Firing draw 12 → 18 kW" lines for an upgrade's tooltip */
  private statDiff(a: Stats, b: Stats): string[] {
    const names: Partial<Record<keyof Stats, string>> = {
      firingDraw: 'Firing draw (kW)', perEnemyDraw: 'kW per body', chargeDraw: 'Charge draw (kW)', constantDraw: 'Draw (kW)', workDraw: 'Draw (kW)',
      efficiency: 'Efficiency', output: 'Output (kW)', capacity: 'Capacity (kJ)', maxCharge: 'Charge (kW)', maxDischarge: 'Discharge (kW)',
      nodeRadius: 'Reach (tiles)', lineLoss: 'Line loss (kW)', spinDown: 'Spin-down (per s)', rockInterval: 'Seconds per rock', slow: 'Slow',
    };
    const out: string[] = [];
    for (const k of Object.keys(names) as (keyof Stats)[]) {
      if (b[k] !== undefined && a[k] !== b[k]) out.push(`${names[k]}: ${a[k] ?? 0} → ${b[k]}`);
    }
    return out;
  }

  private drawMessages(ui: UI) {
    ui.layer = 3;
    // bottom-left above the bar, newest lowest, two at most (the fourth review: the feed at the top
    // centre hid the first straight, bend A and the very Siphon its hint was about)
    const maxW = Math.max(150, Math.min(300, Math.floor(ui.w * 0.55)));
    let bottom = ui.h - BAR_H - TAB_H - (this.paused || this.lines ? 30 : 16);
    const g = this.game, s = ui.scale;
    for (const m of this.msgs.slice(-2).reverse()) {
      const ls = wrapText(m.text, maxW);
      const h = ls.length * 10 + 5;
      const bw = Math.min(maxW, Math.max(...ls.map((l) => textWidth(l)))) + 10;
      // beside the card stack, not over it, when the stack reaches this far down (the fifth review)
      const y = bottom - h;
      const x = y < this.leftBottom + 2 && this.leftRight > 0 ? this.leftRight + 4 : 4;
      // over an enemy it fades, so what it is about stays visible
      const over = g.enemies.some((e) => {
        const ex = this.r.sx(e.x * TILE) / s, ey = this.r.sy(e.y * TILE) / s;
        return ex >= x - 6 && ex <= x + bw + 6 && ey >= y - 8 && ey <= y + h + 8;
      });
      ui.ctx.globalAlpha = Math.min(1, (m.life - m.t) * 1.5) * (over ? 0.4 : 1);
      ui.panel(x, y, bw, h, { blocking: false, alpha: 0.85, border: C.slate });
      ui.wrap(m.text, x + 5, y + 3, maxW, m.color);
      ui.ctx.globalAlpha = 1;
      bottom = y - 3;
    }
  }

  /** the left-hand card stack starts under the HUD; each card pushes the next down */
  private leftCard(ui: UI, w: number, h: number) {
    const x = 4, y = this.leftBottom + 2;
    this.leftRight = Math.max(this.leftRight, x + w);
    this.leftBottom = y + h;
    return { x, y };
  }

  /** a tower whose reach covers a stretch of road (at least a tile of beam on it) */
  private reachesRoad(b: Building): boolean {
    const g = this.game, r = (g.spec(b).range ?? 0) - 0.5;
    const cx = b.x + b.def.size / 2, cy = b.y + b.def.size / 2;
    for (const p of g.paths)
      for (let d = 0; d <= p.length; d += 0.5) {
        const q = p.at(d);
        if (Math.hypot(q.x - cx, q.y - cy) <= r) return true;
      }
    return false;
  }

  private drawFirstSteps(ui: UI, g: Game) {
    ui.layer = 2;
    const bs = [...g.buildings.values()];
    const lamps = bs.filter((b) => b.def.id === 'lamp' && this.reachesRoad(b)).length;
    const ex = bs.some((b) => b.def.role === 'extractor');
    const burner = bs.some((b) => b.def.role === 'generator' && bs.some((x) => x.def.role === 'extractor' && touches(g.rect(x), g.rect(b))));
    const steps: [boolean, string][] = [
      [lamps >= 2, g.map.firstLamps ?? 'Two Lamps (1) inside the two bends (a Node, 7, reaches the far one)'],
      [ex, 'An Extractor (8) on glowing emberrock near the Hearth'],
      [burner, 'A Burner (9) touching the Extractor: +20 kW'],
      [false, 'SPACE starts wave 1 when you are ready'],
    ];
    // as wide as its longest step, but never more than about half the screen: a long step wraps
    const cap = Math.max(200, Math.min(300, Math.floor(ui.w / 2) - 10));
    const wrapped = steps.map(([done, t]) => [done, wrapText(t, cap - 22)] as const);
    const w = Math.max(textWidth('New here? The title screen has a TUTORIAL.'), ...wrapped.flatMap(([, ls]) => ls.map((l) => textWidth(l)))) + 22;
    const rows = wrapped.reduce((a, [, ls]) => a + ls.length, 0);
    const h = 16 + rows * 11 + 13;
    const { x, y } = this.leftCard(ui, w, h);
    // clicks go through it to the map, and it fades while something is being placed under it (the
    // fifth review: on the Switchback it covers the bend it tells you to build in)
    const under = !!this.buildId && ui.mx >= x && ui.mx < x + w && ui.my >= y && ui.my < y + h;
    ui.ctx.globalAlpha = under ? 0.3 : 1;
    ui.panel(x, y, w, h, { blocking: false });
    ui.text('FIRST STEPS', x + 5, y + 4, C.gold);
    let row = 0;
    for (const [done, ls] of wrapped) {
      ui.text(done ? '+' : '-', x + 5, y + 16 + row * 11, done ? C.lime : C.steel);
      for (const l of ls) ui.text(l, x + 13, y + 16 + row++ * 11, done ? C.steel : C.mist);
    }
    ui.text('New here? The title screen has a TUTORIAL.', x + 5, y + 16 + rows * 11 + 1, C.ash);
    ui.ctx.globalAlpha = 1;
  }

  private drawTutorial(ui: UI, g: Game) {
    const t = this.tutorial!;
    const s = t.step!;
    ui.layer = 2;
    const w = 196;
    const lines = wrapText(s.text, w - 10);
    const h = 18 + lines.length * LINE_H + 22;
    const { x, y } = this.leftCard(ui, w, h);
    const pulse = 0.5 + 0.5 * Math.sin(this.clock * 5);
    ui.panel(x, y, w, h, { border: pulse > 0.5 ? C.gold : C.brass, alpha: 0.96 });
    ui.icon('tutorial', x + 4, y + 2);
    ui.text(s.title, x + 22, y + 6, C.gold);
    ui.textR(`${t.i + 1}/${STEPS.length}`, x + w - 5, y + 6, C.steel);
    lines.forEach((l, i) => ui.text(l, x + 5, y + 18 + i * LINE_H, C.mist));
    const by = y + h - 17;
    if (s.next && ui.button(t.i === STEPS.length - 1 ? 'PLAY ON' : 'NEXT [ENTER]', x + w - 82, by, 77, 13, { color: C.gold })) t.advance();
    if (!s.next) ui.text('Do it to go on.', x + w - 5 - textWidth('Do it to go on.'), by + 3, C.ash);
    if (ui.button('SKIP', x + 5, by, 34, 13)) {
      t.skip();
      this.say('Tutorial skipped. H shows every key.', C.ash, 4);
    }
    // light up the slot to press
    const slot = s.slot ? this.slotRects.get(s.slot) : undefined;
    if (slot) {
      ui.layer = 2;
      const c = pulse > 0.5 ? C.gold : C.amber;
      ui.fill(slot.x - 2, slot.y - 2, slot.w + 4, 2, c);
      ui.fill(slot.x - 2, slot.y + slot.h, slot.w + 4, 2, c);
      ui.fill(slot.x - 2, slot.y, 2, slot.h, c);
      ui.fill(slot.x + slot.w, slot.y, 2, slot.h, c);
    }
    void g;
  }

  /** a card for each new kind of enemy, the first time it comes */
  private drawIntel(ui: UI) {
    ui.layer = 2;
    for (const c of this.intel.slice(-2)) {
      const e = ENEMIES[c.enemy];
      const w = 196;
      const body = wrapText(e.blurb, w - 44);
      const ans = wrapText(e.answer, w - 10);
      const h = 14 + Math.max(body.length * LINE_H, 22) + ans.length * LINE_H + 8;
      const { x, y } = this.leftCard(ui, w, h);
      // full alpha while paused, so a card never hangs half-faded over the map
      ui.ctx.globalAlpha = this.paused || this.holding ? 1 : Math.min(1, (14 - c.t) * 1.5);
      ui.panel(x, y, w, h, { border: C.violet, alpha: 0.95 });
      ui.text(`NEW: ${e.name.toUpperCase()}`, x + 5, y + 4, C.gold);
      ui.textR(`${e.health} kJ`, x + w - 18, y + 4, C.steel);
      if (ui.button('x', x + w - 13, y + 3, 10, 9)) c.t = 14;
      const m = drawFrame(ui.ctx, e.id, Math.floor(this.clock * 4), x + 6, y + 15, 1, 'lit', 0);
      if (!m) ui.icon(e.id, x + 8, y + 16);
      body.forEach((l, i) => ui.text(l, x + 38, y + 16 + i * LINE_H, C.mist));
      const ay = y + 16 + Math.max(body.length * LINE_H, 22) + 2;
      ans.forEach((l, i) => ui.text(l, x + 5, ay + i * LINE_H, C.amber));
      ui.ctx.globalAlpha = 1;
    }
  }

  /** the research board: every project, what it costs in kJ, what it needs, and the Labs' rate */
  private drawBoard(ui: UI, g: Game) {
    ui.layer = 6;
    const w = Math.min(ui.w - 16, 420), colW = (w - 18) / 2;
    const rowsOf = (br: 'light' | 'power') => RESEARCH_ORDER.filter((id) => RESEARCH[id].branch === br && !RESEARCH[id].stacks).map((id) => {
      // a done project gives its row to the one stacked on it (tier 3 after tier 2)
      let at = id;
      for (;;) {
        const next = g.research.done.has(at) ? RESEARCH_ORDER.find((s) => RESEARCH[s].stacks && RESEARCH[s].requires === at) : undefined;
        if (!next) return at;
        at = next;
      }
    });
    const rows = Math.max(rowsOf('light').length, rowsOf('power').length);
    const rowH = 20;
    const h = 46 + rows * rowH + 4;
    const x = Math.round(ui.w / 2 - w / 2), y = Math.max(HUD_H + 2, Math.round((ui.h - BAR_H - TAB_H) / 2 - h / 2));
    ui.panel(x, y, w, h, { border: C.cyan, alpha: 0.97 });
    ui.text('RESEARCH', x + 6, y + 5, C.cyan);
    let labs = 0, kw = 0;
    for (const b of g.buildings.values())
      if (b.def.role === 'lab') {
        labs++;
        kw += b.demand * b.sat;
      }
    const rate = labs ? `${labs} Lab${labs > 1 ? 's' : ''}: ${kw.toFixed(0)} kJ/s ${g.research.active ? 'now' : '(idle)'}` : 'No Lab yet: build one (=) to research.';
    ui.text(rate, x + 6 + textWidth('RESEARCH') + 10, y + 5, labs ? C.mist : C.ember);
    if (ui.button('x', x + w - 13, y + 3, 10, 10)) this.board = false;
    ui.textR('game paused', x + w - 18, y + 5, C.steel);
    ui.wrap('A Lab turns watts into kJ of research at 1:1 while a project runs; more Labs go faster. Labs sit on tier 3: they starve before your towers do. Shift-click queues a project.', x + 6, y + 16, w - 12, C.ash);
    (['light', 'power'] as const).forEach((br, col) => {
      const cx = x + 6 + col * (colW + 6);
      ui.text(br === 'light' ? 'LIGHT' : 'POWER', cx, y + 36, br === 'light' ? C.amber : C.cyan);
      rowsOf(br).forEach((id, i) => {
        const r = RESEARCH[id];
        const ry = y + 46 + i * rowH;
        const done = g.research.done.has(id);
        const active = g.research.active === id;
        const why = researchProblem(g, id);
        const cost = Math.round(g.researchCost(id));
        const p = (g.research.progress[id] ?? 0) / cost;
        const qi = g.research.queue.indexOf(id);
        const label = done ? `${r.name}: done` : `${r.name}  ${cost} kJ`;
        const secs = kw > 0 ? Math.ceil((cost - (g.research.progress[id] ?? 0)) / kw) : Math.ceil(cost / 10);
        const qwhy = queueProblem(g, id);
        const queueTip = qi >= 0 ? 'Shift-click to take it out of the queue.' : !qwhy && g.research.active ? 'Shift-click to queue it: it starts by itself when the Labs finish what is ahead.' : '';
        if (ui.button(label, cx, ry, colW, 13, {
          active, disabled: done || (!!why && !active && !!qwhy && qi < 0), color: done ? C.steel : qi >= 0 ? C.cyan : C.bone,
          tip: [r.name, r.blurb, done ? 'Done.' : why && !active ? (qwhy ? why : `${why}. ${queueTip}`) : `${cost} kJ${cost < r.cost ? ' (Head Start)' : ''}: about ${secs} s at ${kw > 0 ? kw.toFixed(0) : 10} kW. ${active ? 'Click to pause it.' : 'Click to work on it now.'} ${active ? '' : queueTip}`],
        })) this.act(this.cmd(this.input.shift || (why && !qwhy) ? { k: 'queue', id } : { k: 'research', id }));
        if (qi >= 0) ui.textR(`NEXT ${qi + 1}`, cx + colW - 3, ry + 3, C.cyan);
        ui.bar(cx, ry + 14, colW, 4, done ? 1 : p, done ? C.steel : active ? C.cyan : C.navy);
      });
    });
  }

  private drawHelp(ui: UI) {
    ui.layer = 7;
    const lines: [string, string][] = [
      ['1-6 / 7-=', 'pick a LIGHT (tower) / POWER building'],
      ['Click', 'place it / select a building'],
      ['Right-click, Esc', 'cancel / deselect'],
      ['X', 'shed (turn off) the building under the mouse'],
      ['T / Shift+T', 'raise / lower its tier (4, Spare: wasted power only)'],
      ['E', 'Overcharge a tower: 3x for 4 s, ahead of the wall'],
      ['Q', 'Pulse: every Jar onto the enemies at the wall'],
      ['V', 'Lines: each power line and what holds it back'],
      ['O', 'Settings: volume, UI scale, screen flashes'],
      ['G', 'Reroute: a cut Node back at once (100 kJ)'],
      ['B', 'Dark Bait (The Fork): turn the Moths away'],
      ['U / Y', 'upgrade (Y: the other way, at a choice)'],
      ['L', 'research board'],
      ['Del', 'sell the selected building (half back)'],
      ['Esc', 'cancel, deselect, or the menu (title, settings)'],
      ['Space', 'start the next wave now'],
      ['WASD, middle-drag', 'pan; wheel zooms; C recentres'],
      ['Shift-click', 'a tier bar (top): shed the whole tier'],
      ['F / P / M', 'speed / pause / mute'],
    ];
    const w = 312, h = 28 + lines.length * 10 + 46;
    const x = ui.w / 2 - w / 2, y = Math.max(HUD_H + 2, ui.h / 2 - h / 2 - 10);
    ui.panel(x, y, w, h, { border: C.steel });
    ui.textC('HOW TO KEEP THE LIGHTS ON', ui.w / 2, y + 5, C.gold);
    lines.forEach(([k, t], i) => {
      ui.text(k, x + 8, y + 20 + i * 10, C.amber);
      ui.text(t, x + 98, y + 20 + i * 10, C.mist);
    });
    const yy = y + 24 + lines.length * 10;
    ui.wrap('Every tower fires at its full rate × its share of power (supply ÷ demand). Buying more towers than your Burners can run makes the whole wall weaker. Bright = powered, flickering purple = starved, dark with one blue pixel = no power.', x + 8, yy, w - 16, C.ash);
    if (ui.button('x', x + w - 13, y + 3, 10, 10)) this.help = false;
  }

  /** one line on why a run was lost, by rule (the second review's ask) */
  private diagnose(): string {
    const g = this.game, s = g.stats;
    // the leaks that took the last quarter of the lights decide what the run died of
    const total = s.leakLog.reduce((a, l) => a + l.lights, 0);
    const tail: typeof s.leakLog = [];
    let sum = 0;
    for (let i = s.leakLog.length - 1; i >= 0 && sum < Math.max(1, total / 4); i--) {
      tail.push(s.leakLog[i]);
      sum += s.leakLog[i].lights;
    }
    const by = (k: string) => tail.filter((l) => l.enemy === k).reduce((a, l) => a + l.lights, 0);
    if (sum === 0) return 'More towers at the bends, and keep them fed.';
    // "more Burners" only when power was short, not when it was being thrown away (the fifth review)
    const wasteful = s.wastedKj > s.kjDelivered * 0.25;
    const morePower = wasteful ? `Jars to carry the peaks (you wasted ${Math.round(s.wastedKj)} kJ)` : 'more Burners';
    // the player's own bursts first: they take the rest of the wall (the fifth review M4)
    const ocStarved = tail.filter((l) => l.overcharged && l.wall < 0.5).reduce((a, l) => a + l.lights, 0);
    if (ocStarved >= sum / 2)
      return `Your own Overcharges: ${ocStarved} of the last ${sum} lights got through while a burst held your wall under half. Each one takes the rest of the wall for 4 s; save them for a Pall.`;
    const lostAll = Object.values(s.lightsLostBy).reduce((a, b) => a + b, 0) || 1;
    if ((s.lightsLostBy.pall ?? 0) / lostAll >= 0.4 && by('pall') > 0) return `Palls took ${s.lightsLostBy.pall} of your ${lostAll} lights. A Pall drinks a beam and hides behind the Moths that overtake it in a cone: burn it (a Brazier burns every body in full), shell it (a Starshell burst lands on everything), or put a cone early on the road and Overcharge it there, on the Hearth's own reach where no Node caps the burst.`;
    const veilsStarved = tail.filter((l) => l.enemy === 'veil' && l.wall < RULES.veilSight.v);
    if (veilsStarved.length && by('veil') >= sum / 3)
      return veilsStarved.some((l) => l.overcharged)
        ? 'Veils walked past while your wall was under 60%: your Overcharges took the power their towers needed to see them.'
        : `Veils walked past while your wall was under 60%: ${morePower}, fewer towers firing at once, or Pulse less (it empties the Jars that carry the wall).`;
    if (by('pall') >= sum / 2) return 'Palls took the last of it. A Pall drinks a beam and hides behind the Moths that overtake it in a cone: burn it (a Brazier burns every body in full, a Pall too), shell it (a Starshell burst lands on everything), or put a cone early on the road, before the Moths catch it up, and Overcharge it there.';
    if (by('siphon') >= sum / 3) return 'Siphons got through: kill them where they drink (an Overcharge, a Brazier), or have spare kW on the line they tap.';
    if (by('flit') >= sum / 3) return 'Flit clumps got through: a cone looking down a straight, a Starshell, or a Brazier behind a Beacon.';
    if (by('shade') >= sum / 3) return 'Shades got through: their 90 kJ needs two towers on them, or an Overcharge as they pass.';
    const lost = lostAll;
    if ((s.lightsLostBy.pall ?? 0) / lost >= 0.4) return 'Palls took most of it. A Pall drinks a beam and hides behind the Moths that overtake it in a cone: burn it (a Brazier burns every body in full, a Pall too), shell it (a Starshell burst lands on everything), or put a cone early on the road, before the Moths catch it up, and Overcharge it there.';
    if (s.brownoutSeconds > 60) return `Your wall spent ${Math.round(s.brownoutSeconds)} s starved: ${wasteful ? morePower : 'more Burners, or Jars to carry the peaks'}.`;
    if (s.wastedKj > s.kjDelivered) return 'You made more power than your towers used: fewer Burners, more towers (or Jars and Labs for the spare).';
    if ((s.lightsLostBy.flit ?? 0) / lost >= 0.3) return 'Flit clumps got through: a cone looking down a straight, a Starshell, or a Brazier behind a Beacon.';
    return 'More towers at the bends, and keep them fed.';
  }

  private drawEnd(ui: UI, g: Game) {
    ui.layer = 8;
    const win = g.over === 'win';
    const s = g.stats;
    const lost = s.lightsLostBy;
    // the worst wave is the one that cost the most lights, not the most leaks
    let worst = 1;
    for (let i = 1; i < s.lightsByWave.length; i++) if ((s.lightsByWave[i] ?? 0) > (s.lightsByWave[worst] ?? 0)) worst = i;
    const rows: [string, string][] = [
      ['Waves', win ? `all ${LAST_WAVE}` : g.endless ? `endless: reached wave ${g.wave}` : `reached ${g.wave} of ${LAST_WAVE}`],
      ['Lights left', `${g.lights} of ${RULES.startLights.v}`],
      ['Kills / leaks', `${s.kills} / ${s.leaks}`],
      ...(win ? [] : ([
        ['Lights lost to', ENEMY_ORDER.filter((id) => lost[id]).map((id) => `${ENEMIES[id].name}s ${lost[id]}`).join(', ') || 'nothing'],
        ['Worst wave', `wave ${worst}: ${s.lightsByWave[worst] ?? 0} lights (${s.leaksByWave[worst] ?? 0} got through)`],
      ] as [string, string][])),
      ['Money earned', `${s.moneyEarned} (${s.wavePay} wave pay)`],
      ['Damage delivered', `${Math.round(s.kjDelivered)} kJ`],
      ['Power wasted', `${Math.round(s.wastedKj)} kJ`],
      ...(s.stolenKj > 0 ? [['Drunk by Siphons', `${Math.round(s.stolenKj)} kJ`] as [string, string]] : []),
      ['Time in brownout', `${Math.round(s.brownoutSeconds)} s`],
      ['Overcharges / research', `${s.overcharges} / ${s.researched}`],
    ];
    if (this.profile) rows.push(['Embers', `+${this.embersEarned} (you have ${this.profile.embers}: SKILLS on the title)`]);
    const spare = !win && g.money >= 100 ? ` You ended with ${g.money} money unspent: between waves it is towers and Burners.` : '';
    const why = win ? '' : this.diagnose() + spare;
    const best = this.profile?.maps[g.map.id];
    if (best) rows.push([`Best on ${g.map.name}`, best.won ? `won with ${best.lights} lights${best.endless ? `, endless wave ${best.endless}` : ''}` : `wave ${best.wave}`]);
    const w = Math.min(ui.w - 12, Math.max(276, ...rows.map(([k, v]) => textWidth(k) + textWidth(v) + 40)));
    const whyLines = why ? wrapText(why, w - 28) : [];
    const h = 34 + rows.length * 10 + (whyLines.length ? whyLines.length * LINE_H + 6 : 0) + 26;
    const x = ui.w / 2 - w / 2, y = ui.h / 2 - h / 2;
    ui.panel(x, y, w, h, { border: win ? C.gold : C.ember, alpha: 0.96 });
    ui.big(win ? 'THE LIGHTS HELD' : 'THE HEARTH WENT DARK', ui.w / 2, y + 8, 2, win ? C.gold : C.ember);
    rows.forEach(([k, v], i) => {
      ui.text(k, x + 14, y + 32 + i * 10, C.ash);
      ui.textR(v, x + w - 14, y + 32 + i * 10, C.mist);
    });
    whyLines.forEach((l, i) => ui.text(l, x + 14, y + 32 + rows.length * 10 + 4 + i * LINE_H, C.gold));
    if (win) {
      if (ui.button('KEEP GOING: ENDLESS', ui.w / 2 - 158, y + h - 22, 120, 15, { color: C.gold, tip: ['Endless', 'Waves keep coming, each 14% heavier. How long can the Hearth hold?'] })) {
        this.cmd({ k: 'endless' });
        this.recorded = false;
        this.say('Endless: the dark keeps coming. Each wave 14% heavier.', C.gold, 6);
      }
      if (ui.button('PLAY AGAIN (R)', ui.w / 2 - 32, y + h - 22, 90, 15)) this.onRestart();
      if (this.opts.onTitle && ui.button('TITLE (T)', ui.w / 2 + 64, y + h - 22, 70, 15)) this.opts.onTitle();
    } else {
      if (ui.button('PLAY AGAIN (R)', ui.w / 2 - 96, y + h - 22, 100, 15, { color: C.gold })) this.onRestart();
      if (this.opts.onTitle && ui.button('TITLE (T)', ui.w / 2 + 10, y + h - 22, 86, 15)) this.opts.onTitle();
    }
  }
}

export { HUD_H, BAR_H, TAB_H, ENEMIES, covers };
