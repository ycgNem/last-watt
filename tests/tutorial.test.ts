// The tutorial played as a newcomer would: build on each gold spot with the money the run has,
// start wave 1, Overcharge when a Shade walks into a Lamp. Every spot must be legal and
// affordable when its step comes up, and the steps must be done by the end of wave 3 (the second
// review: the old tutorial handed the player a 7-leak wave 2).
import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/Game';
import { STEPS, Tutorial } from '../src/app/tutorial';
import { nextWave, overcharge, place } from '../src/sim/actions';

describe('tutorial', () => {
  it('every step can be done with the money the run has, and it ends by wave 3', () => {
    const g = new Game({ seed: 3 });
    const t = new Tutorial();
    const problems: string[] = [];
    let built = -1;
    for (let tick = 0; tick < 60 * 60 * 6 && !t.finished && !g.over; tick++) {
      t.update(g);
      const s = t.step;
      if (!s) break;
      if (s.next) {
        t.advance();
        continue;
      }
      if (s.spot && s.slot && built !== t.i) {
        const r = place(g, s.slot, s.spot.x, s.spot.y);
        if (typeof r === 'string') {
          if (!/money/i.test(r)) problems.push(`step ${t.i + 1} ${s.title}: ${r}`);
        } else built = t.i;
      }
      if (s.title === 'SHARE OF POWER' && g.wave === 0) nextWave(g);
      if (s.title === 'OVERCHARGE')
        for (const b of g.buildings.values()) {
          const e = b.def.id === 'lamp' && b.target >= 0 ? g.enemyById(b.target) : undefined;
          if (e?.def.id === 'shade' && !overcharge(g, b)) break;
        }
      g.step();
      g.drainEvents();
    }
    console.log(`tutorial: finished ${t.finished} at step ${t.i + 1}/${STEPS.length}, wave ${g.wave}, lights ${g.lights}, leaks ${g.stats.leaksByWave.slice(1).join(' ')}`);
    const dark = [...g.buildings.values()].filter((b) => b.net < 0).map((b) => `${b.def.id}@${b.x},${b.y}`);
    expect(problems).toEqual([]);
    expect(dark).toEqual([]);
    expect(t.finished).toBe(true);
    expect(g.wave).toBeLessThanOrEqual(3);
    // following the tutorial costs at most a few lights in waves 1-3
    expect(g.lights).toBeGreaterThanOrEqual(16);
  });
});
