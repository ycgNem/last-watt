// Waves: the breather, spawning each wave's sequence at its spacing, calling the next one, the win.
import { WAVES } from '../../data/waves';
import { ENEMY_BY_CODE } from '../../data/enemies';
import { RULES } from '../../data/rules';
import { DT, type Game } from '../Game';

export function wavesSystem(g: Game) {
  // the breather: once a wave has fully spawned and the field is clear, the next one comes in 20 s
  if (g.wave > 0 && g.wave < WAVES.length) {
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

/** start the next wave now (Space, or the breather running out) */
export function startNextWave(g: Game) {
  if (g.wave >= WAVES.length || g.over) return;
  const w = WAVES[g.wave];
  g.wave++;
  g.waveTimer = 0;
  g.spawners.push({ wave: w.n, seq: w.seq, i: 0, next: 0, spacing: w.spacing });
  g.emit({ t: 'wave', n: w.n, note: w.note });
}
