// The whole run, played by the scripted bot: the run must be winnable by a sensible plan, with
// some tension left in it, and cost the tempting mistakes on either side of the money split (§6,
// §10 question 2): all wall and no factory, a factory that never lets the wall grow, a wall the
// factory can't feed, and no storage.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/Game';
import { Bot, BOT_PLAN, playRun } from '../src/app/bot';

const leaks = (g: Game) => Array.from({ length: g.wave }, (_, i) => g.stats.leaksByWave[i + 1] ?? 0).join(' ');

const planned = (() => {
  const bot = new Bot();
  return { bot, g: playRun(new Game(), bot) };
})();

describe('full run (bot)', () => {

  it('the planned build wins all 12 waves, with the grid under pressure on the way', () => {
    const { bot, g } = planned;
    const s = g.stats;
    console.log(
      `bot: ${g.over} at wave ${g.wave}, lights ${g.lights}, leaks by wave ${leaks(g)}, money earned ${s.moneyEarned} (wave pay ${s.wavePay}), ` +
        `lights lost ${JSON.stringify(s.lightsLostBy)}, overcharges ${s.overcharges}, knocks ${s.knocks}, snuffs ${s.snuffs}, ` +
        `brownout ${s.brownoutSeconds.toFixed(0)} s, research ${s.researched}, time ${g.time.toFixed(0)} s, left ${g.money}`,
    );
    if (bot.log.length) console.log(bot.log.join('\n'));
    expect(g.over).toBe('win');
    // the first map stays forgiving: since the fourth review smoothed wave 8 an expert plan can hold
    // all 20 (§11); what it must not do is hold them without using the grid (the verbs tests below)
    expect(g.lights).toBeGreaterThanOrEqual(14);
    // the grid is under pressure at some point (the second review: 0 s of brownout after wave 3)
    expect(s.brownoutSeconds).toBeGreaterThan(10);
  });

  it('a slower, plainer player (1 s reactions, Overcharge only a cone or fire on a Pall) still wins', () => {
    const g = playRun(new Game(), new Bot({ ...BOT_PLAN, human: true }));
    console.log(`human: ${g.over} at wave ${g.wave}, lights ${g.lights}, leaks ${leaks(g)}`);
    expect(g.over).toBe('win');
    expect(g.lights).toBeGreaterThanOrEqual(6);
  });

  it('all wall and no factory loses early', () => {
    const g = playRun(new Game(), new Bot({ ...BOT_PLAN, opening: BOT_PLAN.opening.filter((s) => s.b !== 'extractor' && s.b !== 'burner'), power: [] }));
    console.log(`no factory: ${g.over} at wave ${g.wave}, leaks by wave ${leaks(g)}`);
    expect(g.over).toBe('lose');
    expect(g.wave).toBeLessThanOrEqual(4);
  });

  it('the split matters: too much factory and a wall the factory cannot feed both end with at most half the lights', () => {
    const rich = playRun(new Game(), new Bot({ ...BOT_PLAN, headroom: 1.2 }));
    const greedy = playRun(new Game(), new Bot({ ...BOT_PLAN, headroom: 3.0 }));
    const ref = planned.g.lights;
    console.log(`factory-heavy (1.2): ${rich.over}, ${rich.lights} lights; tower-greedy (3.0): ${greedy.over}, ${greedy.lights} lights, brownout ${greedy.stats.brownoutSeconds.toFixed(0)} s; planned ${ref}`);
    expect(rich.lights).toBeLessThanOrEqual(ref / 2);
    expect(greedy.lights).toBeLessThanOrEqual(ref / 2);
  });

  it('Jars matter: the same plan without storage ends at least 5 lights worse', () => {
    const g = playRun(new Game(), new Bot({ ...BOT_PLAN, extras: BOT_PLAN.extras.filter((s) => s.b !== 'jar'), upgrades: BOT_PLAN.upgrades.filter((u) => u !== 'jar') }));
    console.log(`no Jars: ${g.over} at wave ${g.wave}, ${g.lights} lights`);
    expect(g.lights).toBeLessThanOrEqual(planned.g.lights - 5);
  });
});

describe('the verbs (the third review: §10 Q1)', () => {
  it('the same plan with no verbs at all (no Overcharge, Pulse or shedding) ends at least 4 lights worse', () => {
    const g = playRun(new Game(), new Bot({ ...BOT_PLAN, noVerbs: true }));
    console.log(`no verbs: ${g.over} at wave ${g.wave}, ${g.lights} lights, leaks ${leaks(g)}`);
    expect(g.lights).toBeLessThanOrEqual(planned.g.lights - 4);
  });
  // two extra Jars never make Overcharge free: a Jar never pays for an Overcharge's extra
  // (grid.test, §8). The run-level guard ("+2 Jars do not hold all 20") went with the fourth
  // review's smoother wave 8, when the plan itself began to hold all 20.
});

describe('the bot plan itself', () => {
  it('every spot in the plan lands on a network once the plan is built', () => {
    const g = playRun(new Game(), new Bot());
    const dark = [...g.buildings.values()].filter((b) => b.net < 0 && b.def.role !== 'node').map((b) => `${b.def.id}@${b.x},${b.y}`);
    expect(dark).toEqual([]);
  });
});
