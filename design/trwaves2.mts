// Two Roads with Shades swapped out (each S becomes the given string) from wave 3 on, and the map's
// early overrides kept: reference, human, no verbs.
import { Game } from '../src/sim/Game';
import { Bot, TWO_ROADS_PLAN, playRun } from '../src/app/bot';
import { TWO_ROADS } from '../src/data/map';
import { WAVES } from '../src/data/waves';
const sub = process.argv[2] ?? 'MM';
const early = JSON.parse(process.argv[3] ?? '{}');
const waves: Record<number, string> = {};
for (let n = 3; n <= 12; n++) waves[n] = (early[n] ?? TWO_ROADS.waves?.[n] ?? WAVES[n - 1].seq).replace(/S/g, sub);
TWO_ROADS.waves = waves;
if (process.argv[4]) TWO_ROADS.pace = +process.argv[4];
for (const [name, plan] of [['verbs', TWO_ROADS_PLAN], ['human', { ...TWO_ROADS_PLAN, human: true }], ['noverbs', { ...TWO_ROADS_PLAN, noVerbs: true }]] as const) {
  const g = playRun(new Game({ map: TWO_ROADS }), new Bot(plan as any));
  const s = g.stats;
  console.log(`${sub} ${name.padEnd(7)} ${g.over} w${g.wave} lights ${g.lights} leaks ${Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ')} oc ${s.overcharges} lost ${JSON.stringify(s.lightsLostBy)} left ${g.money}`);
}
