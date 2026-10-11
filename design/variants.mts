// The bot and its variants: the planned build, no research, no factory, calling early.
// Usage: npx vite-node design/variants.mts
import { Game } from '../src/sim/Game';
import { Bot, BOT_PLAN, playRun } from '../src/app/bot';
const variants: Record<string, () => Bot> = {
  planned: () => new Bot(),
  'no research': () => new Bot({ ...BOT_PLAN, extras: BOT_PLAN.extras.filter((s) => s.b !== 'lab') }),
  'no jars': () => new Bot({ ...BOT_PLAN, extras: BOT_PLAN.extras.filter((s) => s.b !== 'jar') }),
  'no factory': () => new Bot({ ...BOT_PLAN, opening: BOT_PLAN.opening.filter((s) => s.b !== 'extractor' && s.b !== 'burner'), power: [] }),
  'call early': () => new Bot(BOT_PLAN, true),
  'lean power (1.0)': () => new Bot({ ...BOT_PLAN, headroom: 1.0 }),
  'rich power (2.0)': () => new Bot({ ...BOT_PLAN, headroom: 2.0 }),
};
for (const seed of [1, 7]) for (const [name, mk] of Object.entries(variants)) {
  const bot = mk();
  const g = playRun(new Game({ seed }), bot);
  const s = g.stats;
  const leaks = Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ');
  console.log(`seed ${seed} ${name.padEnd(16)} ${g.over} w${g.wave} lights ${String(g.lights).padStart(2)} | leaks ${leaks} | oc ${s.overcharges} knocks ${s.knocks} snuffs ${s.snuffs} | earned ${s.moneyEarned} left ${g.money} | t ${g.time.toFixed(0)}`);
}
