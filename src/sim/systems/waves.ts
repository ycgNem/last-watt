// Waves: the breather, spawning each wave's sequence at its spacing, wave pay when a wave is
// cleared (§5.2), calling the next one, the win after the last wave, then endless if chosen.
import { LAST_WAVE, waveDef } from '../../data/waves';
import { ENEMY_BY_CODE } from '../../data/enemies';
import { RULES } from '../../data/rules';
import { DT, type Game } from '../Game';

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
      spawn(g, c, s.wave);
      s.i++;
      // a Flit followed by a Flit comes on its clump gap, everything else on the wave's spacing
      const def = ENEMY_BY_CODE[c];
      s.next += def.packGap && s.seq[s.i] === c ? def.packGap : s.spacing;
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

/** money for clearing wave n, leaks or not (§5.2) */
export function wavePay(n: number): number {
  return RULES.wavePayBase.v + RULES.wavePayPer.v * n;
}

function spawn(g: Game, code: string, wave: number) {
  const def = ENEMY_BY_CODE[code];
  const p = g.path.at(0);
  g.enemies.push({ id: g.nextId++, def, hp: def.health, dist: 0, x: p.x, y: p.y, slow: 0, face: 1, hit: 0, wave, seen: false });
  if (!g.seenKinds.has(def.id)) {
    g.seenKinds.add(def.id);
    g.emit({ t: 'newenemy', enemy: def.id });
  }
}

/** total bounty a wave pays if everything in it dies (§5) */
export function waveBounty(n: number): number {
  const w = waveDef(n);
  if (!w) return 0;
  let sum = 0;
  for (const c of w.seq) sum += ENEMY_BY_CODE[c].bounty;
  return sum;
}

/** start the next wave now (Space, or the breather running out) */
export function startNextWave(g: Game) {
  if (g.over || (!g.endless && g.wave >= LAST_WAVE)) return;
  const w = waveDef(g.wave + 1)!;
  g.wave++;
  g.waveStarted.add(g.wave);
  g.waveTimer = 0;
  g.spawners.push({ wave: w.n, seq: w.seq, i: 0, next: 0, spacing: w.spacing });
  g.emit({ t: 'wave', n: w.n, note: w.note });
}

/** keep playing past the last wave (from the win screen) */
export function goEndless(g: Game) {
  if (g.over !== 'win') return;
  g.over = null;
  g.endless = true;
  g.waveTimer = RULES.breather.v;
}
