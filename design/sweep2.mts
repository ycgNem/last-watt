// Spacing trial over the headroom sweep. Usage: npx vite-node design/sweep2.mts "s1,...,s12" [h1,h2,...]
import { Game } from '../src/sim/Game';
import { Bot, BOT_PLAN, playRun } from '../src/app/bot';
import { WAVES } from '../src/data/waves';
const sp = process.argv[2];
if (sp) sp.split(',').forEach((v, i) => { if (v) WAVES[i].spacing = +v; });
const hs = (process.argv[3] ?? '1.2,1.4,1.7,2,2.5').split(',').map(Number);
for (const h of hs) {
  const bot = new Bot({ ...BOT_PLAN, headroom: h });
  const g = playRun(new Game(), bot);
  const s = g.stats;
  const leaks = Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ');
  console.log(`h ${h.toFixed(1)} ${g.over} w${g.wave} lights ${String(g.lights).padStart(2)} | leaks ${leaks} | brown ${s.brownoutSeconds.toFixed(0)}s oc ${s.overcharges} | left ${g.money}`);
}
