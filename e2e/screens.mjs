// Screens sweep with an overlap audit: captures every UI state, then checks the text and panel
// boxes the UI recorded that frame (src/ui/ui.ts) for clashing text, text spilling out of its
// panel and text off the screen. Writes e2e/out/screens/<name>.png and report.md.
// Usage: node e2e/screens.mjs [name,name,...]   (BASE=http://127.0.0.1:5173/ by default)
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.BASE ?? 'http://127.0.0.1:5173/';
const out = 'e2e/out/screens';
fs.mkdirSync(out, { recursive: true });
const sizes = [[1280, 720], [1920, 1080], [1024, 768], [1024, 640]];

const STATES = {
  title: async () => {},
  lab0: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const b = window.__place(p.game, 'lab', 19, 18);
    p.selectedId = b.id;
    p.say('A long message to check the feed stays clear of the first-steps card and the side panel.');
  }),
  opening: async (page) => page.evaluate(() => window.__app.newGame()),
  buildtip: async (page, w, h) => {
    await page.evaluate(() => window.__app.newGame());
    await page.waitForTimeout(80);
    const slot = await page.evaluate(() => { const ui = window.__app.ui; const s = ui.scale; const x0 = Math.round(ui.w / 2 - (184 * 2 + 6 + 6 + 62) / 2); return { x: (x0 + 2 + 14) * s, y: (ui.h - 20) * s }; });
    await page.mouse.move(slot.x, slot.y);
  },
  lamp: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const b = window.__place(p.game, 'lamp', 24, 13);
    p.selectedId = b.id;
  }),
  lab: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    window.__place(g, 'extractor', 16, 19); window.__place(g, 'burner', 16, 20);
    const b = window.__place(g, 'lab', 19, 18);
    g.research.active = 'lamp2';
    p.selectedId = b.id;
  }),
  burner: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const b = window.__place(p.game, 'burner', 13, 18);
    p.selectedId = b.id;
  }),
  jars: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    const j = window.__place(g, 'jar', 22, 18); j.charge = 400;
    window.__place(g, 'jar', 23, 18);
    const l = window.__place(g, 'lamp', 24, 13);
    window.__next(g);
    for (let i = 0; i < 60; i++) p.tick();
    p.selectedId = l.id;
  }),
  help: async (page) => page.evaluate(() => { window.__app.newGame().help = true; }),
  wave3: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    g.wave = 2;
    window.__next(g);
    for (let i = 0; i < 120; i++) p.tick();
  }),
  win: async (page) => page.evaluate(() => { const p = window.__app.newGame(); p.game.over = 'win'; }),
  tutorial: async (page) => page.evaluate(() => { const p = window.__app.newGame(false, true); p.tutorial.advance(); }),
  floodghost: async (page) => {
    const at = await page.evaluate(() => {
      const p = window.__app.newGame();
      const g = p.game;
      window.__place(g, 'extractor', 16, 19); window.__place(g, 'burner', 16, 20).fuel = 5;
      window.__place(g, 'lamp', 24, 13); window.__place(g, 'node', 21, 10); window.__place(g, 'lamp', 24, 7);
      window.__next(g);
      for (let i = 0; i < 60 * 3; i++) { p.tick(); g.drainEvents(); }
      p.msgs = [];
      p.paused = true;
      p.buildId = 'floodlight';
      const r = window.__app.r;
      return { x: r.sx(28 * 16), y: r.sy(16 * 16) };
    });
    await page.mouse.move(at.x / (await page.evaluate(() => window.devicePixelRatio || 1)), at.y / (await page.evaluate(() => window.devicePixelRatio || 1)));
  },
  tutorialburner: async (page) => page.evaluate(() => {
    const p = window.__app.newGame(false, true);
    p.tutorial.advance();
    window.__place(p.game, 'lamp', 24, 13);
    window.__place(p.game, 'extractor', 16, 18);
    p.tutorial.update(p.game); p.tutorial.update(p.game);
  }),
  tutorialhold: async (page) => page.evaluate(() => { const p = window.__app.newGame(false, true); for (let i = 0; i < 8; i++) p.tutorial.advance(); }),
  board: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    window.__place(g, 'lab', 19, 18);
    g.research.done.add('brazier'); g.research.done.add('lamp2');
    g.research.active = 'starshell'; g.research.progress.starshell = 500;
    p.board = true;
  }),
  intel: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    window.__place(g, 'lamp', 24, 13);
    g.wave = 6;
    window.__next(g);
    for (let i = 0; i < 60 * 4; i++) p.tick();
  }),
  fullwall: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    for (const r of ['searchlight', 'brazier', 'starshell', 'vane', 'flood2', 'bellows', 'lamp2']) g.research.done.add(r);
    const put = (id, x, y) => window.__place(g, id, x, y);
    put('extractor', 16, 19); put('burner', 16, 20).fuel = 5; put('extractor', 15, 19); put('burner', 13, 18).fuel = 5;
    put('node', 21, 10); put('lamp', 24, 7).level = 2; put('floodlight', 24, 13); put('searchlight', 22, 7); put('brazier', 24, 16);
    put('starshell', 18, 8); put('vane', 22, 18); put('jar', 21, 18).charge = 500;
    g.money = 400;
    g.wave = 8;
    window.__next(g);
    for (let i = 0; i < 60 * 14; i++) { p.tick(); if (i < 60 * 13) g.drainEvents(); }
    p.msgs = [];
    p.selectedId = [...g.buildings.values()].find((b) => b.def.id === 'brazier').id;
  }),
  lose: async (page) => page.evaluate(() => { const p = window.__app.newGame(); p.game.over = 'lose'; p.game.lights = 0; }),
  paused: async (page) => page.evaluate(() => { window.__app.newGame().paused = true; }),
  pulse: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    g.research.done.add('pulse');
    window.__place(g, 'extractor', 16, 19); window.__place(g, 'burner', 16, 20).fuel = 5;
    window.__place(g, 'lamp', 24, 13); window.__place(g, 'lamp', 22, 16);
    window.__place(g, 'jar', 22, 18).charge = 600;
    g.wave = 1;
    window.__next(g);
    for (let i = 0; i < 60 * 34; i++) { p.tick(); g.drainEvents(); }
    p.msgs = [];
  }),
  lines: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    window.__place(g, 'extractor', 16, 19); window.__place(g, 'burner', 16, 20).fuel = 5;
    window.__place(g, 'node', 21, 10);
    window.__place(g, 'lamp', 24, 7); window.__place(g, 'lamp', 24, 13); window.__place(g, 'floodlight', 12, 13);
    window.__place(g, 'jar', 22, 18).charge = 100;
    // a second line with a Burner and no Extractor
    for (const [id, x, y] of [['node', 6, 18], ['burner', 7, 20], ['lamp', 4, 15]]) try { window.__place(g, id, x, y); } catch { /* blocked */ }
    for (let i = 0; i < 3; i++) p.tick();
    p.lines = true;
    p.paused = true;
    p.msgs = [];
  }),
  reroute: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    g.research.done.add('reroute');
    window.__place(g, 'jar', 22, 18).charge = 400;
    window.__place(g, 'node', 21, 10);
    const n = window.__place(g, 'node', 24, 10);
    window.__place(g, 'lamp', 24, 7);
    n.offline = 7;
    g.netDirty = true;
    for (let i = 0; i < 3; i++) p.tick();
    p.paused = true;
    p.selectedId = n.id;
  }),
  continue: async (page) => {
    await page.evaluate(() => {
      const a = window.__app;
      a.saved = { v: 1, hash: '', map: 'switchback', seed: 3, skills: [], tick: 9000, wave: 6, lights: 17, log: [] };
      a.profile.best.wave = 9;
    });
    await page.mouse.move(4, 4);
  },
  skills: async (page) => {
    await page.evaluate(() => {
      const a = window.__app;
      a.profile.embers = 13;
      a.profile.skills = ['spareJar', 'wideMouth', 'hotHearth'];
      a.skillsOpen = true;
    });
    await page.mouse.move(4, 4);
  },
  settings: async (page) => {
    await page.evaluate(() => {
      window.__app.profile.settings = { volume: 0.3, uiScale: 0, flashes: false };
      window.__app.settingsOpen = true;
    });
    await page.mouse.move(4, 4);
  },
  settingsplay: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    p.settingsOpen = true;
  }),
  winembers: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    for (let n = 1; n <= 12; n++) g.wavePaid.add(n);
    g.wave = 12;
    g.lights = 15;
    g.over = 'win';
  }),
  titlemaps: async (page) => {
    await page.evaluate(() => {
      const a = window.__app;
      a.profile.best.wave = 9;
      a.profile.maps.station = { wave: 12, won: true, lights: 17, endless: 0 };
      a.profile.maps.switchback = { wave: 9, won: false, lights: 0, endless: 0 };
      a.pickMap(window.__maps[1]);
    });
    await page.mouse.move(4, 4);
  },
  switchback: async (page) => page.evaluate(() => {
    const a = window.__app;
    a.profile.best.wave = 12;
    a.pickMap(window.__maps[1]);
    const p = a.newGame();
    const g = p.game;
    window.__place(g, 'lamp', 12, 19); window.__place(g, 'lamp', 12, 13); window.__place(g, 'node', 16, 17);
    g.wave = 3;
    window.__next(g);
    for (let i = 0; i < 60 * 20; i++) { p.tick(); g.drainEvents(); }
    p.msgs = [];
  }),
  tworoads: async (page) => page.evaluate(() => {
    const a = window.__app;
    a.profile.best.wave = 12;
    a.pickMap(window.__maps[2]);
    const p = a.newGame();
    const g = p.game;
    window.__place(g, 'lamp', 17, 17); window.__place(g, 'lamp', 18, 15); window.__place(g, 'lamp', 14, 17); window.__place(g, 'lamp', 21, 15);
    g.research.done.add('starshell');
    window.__place(g, 'node', 17, 15); window.__place(g, 'starshell', 17, 13);
    g.wave = 4;
    window.__next(g);
    for (let i = 0; i < 60 * 24; i++) { p.tick(); g.drainEvents(); }
    p.msgs = [];
  }),
};

