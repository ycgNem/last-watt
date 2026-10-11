// Enemies walk the path (slowed by Beacons), Shades knock out Nodes beside it, leaks cost lights.
import { DT, type Game } from '../Game';
import { pointRectDist } from '../geom';

export function enemiesSystem(g: Game) {
  const len = g.path.length;
  let removed = false;
  for (const e of g.enemies) {
    const speed = e.def.speed * (1 - e.slow);
    e.dist += speed * DT;
    const p = g.path.at(e.dist);
    if (p.dx !== 0) e.face = p.dx;
    e.x = p.x;
    e.y = p.y;
    if (e.def.knockRadius) {
      for (const b of g.buildings.values()) {
        if (b.def.role !== 'node') continue;
        if (pointRectDist(e.x, e.y, g.rect(b)) <= e.def.knockRadius) {
          if (b.offline <= 0) {
            g.netDirty = true;
            g.stats.knocks++;
            if (g.stats.firstKnock < 0) g.stats.firstKnock = g.tick;
            g.emit({ t: 'knock', id: b.id, x: b.x + 0.5, y: b.y + 0.5 });
          }
          b.offline = e.def.knockTime ?? 0;
        }
      }
    }
    if (e.dist >= len) {
      e.hp = -Infinity;
      removed = true;
      g.lights = Math.max(0, g.lights - e.def.leak);
      g.stats.leaks++;
      g.stats.leaksByWave[e.wave] = (g.stats.leaksByWave[e.wave] ?? 0) + 1;
      g.stats.lightsLostBy[e.def.id] = (g.stats.lightsLostBy[e.def.id] ?? 0) + e.def.leak;
      g.emit({ t: 'leak', x: e.x, y: e.y, lights: e.def.leak, enemy: e.def.id });
    }
  }
  if (removed) g.enemies = g.enemies.filter((e) => e.hp !== -Infinity);
}
