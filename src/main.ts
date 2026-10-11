// Boot: canvas, art, the fixed 60 Hz loop and the screens (title → play).
import { GameLoop } from './engine/loop';
import { Input } from './engine/input';
import { Audio } from './engine/audio';
import { Renderer, TILE } from './render/renderer';
import { loadArt } from './render/art';
import { UI } from './ui/ui';
import { Play, HUD_H, BAR_H } from './app/play';
import { loadProfile, saveProfile, type Profile } from './app/save';
import { LAST_WAVE } from './data/waves';
import { MAPS, mapById, type MapDef } from './data/map';
import { Game } from './sim/Game';
import { Bot } from './app/bot';
import { C } from './data/palette';
import { drawText, wrapText, LINE_H } from './ui/font';
import { nextWave, overcharge, place } from './sim/actions';

class App {
  canvas = document.getElementById('game') as HTMLCanvasElement;
  r = new Renderer(this.canvas);
  ui = new UI();
  input = new Input();
  audio = new Audio();
  screen: 'loading' | 'title' | 'play' = 'loading';
  play: Play | null = null;
  profile: Profile = loadProfile();
  /** the map picked on the title screen (and drawn behind it) */
  map: MapDef = this.open(mapById(this.profile.map)) ? mapById(this.profile.map) : MAPS[0];
  title = new Game({ map: this.map });
  loop: GameLoop;
  uiScale = 2;

  constructor() {
    this.input.attach(this.canvas);
    this.audio.setMuted(this.profile.muted);
    this.ui.sfx = (id) => this.audio.sfx(id);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousedown', () => this.audio.unlock());
    window.addEventListener('keydown', () => this.audio.unlock());
    this.loop = new GameLoop(() => this.tick(), (dt) => this.frame(dt));
    // a background tab doesn't race to catch up: the loop caps a frame at 0.25 s
    this.loop.start();
    void loadArt().then(() => {
      this.screen = 'title';
      this.focusTitle();
    });
  }

  /** a map is open once the player has reached its unlock wave on any map */
  open(m: MapDef): boolean {
    return this.profile.best.wave >= m.unlockWave;
  }

  pickMap(m: MapDef) {
    if (!this.open(m) || m === this.map) return;
    this.map = m;
    this.title = new Game({ map: m });
    this.focusTitle();
    this.profile.map = m.id;
    saveProfile(this.profile);
  }

  private focusTitle() {
    const [fx, fy] = this.title.map.focus;
    this.r.cam.x = fx * TILE;
    this.r.cam.y = fy * TILE;
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.floor(window.innerWidth * dpr), h = Math.floor(window.innerHeight * dpr);
    this.r.resize(w, h);
    this.uiScale = Math.max(1, Math.floor(Math.min(w / 500, h / 290)));
    const uiH = (HUD_H + BAR_H) * this.uiScale;
    this.r.cam.z = Math.max(1, Math.min(6, Math.floor(Math.min(w / (26 * TILE), (h - uiH) / (14 * TILE)))));
  }

  newGame(withBot = false, tutorial = false) {
    const seed = withBot ? 1 : Math.floor(Math.random() * 1000);
    this.play = new Play(this.r, this.ui, this.input, this.audio, () => this.newGame(), {
      tutorial, seed, map: withBot ? undefined : this.map, profile: withBot ? undefined : this.profile, onProfile: (p) => saveProfile(p),
    });
    if (withBot) this.play.bot = new Bot();
    this.screen = 'play';
    this.resize();
    (window as any).__game = this.play.game;
    return this.play;
  }

  tick() {
    if (this.screen === 'play' && this.play) this.play.tick();
  }

  frame(dt: number) {
    const r = this.r, ui = this.ui;
    r.step(dt);
    if (this.screen === 'play' && this.play) {
      const p = this.play;
      this.loop.speed = p.speed;
      ui.begin(r.ctx, this.input, this.uiScale);
      ui.overUI = ui.overUI || this.input.mouse.y < HUD_H * this.uiScale || this.input.mouse.y > r.H - BAR_H * this.uiScale;
      p.frame(dt);
      r.dimAll = 0;
      r.draw(p.game, p.overlay());
      ui.begin(r.ctx, this.input, this.uiScale);
      p.drawUI();
    } else this.drawTitle(dt);
    this.input.endFrame();
  }

