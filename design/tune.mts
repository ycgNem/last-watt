// Sequential per-wave spacing tuner: for wave 2..8 in turn, the smallest spacing (0.05 s grid)
// at which the bot leaks at most `target` on that wave, earlier waves held at their tuned values.
// The slice's tuner, kept for the record (DESIGN.md §6 cites it): the station only, waves 2-8, its
// own bounty rule (health / 10 × the first argument). The late waves' spacings no longer bind
// (§6, the balance audit); `verbs.mts` is the tool for the twelve-wave run.
import { Game } from '../src/sim/Game';
import { Bot, BOT_PLAN, playRun } from '../src/app/bot';
import { WAVES } from '../src/data/waves';
import { ENEMIES } from '../src/data/enemies';
const bm = +(process.argv[2] ?? 2);
const target = +(process.argv[3] ?? 1);
for (const e of Object.values(ENEMIES)) e.bounty = Math.round((e.health / 10) * bm);
const run = () => { const bot = new Bot({ ...BOT_PLAN, headroom: 1.5 }); const g = playRun(new Game(), bot); return { g, bot }; };
for (let i = 1; i < 8; i++) {
  for (let j = i; j < 8; j++) WAVES[j].spacing = 4.0;
  let best = 4.0;
  for (let s = 4.0; s >= 0.3; s = +(s - 0.05).toFixed(2)) {
    WAVES[i].spacing = s;
    const { g } = run();
    const leaks = g.stats.leaksByWave[i + 1] ?? 0;
    const lostBefore = g.over === 'lose' && g.wave <= i + 1;
    if (leaks <= target && !lostBefore) best = s; else break;
  }
  WAVES[i].spacing = best;
  console.log(`wave ${i + 1}: spacing ${best}`);
}
const { g, bot } = run();
console.log(`final: ${g.over} lights ${g.lights} leaks ${g.stats.leaksByWave.slice(1).join(' ')} money ${g.stats.moneyEarned} wall ${bot.wallI} pow ${bot.powerI} oc ${g.stats.overcharges} t ${g.time.toFixed(0)}`);
console.log(WAVES.map((w) => w.spacing).join(', '));
