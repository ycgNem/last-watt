// Every map (DESIGN.md §11): a plain human-speed player wins it with lights to spare (the third
// review: Two Roads could not be won at human speed and no test said so), playing with no verbs
// does worse, no factory loses, and every spot in the bot's plan lands on a network.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/Game';
import { Bot, planFor, playRun } from '../src/app/bot';
import { MAPS } from '../src/data/map';

const leaks = (g: Game) => Array.from({ length: g.wave }, (_, i) => g.stats.leaksByWave[i + 1] ?? 0).join(' ');

describe.each(MAPS)('map $name', (map) => {
  it('the human profile wins with at least 6 lights, and no verbs at all ends at least 4 worse', () => {
    const p = planFor(map.id);
    const bot = new Bot({ ...p, human: true });
    const g = playRun(new Game({ map }), bot);
    const none = playRun(new Game({ map }), new Bot({ ...p, noVerbs: true }));
    console.log(`${map.id} human: ${g.over} at wave ${g.wave}, lights ${g.lights}, leaks ${leaks(g)}, oc ${g.stats.overcharges}, knocks ${g.stats.knocks}, left ${g.money}; no verbs: ${none.over}, ${none.lights} lights`);
    expect(g.over).toBe('win');
    expect(g.lights).toBeGreaterThanOrEqual(6);
    expect(none.lights).toBeLessThanOrEqual(g.lights - 4);
  });

  it('every spot in the bot plan lands on a network', () => {
    const bot = new Bot(planFor(map.id));
    const g = playRun(new Game({ map }), bot);
    console.log(`${map.id} plan: ${g.over} at wave ${g.wave}, lights ${g.lights}, leaks ${leaks(g)}, oc ${g.stats.overcharges}`);
    const dark = [...g.buildings.values()].filter((b) => b.net < 0 && b.def.role !== 'node').map((b) => `${b.def.id}@${b.x},${b.y}`);
    expect(dark).toEqual([]);
    expect(bot.log).toEqual([]);
  });

  it('no factory loses', () => {
    const p = planFor(map.id);
    const g = playRun(new Game({ map }), new Bot({ ...p, opening: p.opening.filter((s) => s.b !== 'extractor' && s.b !== 'burner'), power: [] }));
    console.log(`${map.id} no factory: ${g.over} at wave ${g.wave}`);
    expect(g.over).toBe('lose');
  });
});
