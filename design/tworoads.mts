// Two Roads at a range of paces: the reference plan and the human profile.
// Usage: npx vite-node design/tworoads.mts "1.8,2.2,2.6"
import { Game } from '../src/sim/Game';
import { Bot, TWO_ROADS_PLAN, playRun } from '../src/app/bot';
import { TWO_ROADS } from '../src/data/map';
for (const pace of (process.argv[2] ?? '1.8,2.2,2.6').split(',').map(Number)) {
  TWO_ROADS.pace = pace;
  for (const [name, plan] of [['verbs', TWO_ROADS_PLAN], ['human', { ...TWO_ROADS_PLAN, human: true }], ['noverbs', { ...TWO_ROADS_PLAN, noVerbs: true }]] as const) {
    const g = playRun(new Game({ map: TWO_ROADS }), new Bot(plan as any));
    const s = g.stats;
    console.log(`pace ${pace} ${name.padEnd(7)} ${g.over} w${g.wave} lights ${g.lights} leaks ${Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ')} oc ${s.overcharges} lost ${JSON.stringify(s.lightsLostBy)} left ${g.money}`);
  }
}
