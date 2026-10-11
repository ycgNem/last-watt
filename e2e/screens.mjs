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
  // after wave 2: the second Burner pair and a fourth Lamp (the fifth review's M5)
  tutorialmore: async (page) => page.evaluate(() => {
    const p = window.__app.newGame(false, true);
    const g = p.game;
    for (const [id, x, y] of [['lamp', 24, 13], ['extractor', 16, 18], ['burner', 16, 16], ['node', 21, 11], ['lamp', 24, 7], ['lamp', 22, 16]]) window.__place(g, id, x, y);
    g.wave = 2; g.wavePaid.add(1); g.wavePaid.add(2); g.waveTimer = 12; g.money = 125;
    while (p.tutorial.i < 10) p.tutorial.advance();
  }),
  tutorialbrazier: async (page) => page.evaluate(() => {
    const p = window.__app.newGame(false, true);
    const g = p.game;
    for (const [id, x, y] of [['lamp', 24, 13], ['extractor', 16, 18], ['burner', 16, 16], ['node', 21, 11], ['lamp', 24, 7], ['lamp', 22, 16], ['jar', 22, 19], ['extractor', 15, 19], ['burner', 13, 18], ['lamp', 24, 16], ['lab', 19, 18]]) window.__place(g, id, x, y);
    g.wave = 3; g.wavePaid.add(1); g.wavePaid.add(2); g.wavePaid.add(3); g.waveTimer = 12; g.money = 30;
    while (p.tutorial.i < 16) p.tutorial.advance();
  }),
  // the NEXT strip's telegraph, hovered, before wave 11 (the fifth review's M6)
  telegraph: async (page) => {
    await page.evaluate(() => {
      const p = window.__app.newGame();
      const g = p.game;
      window.__place(g, 'extractor', 16, 19); window.__place(g, 'burner', 16, 20).fuel = 5;
      window.__place(g, 'lamp', 24, 13); window.__place(g, 'node', 21, 10); window.__place(g, 'lamp', 24, 7); window.__place(g, 'floodlight', 22, 16);
      g.wave = 10;
      for (let n = 1; n <= 10; n++) { g.waveStarted.add(n); g.wavePaid.add(n); }
      g.waveTimer = 15;
    });
    await page.waitForTimeout(120);
    const at = await page.evaluate(() => { const a = window.__app; return { x: (a.play.stripLeft + 12) * a.ui.scale, y: 40 * a.ui.scale }; });
    await page.mouse.move(at.x, at.y);
  },
  board: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    window.__place(g, 'lab', 19, 18);
    g.research.done.add('brazier'); g.research.done.add('lamp2');
    g.research.active = 'starshell'; g.research.progress.starshell = 500;
    g.research.queue = ['lamp3', 'vane'];
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
  flywheel: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    g.research.done.add('bank'); g.research.done.add('flywheel');
    g.money = 300;
    const j = window.__place(g, 'jar', 22, 18);
    j.charge = 400;
    const f = window.__place(g, 'jar', 21, 18);
    window.__upgrade(g, f, 1);
    f.charge = 200;
    for (let i = 0; i < 3; i++) p.tick();
    p.selectedId = j.id;
    p.paused = true;
    p.msgs = [];
  }),
  flywheelsel: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    g.research.done.add('flywheel');
    const f = window.__place(g, 'jar', 21, 18);
    window.__upgrade(g, f, 1);
    f.charge = 250;
    for (let i = 0; i < 3; i++) p.tick();
    p.selectedId = f.id;
    p.paused = true;
    p.msgs = [];
  }),
  tier3: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    for (const r of ['lamp2', 'lamp3', 'flood2', 'flood3']) g.research.done.add(r);
    g.money = 400;
    window.__place(g, 'extractor', 16, 19); window.__place(g, 'burner', 16, 20).fuel = 5;
    window.__place(g, 'node', 21, 10);
    const a = window.__place(g, 'lamp', 24, 7);
    window.__upgrade(g, a);
    const l = window.__place(g, 'lamp', 24, 13);
    window.__upgrade(g, l); window.__upgrade(g, l, 1);
    const f = window.__place(g, 'floodlight', 10, 7);
    window.__upgrade(g, f); window.__upgrade(g, f, 1);
    g.money = 400;
    for (let i = 0; i < 3; i++) p.tick();
    p.selectedId = a.id;
    p.paused = true;
    p.msgs = [];
  }),
  menu: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    p.game.wave = 3;
    p.menu = true;
    p.msgs = [];
  }),
  siphon: async (page) => page.evaluate(() => {
    const p = window.__app.newGame();
    const g = p.game;
    window.__place(g, 'extractor', 16, 19); window.__place(g, 'burner', 16, 20).fuel = 5;
    window.__place(g, 'node', 21, 10);
    window.__place(g, 'lamp', 24, 7); window.__place(g, 'lamp', 24, 13);
    const E = window.__enemies, path = g.paths[0];
    for (const [k, d] of [['siphon', 30.5], ['moth', 26], ['siphon', 36]]) {
      const q = path.at(d);
      g.enemies.push({ id: g.nextId++, def: E[k], hp: E[k].health * 0.7, dist: d, x: q.x, y: q.y, slow: 0, face: 1, hit: 0, wave: 6, seen: false, route: 0 });
    }
    g.wave = 6;
    for (let i = 0; i < 4; i++) p.tick();
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
    a.pickMap(window.__maps.find((m) => m.id === 'tworoads'));
    const p = a.newGame();
    const g = p.game;
    window.__place(g, 'extractor', 18, 25); window.__place(g, 'burner', 16, 25).fuel = 5;
    window.__place(g, 'lamp', 16, 16); window.__place(g, 'lamp', 19, 16); window.__place(g, 'lamp', 16, 14); window.__place(g, 'lamp', 19, 14);
    g.research.done.add('starshell');
    window.__place(g, 'node', 13, 16); window.__place(g, 'node', 23, 16); window.__place(g, 'floodlight', 16, 12); window.__place(g, 'starshell', 13, 13);
    g.wave = 4;
    window.__next(g);
    for (let i = 0; i < 60 * 24; i++) { p.tick(); g.drainEvents(); }
    p.msgs = [];
  }),
};

