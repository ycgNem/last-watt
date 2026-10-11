// Everything the player (or the bot) can do. Each returns null on success or a short reason.
import { BUILDINGS, SELL_REFUND, type BuildingId } from '../data/buildings';
import { RESEARCH } from '../data/research';
import { RULES } from '../data/rules';
import type { Game } from './Game';
import { startNextWave } from './systems/waves';
import type { Building } from './types';

export function placeProblem(g: Game, id: BuildingId, x: number, y: number, free = false): string | null {
  const def = BUILDINGS[id];
  if (def.role === 'core') return 'There is only one Hearth';
  if (def.research && !g.research.done.has(def.research)) return `Research ${RESEARCH[def.research].name} first (Lab)`;
  const s = def.size;
  if (x < 0 || y < 0 || x + s > g.map.w || y + s > g.map.h) return 'Off the map';
  for (let yy = y; yy < y + s; yy++)
    for (let xx = x; xx < x + s; xx++) {
      if (g.isPath(xx, yy)) return 'Not on the path';
      if (g.buildingAt(xx, yy)) return 'Something is already there';
      if (def.role === 'extractor' && !g.isDeposit(xx, yy)) return 'Extractors go on emberrock';
    }
  if (!free && g.money < def.cost) return `Need ${def.cost} money`;
  return null;
}

export function place(g: Game, id: BuildingId, x: number, y: number, free = false): Building | string {
  const why = placeProblem(g, id, x, y, free);
  if (why) return why;
  const def = BUILDINGS[id];
  if (!free) g.money -= def.cost;
  const b = g.addBuilding(def, x, y);
  g.emit({ t: 'place', id: b.id, def: id, x, y });
  return b;
}

/** money a sale pays back: half of everything spent on it (§3 selling) */
export function sellValue(b: Building): number {
  let spent = b.def.cost;
  for (let l = 2; l <= b.level; l++) spent += b.def.upgrades?.[l - 2]?.cost ?? 0;
  return Math.floor(spent * SELL_REFUND.v);
}

export function sell(g: Game, b: Building): string | null {
  if (b.def.role === 'core') return 'The Hearth stays';
  const money = sellValue(b);
  g.money += money;
  g.removeBuilding(b);
  g.emit({ t: 'sell', x: b.x + b.def.size / 2, y: b.y + b.def.size / 2, money });
  return null;
}

/** shed (or restore) one building: the most important verb (§8) */
export function toggleOff(g: Game, b: Building): string | null {
  if (b.def.role === 'core') return 'The Hearth cannot be shed';
  if (b.def.role === 'node') return 'Nodes carry power; they have nothing to shed';
  b.off = !b.off;
  return null;
}

export function setTier(g: Game, b: Building, tier: number): string | null {
  if (!(b.def.tier && tier >= 1 && tier <= 4)) return 'Only consumers have a tier';
  b.tier = tier;
  return null;
}

/** shed (or restore) a whole tier from the HUD */
export function toggleTier(g: Game, tier: number) {
  if (tier >= 1 && tier <= 4) g.tierOff[tier] = !g.tierOff[tier];
}

export function upgradeProblem(g: Game, b: Building): string | null {
  const up = b.def.upgrades?.[b.level - 1];
  if (!up) return 'No further tier';
  if (!g.research.done.has(up.research)) return `Research ${RESEARCH[up.research].name} first (Lab)`;
  if (g.money < up.cost) return `Need ${up.cost} money`;
  return null;
}

export function upgrade(g: Game, b: Building): string | null {
  const why = upgradeProblem(g, b);
  if (why) return why;
  const up = b.def.upgrades![b.level - 1];
  g.money -= up.cost;
  b.level++;
  return null;
}

/** kJ the Jars on a building's network hold */
export function storedFor(g: Game, b: Building): number {
  const n = g.networkOf(b);
  return n ? n.stored : 0;
}

export function overchargeProblem(g: Game, b: Building): string | null {
  if (b.def.role !== 'tower') return 'Only Lamps and Floodlights overcharge';
  if (b.overcharge > 0) return 'Already overcharged';
  if (b.net < 0) return 'Not on a network';
  const n = g.networkOf(b)!;
  if (n.capacity <= 0) return 'Needs a Jar on this network';
  if (jarCharge(g, b) < RULES.overchargeCost.v) return `Needs ${RULES.overchargeCost.v} kJ stored`;
  return null;
}

function jarCharge(g: Game, b: Building): number {
  let sum = 0;
  for (const id of g.networkOf(b)?.members ?? []) {
    const j = g.buildings.get(id)!;
    if (j.def.role === 'storage') sum += j.charge;
  }
  return sum;
}

/** 120 kJ straight from the Jars: the tower fires at 3× its firing draw for 4 s (§8) */
export function overcharge(g: Game, b: Building): string | null {
  const why = overchargeProblem(g, b);
  if (why) return why;
  let need = RULES.overchargeCost.v;
  const jars = (g.networkOf(b)?.members ?? []).map((id) => g.buildings.get(id)!).filter((j) => j.def.role === 'storage');
  jars.sort((a, c) => c.charge - a.charge);
  for (const j of jars) {
    const take = Math.min(j.charge, need);
    j.charge -= take;
    need -= take;
    if (need <= 0) break;
  }
  b.overcharge = RULES.overchargeTime.v;
  g.stats.overcharges++;
  if (g.stats.firstOvercharge < 0) g.stats.firstOvercharge = g.tick;
  g.emit({ t: 'overcharge', id: b.id, x: b.x + b.def.size / 2, y: b.y + b.def.size / 2 });
  return null;
}

export function startResearch(g: Game, id: string): string | null {
  if (!RESEARCH[id]) return 'No such project';
  if (g.research.done.has(id)) return 'Already researched';
  g.research.active = g.research.active === id ? null : id;
  return null;
}

/** start wave 1, or call the next wave early for the bonus (§5) */
export function nextWave(g: Game): string | null {
  if (g.over) return 'The run is over';
  if (g.wave >= 8) return 'That was the last wave';
  startNextWave(g);
  return null;
}
