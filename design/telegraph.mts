// The fifth review's M6: does the NEXT strip's pressure (a wave's kJ/s over its span against the
// wall's kJ/s on the power it has, src/sim/pressure.ts) say which waves will leak? Per map and
// profile, at each wave's start: inflow, wall, the ratio, and then the leaks and lights it cost.
// Usage: npx vite-node design/telegraph.mts [maps]
import { Game } from '../src/sim/Game';
import { Bot, planFor, type BotPlan } from '../src/app/bot';
import { waveDef } from '../src/data/waves';
import { mapById } from '../src/data/map';
import { wavePressure, type Pressure } from '../src/sim/pressure';

function run(name: string, mapId: string, plan: BotPlan) {
  const g = new Game({ map: mapById(mapId) });
  const bot = new Bot(plan);
  const at: Pressure[] = [];
  const lightsAt: number[] = [];
  let seen = 0;
  for (let t = 0; t < 1800 * 60 && !g.over; t++) {
    if (t % (plan.human ? 60 : 6) === 0) bot.act(g);
    g.step();
    g.drainEvents();
    if (g.wave !== seen) {
      seen = g.wave;
      at[seen] = wavePressure(g, waveDef(seen, g.map)!);
      lightsAt[seen] = g.lights;
    }
  }
  lightsAt[seen + 1] = g.lights;
  console.log(`\n${mapId} ${name}: ${g.over} at wave ${g.wave}, ${g.lights} lights`);
  console.log('wave  kJ    span  in kJ/s  wall  full  ratio  leaks  lights lost');
  for (let n = 1; n <= seen; n++) {
    const p = at[n];
    const lost = (lightsAt[n] ?? 0) - (lightsAt[n + 1] ?? g.lights);
    console.log(`${String(n).padStart(4)} ${String(p.kj).padStart(5)} ${p.span.toFixed(1).padStart(5)} ${p.inflow.toFixed(1).padStart(8)} ${p.wall.toFixed(1).padStart(5)} ${p.wallFull.toFixed(1).padStart(5)} ${p.ratio.toFixed(2).padStart(6)} ${String(g.stats.leaksByWave[n] ?? 0).padStart(6)} ${String(lost).padStart(6)}`);
  }
}

for (const m of (process.argv[2] ?? 'station').split(',')) {
  const p = planFor(m);
  run('plan', m, p);
  run('human', m, { ...p, human: true });
  run('noverbs', m, { ...p, noVerbs: true });
}
