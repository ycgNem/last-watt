// Two Roads, wave by wave: what the plan has built, money, generation and leaks.
import { Game } from '../src/sim/Game';
import { Bot, TWO_ROADS_PLAN } from '../src/app/bot';
import { TWO_ROADS } from '../src/data/map';
const human = process.argv[2] === 'human';
const g = new Game({ map: TWO_ROADS });
const bot = new Bot({ ...TWO_ROADS_PLAN, human });
let w = -1;
for (let t = 0; t < 1800 * 60 && !g.over && g.wave <= 7; t++) {
  if (t % (human ? 60 : 6) === 0) bot.act(g);
  g.step();
  for (const e of g.drainEvents()) if (e.t === 'leak') console.log(`  leak ${e.enemy} at wave ${g.wave} t=${g.time.toFixed(0)}`);
  if (g.wave !== w) {
    w = g.wave;
    const kinds: Record<string, number> = {};
    for (const b of g.buildings.values()) kinds[b.def.id] = (kinds[b.def.id] ?? 0) + 1;
    console.log(`wave ${w} t=${g.time.toFixed(0)} money ${g.money} lights ${g.lights} gen ${g.grid.gen.toFixed(0)} research ${[...g.research.done].join(',')} built ${JSON.stringify(kinds)}`);
  }
}
console.log(bot.log.slice(0, 10).join('\n'));
