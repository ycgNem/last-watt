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
import { SKILLS, SKILL_ORDER, skillProblem } from './data/skills';
import { clearRun, loadRun, type RunSave } from './app/runsave';
import { replay } from './sim/commands';
import { Game } from './sim/Game';
import { Bot } from './app/bot';
import { C } from './data/palette';
import { drawText, textWidth, wrapText, LINE_H } from './ui/font';
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
  /** the skill tree is open over the title */
  skillsOpen = false;
  /** the run saved mid-way (CONTINUE), and a note when one could not be used */
  saved: RunSave | null = null;
  saveNote = '';

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
      // the loading screen baked the title's ground before the art arrived: bake it again
      this.title = new Game({ map: this.map });
      this.focusTitle();
      this.readSave();
    });
  }

  /** look for a run saved mid-way */
  readSave() {
    const { run, problem } = loadRun();
    this.saved = run;
    if (problem) this.saveNote = problem;
  }

  /** rebuild the saved run by replaying its commands, then play on from there */
  continueRun() {
    const s = this.saved;
    if (!s) return;
    const map = mapById(s.map);
    const g = new Game({ map, seed: s.seed, skills: s.skills });
    const err = replay(g, s.log, s.tick);
    if (err) {
      clearRun();
      this.saved = null;
      this.saveNote = 'Your saved run could not be rebuilt, so it was dropped.';
      console.warn('replay failed:', err);
      return;
    }
    this.play = new Play(this.r, this.ui, this.input, this.audio, () => this.newGame(), { game: g, map, seed: s.seed, profile: this.profile, onProfile: (p) => saveProfile(p) });
    this.play.paused = true;
    this.play.say(`Continued: ${map.name}, wave ${g.wave}. Paused: P to play on.`, C.gold, 6);
    this.screen = 'play';
    this.resize();
    (window as any).__game = this.play.game;
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

  /** the skill tree over the title: three columns of three, bought with embers, free to respec */
  private drawSkills(top: number) {
    const ui = this.ui, p = this.profile;
    if (this.input.key('Escape') || this.input.key('KeyK')) {
      this.skillsOpen = false;
      return;
    }
    const w = Math.min(ui.w - 16, 432), colW = Math.floor((w - 24) / 3), rowH = 34;
    const intro = wrapText('One ember a wave cleared, and half your lights left on a win. Each skill changes a power rule for every run after.', w - 12);
    const head = 20 + intro.length * LINE_H;
    const h = head + 14 + 3 * rowH + 22;
    const x = Math.round(ui.w / 2 - w / 2), y = top;
    ui.layer = 6;
    ui.panel(x, y, w, h, { border: C.amber, alpha: 0.97 });
    ui.text("THE GAFFER'S SKILLS", x + 6, y + 5, C.amber);
    ui.textR(`${p.embers} embers`, x + w - 18, y + 5, C.gold);
    if (ui.button('x', x + w - 13, y + 3, 10, 10)) this.skillsOpen = false;
    intro.forEach((l, i) => ui.text(l, x + 6, y + 16 + i * LINE_H, C.ash));
    const cols = [['storage', 'STORAGE'], ['supply', 'SUPPLY'], ['gaffer', 'GAFFER']] as const;
    cols.forEach(([col, name], ci) => {
      const cx = x + 6 + ci * (colW + 6);
      ui.text(name, cx, y + head, C.steel);
      SKILL_ORDER.filter((id) => SKILLS[id].column === col).forEach((id) => {
        const s = SKILLS[id];
        const ry = y + head + 11 + (s.row - 1) * rowH;
        const have = p.skills.includes(id);
        const why = skillProblem(id, p.skills, p.embers);
        const label = have ? `${s.name}: learned` : `${s.name}  ${s.cost}`;
        if (ui.button(label, cx, ry, colW, 14, { active: have, disabled: !have && !!why, color: have ? C.gold : C.bone, tip: [s.name, s.blurb, s.watt, ...(have ? ['Learned.'] : why ? [why] : [`${s.cost} embers: click to learn.`])] }) && !have && !why) {
          p.embers -= s.cost;
          p.skills.push(id);
          saveProfile(p);
          this.audio.sfx('upgrade');
        }
        if (s.row < 3) ui.fill(cx + Math.floor(colW / 2), ry + 15, 1, rowH - 16, have ? C.amber : C.iron);
      });
    });
    const spent = p.skills.reduce((a, id) => a + (SKILLS[id]?.cost ?? 0), 0);
    if (ui.button(`RESPEC (+${spent})`, x + 6, y + h - 20, 90, 14, { disabled: spent === 0, tip: ['Respec', 'Forget every skill and get all the embers back. Free.'] })) {
      p.embers += spent;
      p.skills = [];
      saveProfile(p);
    }
    if (ui.button('DONE (K)', x + w - 96, y + h - 20, 90, 14, { color: C.gold })) this.skillsOpen = false;
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
    // a new run replaces the saved one (it saves itself as soon as it has a tick to save)
    if (!withBot && !tutorial) this.saved = null;
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
    if (this.skillsOpen) {
      this.drawSkills(Math.round(ty));
      ui.end();
      return;
    }
    ui.textC('Things come out of the dark. Your towers are lights, and lights run on watts, not money.', ui.w / 2, ty, C.mist);
    ui.textC(`Build a grid, keep it fed, and keep the Hearth lit for ${LAST_WAVE} waves.`, ui.w / 2, ty + 12, C.mist);
    const by = Math.round(ui.h * 0.58);
    if (this.saved) {
      const s = this.saved;
      const cw = 220;
      if (ui.button(`CONTINUE: ${mapById(s.map).name.toUpperCase()}, WAVE ${s.wave}`, Math.round(ui.w / 2 - cw / 2), by - 24, cw, 18, { color: C.gold, active: true, tip: ['Continue', `Your run on ${mapById(s.map).name}: wave ${s.wave}, ${s.lights} lights. It is rebuilt from your moves, then paused.`] }) || this.input.key('KeyC')) {
        this.audio.unlock();
        this.continueRun();
        ui.end();
        return;
      }
    } else if (this.saveNote) ui.textC(this.saveNote, ui.w / 2, by - 18, C.ash);
    const first = !this.profile.tutorialDone;
    const tbw = 112, bx = Math.round(ui.w / 2 - (tbw * 3 + 12) / 2);
    if (ui.button(first ? 'TUTORIAL (START HERE)' : 'TUTORIAL', bx, by, tbw, 18, { color: first ? C.gold : C.bone, active: first, tip: ['Tutorial', 'A guided first run: place each piece on a marked spot and learn why watts matter. About 4 minutes, then the run carries on.'] }) || this.input.key('KeyT')) {
      this.audio.unlock();
      this.newGame(false, true);
    }
    if (ui.button('PLAY', bx + tbw + 6, by, tbw, 18, { color: first ? C.bone : C.gold, active: !first, tip: ['Play', `${LAST_WAVE} waves on ${this.map.name}, then endless if you like.`] }) || this.input.key('Enter') || this.input.key('Space')) {
      this.audio.unlock();
      this.newGame();
    }
    const owned = this.profile.skills.length;
    if (ui.button(`SKILLS: ${this.profile.embers} EMBERS`, bx + 2 * (tbw + 6), by, tbw, 18, { color: this.profile.embers > 0 ? C.amber : C.bone, tip: ['The gaffer\'s skills (K)', `Embers come from runs: one for every wave cleared, and half your lights left on a win. Spend them on skills that change the power rules for every run after. ${owned} of ${SKILL_ORDER.length} learned.`] }) || this.input.key('KeyK')) this.skillsOpen = true;
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
    const hint = `${this.saved ? 'C continue, ' : ''}T tutorial, Enter play, K skills, arrows pick a map. H in game shows the controls.`;
    const bw = Math.min(ui.w - 32, Math.max(360, textWidth(hint) + 8));
    const b = this.profile.maps[this.map.id];
    const ph = wrapText(this.map.blurb, bw).length * LINE_H + (b && b.wave > 0 ? 12 : 0) + 22;
    ui.panel(Math.round(ui.w / 2 - bw / 2) - 8, my + 17, bw + 16, ph, { alpha: 0.8 });
    const lines = ui.wrap(this.map.blurb, Math.round(ui.w / 2 - bw / 2), my + 21, bw, C.mist);
    let y = my + 21 + lines + 4;
    if (b && b.wave > 0) {
      ui.textC(b.won ? `Best here: held all ${LAST_WAVE} waves with ${b.lights} lights${b.endless ? `; endless to wave ${b.endless}` : ''}.` : `Best here: reached wave ${b.wave} of ${LAST_WAVE}.`, ui.w / 2, y, C.amber);
      y += 12;
    }
    ui.textC(hint, ui.w / 2, y + 2, C.steel);
    ui.end();
  }
}

const app = new App();
(window as any).__app = app;
(window as any).__Game = Game;
(window as any).__Bot = Bot;
(window as any).__maps = MAPS;
(window as any).__skills = SKILL_ORDER;
// hooks for the e2e harness and for debugging by hand (free placement, no money spent)
(window as any).__place = (g: Game, id: any, x: number, y: number) => {
  const b = place(g, id, x, y, true);
  if (typeof b === 'string') throw new Error(`${id} at ${x},${y}: ${b}`);
  return b;
};
(window as any).__next = nextWave;
(window as any).__overcharge = overcharge;
void drawText;
