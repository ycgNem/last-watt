// Per-wave trace of one bot run: generation, peak draw, actual demand, brownout, Jar use, leaks.
// Usage: npx vite-node design/probe.mts [headroom]
import { Game } from '../src/sim/Game';
import { Bot, BOT_PLAN } from '../src/app/bot';
const hr = +(process.argv[2] ?? BOT_PLAN.headroom);
const bot = new Bot({ ...BOT_PLAN, headroom: hr });
const g = new Game();
let wave = 0, maxDem = 0, sumSat = 0, n = 0, dis = 0, brown = 0, oc0 = 0, minSat = 1;
for (let t = 0; t < 1800 * 60 && !g.over; t++) {
  if (t % 6 === 0) bot.act(g);
  g.step();
  g.drainEvents();
  if (g.enemies.length) {
    maxDem = Math.max(maxDem, g.grid.demand);
    sumSat += g.grid.wall.sat; n++;
    minSat = Math.min(minSat, g.grid.wall.sat);
    dis += Math.max(0, g.grid.supply - g.grid.gen) / 60;
  }
  if (g.brownout) brown += 1 / 60;
  const done = g.wave > 0 && g.wavePaid.has(g.wave);
  if (done && wave < g.wave) {
    wave = g.wave;
    console.log(`w${String(wave).padStart(2)} gen ${bot.generation(g).toFixed(0).padStart(3)} peak ${bot.fullDraw(g).toFixed(0).padStart(3)} maxDemand ${maxDem.toFixed(0).padStart(3)} avgWallSat ${(sumSat / Math.max(1, n)).toFixed(2)} minSat ${minSat.toFixed(2)} jarKJ ${dis.toFixed(0).padStart(4)} brown ${brown.toFixed(0).padStart(3)}s oc ${g.stats.overcharges - oc0} leaks ${g.stats.leaksByWave[wave] ?? 0} lights ${g.lights} money ${g.money}`);
    maxDem = 0; sumSat = 0; n = 0; dis = 0; brown = 0; oc0 = g.stats.overcharges; minSat = 1;
  }
}
console.log(`${g.over} lights ${g.lights}`);
