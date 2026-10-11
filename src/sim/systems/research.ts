// Research (§7): each Lab converts its served kW into progress at 1:1 on the active project.
import { DT, type Game } from '../Game';
import { RESEARCH } from '../../data/research';

export function researchSystem(g: Game) {
  const id = g.research.active;
  if (!id) return;
  let kw = 0;
  for (const b of g.buildings.values()) if (b.def.role === 'lab' && b.net >= 0) kw += b.demand * b.sat;
  const p = (g.research.progress[id] ?? 0) + kw * DT;
  g.research.progress[id] = p;
  const cost = g.researchCost(id);
  if (p >= cost) {
    g.research.progress[id] = cost;
    g.research.done.add(id);
    g.research.active = null;
    g.stats.researched++;
    g.emit({ t: 'research', id });
    // the Labs move on to the next queued project they can start
    const q = g.research.queue;
    while (q.length) {
      const next = q.shift()!;
      const r = RESEARCH[next];
      if (!r || g.research.done.has(next) || (r.requires && !g.research.done.has(r.requires))) continue;
      g.research.active = next;
      break;
    }
  }
}
