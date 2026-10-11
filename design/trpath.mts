// Two Roads with the crossing legs moved north (longer last legs): reference, human, no verbs.
import { Game } from '../src/sim/Game';
import { Bot, TWO_ROADS_PLAN, playRun } from '../src/app/bot';
import { TWO_ROADS } from '../src/data/map';
const y = +(process.argv[2] ?? 9.5);
TWO_ROADS.paths = [
  [[-1, 4.5], [7.5, 4.5], [7.5, y], [16.5, y], [16.5, 20.5], [16.9, 20.5]],
  [[41, 6.5], [30.5, 6.5], [30.5, y], [20.5, y], [20.5, 18.9]],
];
TWO_ROADS.deposits[1] = [[18, 4], [19, 4], [18, 5], [19, 5], [20, 5]];
for (const pace of (process.argv[3] ?? '1.8').split(',').map(Number)) {
  TWO_ROADS.pace = pace;
  for (const [name, plan] of [['verbs', TWO_ROADS_PLAN], ['human', { ...TWO_ROADS_PLAN, human: true }], ['noverbs', { ...TWO_ROADS_PLAN, noVerbs: true }]] as const) {
    const bot = new Bot(plan as any);
    const g = playRun(new Game({ map: TWO_ROADS }), bot);
    const s = g.stats;
    console.log(`y ${y} pace ${pace} ${name.padEnd(7)} ${g.over} w${g.wave} lights ${g.lights} leaks ${Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ')} oc ${s.overcharges} lost ${JSON.stringify(s.lightsLostBy)} left ${g.money} ${bot.log.length ? bot.log[0] : ''}`);
  }
}
