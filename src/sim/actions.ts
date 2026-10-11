// Everything the player (or the bot) can do. Each returns null on success or a short reason.
import { BUILDINGS, SELL_REFUND, type BuildingId } from '../data/buildings';
import { RESEARCH } from '../data/research';
import { RULES } from '../data/rules';
import { LAST_WAVE } from '../data/waves';
import type { Game } from './Game';
import { goEndless, startNextWave } from './systems/waves';
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
  if (!up) return b.def.upgrades?.length ? 'Fully upgraded' : 'No upgrades';
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
  g.netDirty = true; // a Long line reaches further
  g.emit({ t: 'upgrade', id: b.id, x: b.x + b.def.size / 2, y: b.y + b.def.size / 2 });
  return null;
}

/** kJ the Jars on a building's network hold */
export function storedFor(g: Game, b: Building): number {
  const n = g.networkOf(b);
  return n ? n.stored : 0;
}

export function overchargeProblem(g: Game, b: Building): string | null {
  if (b.def.role !== 'tower') return 'Only towers overcharge';
  if (b.overcharge > 0) return 'Already overcharged';
  if (b.cool > 0) return `The glass is cooling: ${Math.ceil(b.cool)} s`;
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

/** 120 kJ straight from the Jars: the tower runs at 3× its draw for 4 s at full power (§8) */
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
  b.cool = RULES.overchargeTime.v + RULES.overchargeCool.v;
  g.stats.overcharges++;
  if (g.stats.firstOvercharge < 0) g.stats.firstOvercharge = g.tick;
  g.emit({ t: 'overcharge', id: b.id, x: b.x + b.def.size / 2, y: b.y + b.def.size / 2 });
  return null;
}

/** each network with a lit tower and a Jar: its Jars, its lit towers, and the enemies inside their flashes */
function pulseNets(g: Game) {
  const r = RULES.pulseRadius.v;
  return g.networks
    .map((n) => {
      const ms = n.members.map((id) => g.buildings.get(id)!);
      const towers = ms.filter((b) => b.def.role === 'tower' && !b.off && b.sat > 0);
      const lit = g.enemies.filter((e) => e.hp > 0 && towers.some((t) => Math.hypot(e.x - t.x - t.def.size / 2, e.y - t.y - t.def.size / 2) <= r));
      return { jars: ms.filter((b) => b.def.role === 'storage'), towers, lit, stored: ms.reduce((a, b) => a + (b.def.role === 'storage' ? b.charge : 0), 0) };
    })
    .filter((p) => p.towers.length > 0 && p.jars.length > 0);
}

export function pulseProblem(g: Game): string | null {
  if (!g.research.done.has('pulse')) return 'Research Pulse first (Lab)';
  const nets = pulseNets(g);
  const stored = nets.reduce((a, p) => a + p.stored, 0);
  if (stored < RULES.pulseMin.v) return `Needs ${RULES.pulseMin.v} kJ stored where towers are lit (${Math.floor(stored)} now)`;
  if (!nets.some((p) => p.lit.length > 0 && p.stored > 0)) return `Nothing is within ${RULES.pulseRadius.v} tiles of a lit tower`;
  return null;
}

/** Pulse (§8): every Jar on a network whose lit towers have an enemy within 3 tiles empties at
 *  once, and its kJ × 0.6 is split evenly across those enemies (a flash from every side: no
 *  shadows, a Pall takes its share). A network with nothing in reach keeps its charge. */
export function pulse(g: Game): string | null {
  const why = pulseProblem(g);
  if (why) return why;
  const at: { x: number; y: number }[] = [];
  let kj = 0, hit = 0;
  for (const { jars, towers, lit, stored } of pulseNets(g)) {
    if (!lit.length || stored <= 0) continue;
    for (const j of jars) j.charge = 0;
    kj += stored;
    const each = (stored * RULES.pulseEff.v) / lit.length;
    for (const t of towers) at.push({ x: t.x + t.def.size / 2, y: t.y + t.def.size / 2 });
    for (const en of lit) {
      g.stats.kjDelivered += Math.min(Math.max(0, en.hp), each);
      en.hp -= each;
      en.hit += each * 10;
      hit++;
    }
  }
  g.stats.pulses++;
  g.emit({ t: 'pulse', at, kj, hit });
  return null;
}

export function researchProblem(g: Game, id: string): string | null {
  const r = RESEARCH[id];
  if (!r) return 'No such project';
  if (g.research.done.has(id)) return 'Already researched';
  if (r.requires && !g.research.done.has(r.requires)) return `Needs ${RESEARCH[r.requires].name} first`;
  return null;
}

/** pick (or stop) the project the Labs work on */
export function startResearch(g: Game, id: string): string | null {
  const why = researchProblem(g, id);
  if (why) return why;
  g.research.active = g.research.active === id ? null : id;
  return null;
}

/** start wave 1, or call the next wave early (§5) */
export function nextWave(g: Game): string | null {
  if (g.over) return 'The run is over';
  if (!g.endless && g.wave >= LAST_WAVE) return 'That was the last wave';
  startNextWave(g);
  return null;
}

/** keep going past the last wave */
export function endless(g: Game): string | null {
  if (g.over !== 'win') return 'Only after the last wave';
  goEndless(g);
  return null;
}
