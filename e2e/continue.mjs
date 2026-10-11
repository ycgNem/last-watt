// Save mid-run, end to end: play a little through the UI's command path, reload the page, press
// CONTINUE, and check the rebuilt run is the one that was saved. Writes e2e/out/continue-*.png.
// Usage: node e2e/continue.mjs   (BASE=http://127.0.0.1:5173/ by default)
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.BASE ?? 'http://127.0.0.1:5173/';
fs.mkdirSync('e2e/out', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(base);
await page.waitForFunction(() => window.__app?.screen === 'title');
await page.evaluate(() => {
  const p = window.__app.newGame();
  for (const c of [
    { k: 'place', id: 'extractor', x: 16, y: 19 }, { k: 'place', id: 'burner', x: 16, y: 20 },
    { k: 'place', id: 'node', x: 21, y: 10 }, { k: 'place', id: 'lamp', x: 24, y: 7 }, { k: 'place', id: 'lamp', x: 24, y: 13 },
    { k: 'wave' },
  ]) p.cmd(c);
  p.speed = 3;
});
await page.waitForTimeout(7000);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lastwatt.run') ?? 'null'));
if (!saved) throw new Error('nothing was saved');
const live = await page.evaluate(() => ({ tick: window.__game.tick, wave: window.__game.wave, buildings: window.__game.buildings.size }));
console.log(`saved at tick ${saved.tick} (wave ${saved.wave}, ${saved.log.length} commands); live game at tick ${live.tick}`);
await page.reload();
await page.waitForFunction(() => window.__app?.screen === 'title');
await page.mouse.move(4, 4);
await page.waitForTimeout(300);
await page.screenshot({ path: 'e2e/out/continue-title.png' });
const hasSave = await page.evaluate(() => !!window.__app.saved);
if (!hasSave) throw new Error('the title found no saved run');
await page.keyboard.press('KeyC');
await page.waitForFunction(() => window.__app?.screen === 'play');
const back = await page.evaluate(() => ({ tick: window.__game.tick, wave: window.__game.wave, buildings: window.__game.buildings.size, paused: window.__app.play.paused, log: window.__game.log.length }));
console.log(`continued: tick ${back.tick}, wave ${back.wave}, ${back.buildings} buildings, paused ${back.paused}, ${back.log} commands`);
await page.waitForTimeout(300);
await page.screenshot({ path: 'e2e/out/continue-play.png' });
await browser.close();
if (back.tick !== saved.tick || back.wave !== saved.wave || back.log !== saved.log.length || !back.paused) throw new Error('the continued run is not the saved one');
if (errors.length) throw new Error(errors.join('\n'));
console.log('CONTINUE OK');
