// Follow every Pall of a bot run: hp, place and which towers are on it, every 2 s.
// Usage: npx vite-node design/pallwatch.mts [mapId] [pace] [wave]
import { Game } from '../src/sim/Game';
import { Bot, planFor } from '../src/app/bot';
import { mapById } from '../src/data/map';
const map = { ...mapById(process.argv[2] ?? 'station') };
if (process.argv[3]) map.pace = +process.argv[3];
const only = +(process.argv[4] ?? 0);
const g = new Game({ map });
const bot = new Bot(planFor(map.id));
for (let t = 0; t < 1800 * 60 && !g.over; t++) {
  if (t % 6 === 0) bot.act(g);
  g.step();
  g.drainEvents();
  if (t % 120 === 0)
    for (const e of g.enemies)
      if (e.def.id === 'pall' && (!only || e.wave === only)) {
        const on = [...g.buildings.values()].filter((b) => b.target === e.id).map((b) => `${b.def.id}${b.level > 1 ? 2 : ''}@${b.x},${b.y} s${b.sat.toFixed(2)}`);
        console.log(`t ${g.time.toFixed(0)} w${e.wave} #${e.id} r${e.route} left ${g.left(e).toFixed(1)} hp ${e.hp.toFixed(0)} | ${on.join(' ')}`);
      }
}
console.log(g.over, g.wave, g.lights);
