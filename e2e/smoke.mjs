// Smoke test with real input: title → PLAY → build the wave-1 opening with keys and clicks → start
// wave 1 → run it at speed → check the state and that nothing threw. Usage: node e2e/smoke.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.BASE ?? 'http://127.0.0.1:5173/';
fs.mkdirSync('e2e/out', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(base);
await page.waitForFunction(() => window.__app && window.__app.screen === 'title', null, { timeout: 15000 });
// PLAY button
const begin = await page.evaluate(() => { const ui = window.__app.ui; return { x: (ui.w / 2 + 68) * ui.scale, y: (Math.round(ui.h * 0.58) + 9) * ui.scale }; });
await page.mouse.click(begin.x, begin.y);
await page.waitForFunction(() => window.__app.screen === 'play');
const tileXY = (tx, ty) => page.evaluate(([x, y]) => { const r = window.__app.r; return { x: r.sx(x * 16), y: r.sy(y * 16) }; }, [tx, ty]);
const build = async (key, tx, ty) => {
  await page.keyboard.press(key);
  const p = await tileXY(tx, ty);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(60);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(60);
};
await build('Digit8', 16.5, 19.5); // Extractor on the deposit
await build('Digit9', 17, 21); // Burner touching it (2x2 centred on the mouse)
await build('Digit7', 23.5, 10.5); // Node
await build('Digit1', 25, 8); // Lamp inside bend A
await build('Digit1', 25, 14); // Lamp inside bend B
const before = await page.evaluate(() => { const g = window.__app.play.game; return { money: g.money, n: g.buildings.size, ids: [...g.buildings.values()].map((b) => `${b.def.id}@${b.x},${b.y}`) }; });
console.log('built:', JSON.stringify(before));
// select the bend-B Lamp, shed it and restore it with X
const lamp = await tileXY(25, 14);
await page.mouse.click(lamp.x, lamp.y);
await page.waitForTimeout(100);
await page.keyboard.press('KeyX');
await page.waitForTimeout(100);
const shed = await page.evaluate(() => window.__app.play.selected?.off);
await page.keyboard.press('KeyX');
await page.waitForTimeout(100);
await page.keyboard.press('Space');
await page.keyboard.press('KeyF');
await page.keyboard.press('KeyF');
await page.waitForTimeout(12000);
const after = await page.evaluate(() => { const g = window.__app.play.game; return { wave: g.wave, money: g.money, lights: g.lights, kills: g.stats.kills, leaks: g.stats.leaks, t: Math.round(g.time) }; });
console.log('after wave 1 (12 s real at x3):', JSON.stringify(after), 'shed toggled:', shed);
await page.screenshot({ path: 'e2e/out/smoke.png' });
await browser.close();
const ok = before.money === 0 && before.n === 6 && shed === true && after.wave === 1 && errors.length === 0;
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
console.log(ok ? 'SMOKE OK' : 'SMOKE FAILED');
if (!ok) process.exitCode = 1;
