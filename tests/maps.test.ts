// Every map (DESIGN.md §11): the bot's plan for it wins, no factory loses, and every spot in the
// plan lands on a network.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/Game';
import { Bot, planFor, playRun } from '../src/app/bot';
import { MAPS } from '../src/data/map';

const leaks = (g: Game) => Array.from({ length: g.wave }, (_, i) => g.stats.leaksByWave[i + 1] ?? 0).join(' ');

describe.each(MAPS.filter((m) => m.id !== 'station'))('map $name', (map) => {
  it('the bot plan wins', () => {
    const bot = new Bot(planFor(map.id));
    const g = playRun(new Game({ map }), bot);
    console.log(`${map.id}: ${g.over} at wave ${g.wave}, lights ${g.lights}, leaks ${leaks(g)}, oc ${g.stats.overcharges}, knocks ${g.stats.knocks}, snuffs ${g.stats.snuffs}, left ${g.money}, t ${g.time.toFixed(0)}`);
    if (bot.log.length) console.log(bot.log.join('\n'));
    const dark = [...g.buildings.values()].filter((b) => b.net < 0 && b.def.role !== 'node').map((b) => `${b.def.id}@${b.x},${b.y}`);
    expect(dark).toEqual([]);
    expect(bot.log).toEqual([]);
    expect(g.over).toBe('win');
  });

  it('no factory loses', () => {
    const p = planFor(map.id);
    const g = playRun(new Game({ map }), new Bot({ ...p, opening: p.opening.filter((s) => s.b !== 'extractor' && s.b !== 'burner'), power: [] }));
    console.log(`${map.id} no factory: ${g.over} at wave ${g.wave}`);
    expect(g.over).toBe('lose');
  });
});
