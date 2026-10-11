// Quick look at a few states while building (not part of the definition of done).
// Usage: node e2e/peek.mjs  → e2e/out/peek-*.png
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.env.BASE ?? 'http://127.0.0.1:5173/';
fs.mkdirSync('e2e/out', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
async function fresh(w = 1280, h = 720) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base);
  await page.waitForFunction(() => window.__app && window.__app.screen === 'title', null, { timeout: 15000 });
  await page.mouse.move(w * 0.9, h * 0.45);
  return page;
}
const scenes = {
  title: async (p) => {},
  tutorial: async (p) => p.evaluate(() => { const pl = window.__app.newGame(false, true); pl.tutorial.advance(); }),
  opening: async (p) => p.evaluate(() => window.__app.newGame()),
  wall: async (p) => p.evaluate(() => {
    const pl = window.__app.newGame();
    const g = pl.game;
    for (const r of ['searchlight', 'brazier', 'starshell', 'vane', 'flood2', 'bellows']) g.research.done.add(r);
    const put = (id, x, y) => window.__place(g, id, x, y);
    const ex = put('extractor', 16, 19); const bu = put('burner', 16, 20); bu.fuel = 5;
    put('extractor', 15, 19); const b2 = put('burner', 13, 18); b2.fuel = 5;
    put('extractor', 16, 10); const b3 = put('burner', 17, 10); b3.fuel = 5;
    put('node', 21, 10); put('lamp', 24, 7); put('floodlight', 24, 13); put('searchlight', 22, 7); put('brazier', 24, 16);
    put('starshell', 18, 8); put('vane', 22, 18); const j = put('jar', 21, 18); j.charge = 500; put('lab', 19, 18);
    put('beacon', 27, 9); put('node', 24, 11);
    g.research.active = 'lamp2';
    g.wave = 5;
    window.__next(g);
    for (let i = 0; i < 60 * 22; i++) { pl.tick(); if (i < 60 * 21) g.drainEvents(); }
    pl.msgs = [];
  }),
  board: async (p) => p.evaluate(() => { const pl = window.__app.newGame(); window.__place(pl.game, 'lab', 19, 18); pl.board = true; }),
};
for (const [name, fn] of Object.entries(scenes)) {
  for (const [w, h] of [[1280, 720], [1024, 640]]) {
    const page = await fresh(w, h);
    await fn(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `e2e/out/peek-${name}-${w}.png` });
    await page.close();
  }
}
await browser.close();
console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'no errors');
