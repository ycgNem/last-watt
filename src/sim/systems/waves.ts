// Waves: the breather, spawning each wave's sequence at its spacing, wave pay when a wave is
// cleared (§5.2), calling the next one, the win after the last wave, then endless if chosen.
import { LAST_WAVE, waveDef } from '../../data/waves';
import { ENEMY_BY_CODE } from '../../data/enemies';
import { RULES } from '../../data/rules';
import { DT, type Game } from '../Game';
import type { MapDef } from '../../data/map';

export function wavesSystem(g: Game) {
  // the breather: once a wave has fully spawned and the field is clear, the next one comes in 20 s
  const more = g.endless || g.wave < LAST_WAVE;
  if (g.wave > 0 && more) {
    const clear = g.spawners.length === 0 && g.enemies.length === 0;
    if (clear) {
      if (g.waveTimer <= 0) g.waveTimer = RULES.breather.v;
      g.waveTimer -= DT;
      if (g.waveTimer <= 0) startNextWave(g);
    } else g.waveTimer = 0;
  }
  for (const s of g.spawners) {
    s.next -= DT;
    while (s.next <= 0 && s.i < s.seq.length) {
      const c = s.seq[s.i];
      const route = s.routes[c] ?? s.wave % g.paths.length;
      spawn(g, c, s.wave, route);
      s.i++;
      // a Flit followed by a Flit comes on its clump gap (and its road), everything else on the
      // wave's spacing, and the kind's next spawn takes the next road
      const def = ENEMY_BY_CODE[c];
      const clump = !!def.packGap && s.seq[s.i] === c;
      s.next += clump ? def.packGap! : s.spacing;
      if (!clump) s.routes[c] = (route + 1) % g.paths.length;
    }
  }
  if (g.spawners.some((s) => s.i >= s.seq.length)) g.spawners = g.spawners.filter((s) => s.i < s.seq.length);
  // wave pay: a wave is cleared once it has all spawned and none of it is left on the field
  for (const n of g.waveStarted) {
    if (g.wavePaid.has(n)) continue;
    if (g.spawners.some((s) => s.wave === n) || g.enemies.some((e) => e.wave === n)) continue;
    g.wavePaid.add(n);
    const money = wavePay(n);
    g.money += money;
    g.stats.wavePay += money;
    g.stats.moneyEarned += money;
    g.emit({ t: 'wavepay', n, money, leaks: g.stats.leaksByWave[n] ?? 0 });
  }
  if (!g.endless && g.wave === LAST_WAVE && g.spawners.length === 0 && g.enemies.length === 0 && g.lights > 0 && !g.over) {
    g.over = 'win';
    g.emit({ t: 'win' });
  }
}

/** the road each spawn of a sequence takes, by the spawner's own rule: each kind alternates roads,
 *  starting on road (wave mod roads), and a Flit clump keeps to one road (the strip tells the
 *  player what comes down each road, §11) */
export function roadsOf(seq: string, wave: number, roads: number): number[] {
  const routes: Record<string, number> = {};
  const out: number[] = [];
  for (let i = 0; i < seq.length; i++) {
    const c = seq[i];
    const route = routes[c] ?? wave % roads;
    out.push(route);
    const clump = !!ENEMY_BY_CODE[c].packGap && seq[i + 1] === c;
    if (!clump) routes[c] = (route + 1) % roads;
  }
  return out;
}

/** money for clearing wave n, leaks or not (§5.2) */
export function wavePay(n: number): number {
  return RULES.wavePayBase.v + RULES.wavePayPer.v * n;
}

function spawn(g: Game, code: string, wave: number, route: number) {
  const def = ENEMY_BY_CODE[code];
  // they come out of the dark a few tiles along the road (§6), not at the map's edge
  const d0 = Math.min(g.map.spawnAt, g.paths[route].length / 4);
  const p = g.paths[route].at(d0);
  g.enemies.push({ id: g.nextId++, def, hp: def.health, dist: d0, x: p.x, y: p.y, slow: 0, face: 1, hit: 0, wave, seen: false, route });
  if (!g.seenKinds.has(def.id)) {
    g.seenKinds.add(def.id);
    g.emit({ t: 'newenemy', enemy: def.id });
  }
}

/** total bounty a wave pays if everything in it dies (§5) */
export function waveBounty(n: number, map?: MapDef): number {
  const w = waveDef(n, map);
  if (!w) return 0;
  let sum = 0;
  for (const c of w.seq) sum += ENEMY_BY_CODE[c].bounty;
  return sum;
}

/** seconds between a wave's enemies on this map: the table's spacing × the map's pace (§11) */
export function spacingOf(g: Game, w: { n: number; spacing: number }): number {
  return w.spacing * g.map.pace;
}

/** start the next wave now (Space, or the breather running out) */
export function startNextWave(g: Game) {
  if (g.over || (!g.endless && g.wave >= LAST_WAVE)) return;
  const w = waveDef(g.wave + 1, g.map)!;
  g.wave++;
  g.waveStarted.add(g.wave);
  g.waveTimer = 0;
  g.spawners.push({ wave: w.n, seq: w.seq, i: 0, next: 0, spacing: spacingOf(g, w), routes: {} });
  g.emit({ t: 'wave', n: w.n, note: w.note });
}

/** keep playing past the last wave (from the win screen) */
export function goEndless(g: Game) {
  if (g.over !== 'win') return;
  g.over = null;
  g.endless = true;
  g.waveTimer = RULES.breather.v;
}
