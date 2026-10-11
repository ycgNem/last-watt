// Two Roads with its own early waves (argument: JSON of wave -> sequence): reference, human, no verbs.
import { Game } from '../src/sim/Game';
import { Bot, TWO_ROADS_PLAN, playRun } from '../src/app/bot';
import { TWO_ROADS } from '../src/data/map';
if (process.argv[2]) TWO_ROADS.waves = { ...TWO_ROADS.waves, ...JSON.parse(process.argv[2]) };
if (process.argv[3]) TWO_ROADS.pace = +process.argv[3];
for (const [name, plan] of [['verbs', TWO_ROADS_PLAN], ['human', { ...TWO_ROADS_PLAN, human: true }], ['noverbs', { ...TWO_ROADS_PLAN, noVerbs: true }]] as const) {
  const g = playRun(new Game({ map: TWO_ROADS }), new Bot(plan as any));
  const s = g.stats;
  console.log(`${name.padEnd(7)} ${g.over} w${g.wave} lights ${g.lights} leaks ${Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ')} oc ${s.overcharges} lost ${JSON.stringify(s.lightsLostBy)} left ${g.money}`);
}
