// Tier 3 (DESIGN.md §4.2): what the third tier is worth to the bot plan on each map, the main line
// and the other way. The reference plans stop at tier 2 (DECISIONS.md), so this is the ceiling a
// player who researches tier 3 can reach. Usage: npx vite-node design/tier3check.mts
import { Game } from '../src/sim/Game';
import { Bot, planFor, playRun, type BotPlan } from '../src/app/bot';
import { MAPS } from '../src/data/map';

const T3 = ['lamp3', 'flood3', 'star3', 'brazier3', 'search3', 'beacon3'];
for (const map of MAPS) {
  const base = planFor(map.id);
  const runs: [string, BotPlan][] = [
    ['tier 2', base],
    ['tier 3', { ...base, research: [...base.research, ...T3] }],
    ['human t2', { ...base, human: true }],
    ['human t3', { ...base, human: true, research: [...base.research, ...T3] }],
  ];
  for (const [name, plan] of runs) {
    const g = playRun(new Game({ map }), new Bot(plan));
    const t3 = [...g.buildings.values()].filter((b) => b.level >= 3).length;
    console.log(`${map.id.padEnd(10)} ${name.padEnd(9)} ${g.over} w${g.wave} lights ${String(g.lights).padStart(2)} brown ${Math.round(g.stats.brownoutSeconds)} s, tier-3 towers ${t3}, left ${g.money}`);
  }
}
