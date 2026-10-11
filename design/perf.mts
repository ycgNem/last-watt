// Milestone 11's load check, sim side: a dense base on the station and 500 enemies on the road;
// the average and worst g.step() time. Usage: npx vite-node design/perf.mts
import { Game } from '../src/sim/Game';
import { place } from '../src/sim/actions';
import { ENEMIES } from '../src/data/enemies';
const g = new Game();
for (const r of ['searchlight', 'brazier', 'starshell', 'pulse']) g.research.done.add(r);
const kinds = ['lamp', 'floodlight', 'brazier', 'starshell', 'searchlight', 'beacon'] as const;
let towers = 0, k = 0;
for (let y = 0; y < g.map.h - 1; y += 2)
  for (let x = 0; x < g.map.w - 1; x += 2) {
    const id = (x + y) % 10 === 0 ? 'node' : kinds[k++ % kinds.length];
    if (typeof place(g, id, x, y, true) !== 'string' && id !== 'node') towers++;
  }
for (let x = 1; x < g.map.w; x += 3) for (let y = 1; y < g.map.h; y += 3) place(g, 'jar', x, y, true);
const roadLen = g.paths[0].length;
for (let i = 0; i < 500; i++) {
  const def = ENEMIES[(['moth', 'shade', 'flit', 'veil', 'pall'] as const)[i % 5]];
  const d = (i / 500) * roadLen;
  const p = g.paths[0].at(d);
  g.enemies.push({ id: g.nextId++, def: { ...def, speed: def.speed * 0.05 }, hp: 1e9, dist: d, x: p.x, y: p.y, slow: 0, face: 1, hit: 0, wave: 1, seen: false, route: 0 });
}
const times: number[] = [];
for (let i = 0; i < 600; i++) {
  const t0 = performance.now();
  g.step();
  g.drainEvents();
  times.push(performance.now() - t0);
}
times.sort((a, b) => a - b);
const avg = times.reduce((a, b) => a + b, 0) / times.length;
console.log(`${towers} towers, ${g.buildings.size} buildings, ${g.enemies.length} enemies: step avg ${avg.toFixed(2)} ms, p95 ${times[Math.floor(times.length * 0.95)].toFixed(2)} ms, worst ${times[times.length - 1].toFixed(2)} ms (budget 16.7 ms a tick at 60 Hz)`);
