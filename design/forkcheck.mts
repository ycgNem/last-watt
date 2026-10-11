// The Fork (DESIGN.md §11): who takes which branch in the bot's runs, wave by wave, and what the
// map does when the Loop is lit against when the Cut is (the plan with its Cut towers moved onto
// the Loop, and the other way). Usage: npx vite-node design/forkcheck.mts
import { Game } from '../src/sim/Game';
import { Bot, FORK_PLAN, type BotPlan } from '../src/app/bot';
import { THE_FORK } from '../src/data/map';

function play(name: string, plan: BotPlan) {
  const g = new Game({ map: THE_FORK });
  const bot = new Bot(plan);
  const took: Record<string, [number, number]> = {};
  for (let t = 0; t < 1800 * 60 && !g.over; t++) {
    if (t % (plan.human ? 60 : 6) === 0) bot.act(g);
    g.step();
    for (const e of g.drainEvents()) {
      if (e.t !== 'fork') continue;
      (took[e.enemy] ??= [0, 0])[e.branch]++;
    }
  }
  const by = Object.entries(took).map(([k, [l, c]]) => `${k} ${l}/${c}`).join('  ');
  console.log(`${name.padEnd(10)} ${g.over} w${g.wave} lights ${String(g.lights).padStart(2)} left ${g.money} | loop/cut: ${by}`);
}

play('plan', FORK_PLAN);
play('human', { ...FORK_PLAN, human: true });
play('noverbs', { ...FORK_PLAN, noVerbs: true });
// the Loop's last-leg towers left out: the Cut is the brighter way
play('cutlit', { ...FORK_PLAN, wall: FORK_PLAN.wall.filter((s) => !(s.y <= 17 && s.x >= 22)) });