// a bend of tier-2 Lamps past one Node asks 72 kW: the Node carries its 60 and says so (§3.3)
function nodeFull(select) {
  const a = window.__app;
  const p = a.newGame();
  const g = p.game;
  for (const [x, y] of [[16, 19], [15, 19]]) window.__place(g, 'extractor', x, y);
  for (const [x, y] of [[16, 20], [13, 18], [19, 18]]) window.__place(g, 'burner', x, y).fuel = 5;
  const node = window.__place(g, 'node', 21, 11);
  for (const [x, y] of [[24, 7], [22, 7], [20, 7], [18, 7]]) window.__place(g, 'lamp', x, y).level = 2;
  for (const d of [24, 22, 20, 18]) {
    const def = { ...window.__enemies.moth, speed: 0 };
    const q = g.paths[0].at(d);
    g.enemies.push({ id: g.nextId++, def, hp: 1e9, dist: d, x: q.x, y: q.y, slow: 0, face: 1, hit: 0, wave: 1, seen: true, route: 0 });
  }
  g.wave = 1;
  for (let i = 0; i < 60; i++) { p.tick(); g.drainEvents(); }
  p.msgs = [];
  if (select) p.selectedId = node.id;
}
STATES.nodefull = async (page) => page.evaluate(nodeFull, true);

// a Lamp on tier 4 (Spare) while a Jar charges: it gets the spill, and says so (§2.3)
STATES.spare = async (page) => page.evaluate(() => {
  const a = window.__app;
  const p = a.newGame();
  const g = p.game;
  window.__place(g, 'extractor', 16, 19); window.__place(g, 'burner', 16, 20).fuel = 5;
  window.__place(g, 'jar', 22, 18);
  const lamp = window.__place(g, 'lamp', 24, 13);
  window.__place(g, 'lamp', 22, 16);
  window.__place(g, 'lab', 19, 18).tier = 4;
  lamp.tier = 4;
  g.research.active = 'vane';
  for (const d of [36, 38]) {
    const def = { ...window.__enemies.moth, speed: 0 };
    const q = g.paths[0].at(d);
    g.enemies.push({ id: g.nextId++, def, hp: 1e9, dist: d, x: q.x, y: q.y, slow: 0, face: 1, hit: 0, wave: 1, seen: true, route: 0 });
  }
  g.wave = 1;
  for (let i = 0; i < 60 * 3; i++) { p.tick(); g.drainEvents(); }
  p.msgs = [];
  p.selectedId = lamp.id;
});
STATES.nodefulllines = async (page) => {
  await page.evaluate(nodeFull, false);
  await page.evaluate(() => { window.__app.play.lines = true; });
};

function forkGame(bait) {
  {
    const a = window.__app;
    a.profile.best.wave = 12;
    a.pickMap(window.__maps.find((m) => m.id === 'fork'));
    const p = a.newGame();
    const g = p.game;
    window.__place(g, 'extractor', 16, 25); window.__place(g, 'burner', 16, 23).fuel = 5;
    window.__place(g, 'lamp', 17, 17); window.__place(g, 'lamp', 20, 17);
    window.__place(g, 'node', 24, 20); window.__place(g, 'node', 14, 20);
    window.__place(g, 'lamp', 23, 16); window.__place(g, 'lamp', 25, 16); window.__place(g, 'lamp', 14, 16);
    g.wave = 2;
    window.__next(g);
    if (bait) window.__run(g, { k: 'bait', branch: 0 });
    for (let i = 0; i < 60 * 12; i++) { p.tick(); g.drainEvents(); }
    p.msgs = [];
    a.r.cam.x = 15 * 16; a.r.cam.y = 13 * 16;
  }
}
STATES.forkopening = async (page) => page.evaluate(() => {
  const a = window.__app;
  a.profile.best.wave = 12;
  a.pickMap(window.__maps.find((m) => m.id === 'fork'));
  a.newGame();
});
STATES.fork = async (page) => page.evaluate(forkGame, false);
STATES.forkbait = async (page) => page.evaluate(forkGame, true);

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
