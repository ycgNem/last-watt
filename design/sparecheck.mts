// The fifth review's M7: is a Lab on Spare a choice or a trap? The reference plan and the human
// profile per map with every Lab on the Labs tier (3) or on Spare (4): lights, research done and
// when, the wall's seconds under 75% and the brownout, and kJ wasted.
// Usage: npx vite-node design/sparecheck.mts [maps]
import { Game } from '../src/sim/Game';
import { Bot, planFor, type BotPlan } from '../src/app/bot';
import { mapById } from '../src/data/map';
import { setTier } from '../src/sim/actions';

function run(name: string, mapId: string, plan: BotPlan, tier: number) {
  const g = new Game({ map: mapById(mapId) });
  const bot = new Bot(plan);
  let low = 0, labOn = 0;
  const doneAt: string[] = [];
  let done = 0;
  for (let t = 0; t < 1800 * 60 && !g.over; t++) {
    if (t % (plan.human ? 60 : 6) === 0) {
      bot.act(g);
      for (const b of g.buildings.values()) if (b.def.role === 'lab' && b.tier !== tier) setTier(g, b, tier);
    }
    g.step();
    g.drainEvents();
    if (g.enemies.length && g.grid.wall.demand > 0 && g.grid.wall.sat < 0.75) low += 1 / 60;
    for (const b of g.buildings.values()) if (b.def.role === 'lab' && b.demand > 0) labOn += (b.sat * 1) / 60;
    if (g.research.done.size > done) {
      done = g.research.done.size;
      doneAt.push(`w${g.wave}`);
    }
  }
  const s = g.stats;
  console.log(`${mapId.padEnd(10)} ${name.padEnd(6)} tier ${tier}: ${String(g.over).padEnd(4)} lights ${String(g.lights).padStart(2)} | research ${g.research.done.size} (${doneAt.join(' ')}) | lab-seconds ${labOn.toFixed(0)} | <75% ${low.toFixed(0)} s, brown ${s.brownoutSeconds.toFixed(0)} | wasted ${Math.round(s.wastedKj)} kJ`);
}

for (const m of (process.argv[2] ?? 'station').split(',')) {
  const p = planFor(m);
  for (const t of [3, 4]) run('plan', m, p, t);
  for (const t of [3, 4]) run('human', m, { ...p, human: true }, t);
}
