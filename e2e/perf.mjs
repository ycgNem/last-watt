// Milestone 11's load check, browser side: the dense base of design/perf.mts plus about 500
// enemies, played for a few seconds; frame times from requestAnimationFrame. Writes e2e/out/perf.png.
// Usage: node e2e/perf.mjs   (BASE=http://127.0.0.1:5173/ by default)
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.BASE ?? 'http://127.0.0.1:5173/';
fs.mkdirSync('e2e/out', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(base);
await page.waitForFunction(() => window.__app?.screen === 'title');
const setup = await page.evaluate(() => {
  const p = window.__app.newGame();
  const g = p.game;
  for (const r of ['searchlight', 'brazier', 'starshell', 'pulse']) g.research.done.add(r);
  const kinds = ['lamp', 'floodlight', 'brazier', 'starshell', 'searchlight', 'beacon'];
  let k = 0;
  for (let y = 0; y < g.map.h - 1; y += 2)
    for (let x = 0; x < g.map.w - 1; x += 2) {
      const id = (x + y) % 10 === 0 ? 'node' : kinds[k++ % kinds.length];
      try { window.__place(g, id, x, y); } catch { /* road or taken */ }
    }
  for (let x = 1; x < g.map.w; x += 3) for (let y = 1; y < g.map.h; y += 3) try { window.__place(g, 'jar', x, y); } catch { /* taken */ }
  // 500 slow, unkillable enemies spread along the road (the load, not a fight)
  const E = window.__enemies, path = g.paths[0];
  for (let i = 0; i < 500; i++) {
    const def = E[['moth', 'shade', 'flit', 'veil', 'pall'][i % 5]];
    const d = (i / 500) * path.length, q = path.at(d);
    g.enemies.push({ id: g.nextId++, def: { ...def, speed: def.speed * 0.05 }, hp: 1e9, dist: d, x: q.x, y: q.y, slow: 0, face: 1, hit: 0, wave: 1, seen: false, route: 0 });
  }
  g.wave = 1;
  p.speed = 1;
  window.__app.r.cam.z = 2;
  return { buildings: g.buildings.size };
});
// let the waves pour in, then measure
await page.waitForTimeout(6000);
const frames = await page.evaluate(() => new Promise((done) => {
  const ts = [];
  let last = performance.now();
  const step = (t) => {
    ts.push(t - last);
    last = t;
    if (ts.length < 180) requestAnimationFrame(step);
    else done(ts.slice(5));
  };
  requestAnimationFrame(step);
}));
const enemies = await page.evaluate(() => window.__game.enemies.length);
frames.sort((a, b) => a - b);
const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
await page.screenshot({ path: 'e2e/out/perf.png' });
await browser.close();
console.log(`${setup.buildings} buildings, ${enemies} enemies at 1920x1080: frame avg ${avg.toFixed(1)} ms (${(1000 / avg).toFixed(0)} fps), p95 ${frames[Math.floor(frames.length * 0.95)].toFixed(1)} ms`);
