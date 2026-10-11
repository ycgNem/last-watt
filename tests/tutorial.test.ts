// The tutorial played as a newcomer would: build on each gold spot with the money the run has,
// start wave 1, Overcharge when a Shade walks into a Lamp, start the Brazier when told. Every spot
// must be legal and affordable when its step comes up, and the steps must be done before wave 4
// (the second review: the old tutorial handed the player a 7-leak wave 2). Then the graduate plays
// on through wave 4 without touching anything (the fourth review: it walked into wave 4 with 155
// money unspent and lost 13 lights).
import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/Game';
import { STEPS, Tutorial } from '../src/app/tutorial';
import { nextWave, overcharge, place, startResearch } from '../src/sim/actions';

describe('tutorial', () => {
  it('every step can be done with the money the run has, it ends before wave 4, and wave 4 costs at most a few lights', () => {
    const g = new Game({ seed: 3 });
    const t = new Tutorial();
    const problems: string[] = [];
    const money: string[] = [];
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
        } else {
          built = t.i;
          money.push(`${s.title} w${g.wave} ${g.money}`);
        }
      }
      if (s.title === 'SHARE OF POWER' && g.wave === 0) nextWave(g);
      if (s.title === 'THE BRAZIER' && !g.research.active) startResearch(g, 'brazier');
      if (s.title === 'OVERCHARGE')
        for (const b of g.buildings.values()) {
          const e = b.def.id === 'lamp' && b.target >= 0 ? g.enemyById(b.target) : undefined;
          if (e?.def.id === 'shade' && !overcharge(g, b)) break;
        }
      // a build step holds the breather in the real game (play.ts): the same here
      if (s.spot && g.waveTimer > 0) g.waveTimer += 1 / 60;
      g.step();
      g.drainEvents();
    }
    const at = `step ${t.i + 1}/${STEPS.length}, wave ${g.wave}, lights ${g.lights}, money ${g.money}`;
    console.log(`tutorial: finished ${t.finished} at ${at}, leaks ${g.stats.leaksByWave.slice(1).join(' ')}; built ${money.join(', ')}`);
    const dark = [...g.buildings.values()].filter((b) => b.net < 0).map((b) => `${b.def.id}@${b.x},${b.y}`);
    expect(problems).toEqual([]);
    expect(dark).toEqual([]);
    expect(t.finished).toBe(true);
    expect(g.wave).toBeLessThanOrEqual(3);
    expect(g.lights).toBeGreaterThanOrEqual(16);
    // the graduate plays wave 4 with what the tutorial had it build
    for (let tick = 0; tick < 60 * 120 && !g.wavePaid.has(4) && !g.over; tick++) {
      if (g.wave === 3 && g.waveTimer > 0) nextWave(g);
      g.step();
      g.drainEvents();
    }
    console.log(`after wave 4: lights ${g.lights}, leaks ${g.stats.leaksByWave.slice(1).join(' ')}, money ${g.money}`);
    expect(g.wavePaid.has(4)).toBe(true);
    expect(g.lights).toBeGreaterThanOrEqual(12);
  });
});
