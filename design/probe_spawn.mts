// When each research project lands, with enemies spawning at the edge or 6 tiles in.
import { Game } from '../src/sim/Game';
import { Bot, BOT_PLAN } from '../src/app/bot';
import { SLICE_MAP } from '../src/data/map';
for (const sp of [0, 6]) {
  SLICE_MAP.spawnAt = sp;
  const g = new Game();
  const bot = new Bot(BOT_PLAN);
  const at: string[] = [];
  let seen = 0;
  for (let t = 0; t < 1800 * 60 && !g.over; t++) {
    if (t % 6 === 0) bot.act(g);
    g.step();
    for (const e of g.drainEvents()) if (e.t === 'research') at.push(`${e.id}@w${g.wave}`);
    if (g.wave === 8 && !seen) { seen = 1; console.log(`spawn ${sp}: at wave 8 start t=${g.time.toFixed(0)} money ${g.money} buildings ${g.buildings.size} stored ${Math.round(g.grid.stored)}`); }
  }
  console.log(`spawn ${sp}: ${g.over} lights ${g.lights} t=${g.time.toFixed(0)} research ${at.join(' ')}`);
}
