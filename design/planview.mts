// Play a map's bot plan and draw where everything ended up, with networks: one letter per kind
// (upper case on a network, lower case dark), road #, Hearth H, deposit *, empty tile with power
// reach '+', without '.'. Usage: npx vite-node design/planview.mts [mapId]
import { Game } from '../src/sim/Game';
import { Bot, planFor, playRun } from '../src/app/bot';
import { mapById } from '../src/data/map';
import { covers } from '../src/sim/geom';
const map = mapById(process.argv[2] ?? 'station');
const g = playRun(new Game({ map }), new Bot(planFor(map.id)));
const L: Record<string, string> = { lamp: 'L', floodlight: 'F', beacon: 'B', searchlight: 'S', brazier: 'Z', starshell: 'X', node: 'N', extractor: 'E', burner: 'U', vane: 'V', jar: 'J', lab: 'R', hearth: 'H' };
const grid: string[][] = Array.from({ length: map.h }, () => Array(map.w).fill(' '));
const dep = new Set(map.deposits.flat().map(([x, y]) => y * map.w + x));
const conductors = [...g.buildings.values()].filter((b) => b.def.role === 'node' || b.def.role === 'core');
for (let y = 0; y < map.h; y++)
  for (let x = 0; x < map.w; x++) {
    if (g.isPath(x, y)) grid[y][x] = '#';
    else if (dep.has(y * map.w + x)) grid[y][x] = '*';
    else grid[y][x] = conductors.some((c) => covers(g.rect(c), g.spec(c).nodeRadius ?? 0, { x, y, w: 1, h: 1 })) ? '+' : '.';
  }
for (const b of g.buildings.values()) {
  const ch = L[b.def.id] ?? '?';
  for (let dy = 0; dy < b.def.size; dy++) for (let dx = 0; dx < b.def.size; dx++) grid[b.y + dy][b.x + dx] = b.net >= 0 ? ch : ch.toLowerCase();
}
console.log(`${map.id}: ${g.over} at ${g.wave}, lights ${g.lights}, money left ${g.money}`);
console.log('   ' + Array.from({ length: map.w }, (_, x) => (x % 10).toString()).join(''));
grid.forEach((r, y) => console.log(String(y).padStart(2) + ' ' + r.join('')));
