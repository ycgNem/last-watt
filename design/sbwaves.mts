// The Switchback with extra spawns appended to some waves (argument "8:P,10:PP") and a pace.
import { Game } from '../src/sim/Game';
import { Bot, SWITCHBACK_PLAN, playRun } from '../src/app/bot';
import { SWITCHBACK } from '../src/data/map';
import { WAVES } from '../src/data/waves';
const waves: Record<number, string> = {};
for (const part of (process.argv[2] ?? '').split(',').filter(Boolean)) {
  const [n, add] = part.split(':');
  const base = WAVES[+n - 1].seq;
  // "h" appends the first half of the wave again
  waves[+n] = base + add.replace('h', base.slice(0, Math.floor(base.length / 2)));
}
SWITCHBACK.waves = waves;
if (process.argv[3]) SWITCHBACK.pace = +process.argv[3];
for (const [name, plan] of [['verbs', SWITCHBACK_PLAN], ['human', { ...SWITCHBACK_PLAN, human: true }], ['noverbs', { ...SWITCHBACK_PLAN, noVerbs: true }]] as const) {
  const g = playRun(new Game({ map: SWITCHBACK }), new Bot(plan as any));
  const s = g.stats;
  console.log(`${name.padEnd(7)} ${g.over} w${g.wave} lights ${g.lights} leaks ${Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ')} oc ${s.overcharges} lost ${JSON.stringify(s.lightsLostBy)} left ${g.money}`);
}
