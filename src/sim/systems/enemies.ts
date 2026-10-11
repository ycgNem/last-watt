// Enemies walk the path (slowed by Beacons), Shades knock out Nodes beside it, Snuffers put out
// Burners, leaks cost lights.
import { DT, type Game } from '../Game';
import { pointRectDist } from '../geom';
import { SKILL_RULES } from '../../data/skills';

export function enemiesSystem(g: Game) {
  let removed = false;
  // Slow Fuse (§9): a Node is cut only once a Shade has been in reach this long without a break
  const fuse = g.skills.has('slowFuse') ? SKILL_RULES.slowFuse.v : 0;
  const pressed = new Set<number>();
  for (const e of g.enemies) {
    const path = g.paths[e.route];
    const len = path.length;
    const speed = e.def.speed * (1 - e.slow);
    e.dist += speed * DT;
    const p = path.at(e.dist);
    if (p.dx !== 0) e.face = p.dx;
    e.x = p.x;
    e.y = p.y;
    if (e.def.knockRadius) {
      for (const b of g.buildings.values()) {
        if (b.def.role !== 'node') continue;
        if (pointRectDist(e.x, e.y, g.rect(b)) <= e.def.knockRadius) {
          if (!pressed.has(b.id)) {
            pressed.add(b.id);
            b.fuse += DT;
          }
          if (b.fuse < fuse) continue;
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
    if (e.def.snuffRadius) {
      for (const b of g.buildings.values()) {
        if (b.def.role !== 'generator' || b.def.fuel !== 'rock') continue;
        if (pointRectDist(e.x, e.y, g.rect(b)) <= e.def.snuffRadius) {
          if (b.snuffed <= 0) {
            g.stats.snuffs++;
            g.emit({ t: 'snuff', id: b.id, x: b.x + 1, y: b.y + 1 });
          }
          // the burning rock is lost; the Burner stays cold while the Snuffer is near and 8 s after
          b.burnLeft = 0;
          b.snuffed = (e.def.snuffTime ?? 0) * (g.skills.has('quickRelight') ? SKILL_RULES.quickRelight.v : 1);
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
  // a Node no Shade pressed this tick starts its fuse again
  for (const b of g.buildings.values()) if (b.def.role === 'node' && !pressed.has(b.id)) b.fuse = 0;
}
