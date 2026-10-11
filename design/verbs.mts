// The third review's bar (DESIGN.md §6, §10 Q1): does deciding where the watts go mid-wave matter?
// Per map: the reference plan (verbs), the same plan with no verbs at all, the plan with one tower
// raised to tier 1 and no other verb, the human profile, and the plan with two extra Jars; per
// wave, seconds the wall spent under 75% while enemies were on the field.
// Usage: npx vite-node design/verbs.mts [maps] ["s1,...,s12"] ["n:SEQ,..."]
//   maps: station,switchback,tworoads (default station); spacings: blank keeps the current one;
//   "8:SEQ" replaces wave 8's sequence; "8:+D4" turns four of its Moths into Siphons.
import { Game } from '../src/sim/Game';
import { Bot, planFor, type BotPlan, type Spot } from '../src/app/bot';
import { BUILDINGS } from '../src/data/buildings';
import { place } from '../src/sim/actions';
import { WAVES } from '../src/data/waves';
import { ENEMY_BY_CODE } from '../src/data/enemies';
import { mapById } from '../src/data/map';

const sp = process.argv[3];
if (sp) sp.split(',').forEach((v, i) => { if (v) WAVES[i].spacing = +v; });
for (const part of (process.argv[4] ?? '').split(',').filter(Boolean)) {
  const [n, arg] = part.split(':');
  const w = WAVES[+n - 1];
  let seq = arg;
  // "+Dk": k Moths, evenly spaced through the wave, become Siphons
  if (arg.startsWith('+')) {
    const code = arg[1], k = +arg.slice(2);
    const ms = [...w.seq].map((c, i) => (c === 'M' ? i : -1)).filter((i) => i >= 0);
    const chars = [...w.seq];
    for (let j = 0; j < k && j < ms.length; j++) chars[ms[Math.floor(((j + 0.5) * ms.length) / k)]] = code;
    seq = chars.join('');
  }
  w.seq = seq;
  w.composition = {};
  for (const c of seq) w.composition[c] = (w.composition[c] ?? 0) + 1;
}

function run(name: string, mapId: string, plan: BotPlan) {
  const g = new Game({ map: mapById(mapId) });
  const bot = new Bot(plan);
  const low: number[] = [];
  for (let t = 0; t < 1800 * 60 && !g.over; t++) {
    if (t % (plan.human ? 60 : 6) === 0) bot.act(g);
    g.step();
    g.drainEvents();
    if (g.enemies.length && g.grid.wall.demand > 0 && g.grid.wall.sat < 0.75) low[g.wave] = (low[g.wave] ?? 0) + 1 / 60;
  }
  const s = g.stats;
  const leaks = Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ');
  const lows = Array.from({ length: 12 }, (_, i) => Math.round(low[i + 1] ?? 0)).join(' ');
  console.log(`${mapId.padEnd(10)} ${name.padEnd(9)} ${String(g.over).padEnd(4)} w${String(g.wave).padStart(2)} lights ${String(g.lights).padStart(2)} | leaks ${leaks} | <75% s ${lows} | brown ${s.brownoutSeconds.toFixed(0)} oc ${s.overcharges} knocks ${s.knocks} left ${g.money}`);
  return g;
}

for (const m of (process.argv[2] ?? 'station').split(',')) {
  const p = planFor(m);
  run('verbs', m, p);
  run('noverbs', m, { ...p, noVerbs: true });
  run('raise1', m, { ...p, noVerbs: true, raise: 1 });
  run('raise2', m, { ...p, noVerbs: true, raise: 2 });
  run('human', m, { ...p, human: true });
  run('+2jars', m, { ...p, extras: [...p.extras, ...twoJars(m, p)] });
}

/** two Jar spots near the plan's first Jar that no plan spot uses and that place on an empty map
 *  (the balance audit: the old "two tiles below" landed under plan buildings on three maps) */
function twoJars(mapId: string, p: BotPlan): Spot[] {
  const g = new Game({ map: mapById(mapId) });
  const used = new Set<string>();
  for (const s of [...p.opening, ...p.wall, ...p.power.flat(), ...p.extras])
    for (let dx = 0; dx < BUILDINGS[s.b].size; dx++) for (let dy = 0; dy < BUILDINGS[s.b].size; dy++) used.add(`${s.x + dx},${s.y + dy}`);
  const j = p.extras.find((e) => e.b === 'jar') ?? p.extras[0];
  const out: Spot[] = [];
  for (let r = 1; r < 8 && out.length < 2; r++)
    for (let dx = -r; dx <= r && out.length < 2; dx++)
      for (let dy = -r; dy <= r && out.length < 2; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = j.x + dx, y = j.y + dy;
        if (used.has(`${x},${y}`) || typeof place(g, 'jar', x, y, true) === 'string') continue;
        used.add(`${x},${y}`);
        out.push({ b: 'jar', x, y, wave: 3 });
      }
  return out;
}
const kj = WAVES.map((w) => [...w.seq].reduce((a, c) => a + ENEMY_BY_CODE[c].health, 0));
console.log(`wave kJ: ${kj.join(' ')}`);
