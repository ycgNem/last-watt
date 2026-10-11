// The whole run, played by the scripted bot: the slice must be winnable by a sensible plan,
// and lost by the tempting mistake (all wall, no factory).
import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/Game';
import { Bot, BOT_PLAN, playRun } from '../src/app/bot';

describe('full run (bot)', () => {
  it('the planned build wins all 8 waves', () => {
    const bot = new Bot();
    const g = playRun(new Game(), bot);
    const s = g.stats;
    console.log(
      `bot: ${g.over} at wave ${g.wave}, lights ${g.lights}, leaks by wave ${s.leaksByWave.slice(1).join(' ')}, ` +
        `money earned ${s.moneyEarned}, lights lost ${JSON.stringify(s.lightsLostBy)}, overcharges ${s.overcharges}, knocks ${s.knocks}, ` +
        `brownout ${s.brownoutSeconds.toFixed(0)} s, wasted ${s.wastedKj.toFixed(0)} kJ, ` +
        `wall ${bot.wallI}/${BOT_PLAN.wall.length} power ${bot.powerI}/${BOT_PLAN.power.length}, time ${g.time.toFixed(0)} s`,
    );
    if (bot.log.length) console.log(bot.log.join('\n'));
    expect(g.over).toBe('win');
  });

  it('all wall and no factory loses', () => {
    const g = playRun(new Game(), new Bot({ ...BOT_PLAN, opening: BOT_PLAN.opening.filter((s) => s.b !== 'extractor' && s.b !== 'burner'), power: [] }));
    console.log(`no factory: ${g.over} at wave ${g.wave}, leaks by wave ${g.stats.leaksByWave.slice(1).join(' ')}`);
    expect(g.over).toBe('lose');
  });
});
