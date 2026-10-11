// One bot run at the current data, with per-wave leaks: quick balance read between tuner runs.
// Usage: npx vite-node design/check.mts [spacing,spacing,...]
import { Game } from '../src/sim/Game';
import { Bot, playRun } from '../src/app/bot';
import { WAVES } from '../src/data/waves';
const arg = process.argv[2];
if (arg) arg.split(',').forEach((v, i) => (WAVES[i].spacing = +v));
const bot = new Bot();
const g = playRun(new Game(), bot);
const s = g.stats;
console.log(`spacing ${WAVES.map((w) => w.spacing).join(', ')}`);
console.log(`${g.over} at wave ${g.wave}, lights ${g.lights}, leaks ${s.leaksByWave.slice(1).join(' ')}, lost ${JSON.stringify(s.lightsLostBy)}, oc ${s.overcharges}, knocks ${s.knocks}, money ${s.moneyEarned}, spent-to ${bot.wallI}/${bot.powerI}/${bot.extraI}, t ${g.time.toFixed(0)}`);
