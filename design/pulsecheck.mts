// The bot with and without Pulse on every map: what the verb is worth.
// Usage: npx vite-node design/pulsecheck.mts
import { Game } from '../src/sim/Game';
import { Bot, planFor, playRun } from '../src/app/bot';
import { MAPS } from '../src/data/map';
for (const map of MAPS) {
  for (const withPulse of [false, true]) {
    const p = planFor(map.id);
    const research = withPulse ? [...p.research.slice(0, p.research.indexOf(process.argv[2] ?? 'bank') + 1), 'pulse', ...p.research.slice(p.research.indexOf(process.argv[2] ?? 'bank') + 1)] : p.research;
    const g = playRun(new Game({ map }), new Bot({ ...p, research }));
    const s = g.stats;
    console.log(`${map.id} ${withPulse ? 'pulse' : 'none '}: ${g.over} at ${g.wave}, lights ${g.lights}, pulses ${s.pulses}, oc ${s.overcharges}, leaks ${Array.from({ length: g.wave }, (_, i) => s.leaksByWave[i + 1] ?? 0).join(' ')}`);
  }
}
