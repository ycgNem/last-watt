// One bot run at the current data, with per-wave leaks: quick balance read between tuner runs.
// Usage: npx vite-node design/check.mts [mapId] [pace] [headroom]
import { Game } from '../src/sim/Game';
import { Bot, planFor, playRun } from '../src/app/bot';
import { mapById } from '../src/data/map';
const map = { ...mapById(process.argv[2] ?? 'station') };
if (process.argv[3]) map.pace = +process.argv[3];
const plan = planFor(map.id);
const bot = new Bot(process.argv[4] ? { ...plan, headroom: +process.argv[4] } : plan);
const g = playRun(new Game({ map }), bot);
const s = g.stats;
console.log(`${map.id} pace ${map.pace}: ${g.over} at wave ${g.wave}, lights ${g.lights}, leaks ${Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ')}, lost ${JSON.stringify(s.lightsLostBy)}`);
console.log(`oc ${s.overcharges}, knocks ${s.knocks}, snuffs ${s.snuffs}, money ${s.moneyEarned} (wave pay ${s.wavePay}), left ${g.money}, research ${[...g.research.done].join(',')}, wall ${bot.wallI} power ${bot.powerI} extras ${bot.extraI}, brownout ${s.brownoutSeconds.toFixed(0)} s, t ${g.time.toFixed(0)}`);
const kinds: Record<string, number> = {};
for (const b of g.buildings.values()) kinds[b.def.id + (b.level > 1 ? '2' : '')] = (kinds[b.def.id + (b.level > 1 ? '2' : '')] ?? 0) + 1;
console.log(JSON.stringify(kinds));
if (bot.log.length) console.log(bot.log.join('\n'));
