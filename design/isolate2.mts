// From the old rules plus the Jar change, add each new rule alone (station plan).
import { Game } from '../src/sim/Game';
import { Bot, BOT_PLAN, playRun } from '../src/app/bot';
import { ENEMIES } from '../src/data/enemies';
import { WAVES } from '../src/data/waves';
import { SLICE_MAP } from '../src/data/map';
import { RULES } from '../src/data/rules';

const plan0 = BOT_PLAN.opening;
function old() {
  ENEMIES.shade.knockRadius = 2.5; ENEMIES.shade.knockTime = 10;
  WAVES[2].seq = 'MMMSMMMMSMMM'; SLICE_MAP.spawnAt = 0; RULES.windShadow.v = 0; BOT_PLAN.opening = plan0;
}
function go(name: string, f: () => void) {
  old();
  f();
  const g = playRun(new Game(), new Bot(BOT_PLAN));
  const s = g.stats;
  console.log(`${name.padEnd(16)} ${g.over} w${g.wave} lights ${g.lights} leaks ${Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ')} knocks ${s.knocks} brown ${s.brownoutSeconds.toFixed(0)} oc ${s.overcharges} lost ${JSON.stringify(s.lightsLostBy)}`);
}
const node = () => { BOT_PLAN.opening = plan0.map((s) => (s.b === 'node' && s.x === 21 && s.y === 10 ? { ...s, y: 11 } : s)); };
go('old+jars', () => {});
go('+spawn6', () => { SLICE_MAP.spawnAt = 6; });
go('+wave3', () => { WAVES[2].seq = 'MMMSMMFFFFMMSMMM'; });
go('+shadow', () => { RULES.windShadow.v = 0.4; });
go('+node 21,11', node);
go('+shade3.5/6+node', () => { ENEMIES.shade.knockRadius = 3.5; ENEMIES.shade.knockTime = 6; node(); });
go('+shade2.5/6', () => { ENEMIES.shade.knockTime = 6; });
