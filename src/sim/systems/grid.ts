// The grid, once per tick, before any consumer acts (DESIGN.md §2):
// networks from nodes, supply, priority tiers, satisfaction, Jar charge/discharge, wasted kW.
// Consumers read b.sat afterwards; they never compute it.
import { RULES } from '../../data/rules';
import { DT, emptyTiers, type Game } from '../Game';
import { covers } from '../geom';
import type { Building, Network } from '../types';

/** a node-like building carries power: the Hearth always, a Node unless knocked out */
function conducts(b: Building) {
  return b.def.role === 'core' || (b.def.role === 'node' && b.offline <= 0);
}

/** rebuild which network every building is on (§2.5); only when something changed */
export function rebuildNetworks(g: Game) {
  const all = [...g.buildings.values()];
  const parent = new Map<number, number>();
  const find = (a: number): number => {
    let r = a;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = a;
    while (parent.get(c) !== r) {
      const n = parent.get(c)!;
      parent.set(c, r);
      c = n;
    }
    return r;
  };
  const union = (a: number, b: number) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const b of all) parent.set(b.id, b.id);
  const cond = all.filter(conducts);
  for (let i = 0; i < cond.length; i++)
    for (let j = i + 1; j < cond.length; j++) {
      const a = cond[i], b = cond[j];
      if (covers(g.rect(a), a.def.nodeRadius!, g.rect(b)) || covers(g.rect(b), b.def.nodeRadius!, g.rect(a))) union(a.id, b.id);
    }
  const covered = new Set<number>();
  for (const b of all) {
    if (conducts(b)) continue;
    for (const c of cond) {
      if (covers(g.rect(c), c.def.nodeRadius!, g.rect(b))) {
        union(b.id, c.id);
        covered.add(b.id);
      }
    }
  }
  const index = new Map<number, number>();
  const nets: Network[] = [];
  for (const c of cond) {
    const r = find(c.id);
    if (!index.has(r)) {
      index.set(r, nets.length);
      nets.push({
        id: nets.length, nodes: [], members: [], gen: 0, demand: 0, discharge: 0, charged: 0, wasted: 0,
        stored: 0, capacity: 0, tiers: emptyTiers(), wall: { demand: 0, served: 0, sat: 1 }, hasHearth: false,
      });
    }
    const n = nets[index.get(r)!];
    n.nodes.push(c.id);
    if (c.def.role === 'core') n.hasHearth = true;
  }
  for (const b of all) {
    const on = conducts(b) || covered.has(b.id);
    b.net = on ? index.get(find(b.id)) ?? -1 : -1;
    if (b.net >= 0) nets[b.net].members.push(b.id);
  }
  g.networks = nets;
  g.netDirty = false;
  g.netVersion++;
}

/** kW a consumer asks for this tick (0 for non-consumers, shed buildings and shed tiers) */
export function demandOf(g: Game, b: Building): number {
  if (b.off || g.tierOff[b.tier]) return 0;
  const d = b.def;
  switch (d.role) {
    case 'tower':
      if (b.overcharge > 0) return 0; // Overcharge runs on storage, not the grid (§8)
      return b.target >= 0 ? g.towerStats(b).firingDraw : d.idleDraw ?? 0;
    case 'beacon':
      return d.constantDraw ?? 0;
    case 'extractor':
      return b.stock < (d.stockCap ?? 1) ? d.workDraw ?? 0 : 0;
    case 'lab':
      return g.research.active ? d.workDraw ?? 0 : 0;
    default:
      return 0;
  }
}

export function isConsumer(b: Building) {
  const r = b.def.role;
  return r === 'tower' || r === 'beacon' || r === 'extractor' || r === 'lab';
}

