// Screenshots of the moments that matter (CLAUDE.md): the title, the opening, the first
// brownout, the first Shade blackout, the first Overcharge, a full bot run and the win screen.
// Usage: node e2e/shots.mjs [scene,scene,...]   (BASE=http://127.0.0.1:5173/ by default)
import { chromium } from 'playwright';
import fs from 'node:fs';

const all = ['title', 'opening', 'placing', 'brownout', 'blackout', 'overcharge', 'midrun', 'win', 'lose', 'help'];
const scenes = (process.argv[2] ?? all.join(',')).split(',');
const base = process.env.BASE ?? 'http://127.0.0.1:5173/';
const out = 'e2e/out';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];

async function fresh(w = 1280, h = 720) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(base);
  await page.waitForFunction(() => window.__app && window.__app.screen === 'title', null, { timeout: 15000 });
  // park the mouse on empty ground at the right, so no hover tooltip covers the shot
  await page.mouse.move(w * 0.9, h * 0.45);
  return page;
}

/** run the sim n seconds synchronously (the bot acts if one is attached), then let a frame draw */
const run = (page, seconds, until) => page.evaluate(([s, u]) => {
  const p = window.__app.play;
  const stop = u ? new Function('g', `return ${u}`) : () => false;
  const n = s * 60;
  for (let i = 0; i < n && !p.game.over; i++) {
    p.tick();
    // drain all but the last second's events so effects don't pile up from a fast-forward
    if (i < n - 60) p.game.drainEvents();
    if (stop(p.game)) break;
  }
  // the fast-forward drained the events that would have replaced the opening messages: drop them,
  // so the feed shows only what the last second's events say on the next frame
  p.msgs = [];
}, [seconds, until ?? null]);

const shot = async (page, name) => {
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(`shot ${out}/${name}.png`);
};

const SCENES = {
  async title(page) { await shot(page, 'title'); },
  async opening(page) {
    await page.evaluate(() => window.__app.newGame());
    await shot(page, 'opening');
  },
  async placing(page) {
    await page.evaluate(() => {
      const p = window.__app.newGame();
      const g = p.game;
      const { place } = window.__actions ?? {};
      void place;
      p.buildId = 'lamp';
    });
    // hover the inside of bend B
    const pos = await page.evaluate(() => {
      const r = window.__app.r;
      return { x: r.sx(25 * 16) / (window.devicePixelRatio || 1), y: r.sy(14 * 16) / (window.devicePixelRatio || 1) };
    });
    await page.mouse.move(pos.x, pos.y);
    await shot(page, 'placing');
  },
  // layout B: four Lamps and no Burner, wave 1 in range → the whole wall dims
  async brownout(page) {
    await page.evaluate(() => {
      const p = window.__app.newGame();
      const g = p.game;
      const put = (id, x, y) => window.__place(g, id, x, y);
      put('node', 23, 10); put('lamp', 24, 7); put('lamp', 24, 13); put('lamp', 22, 7); put('lamp', 22, 16);
      window.__next(g);
    });
    await run(page, 40, 'g.brownout && g.enemies.filter(e => e.x > 21).length >= 3');
    await shot(page, 'first-brownout');
  },
  // a chain of Nodes beside the path; a Shade walks past and cuts it
  async blackout(page) {
    await page.evaluate(() => {
      const p = window.__app.newGame();
      const g = p.game;
      const put = (id, x, y) => window.__place(g, id, x, y);
      const ex = put('extractor', 16, 19); ex.tier = 1;
      const bu = put('burner', 16, 20); bu.fuel = 5;
      const ex2 = put('extractor', 15, 19); ex2.tier = 1;
      const bu2 = put('burner', 13, 18); bu2.fuel = 5;
      put('node', 17, 10); put('node', 14, 7); put('node', 10, 7);
      put('lamp', 12, 4); put('lamp', 7, 4); // (7,4) hangs off the Node at (10,7) alone
      put('lamp', 24, 7); put('node', 23, 10); put('lamp', 24, 13);
      g.wave = 2;
      window.__next(g);
    });
    await run(page, 60, 'g.stats.knocks > 0');
    await run(page, 0.6);
    await page.evaluate(() => { const r = window.__app.r; r.cam.x = 14 * 16; r.cam.y = 10 * 16; window.__app.play.msgs = window.__app.play.msgs.filter((m) => m.text.includes('Shade cut')); });
    await shot(page, 'first-shade-blackout');
  },
  // a Floodlight with a full Jar overcharges at the wave-5 Pall
  async overcharge(page) {
    await page.evaluate(() => {
      const p = window.__app.newGame();
      const g = p.game;
      const put = (id, x, y) => window.__place(g, id, x, y);
      put('extractor', 16, 19); put('burner', 16, 20); put('extractor', 15, 19); put('burner', 13, 18);
      put('node', 23, 10); put('lamp', 24, 7); put('lamp', 24, 13); put('floodlight', 24, 10); put('lamp', 22, 16);
      const j = put('jar', 22, 18); j.charge = 600;
      const j2 = put('jar', 23, 18); j2.charge = 600;
      g.wave = 4;
      window.__next(g);
    });
    await run(page, 90, 'g.enemies.some(e => e.def.id === "pall" && e.dist > 31)');
    await page.evaluate(() => {
      const g = window.__app.play.game;
      const fl = [...g.buildings.values()].find((b) => b.def.id === 'floodlight');
      window.__overcharge(g, fl);
    });
    await run(page, 0.5);
    await shot(page, 'first-overcharge');
  },
  async midrun(page) {
    await page.evaluate(() => window.__app.newGame(true));
    await run(page, 230);
    await shot(page, 'midrun-bot');
  },
  async win(page) {
    await page.evaluate(() => window.__app.newGame(true));
    await run(page, 900);
    await shot(page, 'win');
  },
  async lose(page) {
    await page.evaluate(() => {
      const p = window.__app.newGame();
      const g = p.game;
      window.__place(g, 'lamp', 24, 13);
      window.__next(g);
      g.lights = 2;
    });
    await run(page, 120);
    await shot(page, 'lose');
  },
  async help(page) {
    await page.evaluate(() => { const p = window.__app.newGame(); p.help = true; });
    await shot(page, 'help');
  },
};

for (const sc of scenes) {
  const page = await fresh();
  try {
    await SCENES[sc](page);
  } catch (e) {
    errors.push(`[${sc}] ${e.message}`);
  }
  await page.close();
}
await browser.close();
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'));
  process.exitCode = 1;
}
