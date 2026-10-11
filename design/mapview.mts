// ASCII view of a map: road (#), Hearth (H), deposits (*), Shade reach of the road (.), Hearth reach (:).
// Usage: npx vite-node design/mapview.mts [mapId]
import { MAPS } from '../src/data/map';
import { Path, pointRectDist } from '../src/sim/geom';
const id = process.argv[2];
for (const m of MAPS.filter((x) => !id || x.id === id)) {
  const paths = m.paths.map((p) => new Path(m, p));
  const cells = new Set<number>();
  for (const p of paths) for (const c of p.cells) cells.add(c);
  const dep = new Set<number>();
  for (const d of m.deposits) for (const [x, y] of d) dep.add(y * m.w + x);
  const hr = { x: m.hearth.x, y: m.hearth.y, w: 4, h: 4 };
  console.log(`${m.name}: roads ${paths.map((p) => p.length.toFixed(1)).join(' + ')} tiles`);
  console.log('   ' + Array.from({ length: m.w }, (_, x) => (x % 10).toString()).join(''));
  for (let y = 0; y < m.h; y++) {
    let row = '';
    for (let x = 0; x < m.w; x++) {
      const k = y * m.w + x;
      const inH = x >= hr.x && x < hr.x + 4 && y >= hr.y && y < hr.y + 4;
      const reach = paths.some((p) => { for (let d = 0; d <= p.length; d += 0.25) { const q = p.at(d); if (pointRectDist(q.x, q.y, { x, y, w: 1, h: 1 }) <= 2.5) return true; } return false; });
      row += inH ? 'H' : cells.has(k) ? '#' : dep.has(k) ? '*' : reach ? '.' : pointRectDist(x + 0.5, y + 0.5, hr) <= 4 ? ':' : ' ';
    }
    console.log(String(y).padStart(2) + ' ' + row);
  }
}
