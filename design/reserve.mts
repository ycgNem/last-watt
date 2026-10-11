// The sixth review's graded-pressure check (the critic's script): the human profile holding 0-300 money back
// from wave 3, lights at the end of each wave. A good curve loses them over several waves, not
// 20 to 0 in two.
import { Game } from '../src/sim/Game';
import { Bot, planFor } from '../src/app/bot';
import { mapById } from '../src/data/map';
for (const m of (process.argv[2] ?? 'station').split(',')) for (const reserve of [0, 100, 200, 300]) for (const lateFrom of [0]) {
  const g = new Game({ map: mapById(m) });
  const bot = new Bot({ ...planFor(m), human: true });
  const lw: number[] = [];
  let seen = 0, maxBank = 0;
  for (let t = 0; t < 1800 * 60 && !g.over; t++) {
    if (t % 60 === 0) { const keep = g.wave >= 3 ? Math.min(reserve, g.money) : 0; g.money -= keep; bot.act(g); g.money += keep; }
    g.step(); g.drainEvents();
    if (g.wave !== seen) { lw[seen] = g.lights; seen = g.wave; maxBank = Math.max(maxBank, g.money); }
  }
  lw[seen] = g.lights;
  console.log(`${m} reserve ${String(reserve).padStart(3)}: ${g.over} w${g.wave} lights by wave end: ${lw.slice(1).join(' ')}  brown ${Math.round(g.stats.brownoutSeconds)}s`);
}
