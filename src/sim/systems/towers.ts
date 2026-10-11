// Towers turn satisfaction into damage: kJ/s = firing draw × efficiency × satisfaction (§1),
// or 3× firing draw at full power during an Overcharge (§8). Beacons slow (§4).
import { RULES } from '../../data/rules';
import { DT, type Game } from '../Game';
import type { Enemy } from '../types';

export function towersSystem(g: Game) {
  for (const e of g.enemies) {
    e.slow = 0;
    e.hit = 0;
  }
  for (const b of g.buildings.values()) {
    const d = b.def;
    b.dps = 0;
    if (d.role === 'beacon') {
      if (b.net < 0 || b.off || b.sat <= 0) continue;
      const s = (d.slow ?? 0) * b.sat;
      const cx = b.x + d.size / 2, cy = b.y + d.size / 2;
      for (const e of g.enemies) if (Math.hypot(e.x - cx, e.y - cy) <= (d.range ?? 0)) e.slow = Math.max(e.slow, s);
      continue;
    }
    if (d.role !== 'tower' || b.target < 0) continue;
    const target = g.enemyById(b.target);
    if (!target) continue;
    const { firingDraw, efficiency } = g.towerStats(b);
    const dps = b.overcharge > 0 ? firingDraw * RULES.overchargeMult.v * efficiency : firingDraw * efficiency * b.sat;
    if (dps <= 0) continue;
    b.dps = dps;
    if (!d.shares) {
      hurt(g, target, dps);
      continue;
    }
    // Floodlight: target, then up to two more within the spill radius, split 4 : 2 : 1;
    // a share with nobody to land on is lost; a Pall takes its share and every later one
    const others = g.enemies
      .filter((e) => e !== target && e.hp > 0 && Math.hypot(e.x - target.x, e.y - target.y) <= (d.spillRadius ?? 0))
      .sort((a, b2) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b2.x - target.x, b2.y - target.y));
    const lit: (Enemy | undefined)[] = [target, others[0], others[1]];
    const total = d.shares.reduce((a, s) => a + s, 0);
    for (let k = 0; k < d.shares.length; k++) {
      const e = lit[k];
      if (!e) continue;
      if (e.def.shadow) {
        let rest = 0;
        for (let j = k; j < d.shares.length; j++) rest += d.shares[j];
        hurt(g, e, (dps * rest) / total);
        break;
      }
      hurt(g, e, (dps * d.shares[k]) / total);
    }
  }
  // the dead pay their bounty (§1: health / 10)
  let dead = false;
  for (const e of g.enemies) {
    if (e.hp <= 0) {
      dead = true;
      g.money += e.def.bounty;
      g.stats.moneyEarned += e.def.bounty;
      g.stats.kills++;
      g.emit({ t: 'kill', x: e.x, y: e.y, money: e.def.bounty, enemy: e.def.id });
    }
  }
  if (dead) g.enemies = g.enemies.filter((e) => e.hp > 0);
}

function hurt(g: Game, e: Enemy, kjPerS: number) {
  const dmg = Math.min(e.hp, kjPerS * DT);
  e.hp -= kjPerS * DT;
  e.hit += kjPerS;
  g.stats.kjDelivered += dmg;
}