export function gridSystem(g: Game) {
  // nodes come back online
  for (const b of g.buildings.values()) {
    if (b.offline > 0) {
      b.offline -= DT;
      if (b.offline <= 0) {
        b.offline = 0;
        g.netDirty = true;
        g.emit({ t: 'restore', id: b.id });
      }
    }
  }
  if (g.netDirty) rebuildNetworks(g);

  const total = { gen: 0, demand: 0, supply: 0, wasted: 0, stored: 0, capacity: 0, tiers: emptyTiers(), wall: { demand: 0, served: 0, sat: 1 } };
  for (const b of g.buildings.values()) {
    if (b.net < 0) {
      b.demand = 0;
      b.sat = 0;
      b.flow = 0;
      if (b.def.role === 'generator') b.output = 0;
    }
  }
  for (const n of g.networks) {
    n.tiers = emptyTiers();
    n.gen = 0;
    n.demand = 0;
    n.discharge = 0;
    n.charged = 0;
    n.wasted = 0;
    n.stored = 0;
    n.capacity = 0;
    const jars: Building[] = [];
    const consumers: Building[] = [];
    for (const id of n.members) {
      const b = g.buildings.get(id)!;
      if (b.def.role === 'core') {
        b.output = b.def.output ?? 0;
        n.gen += b.output;
      } else if (b.def.role === 'generator') {
        if (b.off) b.output = 0;
        n.gen += b.output;
      } else if (b.def.role === 'storage') {
        jars.push(b);
        b.flow = 0;
      } else if (isConsumer(b)) {
        b.demand = demandOf(g, b);
        n.tiers[b.tier].demand += b.demand;
        n.demand += b.demand;
        consumers.push(b);
      }
    }
    let supply = n.gen;
    if (n.gen >= n.demand) {
      // surplus charges Jars up to their charge rate; the rest is wasted (§2.4)
      let surplus = n.gen - n.demand;
      for (const j of jars) {
        if (j.off) continue;
        const room = ((j.def.capacity ?? 0) - j.charge) / DT;
        const take = Math.max(0, Math.min(j.def.maxCharge ?? 0, room, surplus));
        j.charge += take * DT;
        j.flow = take;
        surplus -= take;
        n.charged += take;
      }
      n.wasted = surplus;
    } else {
      // a deficit draws on Jars, up to each one's discharge rate (§2.1)
      const deficit = n.demand - n.gen;
      const avail = jars.map((j) => (j.off ? 0 : Math.min(j.def.maxDischarge ?? 0, j.charge / DT)));
      const sum = avail.reduce((a, b) => a + b, 0);
      const dis = Math.min(deficit, sum);
      if (dis > 0)
        jars.forEach((j, i) => {
          const share = (dis * avail[i]) / sum;
          j.charge = Math.max(0, j.charge - share * DT);
          j.flow = -share;
        });
      n.discharge = dis;
      supply += dis;
    }
    // tier by tier: tier 1 is served fully before tier 2 sees anything (§2.3)
    let rem = supply;
    for (let t = 1; t <= 4; t++) {
      const ts = n.tiers[t];
      ts.sat = ts.demand > 0 ? Math.min(1, rem / ts.demand) : 1;
      ts.served = ts.sat * ts.demand;
      rem = Math.max(0, rem - ts.served);
    }
    n.wall = { demand: 0, served: 0, sat: 1 };
    for (const b of consumers) {
      b.sat = b.off || g.tierOff[b.tier] ? 0 : n.tiers[b.tier].sat;
      if (b.def.role === 'tower' || b.def.role === 'beacon') {
        n.wall.demand += b.demand;
        n.wall.served += b.demand * b.sat;
      }
    }
    n.wall.sat = n.wall.demand > 0 ? n.wall.served / n.wall.demand : 1;
    for (const j of jars) {
      n.stored += j.charge;
      n.capacity += j.def.capacity ?? 0;
    }
    total.gen += n.gen;
    total.demand += n.demand;
    total.supply += supply;
    total.wasted += n.wasted;
    total.stored += n.stored;
    total.capacity += n.capacity;
    for (let t = 1; t <= 4; t++) {
      total.tiers[t].demand += n.tiers[t].demand;
      total.tiers[t].served += n.tiers[t].served;
    }
    total.wall.demand += n.wall.demand;
    total.wall.served += n.wall.served;
  }
  total.wall.sat = total.wall.demand > 0 ? total.wall.served / total.wall.demand : 1;
  for (let t = 1; t <= 4; t++) {
    const ts = total.tiers[t];
    ts.sat = ts.demand > 0 ? ts.served / ts.demand : 1;
  }
  g.grid = total;
  g.stats.wastedKj += total.wasted * DT;

  // brownout: the wall below the starved line; it ends only once the wall is clearly back
  const wall = total.wall;
  const starved = g.brownout ? !(wall.demand <= 0 || wall.sat >= RULES.brownoutEnds.v) : wall.demand > 0 && wall.sat < RULES.starvedBelow.v;
  if (starved !== g.brownout) {
    g.brownoutClock += DT;
    if (g.brownoutClock >= (starved ? 0.25 : 2)) {
      g.brownout = starved;
      g.brownoutClock = 0;
      if (starved) {
        if (g.stats.firstBrownout < 0) g.stats.firstBrownout = g.tick;
        g.emit({ t: 'brownout', sat: wall.sat });
      } else g.emit({ t: 'recovered' });
    }
  } else g.brownoutClock = 0;
  if (g.brownout) g.stats.brownoutSeconds += DT;
}
