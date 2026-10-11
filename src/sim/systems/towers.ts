// Towers turn satisfaction into damage (§1, §4): kJ/s = draw × efficiency × satisfaction; an
// Overcharge triples the draw and is served ahead of every tier (§8). Lamps and Searchlights are
// narrow beams (a Pall drinks 3/4); a Floodlight's cone lands 40% on each enemy in it (three or
// more share all of it) and a Pall drinks the rest of the beam, shadowing everyone behind it; a
// Brazier burns every body in its fire; a Starshell charges up to three shells and lobs them.
// Beacons slow. Then the dead pay their bounty.
import { RULES } from '../../data/rules';
import { DT, type Game } from '../Game';
import type { Building, Enemy } from '../types';
import { canSee } from './targeting';

export function towersSystem(g: Game) {
  for (const e of g.enemies) {
    e.slow = 0;
    e.hit = 0;
  }
  for (const b of g.buildings.values()) {
    const d = g.spec(b);
    b.dps = 0;
    if (b.sweep > 0) b.sweep = Math.max(0, b.sweep - DT);
    if (d.role === 'beacon') {
      if (b.net < 0 || b.off || b.sat <= 0) continue;
      const s = (d.slow ?? 0) * b.sat;
      const cx = b.x + d.size / 2, cy = b.y + d.size / 2;
      for (const e of g.enemies) if (Math.hypot(e.x - cx, e.y - cy) <= (d.range ?? 0)) e.slow = Math.max(e.slow, s);
      continue;
    }
    if (d.role !== 'tower') continue;
    const oc = b.overcharge > 0;
    const power = (oc ? RULES.overchargeMult.v : 1) * b.sat;
    if (d.kind === 'mortar') {
      mortar(g, b);
      continue;
    }
    if (b.target < 0 || (d.kind === 'beam' && b.sweep > 0)) continue;
    const target = g.enemyById(b.target);
    if (!target) continue;
    if (d.kind === 'radial') {
      // every body in the fire, the ones nearest the Hearth first, up to what it asked power for
      const cx = b.x + d.size / 2, cy = b.y + d.size / 2;
      const each = (d.perEnemyDraw ?? 0) * (d.efficiency ?? 0) * power;
      if (each <= 0) continue;
      const burning = g.enemies.filter((e) => e.hp > 0 && Math.hypot(e.x - cx, e.y - cy) <= (d.range ?? 0)).sort((a, c) => g.left(a) - g.left(c)).slice(0, Math.max(1, b.bodies));
      for (const e of burning) hurt(g, e, each);
      b.dps = each * burning.length;
      continue;
    }
    const dps = (d.firingDraw ?? 0) * (d.efficiency ?? 0) * power;
    if (dps <= 0) continue;
    b.dps = dps;
    if (d.kind === 'cone') {
      cone(g, b, target, dps);
      continue;
    }
    // a narrow beam: a Pall drinks most of it (§5)
    hurt(g, target, dps * (target.def.narrowBeam ?? 1));
  }
  // Starshells in the air
  for (const s of g.shots) s.t += DT;
  const landed = g.shots.filter((s) => s.t >= s.flight);
  if (landed.length) {
    g.shots = g.shots.filter((s) => s.t < s.flight);
    for (const s of landed) {
      const hit = g.enemies.filter((e) => e.hp > 0 && Math.hypot(e.x - s.x, e.y - s.y) <= s.radius);
      const share = hit.length ? Math.min(s.catch, 1 / hit.length) : 0;
      for (const e of hit) hurtKj(g, e, s.energy * share);
      g.emit({ t: 'burst', x: s.x, y: s.y, r: s.radius, hit: hit.length });
    }
  }
  // the dead pay their bounty (§1: health × 0.15)
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

/** the cone: every enemy inside catches up to 40%; a Pall takes the shares of everyone behind it (§4) */
export function coneCatchers(g: Game, b: Building, target: Enemy): Enemy[] {
  const d = g.spec(b);
  const cx = b.x + d.size / 2, cy = b.y + d.size / 2;
  const a0 = Math.atan2(target.y - cy, target.x - cx);
  const half = ((d.halfAngle ?? 30) * Math.PI) / 180;
  const out: Enemy[] = [];
  for (const e of g.enemies) {
    if (e.hp <= 0) continue;
    const dist = Math.hypot(e.x - cx, e.y - cy);
    if (dist > (d.range ?? 0) || !canSee(b, e)) continue;
    let da = Math.abs(Math.atan2(e.y - cy, e.x - cx) - a0);
    if (da > Math.PI) da = 2 * Math.PI - da;
    if (e === target || da <= half) out.push(e);
  }
  out.sort((p, q) => Math.hypot(p.x - cx, p.y - cy) - Math.hypot(q.x - cx, q.y - cy));
  return out;
}

function cone(g: Game, b: Building, target: Enemy, dps: number) {
  const d = g.spec(b);
  const lit = coneCatchers(g, b, target);
  const share = Math.min(d.catch ?? 1, 1 / lit.length);
  const pall = lit.findIndex((e) => e.def.shadow);
  let delivered = 0;
  lit.forEach((e, i) => {
    if (pall >= 0 && i > pall) return;
    // the Pall drinks what is left of the beam once those in front have caught theirs (§5)
    const k = pall === i ? 1 - share * i : share;
    hurt(g, e, dps * k);
    delivered += dps * k;
  });
  b.dps = delivered;
}

/** a Starshell charges up to a magazine of shells from what the grid serves it (3× on an
 *  Overcharge) and lobs one whenever it holds a full shell, a target, and has reloaded (§4.1) */
function mortar(g: Game, b: Building) {
  const d = g.spec(b);
  const size = d.shellSize ?? 0;
  const cap = size * (d.magazine ?? 1);
  if (b.shell < cap) {
    const kw = b.demand * b.sat;
    b.shell = Math.min(cap, b.shell + kw * DT);
    b.dps = kw * (d.efficiency ?? 0) * Math.min(1, d.catch ? d.catch * 3 : 1);
  }
  if (b.shell < size || b.target < 0 || b.sweep > 0) return;
  const t = g.enemyById(b.target);
  if (!t) return;
  const ft = d.flightTime ?? 1;
  // lead the target: where it will be when the shell lands
  const p = g.paths[t.route].at(t.dist + t.def.speed * (1 - t.slow) * ft);
  const cx = b.x + d.size / 2, cy = b.y + d.size / 2;
  g.shots.push({ from: b.id, x0: cx, y0: cy, x: p.x, y: p.y, t: 0, flight: ft, energy: size * (d.efficiency ?? 0), radius: d.burstRadius ?? 1, catch: d.catch ?? 1 });
  b.shell -= size;
  b.sweep = d.reload ?? 0;
  g.emit({ t: 'shoot', id: b.id, x: cx, y: cy });
}

function hurt(g: Game, e: Enemy, kjPerS: number) {
  const dmg = Math.min(Math.max(0, e.hp), kjPerS * DT);
  e.hp -= kjPerS * DT;
  e.hit += kjPerS;
  g.stats.kjDelivered += dmg;
}

function hurtKj(g: Game, e: Enemy, kj: number) {
  g.stats.kjDelivered += Math.min(Math.max(0, e.hp), kj);
  e.hp -= kj;
  e.hit += kj * 10;
}
