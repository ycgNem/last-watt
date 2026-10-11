// The whole run, played by the scripted bot: the run must be winnable by a sensible plan and lost
// by the tempting mistakes on either side of the money split (§6, §10 question 2): all wall and no
// factory, a factory that never lets the wall grow, and a wall the factory can't feed.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/Game';
import { Bot, BOT_PLAN, playRun } from '../src/app/bot';

const leaks = (g: Game) => Array.from({ length: g.wave }, (_, i) => g.stats.leaksByWave[i + 1] ?? 0).join(' ');

describe('full run (bot)', () => {
  it('the planned build wins all 12 waves', () => {
    const bot = new Bot();
    const g = playRun(new Game(), bot);
    const s = g.stats;
    console.log(
      `bot: ${g.over} at wave ${g.wave}, lights ${g.lights}, leaks by wave ${leaks(g)}, money earned ${s.moneyEarned} (wave pay ${s.wavePay}), ` +
        `lights lost ${JSON.stringify(s.lightsLostBy)}, overcharges ${s.overcharges}, knocks ${s.knocks}, snuffs ${s.snuffs}, ` +
        `brownout ${s.brownoutSeconds.toFixed(0)} s, research ${s.researched}, time ${g.time.toFixed(0)} s`,
    );
    if (bot.log.length) console.log(bot.log.join('\n'));
    expect(g.over).toBe('win');
    expect(g.lights).toBeGreaterThanOrEqual(8);
  });

  it('all wall and no factory loses early', () => {
    const g = playRun(new Game(), new Bot({ ...BOT_PLAN, opening: BOT_PLAN.opening.filter((s) => s.b !== 'extractor' && s.b !== 'burner'), power: [] }));
    console.log(`no factory: ${g.over} at wave ${g.wave}, leaks by wave ${leaks(g)}`);
    expect(g.over).toBe('lose');
    expect(g.wave).toBeLessThanOrEqual(4);
  });

  it('the split matters: too much factory loses, and so does a wall the factory cannot feed', () => {
    const rich = playRun(new Game(), new Bot({ ...BOT_PLAN, headroom: 1.2 }));
    const greedy = playRun(new Game(), new Bot({ ...BOT_PLAN, headroom: 3.0 }));
    console.log(`factory-heavy (1.2): ${rich.over} at wave ${rich.wave}; tower-greedy (3.0): ${greedy.over} at wave ${greedy.wave}, brownout ${greedy.stats.brownoutSeconds.toFixed(0)} s`);
    expect(rich.over).toBe('lose');
    expect(greedy.over).toBe('lose');
  });

  it('Jars matter: the same plan without storage loses', () => {
    const g = playRun(new Game(), new Bot({ ...BOT_PLAN, extras: BOT_PLAN.extras.filter((s) => s.b !== 'jar') }));
    console.log(`no Jars: ${g.over} at wave ${g.wave}`);
    expect(g.over).toBe('lose');
  });
});

describe('the bot plan itself', () => {
  it('every spot in the plan lands on a network once the plan is built', () => {
    const g = playRun(new Game(), new Bot());
    const dark = [...g.buildings.values()].filter((b) => b.net < 0 && b.def.role !== 'node').map((b) => `${b.def.id}@${b.x},${b.y}`);
    expect(dark).toEqual([]);
  });
});
