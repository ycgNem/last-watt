// The Flywheel against the Bank (the balance audit; DESIGN.md §3.2). A player chooses per Jar, so
// the fair test is the marginal one: the plan's own Jars stay Banks, and one more Jar (built from
// wave `w` beside the plan's first) goes to a Bank or to a Flywheel. Plan and human per map.
// Usage: npx vite-node design/flycheck.mts [maps] [wave]
import { Game } from '../src/sim/Game';
import { Bot, planFor, type BotPlan, type Spot } from '../src/app/bot';
import { BUILDINGS } from '../src/data/buildings';
import { mapById } from '../src/data/map';
import { place, upgrade } from '../src/sim/actions';

const fromWave = +(process.argv[3] ?? 6);

function spotFor(mapId: string, p: BotPlan): Spot {
  const g = new Game({ map: mapById(mapId) });
  const used = new Set<string>();
  for (const s of [...p.opening, ...p.wall, ...p.power.flat(), ...p.extras])
    for (let dx = 0; dx < BUILDINGS[s.b].size; dx++) for (let dy = 0; dy < BUILDINGS[s.b].size; dy++) used.add(`${s.x + dx},${s.y + dy}`);
  const j = p.extras.find((e) => e.b === 'jar') ?? p.extras[0];
  for (let r = 1; r < 8; r++)
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = j.x + dx, y = j.y + dy;
        if (!used.has(`${x},${y}`) && typeof place(g, 'jar', x, y, true) !== 'string') return { b: 'jar', x, y };
      }
  throw new Error('no spot');
}

function run(name: string, mapId: string, plan: BotPlan, extra: 'none' | 'bank' | 'fly') {
  const g = new Game({ map: mapById(mapId) });
  const bot = new Bot(plan);
  const spot = spotFor(mapId, plan);
  let low = 0, mine = -1;
  for (let t = 0; t < 1800 * 60 && !g.over; t++) {
    if (t % (plan.human ? 60 : 6) === 0) {
      if (extra !== 'none' && g.wave >= fromWave) {
        // placed and upgraded in one go, once its research is done (the bot, short of power,
        // upgrades any plain Jar it finds to a Bank)
        if (mine < 0 && g.money >= 135 && g.research.done.has(extra === 'fly' ? 'flywheel' : 'bank')) {
          const b = place(g, 'jar', spot.x, spot.y);
          if (typeof b !== 'string') mine = b.id;
        }
        const b = g.buildings.get(mine);
        if (b && b.level === 1 && g.research.done.has(extra === 'fly' ? 'flywheel' : 'bank') && g.money >= 75) upgrade(g, b, extra === 'fly' ? 1 : 0);
      }
      // the plan's own Jars to Banks, as the bot would (it is kept off the extra one)
      for (const b of g.buildings.values())
        if (b.def.id === 'jar' && b.id !== mine && b.level === 1 && g.research.done.has('bank') && g.money >= 75) upgrade(g, b, 0);
      bot.act(g);
    }
    g.step();
    g.drainEvents();
    if (g.enemies.length && g.grid.wall.demand > 0 && g.grid.wall.sat < 0.75) low += 1 / 60;
  }
  const s = g.stats;
  const jars = [...g.buildings.values()].filter((b) => b.def.role === 'storage').map((b) => (b.level > 1 ? (g.spec(b).spinDown ? 'F' : 'B') : 'J')).join('');
  const leaks = Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ');
  console.log(`${mapId.padEnd(10)} ${name.padEnd(6)} +${extra.padEnd(4)} ${String(g.over).padEnd(4)} w${g.wave} lights ${String(g.lights).padStart(2)} | jars ${jars.padEnd(5)} | leaks ${leaks} | <75% ${low.toFixed(0)} s brown ${s.brownoutSeconds.toFixed(0)} oc ${s.overcharges} left ${g.money}`);
}

for (const m of (process.argv[2] ?? 'station').split(',')) {
  const p = planFor(m);
  const both = { ...p, upgrades: p.upgrades.filter((u) => u !== 'jar'), research: [...p.research.slice(0, p.research.indexOf('bank') + 1), 'flywheel', ...p.research.slice(p.research.indexOf('bank') + 1)] };
  for (const [name, plan] of [['plan', both], ['human', { ...both, human: true }]] as const)
    for (const x of ['none', 'bank', 'fly'] as const) run(name, m, plan, x);
}
