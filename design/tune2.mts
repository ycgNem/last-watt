// Wave tuning across every check that has to hold (DESIGN.md §6, §11): the station plan at the
// headroom sweep's points, the human profile, no Jars, and the other maps' plans.
// Usage: npx vite-node design/tune2.mts "s1,...,s12" ["n:CODES,..."]   (blank spacings keep the current one)
import { Game } from '../src/sim/Game';
import { Bot, BOT_PLAN, planFor, playRun, type BotPlan } from '../src/app/bot';
import { WAVES } from '../src/data/waves';
import { MAPS } from '../src/data/map';
const sp = process.argv[2];
if (sp) sp.split(',').forEach((v, i) => { if (v) WAVES[i].spacing = +v; });
// extra spawns appended per wave: "8:P,10:PN" adds a Pall to wave 8, a Pall and a Snuffer to wave 10
for (const part of (process.argv[3] ?? '').split(',').filter(Boolean)) {
  const [n, add] = part.split(':');
  WAVES[+n - 1].seq += add;
}
const run = (name: string, plan: BotPlan, map = MAPS[0]) => {
  const g = playRun(new Game({ map }), new Bot(plan));
  const s = g.stats;
  const leaks = Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ');
  console.log(`${name.padEnd(14)} ${g.over} w${String(g.wave).padStart(2)} lights ${String(g.lights).padStart(2)} | leaks ${leaks} | brown ${s.brownoutSeconds.toFixed(0)}s oc ${s.overcharges} | waste ${Math.round(s.wastedKj)} dmg ${Math.round(s.kjDelivered)}`);
};
for (const h of [1.2, 1.5, 1.8, 2.2, 3.0]) run(`station h${h}`, { ...BOT_PLAN, headroom: h });
run('station human', { ...BOT_PLAN, human: true });
run('station no jar', { ...BOT_PLAN, extras: BOT_PLAN.extras.filter((s) => s.b !== 'jar'), upgrades: BOT_PLAN.upgrades.filter((u) => u !== 'jar') });
for (const m of MAPS.slice(1)) run(m.id, planFor(m.id), m);
