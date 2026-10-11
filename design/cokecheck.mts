// The sixth review's Coker check (the critic's script): every Extractor the plan upgrades taken to a
// Deep bit or a Coker, with Mining at its place in the plan's research or early, plan and human.
import { Game } from '../src/sim/Game';
import { Bot, planFor, type BotPlan } from '../src/app/bot';
import { mapById } from '../src/data/map';

function run(name: string, mapId: string, plan: BotPlan) {
  const g = new Game({ map: mapById(mapId) });
  const bot = new Bot(plan);
  let genLate = 0, nLate = 0, worksLate = 0;
  for (let t = 0; t < 1800 * 60 && !g.over; t++) {
    if (t % (plan.human ? 60 : 6) === 0) bot.act(g);
    g.step();
    g.drainEvents();
    if (g.wave >= 9) {
      let gen = 0, works = 0;
      for (const b of g.buildings.values()) { if (b.def.role === 'generator' || b.def.role === 'core') gen += b.output ?? 0; if (b.def.role === 'extractor') works += b.demand ?? 0; }
      genLate += gen; worksLate += works; nLate++;
    }
  }
  const ex = [...g.buildings.values()].filter((b) => b.def.role === 'extractor');
  const up = ex.filter((b) => b.level > 1);
  console.log(`${mapId.padEnd(10)} ${name.padEnd(18)} ${String(g.over).padEnd(5)} w${g.wave} lights ${String(g.lights).padStart(2)} brown ${Math.round(g.stats.brownoutSeconds).toString().padStart(3)}s wasted ${Math.round(g.stats.wastedKj).toString().padStart(6)} kJ  gen(w9+) ${(genLate / Math.max(1, nLate)).toFixed(0)} kW works ${(worksLate / Math.max(1, nLate)).toFixed(1)} kW  extractors ${ex.length} upgraded ${up.length} (${up.map((b) => b.branch ? 'C' : 'D').join('')}) left ${g.money}`);
}

for (const m of (process.argv[2] ?? 'station,switchback,fork,tworoads').split(',')) {
  const p = planFor(m);
  const early = (r: string[]) => { const x = r.filter((i) => i !== 'deepbit'); x.splice(x.indexOf('bellows') + 1, 0, 'deepbit'); return x; };
  for (const human of [false, true]) {
    const base = { ...p, human };
    run(`${human ? 'human' : 'plan'} deep`, m, base);
    run(`${human ? 'human' : 'plan'} coker`, m, { ...base, branches: { ...p.branches, extractor: 1 } });
    run(`${human ? 'human' : 'plan'} deep early`, m, { ...base, research: early(p.research) });
    run(`${human ? 'human' : 'plan'} coker early`, m, { ...base, research: early(p.research), branches: { ...p.branches, extractor: 1 } });
    run(`${human ? 'human' : 'plan'} smart`, m, { ...base, smartMining: true });
    run(`${human ? 'human' : 'plan'} smart early`, m, { ...base, research: early(p.research), smartMining: true });
  }
}