function audit(recs, uw, uh) {
  const issues = [];
  const texts = recs.filter((r) => r.kind === 'text' && r.s && r.s.trim());
  const panels = recs.filter((r) => r.kind === 'panel' || r.kind === 'button');
  const inter = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const contains = (p, t) => t.x >= p.x && t.y >= p.y && t.x + t.w <= p.x + p.w && t.y + t.h <= p.y + p.h;
  for (let i = 0; i < texts.length; i++)
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      if (!inter(a, b)) continue;
      const lo = a.layer <= b.layer ? a : b, hi = lo === a ? b : a;
      // fine if the upper one sits on a panel that covers the lower one
      if (hi.layer > lo.layer && panels.some((p) => p.layer === hi.layer && inter(p, lo) && contains(p, hi))) continue;
      issues.push(`clash: "${a.s}" and "${b.s}" at ${a.x},${a.y}`);
    }
  // non-modal panels (HUD, bar, side panels, feed: layers 1-3) must not sit on each other
  const flat = panels.filter((p) => p.kind === 'panel' && p.layer >= 1 && p.layer <= 3);
  for (let i = 0; i < flat.length; i++)
    for (let j = i + 1; j < flat.length; j++)
      if (flat[i].layer !== flat[j].layer && inter(flat[i], flat[j])) issues.push(`panels overlap: layer ${flat[i].layer} at ${flat[i].x},${flat[i].y} and layer ${flat[j].layer} at ${flat[j].x},${flat[j].y}`);
  for (const t of texts) {
    if (t.x < 0 || t.y < 0 || t.x + t.w > uw || t.y + t.h > uh) issues.push(`off screen: "${t.s}" at ${t.x},${t.y} (w ${t.w})`);
    const home = panels.filter((p) => p.layer === t.layer && t.x >= p.x && t.y >= p.y && t.x < p.x + p.w && t.y < p.y + p.h).sort((a, b) => a.w * a.h - b.w * b.h)[0];
    if (home && (t.x + t.w > home.x + home.w || t.y + t.h > home.y + home.h)) issues.push(`spills out of its panel: "${t.s}" at ${t.x},${t.y}`);
  }
  return issues;
}