  private drawTitle(dt: number) {
    const r = this.r, ui = this.ui;
    r.cam.x += dt * 3;
    r.clampCamera(this.title);
    r.dimAll = 0.35;
    r.draw(this.title, {});
    ui.begin(r.ctx, this.input, this.uiScale);
    if (this.screen === 'loading') {
      ui.textC('Lighting the lamps...', ui.w / 2, ui.h / 2, C.ash);
      return;
    }
    const s = Math.max(3, Math.floor(ui.w / 110));
    ui.big('LAST WATT', ui.w / 2, Math.round(ui.h * 0.2), s, C.gold, C.rust);
    const ty = ui.h * 0.2 + s * 9 + 10;
    ui.textC('Things come out of the dark. Your towers are lights, and lights run on watts, not money.', ui.w / 2, ty, C.mist);
    ui.textC(`Build a grid, keep it fed, and keep the Hearth lit for ${LAST_WAVE} waves.`, ui.w / 2, ty + 12, C.mist);
    const by = Math.round(ui.h * 0.58);
    const first = !this.profile.tutorialDone;
    if (ui.button(first ? 'TUTORIAL (START HERE)' : 'TUTORIAL', ui.w / 2 - 130, by, 124, 18, { color: first ? C.gold : C.bone, active: first, tip: ['Tutorial', 'A guided first run: place each piece on a marked spot and learn why watts matter. About 3 minutes, then the run carries on.'] }) || this.input.key('KeyT')) {
      this.audio.unlock();
      this.newGame(false, true);
    }
    if (ui.button('PLAY', ui.w / 2 + 6, by, 124, 18, { color: first ? C.bone : C.gold, active: !first, tip: ['Play', `${LAST_WAVE} waves on ${this.map.name}, then endless if you like.`] }) || this.input.key('Enter') || this.input.key('Space')) {
      this.audio.unlock();
      this.newGame();
    }
    // the map picker: one button per map, locked ones say what opens them
    const mw = 108, gap = 4, my = by + 26;
    const mx = Math.round(ui.w / 2 - (MAPS.length * mw + (MAPS.length - 1) * gap) / 2);
    MAPS.forEach((m, i) => {
      const open = this.open(m);
      const label = open ? m.name.toUpperCase() : `WAVE ${m.unlockWave} TO OPEN`;
      const tip = open ? [m.name, m.blurb] : [m.name, `Reach wave ${m.unlockWave} on any map to open it. ${m.blurb}`];
      if (ui.button(label, mx + i * (mw + gap), my, mw, 15, { active: m === this.map, disabled: !open, color: m === this.map ? C.gold : C.bone, tip })) this.pickMap(m);
    });
    const step = (this.input.key('ArrowRight') ? 1 : 0) - (this.input.key('ArrowLeft') ? 1 : 0);
    if (step) {
      const open = MAPS.filter((m) => this.open(m));
      this.pickMap(open[(open.indexOf(this.map) + step + open.length) % open.length]);
    }
    const bw = Math.min(ui.w - 32, 360);
    const b = this.profile.maps[this.map.id];
    const ph = wrapText(this.map.blurb, bw).length * LINE_H + (b && b.wave > 0 ? 12 : 0) + 22;
    ui.panel(Math.round(ui.w / 2 - bw / 2) - 8, my + 17, bw + 16, ph, { alpha: 0.8 });
    const lines = ui.wrap(this.map.blurb, Math.round(ui.w / 2 - bw / 2), my + 21, bw, C.mist);
    let y = my + 21 + lines + 4;
    if (b && b.wave > 0) {
      ui.textC(b.won ? `Best here: held all ${LAST_WAVE} waves with ${b.lights} lights${b.endless ? `; endless to wave ${b.endless}` : ''}.` : `Best here: reached wave ${b.wave} of ${LAST_WAVE}.`, ui.w / 2, y, C.amber);
      y += 12;
    }
    ui.textC('T tutorial, Enter play, arrows pick a map. H in game shows the controls.', ui.w / 2, y + 2, C.steel);
    ui.end();
  }
}

const app = new App();
(window as any).__app = app;
(window as any).__Game = Game;
(window as any).__Bot = Bot;
(window as any).__maps = MAPS;
// hooks for the e2e harness and for debugging by hand (free placement, no money spent)
(window as any).__place = (g: Game, id: any, x: number, y: number) => {
  const b = place(g, id, x, y, true);
  if (typeof b === 'string') throw new Error(`${id} at ${x},${y}: ${b}`);
  return b;
};
(window as any).__next = nextWave;
(window as any).__overcharge = overcharge;
void drawText;
