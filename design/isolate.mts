// Which rule change moves the result: run the station plan with each change undone in turn.
// Usage: npx vite-node design/isolate.mts
import { Game } from '../src/sim/Game';
import { Bot, BOT_PLAN, playRun } from '../src/app/bot';
import { ENEMIES } from '../src/data/enemies';
import { WAVES } from '../src/data/waves';
import { SLICE_MAP } from '../src/data/map';
import { RULES } from '../src/data/rules';

const base = { shade: [ENEMIES.shade.knockRadius, ENEMIES.shade.knockTime], w3: WAVES[2].seq, spawn: SLICE_MAP.spawnAt, shadow: RULES.windShadow.v };
function reset() {
  ENEMIES.shade.knockRadius = base.shade[0]; ENEMIES.shade.knockTime = base.shade[1];
  WAVES[2].seq = base.w3; SLICE_MAP.spawnAt = base.spawn; RULES.windShadow.v = base.shadow;
}
function go(name: string, f: () => void) {
  reset();
  f();
  const g = playRun(new Game(), new Bot(BOT_PLAN));
  const s = g.stats;
  console.log(`${name.padEnd(16)} ${g.over} w${g.wave} lights ${g.lights} leaks ${Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ')} knocks ${s.knocks} brown ${s.brownoutSeconds.toFixed(0)} oc ${s.overcharges} lost ${JSON.stringify(s.lightsLostBy)}`);
}
go('all new', () => {});
go('shade 2.5/10', () => { ENEMIES.shade.knockRadius = 2.5; ENEMIES.shade.knockTime = 10; });
go('shade 3.5/6', () => { ENEMIES.shade.knockRadius = 3.5; });
go('old wave 3', () => { WAVES[2].seq = 'MMMSMMMMSMMM'; });
go('spawn 0', () => { SLICE_MAP.spawnAt = 0; });
go('no shadow', () => { RULES.windShadow.v = 0; });
go('all old but jars', () => { ENEMIES.shade.knockRadius = 2.5; ENEMIES.shade.knockTime = 10; WAVES[2].seq = 'MMMSMMMMSMMM'; SLICE_MAP.spawnAt = 0; RULES.windShadow.v = 0; });
go('3.5/6 node 21,11', () => {
  ENEMIES.shade.knockRadius = 3.5;
  BOT_PLAN.opening = BOT_PLAN.opening.map((s) => (s.b === 'node' && s.x === 21 && s.y === 10 ? { ...s, y: 11 } : s));
});
