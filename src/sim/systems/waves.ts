// Waves: the countdown, spawning each wave's sequence at its spacing, call-early, the win.
import { WAVES } from '../../data/waves';
import { ENEMY_BY_CODE } from '../../data/enemies';
import { RULES } from '../../data/rules';
import { DT, type Game } from '../Game';

export function wavesSystem(g: Game) {
  if (g.wave > 0 && g.wave < WAVES.length) {
    g.waveTimer -= DT;
    if (g.waveTimer <= 0) startNextWave(g);
  }
  for (const s of g.spawners) {
    s.next -= DT;
    while (s.next <= 0 && s.i < s.seq.length) {
      spawn(g, s.seq[s.i], s.wave);
      s.i++;
      s.next += s.spacing;
    }
  }
  if (g.spawners.some((s) => s.i >= s.seq.length)) g.spawners = g.spawners.filter((s) => s.i < s.seq.length);
  if (g.wave === WAVES.length && g.spawners.length === 0 && g.enemies.length === 0 && g.lights > 0 && !g.over) {
    g.over = 'win';
    g.emit({ t: 'win' });
  }
}

function spawn(g: Game, code: string, wave: number) {
  const def = ENEMY_BY_CODE[code];
  const p = g.path.at(0);
  g.enemies.push({ id: g.nextId++, def, hp: def.health, dist: 0, x: p.x, y: p.y, slow: 0, face: 1, hit: 0, wave });
}

/** total bounty a wave pays if everything in it dies (§5) */
export function waveBounty(n: number): number {
  const w = WAVES[n - 1];
  if (!w) return 0;
  let sum = 0;
  for (const c of w.seq) sum += ENEMY_BY_CODE[c].bounty;
  return sum;
}

/** what calling the next wave right now would pay (§5): 25% × its bounty × time left / timer */
export function callEarlyBonus(g: Game): number {
  if (g.wave === 0 || g.wave >= WAVES.length) return 0;
  return Math.round(RULES.callEarlyShare.v * waveBounty(g.wave + 1) * Math.max(0, g.waveTimer) / RULES.waveTimer.v);
}

/** start the next wave now; returns the call-early bonus paid */
export function startNextWave(g: Game): number {
  if (g.wave >= WAVES.length || g.over) return 0;
  const bonus = g.waveTimer > 0 ? callEarlyBonus(g) : 0;
  if (bonus > 0) {
    g.money += bonus;
    g.stats.bonusEarned += bonus;
    g.stats.moneyEarned += bonus;
  }
  const w = WAVES[g.wave];
  g.wave++;
  g.waveTimer = RULES.waveTimer.v;
  g.spawners.push({ wave: w.n, seq: w.seq, i: 0, next: 0, spacing: w.spacing });
  g.emit({ t: 'wave', n: w.n, note: w.note, bonus });
  return bonus;
}
