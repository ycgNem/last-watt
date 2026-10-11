// The grid, once per tick, before any consumer acts (DESIGN.md §2):
// networks from nodes, supply, line losses, priority tiers, satisfaction, Jar charge/discharge,
// wasted kW. Consumers read b.sat afterwards; they never compute it.
import { RULES } from '../../data/rules';
import { SKILL_RULES } from '../../data/skills';
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
  const reach = (b: Building) => g.spec(b).nodeRadius ?? 0;
  for (let i = 0; i < cond.length; i++)
    for (let j = i + 1; j < cond.length; j++) {
      const a = cond[i], b = cond[j];
      if (covers(g.rect(a), reach(a), g.rect(b)) || covers(g.rect(b), reach(b), g.rect(a))) union(a.id, b.id);
    }
  const covered = new Set<number>();
  for (const b of all) {
    if (conducts(b)) continue;
    for (const c of cond) {
      if (covers(g.rect(c), reach(c), g.rect(b))) {
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
        id: nets.length, nodes: [], members: [], gen: 0, loss: 0, demand: 0, discharge: 0, charged: 0, wasted: 0,
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
  const d = g.spec(b);
  switch (d.role) {
    case 'tower': {
      // an Overcharge asks 3× whatever the tower would ask, ahead of every tier (§8)
      const k = b.overcharge > 0 ? (g.skills.has('coolGlass') ? SKILL_RULES.coolGlass.v : RULES.overchargeMult.v) : 1;
      switch (d.kind) {
        case 'radial': return k * ((d.idleDraw ?? 0) + (d.perEnemyDraw ?? 0) * b.bodies);
        case 'mortar': return b.shell < (d.shellSize ?? 0) * (d.magazine ?? 1) ? k * (d.chargeDraw ?? 0) : 0;
        default: return k * (b.target >= 0 && b.sweep <= 0 ? d.firingDraw ?? 0 : d.idleDraw ?? 0);
      }
    }
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

/** kW a consumer would ask at its busiest (every tower firing, a Brazier with three bodies) */
export function fullDraw(g: Game, b: Building): number {
  if (b.off) return 0;
  const d = g.spec(b);
  switch (d.role) {
    case 'tower':
      // a Brazier is budgeted at a crowd of three; the forecast names its worst case (maxBodies)
      if (d.kind === 'radial') return (d.idleDraw ?? 0) + (d.perEnemyDraw ?? 0) * 3;
      if (d.kind === 'mortar') return d.chargeDraw ?? 0;
      return d.firingDraw ?? 0;
    case 'beacon': return d.constantDraw ?? 0;
    case 'extractor': return d.workDraw ?? 0;
    case 'lab': return g.research.active ? d.workDraw ?? 0 : 0;
    default: return 0;
  }
}

/** the tier a consumer is served in this tick: 0 while Overcharged (ahead of Works) */
function tierOf(b: Building): number {
  return b.overcharge > 0 ? 0 : b.tier;
}

export function isConsumer(b: Building) {
  const r = b.def.role;
  return r === 'tower' || r === 'beacon' || r === 'extractor' || r === 'lab';
}

/** one tick of the grid. `dry`: allocate only (no clocks, no Jar flow, no stats), for showing
 *  the true state of what was just built while the sim is paused or held */
export function gridSystem(g: Game, dry = false) {
  // nodes come back online
  for (const b of g.buildings.values()) {
    if (!dry && b.offline > 0) {
      b.offline -= DT;
      if (b.offline <= 0) {
        b.offline = 0;
        g.netDirty = true;
        g.emit({ t: 'restore', id: b.id });
      }
    }
  }
  if (g.netDirty) rebuildNetworks(g);

  const total = { gen: 0, demand: 0, supply: 0, wasted: 0, stored: 0, capacity: 0, tiers: emptyTiers(), wall: { demand: 0, served: 0, sat: 1 }, peak: 0 };
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
    n.loss = 0;
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
      const role = b.def.role;
      if (role === 'core') {
        b.output = g.hearthOutput();
        n.gen += b.output;
      } else if (role === 'generator') {
        if (b.off) b.output = 0;
        n.gen += b.output;
      } else if (role === 'node') {
        if (b.offline <= 0) n.loss += g.spec(b).lineLoss ?? 0;
      } else if (role === 'storage') {
        jars.push(b);
        b.flow = 0;
      } else if (isConsumer(b)) {
        b.demand = demandOf(g, b);
        n.tiers[tierOf(b)].demand += b.demand;
        n.demand += b.demand;
        consumers.push(b);
        if (b.def.role === 'tower' || b.def.role === 'beacon') total.peak += fullDraw(g, b);
      }
    }
    // long lines lose their kW before anyone sees it (§3.2)
    const made = Math.max(0, n.gen - n.loss);
    let supply = made;
    if (made >= n.demand) {
      // surplus charges Jars up to their charge rate; the rest is wasted (§2.4)
      let surplus = made - n.demand;
      for (const j of jars) {
        if (j.off) continue;
        const js = g.spec(j);
        const room = ((js.capacity ?? 0) - j.charge) / DT;
        const rate = (js.maxCharge ?? 0) * (g.skills.has('wideMouth') ? SKILL_RULES.wideMouth.v : 1);
        const take = Math.max(0, Math.min(rate, room, surplus));
        if (!dry) j.charge += take * DT;
        j.flow = take;
        surplus -= take;
        n.charged += take;
      }
      n.wasted = surplus;
    } else {
      // a deficit draws on Jars, up to each one's discharge rate (§2.1)
      const deficit = n.demand - made;
      const avail = jars.map((j) => (j.off ? 0 : Math.min(g.spec(j).maxDischarge ?? 0, j.charge / DT)));
      const sum = avail.reduce((a, b) => a + b, 0);
      const dis = Math.min(deficit, sum);
      if (dis > 0)
        jars.forEach((j, i) => {
          const share = (dis * avail[i]) / sum;
          if (!dry) j.charge = Math.max(0, j.charge - share * DT);
          j.flow = -share;
        });
      n.discharge = dis;
      supply += dis;
    }
    // tier by tier: Overcharges (tier 0) first, then tier 1 is served fully before tier 2 sees
    // anything (§2.3, §8)
    let rem = supply;
    for (let t = 0; t <= 4; t++) {
      const ts = n.tiers[t];
      ts.sat = ts.demand > 0 ? Math.min(1, rem / ts.demand) : 1;
      ts.served = ts.sat * ts.demand;
      rem = Math.max(0, rem - ts.served);
    }
    n.wall = { demand: 0, served: 0, sat: 1 };
    for (const b of consumers) {
      b.sat = b.off || g.tierOff[b.tier] ? 0 : n.tiers[tierOf(b)].sat;
      if (b.def.role === 'tower' || b.def.role === 'beacon') {
        n.wall.demand += b.demand;
        n.wall.served += b.demand * b.sat;
      }
    }
    n.wall.sat = n.wall.demand > 0 ? n.wall.served / n.wall.demand : 1;
    for (const j of jars) {
      const spin = g.spec(j).spinDown ?? 0;
      if (spin > 0 && j.charge > 0) {
        // a Flywheel spins down: its friction is power wasted (§3.2)
        const lost = j.charge * spin;
        if (!dry) j.charge = Math.max(0, j.charge - lost * DT);
        n.wasted += lost;
      }
      n.stored += j.charge;
      n.capacity += g.spec(j).capacity ?? 0;
    }
    total.gen += made;
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
  g.grid = total;
  if (dry) return;
  // what a Veil's sight reads: satisfaction over the last half second, so it doesn't flicker
  const k = Math.min(1, DT / 0.5);
  for (const b of g.buildings.values()) b.satAvg += ((b.net < 0 ? 0 : b.sat) - b.satAvg) * k;
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
