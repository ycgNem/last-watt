// The bot on every map with no skills, each skill alone, and the whole tree: what a skill is worth.
// Usage: npx vite-node design/skillcheck.mts [mapId]
import { Game } from '../src/sim/Game';
import { Bot, planFor, playRun } from '../src/app/bot';
import { mapById } from '../src/data/map';
import { SKILL_ORDER } from '../src/data/skills';
const map = mapById(process.argv[2] ?? 'station');
const sets: [string, string[]][] = [['none', []], ...SKILL_ORDER.map((s): [string, string[]] => [s, [s]]), ['all', SKILL_ORDER]];
for (const [name, skills] of sets) {
  const bot = new Bot(planFor(map.id));
  const g = playRun(new Game({ map, skills }), bot);
  const s = g.stats;
  console.log(`${map.id} ${name.padEnd(12)} ${g.over} w${g.wave} lights ${String(g.lights).padStart(2)} | leaks ${Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ')} | brown ${s.brownoutSeconds.toFixed(0)}s${bot.log.length ? ' | ' + bot.log.length + ' skips' : ''}`);
}