const only = process.argv[2]?.split(',');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const lines = ['# Screens report', ''];
let total = 0;
const errors = [];
for (const [w, h] of sizes) {
  for (const [name, fn] of Object.entries(STATES)) {
    if (only && !only.includes(name)) continue;
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', (e) => errors.push(`${name} ${w}x${h}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name} ${w}x${h}: ${m.text()}`); });
    await page.goto(base);
    await page.waitForFunction(() => window.__app && window.__app.screen === 'title', null, { timeout: 15000 });
    await page.mouse.move(w * 0.42, h * 0.6);
    await fn(page, w, h);
    await page.waitForTimeout(300);
    const file = `${out}/${name}-${w}x${h}.png`;
    await page.screenshot({ path: file });
    const { recs, uw, uh } = await page.evaluate(() => ({ recs: window.__app.ui.lastRecs, uw: window.__app.ui.w, uh: window.__app.ui.h }));
    const issues = audit(recs, uw, uh);
    total += issues.length;
    lines.push(`## ${name} ${w}x${h} (ui ${uw}x${uh}): ${issues.length ? issues.length + ' issue(s)' : 'clean'}`);
    for (const i of issues) lines.push(`- ${i}`);
    await page.close();
  }
}
await browser.close();
if (errors.length) lines.push('', '## Errors', ...errors.map((e) => `- ${e}`));
fs.writeFileSync(`${out}/report.md`, lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\n${total} layout issue(s), ${errors.length} error(s). Report: ${out}/report.md`);
if (errors.length) process.exitCode = 1;
