// Headroom sweep: how much generation (vs the wall's full-fire draw) the bot keeps, and what it costs.
// Usage: npx vite-node design/sweep.mts [h1,h2,...]
import { Game } from '../src/sim/Game';
import { Bot, BOT_PLAN, playRun } from '../src/app/bot';
const hs = (process.argv[2] ?? '1.2,1.4,1.7,2,2.5,3,4').split(',').map(Number);
for (const h of hs) {
  const bot = new Bot({ ...BOT_PLAN, headroom: h });
  const g = playRun(new Game(), bot);
  const s = g.stats;
  const leaks = Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ');
  console.log(`headroom ${h.toFixed(1)} ${g.over} w${g.wave} lights ${String(g.lights).padStart(2)} | leaks ${leaks} | power ${bot.powerI} wall ${bot.wallI} | brown ${s.brownoutSeconds.toFixed(0)}s oc ${s.overcharges} | left ${g.money}`);
}
